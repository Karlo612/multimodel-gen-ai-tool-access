
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VideoMode, type VideoAspectRatio } from '../types';
import * as geminiService from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import Loader from './Loader';

// FIX: Removed global declaration for `window.aistudio` to resolve a TypeScript
// type conflict. The correct type definitions are expected to be globally available.

const ApiKeySelector: React.FC<{onKeySelected: () => void}> = ({ onKeySelected }) => {
    return (
        <div className="p-4 bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700 rounded-lg text-center">
            <h4 className="font-semibold mb-2">API Key Required</h4>
            <p className="text-sm mb-4">Video generation requires a user-provided API key. Please select a key to continue.</p>
            <p className="text-xs mb-4">For information on billing, please visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">ai.google.dev/gemini-api/docs/billing</a>.</p>
            <button
                onClick={async () => {
                    await window.aistudio?.openSelectKey();
                    onKeySelected();
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600"
            >
                Select API Key
            </button>
        </div>
    );
}

const VideoPanel: React.FC = () => {
    const [mode, setMode] = useState<VideoMode>(VideoMode.GENERATE);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    
    // Video Generation State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');

    // Video Analysis State
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoFileRef = useRef<HTMLInputElement>(null);

    const checkApiKey = useCallback(async () => {
        const keyExists = await window.aistudio?.hasSelectedApiKey();
        setHasApiKey(!!keyExists);
    }, []);

    useEffect(() => {
        if (mode === VideoMode.GENERATE) {
            checkApiKey();
        }
    }, [mode, checkApiKey]);

    const resetState = () => {
        setPrompt('');
        setIsLoading(false);
        setError(null);
        setResult(null);
        setImageFile(null);
        setImageUrl(null);
        setVideoFile(null);
        setVideoUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (videoFileRef.current) videoFileRef.current.value = '';
    }

    const changeMode = (newMode: VideoMode) => {
        setMode(newMode);
        resetState();
    }

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
        }
    };
    
    const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
        }
    };
    
    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("Prompt is required for video generation.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            await checkApiKey();
            if (!await window.aistudio?.hasSelectedApiKey()) {
                 throw new Error("API key not selected. Please select a key and try again.");
            }

            let imagePayload;
            if (imageFile) {
                const base64Data = await fileToBase64(imageFile);
                imagePayload = { imageBytes: base64Data, mimeType: imageFile.type };
            }
            const videoResultUrl = await geminiService.generateVideo(prompt, aspectRatio, imagePayload);
            setResult(videoResultUrl);
        } catch (err: any) {
            if (err.message?.includes("Requested entity was not found")) {
                setError("API key is invalid. Please select a valid key.");
                setHasApiKey(false);
            } else {
                setError(err.message || 'An error occurred during video generation.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!prompt.trim() || !videoFile) {
            setError("A video file and a prompt are required for analysis.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setResult(null);

        // Frame extraction
        const videoElement = document.createElement('video');
        videoElement.src = URL.createObjectURL(videoFile);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const frames: {inlineData: {data:string, mimeType: string}}[] = [];
        const frameCaptureInterval = 1; // seconds

        videoElement.onloadedmetadata = async () => {
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;

            try {
                for (let time = 0; time < videoElement.duration; time += frameCaptureInterval) {
                     videoElement.currentTime = time;
                     await new Promise(r => videoElement.onseeked = r);
                     context?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                     const dataUrl = canvas.toDataURL('image/jpeg');
                     frames.push({ inlineData: { data: dataUrl.split(',')[1], mimeType: 'image/jpeg' }});
                }
                
                if (frames.length > 0) {
                     const analysisResult = await geminiService.analyzeVideo(prompt, frames);
                     setResult(analysisResult.text);
                } else {
                    throw new Error("Could not extract any frames from the video.");
                }
            } catch (err: any) {
                 setError(err.message || 'An error occurred during video analysis.');
            } finally {
                 setIsLoading(false);
            }
        };
        videoElement.load();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === VideoMode.GENERATE) handleGenerate();
        if (mode === VideoMode.ANALYZE) handleAnalyze();
    };

    const renderGenerateForm = () => (
        <>
            <div>
                <label className="block text-sm font-medium mb-2">Upload Starting Image (Optional)</label>
                <input type="file" accept="image/*" onChange={handleImageFileChange} ref={fileInputRef} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
            </div>
            {imageUrl && (
                 <div className="w-full aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
                   <img src={imageUrl} alt="Upload preview" className="w-full h-full object-contain" />
                </div>
            )}
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A robot holding a red skateboard..."
                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-28"
                disabled={isLoading}
            />
             <div>
                <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as VideoAspectRatio)} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                    <option value="16:9">Landscape (16:9)</option>
                    <option value="9:16">Portrait (9:16)</option>
                </select>
            </div>
        </>
    );
    
    const renderAnalyzeForm = () => (
        <>
            <div>
                <label className="block text-sm font-medium mb-2">Upload Video</label>
                <input type="file" accept="video/*" onChange={handleVideoFileChange} ref={videoFileRef} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
            </div>
            {videoUrl && (
                 <div className="w-full aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
                   <video src={videoUrl} controls className="w-full h-full object-contain" />
                </div>
            )}
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Summarize this video..."
                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-28"
                disabled={isLoading}
            />
        </>
    );

    return (
        <div className="h-full flex flex-col p-4 md:p-6 bg-gray-100 dark:bg-gray-900">
            <header className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Video Studio</h2>
                <div className="bg-white dark:bg-gray-800 p-1 rounded-lg flex items-center gap-1 border border-gray-200 dark:border-gray-700">
                    <button onClick={() => changeMode(VideoMode.GENERATE)} className={`px-3 py-1 text-sm rounded-md ${mode === VideoMode.GENERATE ? 'bg-blue-500 text-white' : ''}`}>Generate</button>
                    <button onClick={() => changeMode(VideoMode.ANALYZE)} className={`px-3 py-1 text-sm rounded-md ${mode === VideoMode.ANALYZE ? 'bg-blue-500 text-white' : ''}`}>Analyze</button>
                </div>
            </header>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                    {mode === VideoMode.GENERATE && !hasApiKey && <ApiKeySelector onKeySelected={checkApiKey} />}
                    <h3 className="font-semibold text-lg">{mode === VideoMode.GENERATE ? "Generate Video" : "Analyze Video"}</h3>
                    {mode === VideoMode.GENERATE ? renderGenerateForm() : renderAnalyzeForm()}
                    <button type="submit" className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 font-semibold" disabled={isLoading || (mode === VideoMode.GENERATE && !hasApiKey)}>
                        {isLoading ? 'Processing...' : (mode.charAt(0).toUpperCase() + mode.slice(1))}
                    </button>
                    {error && <div className="text-red-500 text-sm mt-2 p-2 bg-red-100 dark:bg-red-900/50 rounded-md">{error}</div>}
                </form>

                <div className="flex items-center justify-center p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                    {isLoading && <Loader text={mode === VideoMode.GENERATE ? "Generating video... This may take a few minutes." : "Analyzing video..."}/>}
                    {!isLoading && !result && <div className="text-gray-500">Your result will appear here.</div>}
                    {!isLoading && result && (
                        mode === VideoMode.ANALYZE ? (
                             <div className="w-full h-full overflow-y-auto p-2">
                                <p className="whitespace-pre-wrap">{result}</p>
                            </div>
                        ) : (
                            <video src={result} controls autoPlay loop className="w-full h-full object-contain rounded-lg" />
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoPanel;
