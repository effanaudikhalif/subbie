import React from 'react';
import Logo from './Logo';

interface LoadingPageProps {
  className?: string;
}

const LoadingPage: React.FC<LoadingPageProps> = ({ className = "" }) => {
  return (
    <div className={`min-h-screen bg-white flex items-center justify-center ${className}`}>
      <div className="logo-flash">
        <Logo />
      </div>
      <style jsx>{`
        .logo-flash {
          animation: flash 1.5s ease-in-out infinite;
        }
        @keyframes flash {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LoadingPage; 