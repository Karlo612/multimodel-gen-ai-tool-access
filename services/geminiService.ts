
import { GoogleGenAI, Type, Modality, Chat, GenerateContentResponse, LiveSession, LiveServerMessage } from "@google/genai";
import { ChatModel, VideoAspectRatio } from '../types';

let ai: GoogleGenAI;

// This function must be called before any other function
const getAi = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};


export const generateText = async (prompt: string, model: ChatModel) => {
    const ai = getAi();
    const config: any = {};
    if (model === ChatModel.PRO_THINKING) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: config,
    });
    return response;
};

export const createChat = (model: ChatModel, systemInstruction: string): Chat => {
    const ai = getAi();
    return ai.chats.create({
        model: model,
        config: {
            systemInstruction,
        }
    });
};

export const generateWithGoogleSearch = async (prompt: string) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });
    return response;
};

export const generateWithGoogleMaps = async (prompt:string, latLng?: {latitude: number, longitude: number}) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleMaps: {} }],
            toolConfig: latLng ? { retrievalConfig: { latLng } } : undefined,
        },
    });
    return response;
};

export const analyzeImage = async (prompt: string, image: {inlineData: {data:string, mimeType: string}}) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [image, { text: prompt }] },
    });
    return response;
};

export const generateImage = async (prompt: string, aspectRatio: string) => {
    const ai = getAi();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio as any,
        },
    });
    return response.generatedImages[0]?.image.imageBytes;
};

export const editImage = async (prompt: string, image: {inlineData: {data:string, mimeType: string}}) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [image, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const generateVideo = async (prompt: string, aspectRatio: VideoAspectRatio, image?: {imageBytes: string, mimeType: string}) => {
    // Re-create AI instance to get latest key from Veo selection dialog
    if (!process.env.API_KEY) throw new Error("API key not found after selection.");
    const videoAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let operation = await videoAI.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: image,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await videoAI.operations.getVideosOperation({ operation: operation });
    }
    
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed or returned no link.");
    
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
};

export const analyzeVideo = async (prompt: string, frames: {inlineData: {data:string, mimeType: string}}[]) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [...frames, { text: prompt }] },
    });
    return response;
};


export const textToSpeech = async (text: string) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const connectLive = async (callbacks: {
    onopen: () => void;
    // FIX: Use LiveServerMessage for strong typing of the onmessage callback.
    onmessage: (message: LiveServerMessage) => Promise<void>;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}): Promise<LiveSession> => {
    const ai = getAi();
    const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: 'You are a helpful business assistant. Be concise and professional.',
        },
    });
    return session;
};
