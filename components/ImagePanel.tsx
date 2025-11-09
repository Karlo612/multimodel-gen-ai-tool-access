
import React, { useState, useRef } from 'react';
import { ImageMode, type AspectRatio } from '../types';
import * as geminiService from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import Loader from './Loader';

const ImagePanel: React.FC = () => {
    const [mode, setMode] = useState<ImageMode>(ImageMode.GENERATE);
    const [prompt, setPrompt] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
            setResult(null); // Clear previous results
        }
    };
    
    const resetState = () => {
        setPrompt('');
        setImageFile(null);
        setImageUrl(null);
        setResult(null);
        setIsLoading(false);
        setError(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
    }

    const changeMode = (newMode: ImageMode) => {
        setMode(newMode);
        resetState();
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;
        if ((mode === ImageMode.EDIT || mode === ImageMode.ANALYZE) && !imageFile) {
            setError('Please upload an image.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            if (mode === ImageMode.GENERATE) {
                const base64Image = await geminiService.generateImage(prompt, aspectRatio);
                if (base64Image) {
                    setResult(`data:image/jpeg;base64,${base64Image}`);
                }
            } else if (imageFile) {
                const base64Data = await fileToBase64(imageFile);
                const imagePart = { inlineData: { data: base64Data, mimeType: imageFile.type } };

                if (mode === ImageMode.EDIT) {
                    const editedImageBase64 = await geminiService.editImage(prompt, imagePart);
                    if (editedImageBase64) {
                        setResult(`data:${imageFile.type};base64,${editedImageBase64}`);
                    }
                } else if (mode === ImageMode.ANALYZE) {
                    const analysisResult = await geminiService.analyzeImage(prompt, imagePart);
                    setResult(analysisResult.text);
                }
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 bg-gray-100 dark:bg-gray-900">
            <header className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Image Studio</h2>
                <div className="bg-white dark:bg-gray-800 p-1 rounded-lg flex items-center gap-1 border border-gray-200 dark:border-gray-700">
                    <button onClick={() => changeMode(ImageMode.GENERATE)} className={`px-3 py-1 text-sm rounded-md ${mode === ImageMode.GENERATE ? 'bg-blue-500 text-white' : ''}`}>Generate</button>
                    <button onClick={() => changeMode(ImageMode.EDIT)} className={`px-3 py-1 text-sm rounded-md ${mode === ImageMode.EDIT ? 'bg-blue-500 text-white' : ''}`}>Edit</button>
                    <button onClick={() => changeMode(ImageMode.ANALYZE)} className={`px-3 py-1 text-sm rounded-md ${mode === ImageMode.ANALYZE ? 'bg-blue-500 text-white' : ''}`}>Analyze</button>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                {/* Input Panel */}
                <div className="flex flex-col gap-4 p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                    <h3 className="font-semibold text-lg">{mode.charAt(0).toUpperCase() + mode.slice(1)} Image</h3>
                    
                    {(mode === ImageMode.EDIT || mode === ImageMode.ANALYZE) && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Upload Image</label>
                            <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        </div>
                    )}

                    {imageUrl && (mode === ImageMode.EDIT || mode === ImageMode.ANALYZE) && (
                        <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
                           <img src={imageUrl} alt="Upload preview" className="w-full h-full object-contain" />
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                                mode === ImageMode.GENERATE ? "A futuristic cityscape at sunset..." :
                                mode === ImageMode.EDIT ? "Add a retro filter..." :
                                "What is in this image?"
                            }
                            className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-28"
                            disabled={isLoading}
                        />

                        {mode === ImageMode.GENERATE && (
                             <div>
                                <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm">
                                    <option value="1:1">Square (1:1)</option>
                                    <option value="16:9">Landscape (16:9)</option>
                                    <option value="9:16">Portrait (9:16)</option>
                                    <option value="4:3">Standard (4:3)</option>
                                    <option value="3:4">Tall (3:4)</option>
                                </select>
                            </div>
                        )}

                        <button type="submit" className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 font-semibold" disabled={isLoading || !prompt.trim()}>
                            {isLoading ? 'Processing...' : (mode.charAt(0).toUpperCase() + mode.slice(1))}
                        </button>
                    </form>
                     {error && <div className="text-red-500 text-sm mt-2 p-2 bg-red-100 dark:bg-red-900/50 rounded-md">{error}</div>}
                </div>

                {/* Output Panel */}
                <div className="flex items-center justify-center p-4 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                    {isLoading && <Loader text="Generating creative content..."/>}
                    {!isLoading && !result && <div className="text-gray-500">Your result will appear here.</div>}
                    {!isLoading && result && (
                        mode === ImageMode.ANALYZE ? (
                            <div className="w-full h-full overflow-y-auto p-2">
                                <p className="whitespace-pre-wrap">{result}</p>
                            </div>
                        ) : (
                            <div className="w-full h-full">
                                <img src={result} alt="Generated result" className="w-full h-full object-contain rounded-lg"/>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImagePanel;
