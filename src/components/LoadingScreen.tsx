import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Please wait...' }) => {
  const letters = 'GREENFIELD'.split('');

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        {letters.map((letter, index) => (
          <span
            key={index}
            className="loading-letter text-4xl md:text-5xl font-extrabold text-primary"
          >
            {letter}
          </span>
        ))}
      </div>
      <p className="mt-6 text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
};

export default LoadingScreen;
