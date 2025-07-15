import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  height?: number;
  width?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", height = 48, width = 200 }) => {
  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <Image
        src="/subly_logo.png"
        alt="Subly Logo"
        width={width}
        height={height}
        className="object-contain h-30"
        priority
      />
    </Link>
  );
};

export default Logo; 