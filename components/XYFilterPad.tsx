import React, { useState, useRef, useCallback } from 'react';
import { MIN_FILTER_FREQ, MAX_FILTER_FREQ } from '../constants';

interface XYFilterPadProps {
    onFilterChange: (freq: number, drive: number) => void;
    onInteractionStart: () => void;
    onInteractionEnd: () => void;
}

// Convert a linear value (0-1) to a logarithmic frequency scale
const valToFreq = (value: number): number => {
    const min = Math.log(MIN_FILTER_FREQ);
    const max = Math.log(MAX_FILTER_FREQ);
    const scale = max - min;
    return Math.exp(min + scale * value);
};

const XYFilterPad: React.FC<XYFilterPadProps> = ({ onFilterChange, onInteractionStart, onInteractionEnd }) => {
    const [isInteracting, setIsInteracting] = useState(false);
    const [dotPosition, setDotPosition] = useState({ x: 50, y: 50 });
    const padRef = useRef<HTMLDivElement>(null);

    const handleInteraction = useCallback((clientX: number, clientY: number) => {
        if (!padRef.current) return;
        
        const rect = padRef.current.getBoundingClientRect();
        let x = (clientX - rect.left) / rect.width;
        let y = (clientY - rect.top) / rect.height;
        
        // Clamp values between 0 and 1
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        
        setDotPosition({ x: x * 100, y: y * 100 });
        
        const freq = valToFreq(x);
        // Invert Y-axis so that top is high drive
        const drive = 1 - y;
        
        onFilterChange(freq, drive);
    }, [onFilterChange]);

    const handleStart = useCallback((clientX: number, clientY: number) => {
        setIsInteracting(true);
        onInteractionStart();
        handleInteraction(clientX, clientY);
    }, [onInteractionStart, handleInteraction]);

    const handleEnd = useCallback(() => {
        setIsInteracting(false);
        onInteractionEnd();
        setDotPosition({ x: 50, y: 50 }); // Animate dot back to center
    }, [onInteractionEnd]);
    
    // --- Mouse Events ---
    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
        
        const onMouseMove = (moveEvent: MouseEvent) => handleInteraction(moveEvent.clientX, moveEvent.clientY);
        const onMouseUp = () => {
            handleEnd();
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // --- Touch Events ---
    const onTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
        
        const onTouchMove = (moveEvent: TouchEvent) => {
            const moveTouch = moveEvent.touches[0];
            handleInteraction(moveTouch.clientX, moveTouch.clientY);
        };
        const onTouchEnd = () => {
            handleEnd();
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };

        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onTouchEnd);
    };

    return (
        <div 
            ref={padRef}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            className={`relative w-40 h-40 bg-gray-900/50 rounded-lg cursor-crosshair select-none touch-none shadow-inner overflow-hidden transition-all duration-200 ${
                isInteracting ? 'shadow-lg shadow-red-500/50 bg-red-900/20' : ''
            }`}
            style={{
                backgroundImage: `
                    linear-gradient(rgba(107, 114, 128, 0.2) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(107, 114, 128, 0.2) 1px, transparent 1px)
                `,
                backgroundSize: '25% 25%',
            }}
        >
            <div 
                className="absolute w-5 h-5 bg-red-500 rounded-full border-2 border-white pointer-events-none shadow-lg"
                style={{
                    left: `${dotPosition.x}%`,
                    top: `${dotPosition.y}%`,
                    transform: `translate(-50%, -50%) scale(${isInteracting ? 1 : 0})`,
                    opacity: isInteracting ? 1 : 0,
                    // Use different transitions for tracking vs. resetting for a snappier feel
                    transition: isInteracting 
                        ? 'transform 0.1s ease-out, opacity 0.1s ease-out'
                        : 'all 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                }}
            />
            <div className="absolute inset-0 flex flex-col justify-between items-center text-gray-500 text-xs p-1 pointer-events-none">
                <span>DRIVE</span>
                <span></span>
            </div>
             <div className="absolute inset-0 flex justify-between items-center text-gray-500 text-xs p-1 pointer-events-none">
                <span></span>
                <span>FREQ</span>
            </div>
        </div>
    );
};

export default XYFilterPad;