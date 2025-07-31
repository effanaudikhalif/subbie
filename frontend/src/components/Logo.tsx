import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  height?: number;
  width?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", height = 42, width = 175 }) => {
  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <Image
        src="/icons/subby-newlogo.png"
        alt="Subby Logo"
        width={width}
        height={height}
        className="object-contain h-10"
        priority
      />
    </Link>
  );
};

export default Logo; 