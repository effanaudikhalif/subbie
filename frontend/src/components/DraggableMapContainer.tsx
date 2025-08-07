"use client";
import React, { useState, useEffect, useRef } from 'react';
import LocationMapPreview from './LocationMapPreview';

interface DraggableMapContainerProps {
  searchLocation?: string;
  listings?: any[];
  dateRange?: Array<{
    startDate: Date | null;
    endDate: Date | null;
    key: string;
  }>;
  onBoundsChange?: (bounds: { sw: { lat: number, lng: number }, ne: { lat: number, lng: number } }) => void;
  isMobileSmall: boolean;
  isMobileMedium?: boolean;
  isMobileLarge?: boolean;
  className?: string;
  onMapHeightChange?: (height: number) => void;
}

const DraggableMapContainer: React.FC<DraggableMapContainerProps> = ({
  searchLocation,
  listings,
  dateRange,
  onBoundsChange,
  isMobileSmall,
  isMobileMedium = false,
  isMobileLarge = false,
  className = "",
  onMapHeightChange
}) => {
  const [mapHeight, setMapHeight] = useState(300); // Default height in pixels
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobileSmall && !isMobileMedium && !isMobileLarge) return;
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartHeight(mapHeight);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || (!isMobileSmall && !isMobileMedium && !isMobileLarge)) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    const newHeight = Math.max(200, Math.min(600, startHeight + deltaY));
    setMapHeight(newHeight);
    onMapHeightChange?.(newHeight);
  };

  const handleTouchEnd = () => {
    if (!isMobileSmall && !isMobileMedium && !isMobileLarge) return;
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMobileSmall && !isMobileMedium && !isMobileLarge) return;
    setIsDragging(true);
    setStartY(e.clientY);
    setStartHeight(mapHeight);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || (!isMobileSmall && !isMobileMedium && !isMobileLarge)) return;
    
    const currentY = e.clientY;
    const deltaY = currentY - startY;
    const newHeight = Math.max(200, Math.min(600, startHeight + deltaY));
    setMapHeight(newHeight);
    onMapHeightChange?.(newHeight);
  };

  const handleMouseUp = () => {
    if (!isMobileSmall && !isMobileMedium && !isMobileLarge) return;
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging && (isMobileSmall || isMobileMedium || isMobileLarge)) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, startY, startHeight, isMobileSmall, isMobileMedium, isMobileLarge]);

  // Only enable draggable functionality on mobile small, medium, and large
  if (!isMobileSmall && !isMobileMedium && !isMobileLarge) {
    return (
      <LocationMapPreview
        searchLocation={searchLocation}
        listings={listings}
        dateRange={dateRange}
        onBoundsChange={onBoundsChange}
        className={className}
      />
    );
  }



  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ height: `${mapHeight}px` }}
    >
      <LocationMapPreview
        searchLocation={searchLocation}
        listings={listings}
        dateRange={dateRange}
        onBoundsChange={onBoundsChange}
        className={`w-full h-full ${className?.includes('rounded-none') ? 'rounded-none' : ''}`}
      />
      
      {/* Draggable handle */}
      <div
        className="absolute bottom-0 left-0 right-0 h-8 bg-white border-t border-gray-200 flex items-center justify-center cursor-ns-resize touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );
};

export default DraggableMapContainer; 