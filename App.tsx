
import React, { useState } from 'react';
import { Panel } from './types';
import AssistantPanel from './components/AssistantPanel';
import ImagePanel from './components/ImagePanel';
import VideoPanel from './components/VideoPanel';
import AudioPanel from './components/AudioPanel';
import { Bot, Image as ImageIcon, Video, Mic } from 'lucide-react';

// Using SVG strings as components for icons
const IconBot = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const IconImage = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>;
const IconVideo = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>;
const IconMic = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;

const App: React.FC = () => {
  const [activePanel, setActivePanel] = useState<Panel>(Panel.ASSISTANT);

  const renderPanel = () => {
    switch (activePanel) {
      case Panel.ASSISTANT:
        return <AssistantPanel />;
      case Panel.IMAGE:
        return <ImagePanel />;
      case Panel.VIDEO:
        return <VideoPanel />;
      case Panel.AUDIO:
        return <AudioPanel />;
      default:
        return <AssistantPanel />;
    }
  };

  const navItems = [
    { id: Panel.ASSISTANT, label: 'Assistant', icon: <IconBot /> },
    { id: Panel.IMAGE, label: 'Image Studio', icon: <IconImage /> },
    { id: Panel.VIDEO, label: 'Video Studio', icon: <IconVideo /> },
    { id: Panel.AUDIO, label: 'Audio Suite', icon: <IconMic /> },
  ];

  return (
    <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <nav className="flex flex-col items-center sm:items-stretch w-16 sm:w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 p-2 sm:p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M10.13 2.34a1 1 0 0 0-1.26 1.34l3.07 5.32a1 1 0 0 0 1.26-1.34Z"/><path d="M13.87 2.34a1 1 0 0 1 1.26 1.34l-3.07 5.32a1 1 0 0 1-1.26-1.34Z"/><path d="M12 21.7a3.3 3.3 0 0 0 3.3-3.3c0-2.5-2-2.5-2-5"/><path d="M12 21.7a3.3 3.3 0 0 1-3.3-3.3c0-2.5 2-2.5 2-5"/><path d="M19.07 4.93a1 1 0 0 0-1.42-1.42l-2.12 2.12a1 1 0 0 0 1.42 1.42Z"/><path d="M4.93 4.93a1 1 0 0 1 1.42-1.42l2.12 2.12a1 1 0 1 1-1.42 1.42Z"/><path d="m19.07 19.07-2.12-2.12a1 1 0 0 0-1.42 1.42l2.12 2.12a1 1 0 0 0 1.42-1.42Z"/><path d="m4.93 19.07 2.12-2.12a1 1 0 0 1 1.42 1.42L6.34 20.5a1 1 0 0 1-1.42-1.42Z"/></svg>
            <h1 className="text-xl font-bold hidden sm:block">Gemini App</h1>
        </div>
        <ul className="flex flex-col gap-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActivePanel(item.id)}
                className={`flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium transition-colors ${
                  activePanel === item.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 overflow-y-auto">
        {renderPanel()}
      </main>
    </div>
  );
};

export default App;
