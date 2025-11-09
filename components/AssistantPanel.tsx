
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Chat } from '@google/genai';
import { ChatModel, AssistantMode, type ChatMessage, type GroundingChunk } from '../types';
import * as geminiService from '../services/geminiService';
import Loader from './Loader';

// Icons
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="m22 2-11 11"/></svg>;
const UserIcon = () => <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0"></div>;
const AiIcon = () => <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.13 2.34a1 1 0 0 0-1.26 1.34l3.07 5.32a1 1 0 0 0 1.26-1.34Z"/><path d="M13.87 2.34a1 1 0 0 1 1.26 1.34l-3.07 5.32a1 1 0 0 1-1.26-1.34Z"/><path d="M12 21.7a3.3 3.3 0 0 0 3.3-3.3c0-2.5-2-2.5-2-5"/><path d="M12 21.7a3.3 3.3 0 0 1-3.3-3.3c0-2.5 2-2.5 2-5"/></svg></div>;

const AssistantPanel: React.FC = () => {
    const [mode, setMode] = useState<AssistantMode>(AssistantMode.CHAT);
    const [chatModel, setChatModel] = useState<ChatModel>(ChatModel.FLASH);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);

    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        // Reset chat history when mode or model changes
        setMessages([]);
        if (mode === AssistantMode.CHAT) {
            chatRef.current = geminiService.createChat(chatModel, "You are a helpful business assistant.");
        } else {
            chatRef.current = null;
        }
    }, [mode, chatModel]);

    const handleGeolocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                    alert("Location captured successfully!");
                },
                (error) => {
                    setError(`Geolocation error: ${error.message}`);
                }
            );
        } else {
            setError("Geolocation is not supported by this browser.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            let response;
            if (mode === AssistantMode.CHAT) {
                if (chatRef.current) {
                    response = await chatRef.current.sendMessage({ message: input });
                } else {
                    throw new Error("Chat not initialized");
                }
            } else if (mode === AssistantMode.WEB_SEARCH) {
                response = await geminiService.generateWithGoogleSearch(input);
            } else if (mode === AssistantMode.MAPS_SEARCH) {
                response = await geminiService.generateWithGoogleMaps(input, location || undefined);
            }

            if (response) {
                const aiMessage: ChatMessage = {
                    sender: 'ai',
                    text: response.text,
                    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
                };
                setMessages(prev => [...prev, aiMessage]);
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderSources = (sources: GroundingChunk[]) => (
        <div className="mt-2 text-xs">
            <h4 className="font-bold mb-1">Sources:</h4>
            <div className="flex flex-wrap gap-2">
            {sources.map((chunk, index) => {
                const source = chunk.web || chunk.maps;
                if (!source) return null;
                return (
                    <a key={index} href={source.uri} target="_blank" rel="noopener noreferrer" 
                       className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors truncate max-w-xs">
                        {source.title || source.uri}
                    </a>
                );
            })}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-4 md:p-6 bg-gray-100 dark:bg-gray-900">
            <header className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">AI Assistant</h2>
                    <div className="bg-white dark:bg-gray-800 p-1 rounded-lg flex items-center gap-1 border border-gray-200 dark:border-gray-700">
                        <button onClick={() => setMode(AssistantMode.CHAT)} className={`px-3 py-1 text-sm rounded-md ${mode === AssistantMode.CHAT ? 'bg-blue-500 text-white' : ''}`}>Chat</button>
                        <button onClick={() => setMode(AssistantMode.WEB_SEARCH)} className={`px-3 py-1 text-sm rounded-md ${mode === AssistantMode.WEB_SEARCH ? 'bg-blue-500 text-white' : ''}`}>Web Search</button>
                        <button onClick={() => setMode(AssistantMode.MAPS_SEARCH)} className={`px-3 py-1 text-sm rounded-md ${mode === AssistantMode.MAPS_SEARCH ? 'bg-blue-500 text-white' : ''}`}>Maps Search</button>
                    </div>
                </div>
                {mode === AssistantMode.CHAT && (
                     <select value={chatModel} onChange={(e) => setChatModel(e.target.value as ChatModel)} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm">
                        <option value={ChatModel.FLASH}>Flash (Fast)</option>
                        <option value={ChatModel.FLASH_LITE}>Flash Lite (Ultra Fast)</option>
                        <option value={ChatModel.PRO_THINKING}>Pro (Complex)</option>
                    </select>
                )}
                 {mode === AssistantMode.MAPS_SEARCH && (
                    <button onClick={handleGeolocation} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-600">
                        {location ? 'Update Location' : 'Use My Location'}
                    </button>
                )}
            </header>
            
            <div className="flex-1 overflow-y-auto mb-4 p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <p>Start a conversation to get started.</p>
                        <p className="text-sm">Current Mode: {mode.replace('_', ' ')}</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                     <div key={index} className={`flex items-start gap-3 mb-4 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'ai' && <AiIcon />}
                        <div className={`p-3 rounded-lg max-w-xl ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-800'}`}>
                           <p className="whitespace-pre-wrap">{msg.text}</p>
                           {msg.sources && msg.sources.length > 0 && renderSources(msg.sources)}
                        </div>
                        {msg.sender === 'user' && <UserIcon />}
                    </div>
                ))}
                {isLoading && (
                     <div className="flex items-start gap-3 mb-4">
                        <AiIcon />
                        <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-800"><Loader /></div>
                     </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {error && <div className="text-red-500 text-sm mb-2 p-2 bg-red-100 dark:bg-red-900/50 rounded-md">{error}</div>}

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Message ${mode.replace('_', ' ')}...`}
                    className="flex-1 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
                <button type="submit" className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300" disabled={isLoading || !input.trim()}>
                    <SendIcon/>
                </button>
            </form>
        </div>
    );
};

export default AssistantPanel;
