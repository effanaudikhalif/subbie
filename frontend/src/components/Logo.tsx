import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  height?: number;
  width?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", height = 20, width = 70 }) => {
  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <Image
        src="/icons/subbie.png"
        alt="Subbie Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
    </Link>
  );
};

export default Logo; 