
import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: Import LiveServerMessage for strong typing of live session messages.
import type { LiveSession, LiveServerMessage } from '@google/genai';
import { AudioMode } from '../types';
import * as geminiService from '../services/geminiService';
import { decode, decodeAudioData, encode } from '../utils/audioUtils';
import Loader from './Loader';

const AudioPanel: React.FC = () => {
    const [mode, setMode] = useState<AudioMode>(AudioMode.LIVE);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Live Mode State
    const [isLive, setIsLive] = useState(false);
    const [transcripts, setTranscripts] = useState<{user: string, model: string}[]>([]);
    const currentUserTranscript = useRef('');
    const currentModelTranscript = useRef('');
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    // TTS Mode State
    const [ttsText, setTtsText] = useState('');
    const ttsAudioContextRef = useRef<AudioContext | null>(null);


    const resetState = () => {
        setIsLoading(false);
        setError(null);
        // Live
        setIsLive(false);
        setTranscripts([]);
        currentUserTranscript.current = '';
        currentModelTranscript.current = '';
        if (sessionPromiseRef.current) {
             sessionPromiseRef.current.then(s => s.close());
             sessionPromiseRef.current = null;
        }
        if(mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if(scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if(audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        // TTS
        setTtsText('');
        if(ttsAudioContextRef.current) {
            ttsAudioContextRef.current.close();
            ttsAudioContextRef.current = null;
        }
    };

    const changeMode = (newMode: AudioMode) => {
        resetState();
        setMode(newMode);
    };
    
    const startLiveConversation = async () => {
        if (isLive) return;
        setIsLoading(true);
        setError(null);
        setTranscripts([]);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;
            
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const outputNode = outputAudioContext.createGain();
            outputNode.connect(outputAudioContext.destination);
            
            let nextStartTime = 0;
            const sources = new Set<AudioBufferSourceNode>();

            sessionPromiseRef.current = geminiService.connectLive({
                onopen: () => {
                    const source = inputAudioContext.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;
                    
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBlob = {
                            data: encode(new Uint8Array(int16.buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);
                    setIsLive(true);
                    setIsLoading(false);
                },
                // FIX: Add LiveServerMessage type to the message parameter for type safety.
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.outputTranscription) {
                        currentModelTranscript.current += message.serverContent.outputTranscription.text;
                    }
                    if (message.serverContent?.inputTranscription) {
                        currentUserTranscript.current += message.serverContent.inputTranscription.text;
                    }

                    if(message.serverContent?.turnComplete) {
                        const userTurn = currentUserTranscript.current;
                        const modelTurn = currentModelTranscript.current;
                        if(userTurn || modelTurn) {
                           setTranscripts(prev => [...prev, {user: userTurn, model: modelTurn}]);
                        }
                        currentUserTranscript.current = '';
                        currentModelTranscript.current = '';
                    }

                    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (audioData) {
                        nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                        const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
                        const source = outputAudioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.addEventListener('ended', () => { sources.delete(source); });
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                        sources.add(source);
                    }
                    if (message.serverContent?.interrupted) {
                         for (const source of sources.values()) {
                            source.stop();
                            sources.delete(source);
                        }
                        nextStartTime = 0;
                    }
                },
                onerror: (e) => {
                    console.error("Live session error:", e);
                    setError("A connection error occurred.");
                    stopLiveConversation();
                },
                onclose: () => {
                    stopLiveConversation();
                }
            });
        } catch (err: any) {
            setError(err.message || 'Failed to start microphone.');
            setIsLoading(false);
        }
    };

    const stopLiveConversation = () => {
        if (!isLive && !isLoading) return;
        resetState();
    };
    
    const handleTts = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!ttsText.trim()) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const audioData = await geminiService.textToSpeech(ttsText);
            if(audioData) {
                 if(!ttsAudioContextRef.current || ttsAudioContextRef.current.state === 'closed') {
                     ttsAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                 }
                 const audioCtx = ttsAudioContextRef.current;
                 const audioBuffer = await decodeAudioData(decode(audioData), audioCtx, 24000, 1);
                 const source = audioCtx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(audioCtx.destination);
                 source.start();
            }
        } catch (err: any) {
             setError(err.message || 'Failed to generate speech.');
        } finally {
             setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 bg-gray-100 dark:bg-gray-900">
            <header className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Audio Suite</h2>
                <div className="bg-white dark:bg-gray-800 p-1 rounded-lg flex items-center gap-1 border border-gray-200 dark:border-gray-700">
                    <button onClick={() => changeMode(AudioMode.LIVE)} className={`px-3 py-1 text-sm rounded-md ${mode === AudioMode.LIVE ? 'bg-blue-500 text-white' : ''}`}>Live Conversation</button>
                    <button onClick={() => changeMode(AudioMode.TTS)} className={`px-3 py-1 text-sm rounded-md ${mode === AudioMode.TTS ? 'bg-blue-500 text-white' : ''}`}>Text-to-Speech</button>
                </div>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                {mode === AudioMode.LIVE && (
                    <div className="w-full max-w-2xl mx-auto flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto p-4 mb-4 border-b dark:border-gray-700">
                            {transcripts.length === 0 && <p className="text-center text-gray-500">Press start to begin the conversation.</p>}
                            {transcripts.map((t, i) => (
                                <div key={i}>
                                    {t.user && <p className="text-right my-2"><span className="bg-blue-500 text-white px-3 py-1 rounded-lg inline-block">{t.user}</span></p>}
                                    {t.model && <p className="text-left my-2"><span className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-lg inline-block">{t.model}</span></p>}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-center items-center gap-4">
                            <button onClick={isLive ? stopLiveConversation : startLiveConversation}
                                className={`px-6 py-3 rounded-full font-semibold text-white transition-colors ${isLive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                                disabled={isLoading}>
                                {isLoading ? "Starting..." : isLive ? "Stop Conversation" : "Start Conversation"}
                            </button>
                        </div>
                    </div>
                )}
                
                {mode === AudioMode.TTS && (
                    <form onSubmit={handleTts} className="w-full max-w-lg flex flex-col gap-4">
                        <h3 className="text-lg font-semibold text-center">Text-to-Speech</h3>
                        <textarea
                            value={ttsText}
                            onChange={(e) => setTtsText(e.target.value)}
                            placeholder="Enter text to generate speech..."
                            className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-40"
                            disabled={isLoading}
                        />
                        <button type="submit" className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 font-semibold" disabled={isLoading || !ttsText.trim()}>
                           {isLoading ? 'Generating...' : 'Generate and Play Audio'}
                        </button>
                    </form>
                )}
                 {error && <div className="text-red-500 text-sm mt-4 p-2 text-center bg-red-100 dark:bg-red-900/50 rounded-md">{error}</div>}
            </div>
        </div>
    );
};

export default AudioPanel;
