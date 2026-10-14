import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCw, Play, Pause, RotateCcw, Maximize2, Compass } from 'lucide-react';

interface Product360ViewerProps {
  frames: string[];
  productName?: string;
  initialAngleIndex?: number;
  autoRotateSpeedMs?: number;
  className?: string;
}

export function Product360Viewer({
  frames,
  productName = 'Product',
  initialAngleIndex = 0,
  autoRotateSpeedMs = 120,
  className = ''
}: Product360ViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialAngleIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startIndex, setStartIndex] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const frameCount = frames.length || 16;
  const currentDegree = Math.round((currentIndex / frameCount) * 360);

  // Auto-play loop
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % frames.length);
      }, autoRotateSpeedMs);
    } else {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPlaying, frames.length, autoRotateSpeedMs]);

  // Touch and Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (frames.length <= 1) return;
    setIsPlaying(false);
    setIsDragging(true);
    setStartX(e.clientX);
    setStartIndex(currentIndex);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || frames.length <= 1) return;
    const deltaX = e.clientX - startX;
    // SENSITIVITY: 1 frame per 16 pixels of mouse movement
    const frameDelta = Math.floor(deltaX / 16);
    let newIndex = (startIndex - frameDelta) % frames.length;
    if (newIndex < 0) newIndex += frames.length;
    setCurrentIndex(newIndex);
  }, [isDragging, frames.length, startX, startIndex]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (frames.length <= 1) return;
    setIsPlaying(false);
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setStartIndex(currentIndex);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || frames.length <= 1) return;
    const deltaX = e.touches[0].clientX - startX;
    const frameDelta = Math.floor(deltaX / 16);
    let newIndex = (startIndex - frameDelta) % frames.length;
    if (newIndex < 0) newIndex += frames.length;
    setCurrentIndex(newIndex);
  }, [isDragging, frames.length, startX, startIndex]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  if (!frames || frames.length === 0) {
    return null;
  }

  const currentFrame = frames[currentIndex] || frames[0];

  return (
    <div 
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center ${className}`}
    >
      {/* 360 Spin Visualizer Viewport */}
      <div 
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`w-full h-full flex items-center justify-center cursor-ew-resize relative group ${isDragging ? 'cursor-grabbing' : ''}`}
        title="Drag left or right to rotate 360°"
      >
        <img 
          src={currentFrame} 
          alt={`${productName} 360 view frame ${currentIndex + 1} (${currentDegree}°)`}
          className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-75"
        />

        {/* Drag Instruction Overlay (Fades out when interacting) */}
        {!isDragging && !isPlaying && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1.5 opacity-90 transition-opacity pointer-events-none shadow-sm">
            <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Drag horizontally to rotate 360°</span>
          </div>
        )}
      </div>

      {/* Top Controls: Degree Badge & Indicator */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md shadow-xs border border-slate-200/80 text-xs font-bold text-slate-800 flex items-center gap-1.5 pointer-events-auto">
          <Compass className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span>{currentDegree}°</span>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">360° Studio</span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsPlaying(p => !p)}
            className={`p-2 rounded-lg backdrop-blur-md shadow-xs transition-colors border ${
              isPlaying 
                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' 
                : 'bg-white/90 text-slate-700 border-slate-200/80 hover:bg-white'
            }`}
            title={isPlaying ? "Pause auto-rotation" : "Start auto-rotation"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setCurrentIndex(0);
            }}
            className="p-2 rounded-lg bg-white/90 backdrop-blur-md border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-white shadow-xs transition-colors"
            title="Reset to 0° front view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Angle Progress Bar */}
      <div className="absolute bottom-1 left-4 right-4 h-1 bg-slate-200/60 rounded-full overflow-hidden pointer-events-none">
        <div 
          className="h-full bg-indigo-600 rounded-full transition-all duration-75"
          style={{ width: `${((currentIndex + 1) / frameCount) * 100}%` }}
        />
      </div>
    </div>
  );
}
