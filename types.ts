
export enum Panel {
    ASSISTANT = 'assistant',
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
}

export enum AssistantMode {
    CHAT = 'chat',
    WEB_SEARCH = 'web_search',
    MAPS_SEARCH = 'maps_search',
}

export enum ChatModel {
    FLASH = 'gemini-2.5-flash',
    FLASH_LITE = 'gemini-flash-lite-latest',
    PRO_THINKING = 'gemini-2.5-pro',
}

export enum ImageMode {
    GENERATE = 'generate',
    EDIT = 'edit',
    ANALYZE = 'analyze',
}

export enum VideoMode {
    GENERATE = 'generate',
    ANALYZE = 'analyze',
}

export enum AudioMode {
    LIVE = 'live',
    TTS = 'tts',
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type VideoAspectRatio = "16:9" | "9:16";

export interface ChatMessage {
    sender: 'user' | 'ai';
    text: string;
    sources?: any[];
}

export interface GroundingChunk {
    web?: {
        uri: string;
        title: string;
    };
    maps?: {
        uri: string;
        title: string;
        placeAnswerSources?: {
            reviewSnippets?: {
                uri: string;
                title: string;
            }[];
        }
    };
}
