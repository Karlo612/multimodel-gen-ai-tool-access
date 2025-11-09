
import React from 'react';

interface LoaderProps {
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ text = "Thinking..." }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
    </div>
  );
};

export default Loader;
