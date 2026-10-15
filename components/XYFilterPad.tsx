import React, { useState, useRef, useCallback } from 'react';
import { MIN_FILTER_FREQ, MAX_FILTER_FREQ } from '../constants';
import { VisualizerStyle } from '../types';

interface XYFilterPadProps {
    onFilterChange: (freq: number, drive: number) => void;
    onInteractionStart: () => void;
    onInteractionEnd: () => void;
    visualizerStyle?: VisualizerStyle;
    isHeld?: boolean;
    onToggleHold?: (held: boolean, freq: number, drive: number) => void;
}

// Convert a linear value (0-1) to a logarithmic frequency scale
const valToFreq = (value: number): number => {
    const min = Math.log(MIN_FILTER_FREQ);
    const max = Math.log(MAX_FILTER_FREQ);
    const scale = max - min;
    return Math.exp(min + scale * value);
};

const XYFilterPad: React.FC<XYFilterPadProps> = ({
    onFilterChange,
    onInteractionStart,
    onInteractionEnd,
    visualizerStyle = 'default',
    isHeld = false,
    onToggleHold,
}) => {
    const [isInteracting, setIsInteracting] = useState(false);
    const [dotPosition, setDotPosition] = useState({ x: 50, y: 50 });
    const padRef = useRef<HTMLDivElement>(null);
    const isHeldRef = useRef(isHeld);
    isHeldRef.current = isHeld;
    const dotPosRef = useRef(dotPosition);
    dotPosRef.current = dotPosition;
    const isMinimal = visualizerStyle === 'minimal';

    // When external isHeld is turned off (e.g., via DJ Reset), reset dot if not actively dragging
    React.useEffect(() => {
        if (!isHeld && !isInteracting) {
            setDotPosition({ x: 50, y: 50 });
        }
    }, [isHeld, isInteracting]);

    const handleInteraction = useCallback((clientX: number, clientY: number) => {
        if (!padRef.current) return;
        
        const rect = padRef.current.getBoundingClientRect();
        let x = (clientX - rect.left) / rect.width;
        let y = (clientY - rect.top) / rect.height;
        
        // Clamp values between 0 and 1
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        
        const nextPos = { x: x * 100, y: y * 100 };
        dotPosRef.current = nextPos;
        setDotPosition(nextPos);
        
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
        if (!isHeldRef.current) {
            onInteractionEnd();
            setDotPosition({ x: 50, y: 50 });
        }
    }, [onInteractionEnd]);
    
    // --- Mouse Events ---
    const onMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
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
        if ((e.target as HTMLElement).closest('button')) return;
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

    const isActive = isInteracting || isHeld;

    const handleToggleHoldClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nextHeld = !isHeld;
        const x = dotPosRef.current.x / 100;
        const y = dotPosRef.current.y / 100;
        const freq = valToFreq(x);
        const drive = 1 - y;
        if (onToggleHold) {
            onToggleHold(nextHeld, freq, drive);
        } else if (nextHeld) {
            onInteractionStart();
            onFilterChange(freq, drive);
        } else {
            onInteractionEnd();
            setDotPosition({ x: 50, y: 50 });
        }
    };

    return (
        <div 
            ref={padRef}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            className={
                isMinimal
                    ? `relative w-40 h-40 bg-[#0e0e11] border ${isActive ? 'border-[#ff3b1d]' : 'border-[#27272a]'} cursor-crosshair select-none touch-none overflow-hidden`
                    : `relative w-40 h-40 bg-gray-900/50 rounded-lg cursor-crosshair select-none touch-none shadow-inner overflow-hidden transition-colors duration-200 ${
                        isActive ? 'shadow-lg shadow-red-500/50 bg-red-900/20 ring-1 ring-red-500/40' : ''
                    }`
            }
            style={{
                backgroundImage: isMinimal
                    ? `linear-gradient(#1c1c20 1px, transparent 1px), linear-gradient(90deg, #1c1c20 1px, transparent 1px)`
                    : `linear-gradient(rgba(107, 114, 128, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(107, 114, 128, 0.2) 1px, transparent 1px)`,
                backgroundSize: '25% 25%',
            }}
        >
            <button
                type="button"
                onClick={handleToggleHoldClick}
                title={isHeld ? "Unlock XY Filter hold" : "Hold/lock XY Filter position for hands-free playback & export"}
                className={`absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase rounded transition-colors cursor-pointer ${
                    isHeld
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'bg-gray-800/80 text-gray-400 hover:text-gray-200 border border-gray-600/60'
                }`}
            >
                {isHeld ? 'HELD' : 'HOLD'}
            </button>
            <div 
                className={
                    isMinimal
                        ? 'absolute w-3.5 h-3.5 bg-[#ff3b1d] border border-[#f4f4f5] pointer-events-none'
                        : 'absolute w-5 h-5 bg-red-500 rounded-full border-2 border-white pointer-events-none shadow-lg'
                }
                style={{
                    left: `${dotPosition.x}%`,
                    top: `${dotPosition.y}%`,
                    transform: isMinimal
                        ? 'translate(-50%, -50%)'
                        : `translate(-50%, -50%) scale(${isActive ? 1 : 0})`,
                    opacity: isActive ? 1 : 0,
                    transition: isMinimal
                        ? 'none'
                        : isInteracting 
                            ? 'transform 0.1s ease-out, opacity 0.1s ease-out'
                            : 'all 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                }}
            />
            <div className="absolute inset-0 flex flex-col justify-between items-center text-gray-500 font-mono text-[10px] tracking-widest p-1.5 pointer-events-none">
                <span>DRIVE</span>
                <span></span>
            </div>
             <div className="absolute inset-0 flex justify-between items-center text-gray-500 font-mono text-[10px] tracking-widest p-1.5 pointer-events-none">
                <span></span>
                <span>FREQ</span>
            </div>
        </div>
    );
};

export default React.memo(XYFilterPad);