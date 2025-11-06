import React, { useRef, useCallback, useState, useEffect } from 'react';
import { MIN_TEMPO, MAX_TEMPO } from '../constants';
import { SavedPattern } from '../types';
import Tooltip from './Tooltip';

// --- New Disco Ball Component ---
const DiscoBall: React.FC<{ isPlaying: boolean }> = React.memo(({ isPlaying }) => {
    return (
        <div className={`
            w-12 h-16
            transform transition-all duration-500 ease-out
            ${isPlaying ? 'translate-y-0' : '-translate-y-full'}
        `}>
            <svg viewBox="0 0 50 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="disco-tiles" patternUnits="userSpaceOnUse" width="5" height="5">
                        <rect width="5" height="5" fill="#2d3748" />
                        <rect x="0.5" y="0.5" width="4" height="4" fill="#4a5568" />
                        <rect x="1" y="1" width="1.5" height="1.5" fill="white" fillOpacity="0.7" />
                    </pattern>
                    <radialGradient id="disco-shine" cx="0.3" cy="0.3" r="0.8">
                        <stop stopColor="white" stopOpacity="0.5" />
                        <stop offset="1" stopColor="#A0AEC0" stopOpacity="0.1" />
                    </radialGradient>
                    <radialGradient id="specular-highlight" cx="0.25" cy="0.25" r="0.25" fx="0.25" fy="0.25">
                        <stop stopColor="white" stopOpacity="0.9" />
                        <stop offset="1" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                    <filter id="sparkle-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <style>
                        {`
                            .disco-ball-sway {
                                animation: sway 6s ease-in-out infinite;
                                transform-origin: center;
                            }
                            @keyframes sway {
                                0% { transform: rotate(-10deg); }
                                50% { transform: rotate(10deg); }
                                100% { transform: rotate(-10deg); }
                            }
                            .sparkle-1 { animation: sparkle 1.5s ease-in-out infinite; }
                            .sparkle-2 { animation: sparkle 1.5s ease-in-out infinite 0.3s; }
                            .sparkle-3 { animation: sparkle 1.5s ease-in-out infinite 0.6s; }
                            .sparkle-4 { animation: sparkle 1.8s ease-in-out infinite 0.2s; }
                            .sparkle-5 { animation: sparkle 1.8s ease-in-out infinite 0.9s; }
                            @keyframes sparkle {
                                0%, 100% { opacity: 0; transform: scale(0.5); }
                                50% { opacity: 1; transform: scale(1); }
                            }
                        `}
                    </style>
                </defs>
                {/* String */}
                <line x1="25" y1="0" x2="25" y2="15" stroke="#4A5568" strokeWidth="1" />
                
                {/* Sparkles */}
                <g filter="url(#sparkle-glow)">
                    <path d="M5 25 L10 20 L15 25 L10 30 Z" fill="#FBBF24" className="sparkle-1"/>
                    <path d="M40 35 L45 32 L48 37 L43 40 Z" fill="#A78BFA" className="sparkle-2"/>
                    <path d="M15 50 L20 48 L22 53 L17 55 Z" fill="#60A5FA" className="sparkle-3"/>
                    <path d="M30 22 L34 20 L36 25 L32 27 Z" fill="#F472B6" className="sparkle-4" />
                    <path d="M8 52 L12 55 L9 59 L5 56 Z" fill="#34D399" className="sparkle-5" />
                </g>

                {/* Ball */}
                <g className={isPlaying ? 'disco-ball-sway' : ''}>
                    <circle cx="25" cy="40" r="20" fill="url(#disco-tiles)" />
                    <circle cx="25" cy="40" r="20" fill="url(#disco-shine)" />
                    <circle cx="25" cy="40" r="20" fill="url(#specular-highlight)" opacity="1" />
                </g>
            </svg>
        </div>
    );
});


// --- Dancing Cat Component ---
interface DancingCatProps {
    isPlaying: boolean;
    tempo: number;
}

const BrownTabbyCatFrame1: React.FC = () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="eye-iris-tabby" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="#84cc16" />
                <stop offset="60%" stopColor="#4d7c0f" />
                <stop offset="100%" stopColor="#1a2e05" />
            </radialGradient>
            <radialGradient id="fur-base" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#d2b48c" />
                <stop offset="100%" stopColor="#8c6d46" />
            </radialGradient>
             <style>
              {`.tail-1 { animation: tail-sway-1 2s ease-in-out infinite; } @keyframes tail-sway-1 { 0% { d: path("M68,88 Q 78 70 83 80 T 88 85"); } 50% { d: path("M68,88 Q 82 72 85 78 T 90 82"); } 100% { d: path("M68,88 Q 78 70 83 80 T 88 85"); } }`}
            </style>
        </defs>
        
        {/* Body */}
        <path d="M30 88 L30 60 C 35 55, 61 55, 66 60 L 66 88 Z" fill="url(#fur-base)" />
        <ellipse cx="48" cy="70" rx="10" ry="8" fill="#f5e5d3" />
        {/* Body Stripes */}
        <g stroke="#5d4037" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M38,60 C 36,70 38,85" />
            <path d="M43,58 C 42,70 43,86" />
            <path d="M53,58 C 54,70 53,86" />
            <path d="M58,60 C 60,70 58,85" />
        </g>
        <path d="M35 88 V 65 M61 88 V 65" stroke="#5d4037" strokeWidth="3" strokeLinecap="round"/>
        <path className="tail-1" stroke="#8c6d46" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Arms */}
        <path d="M30,62 C 25,70, 25,80, 25,80" stroke="url(#fur-base)" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M66,62 C 71,70, 71,80, 71,80" stroke="url(#fur-base)" strokeWidth="6" fill="none" strokeLinecap="round"/>

        {/* Head */}
        <g transform="translate(48, 40)">
            <path d="M-22,0 a22,22 0 1,1 44,0 a22,22 0 1,1 -44,0" fill="url(#fur-base)" stroke="#5d4037" strokeWidth="2" />
            
            {/* Tabby Markings */}
            <g transform="translate(0, -16)" stroke="#5d4037" strokeWidth="2" fill="none" strokeLinecap="round">
                <path d="M-11,0 L-9,4" />
                <path d="M-7,0 L-5,4" />
                <path d="M7,0 L5,4" />
                <path d="M11,0 L9,4" />
                <path d="M-4,0 Q 0,-3 4,0" />
            </g>
            <path d="M-20,0 C -25,-5, -25,5, -20,0 M20,0 C 25,-5, 25,5, 20,0" stroke="#5d4037" fill="none" strokeWidth="2" strokeLinecap="round"/>

            <path d="M-15,8 C 0,22 0,22 15,8 Q 12,0 0,0 Q -12,0 -15,8 Z" fill="#f5e5d3"/>
            
            {/* Ears */}
            <g transform="rotate(-30, -14, -22)">
                <path d="M-24,-18 L-14,-28 L-4,-18 Z" fill="#d2b48c" stroke="#5d4037" strokeWidth="2" strokeLinejoin="round" />
                <path d="M-20,-19 L -14,-25 L-8,-19" fill="#5d4037" opacity="0.5"/>
            </g>
            <g transform="rotate(30, 14, -22)">
                <path d="M24,-18 L14,-28 L4,-18 Z" fill="#d2b48c" stroke="#5d4037" strokeWidth="2" strokeLinejoin="round" />
                <path d="M20,-19 L 14,-25 L8,-19" fill="#5d4037" opacity="0.5"/>
            </g>

            <circle cx="-10" cy="-2" r="5" fill="url(#eye-iris-tabby)"/> <circle cx="-10" cy="-2" r="2.5" fill="black" /> <circle cx="-11" cy="-3.5" r="1" fill="white" />
            <circle cx="10" cy="-2" r="5" fill="url(#eye-iris-tabby)"/> <circle cx="10" cy="-2" r="2.5" fill="black" /> <circle cx="9" cy="-3.5" r="1" fill="white" />
            
            <path d="M-3,5 L0,8 L3,5 C 2,4 -2,4 -3,5 Z" fill="#c48a8a" />
            <path d="M0,8 L0,12 M-5,14 Q 0,16 5,14" stroke="#44403c" strokeWidth="1" fill="none" strokeLinecap="round" />
            {/* Whiskers */}
            <g stroke="#44403c" strokeWidth="0.75" fill="none" strokeLinecap="round">
                <path d="M-16,8 q-8,1 -12,-2" />
                <path d="M-16,11 q-10,0 -14,0" />
                <path d="M-16,14 q-8,-1 -12,2" />
                <path d="M16,8 q8,1 12,-2" />
                <path d="M16,11 q10,0 14,0" />
                <path d="M16,14 q8,-1 12,2" />
            </g>
        </g>
    </svg>
);

const BrownTabbyCatFrame2: React.FC = () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="eye-iris-tabby-f2" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="#84cc16" />
                <stop offset="60%" stopColor="#4d7c0f" />
                <stop offset="100%" stopColor="#1a2e05" />
            </radialGradient>
            <radialGradient id="fur-base-f2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#d2b48c" />
                <stop offset="100%" stopColor="#8c6d46" />
            </radialGradient>
             <style>
              {`.tail-2 { animation: tail-sway-2 2s ease-in-out infinite; } @keyframes tail-sway-2 { 0% { d: path("M68,88 Q 82 72 85 78 T 90 82"); } 50% { d: path("M68,88 Q 78 70 83 80 T 88 85"); } 100% { d: path("M68,88 Q 82 72 85 78 T 90 82"); } }`}
            </style>
        </defs>
        
        {/* Body */}
        <path d="M30 88 L30 60 C 35 55, 61 55, 66 60 L 66 88 Z" fill="url(#fur-base-f2)" />
        <ellipse cx="48" cy="70" rx="10" ry="8" fill="#f5e5d3" />
        {/* Body Stripes */}
        <g stroke="#5d4037" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M38,60 C 36,70 38,85" />
            <path d="M43,58 C 42,70 43,86" />
            <path d="M53,58 C 54,70 53,86" />
            <path d="M58,60 C 60,70 58,85" />
        </g>
        <path d="M35 88 V 65 M61 88 V 65" stroke="#5d4037" strokeWidth="3" strokeLinecap="round"/>
        <path className="tail-2" stroke="#8c6d46" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Arms up! */}
        <path d="M30,62 C 20,50, 20,40, 25,35" stroke="url(#fur-base-f2)" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M66,62 C 76,50, 76,40, 71,35" stroke="url(#fur-base-f2)" strokeWidth="6" fill="none" strokeLinecap="round"/>

        {/* Head */}
        <g transform="translate(48, 44)">
             <path d="M-22,0 a22,22 0 1,1 44,0 a22,22 0 1,1 -44,0" fill="url(#fur-base-f2)" stroke="#5d4037" strokeWidth="2" />
            
            {/* Tabby Markings */}
            <g transform="translate(0, -16)" stroke="#5d4037" strokeWidth="2" fill="none" strokeLinecap="round">
                <path d="M-11,0 L-9,4" />
                <path d="M-7,0 L-5,4" />
                <path d="M7,0 L5,4" />
                <path d="M11,0 L9,4" />
                <path d="M-4,0 Q 0,-3 4,0" />
            </g>
            <path d="M-20,0 C -25,-5, -25,5, -20,0 M20,0 C 25,-5, 25,5, 20,0" stroke="#5d4037" fill="none" strokeWidth="2" strokeLinecap="round"/>

            <path d="M-15,8 C 0,22 0,22 15,8 Q 12,0 0,0 Q -12,0 -15,8 Z" fill="#f5e5d3"/>
            
            {/* Ears */}
            <g transform="rotate(-30, -14, -22)">
                <path d="M-24,-18 L-14,-28 L-4,-18 Z" fill="#d2b48c" stroke="#5d4037" strokeWidth="2" strokeLinejoin="round" />
                <path d="M-20,-19 L -14,-25 L-8,-19" fill="#5d4037" opacity="0.5"/>
            </g>
            <g transform="rotate(30, 14, -22)">
                <path d="M24,-18 L14,-28 L4,-18 Z" fill="#d2b48c" stroke="#5d4037" strokeWidth="2" strokeLinejoin="round" />
                <path d="M20,-19 L 14,-25 L8,-19" fill="#5d4037" opacity="0.5"/>
            </g>
            
            {/* Eyes closed */}
            <path d="M-14,-2 C -10,0 -6,-2 -14,-2 M14,-2 C 10,0 6,-2 14,-2" stroke="black" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            
            <path d="M-3,5 L0,8 L3,5 C 2,4 -2,4 -3,5 Z" fill="#c48a8a" />
            <path d="M0,8 L0,12 M-5,14 Q 0,17 5,14" stroke="#44403c" strokeWidth="1" fill="none" strokeLinecap="round" />
             {/* Whiskers */}
            <g stroke="#44403c" strokeWidth="0.75" fill="none" strokeLinecap="round">
                <path d="M-16,8 q-8,1 -12,-2" />
                <path d="M-16,11 q-10,0 -14,0" />
                <path d="M-16,14 q-8,-1 -12,2" />
                <path d="M16,8 q8,1 12,-2" />
                <path d="M16,11 q10,0 14,0" />
                <path d="M16,14 q8,-1 12,2" />
            </g>
        </g>
    </svg>
);


const catFrames = [
    <BrownTabbyCatFrame1 key="1" />,
    <BrownTabbyCatFrame2 key="2" />,
];

const DancingCat: React.FC<DancingCatProps> = React.memo(({ isPlaying, tempo }) => {
    const [currentFrame, setCurrentFrame] = useState(0);

    useEffect(() => {
        if (!isPlaying) {
            const timer = setTimeout(() => setCurrentFrame(0), 500);
            return () => clearTimeout(timer);
        }

        const intervalMs = (60 / tempo / 2) * 1000;

        const intervalId = setInterval(() => {
            setCurrentFrame(prevFrame => (prevFrame + 1) % catFrames.length);
        }, intervalMs);

        return () => {
            clearInterval(intervalId);
        };
    }, [isPlaying, tempo]);

    const containerClasses = `
        relative w-32 h-24
        transform transition-all duration-500 ease-in-out
        ${isPlaying ? 'opacity-100' : 'opacity-0 -translate-y-4'}
    `;

    return (
        <div className={containerClasses} aria-hidden="true">
            <div className="absolute left-0 bottom-0">
                {catFrames[currentFrame]}
            </div>
            <div className="absolute right-0 top-0">
                 <DiscoBall isPlaying={isPlaying} />
            </div>
        </div>
    );
});


// --- Main Controls Component ---

interface ControlsProps {
    isPlaying: boolean;
    onPlayToggle: () => void;
    tempo: number;
    onTempoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    swing: number;
    onSwingChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    masterVolume: number;
    onMasterVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    activePattern: 'a' | 'b';
    onPatternToggle: (pattern: 'a' | 'b') => void;
    hueRotate: number;
    onHueRotateChange: (value: number) => void;
    isColorAnimating: boolean;
    onToggleColorAnimation: () => void;
    onDownload: () => void;
    isRendering: boolean;
    savedPatterns: (SavedPattern | null)[];
    currentPatternIndex: number;
    onSelectPattern: (slotIndex: number) => void;
    onCatClick: () => void;
    onClearPattern: () => void;
    isCurrentPatternEmpty: boolean;
}

const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
);

const PauseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const VolumeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
    </svg>
);

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

// --- Pattern Slot Button Component ---
interface PatternSlotButtonProps {
    slotIndex: number;
    hasContent: boolean;
    isActive: boolean;
    onClick: (index: number) => void;
}

const hasContentInPattern = (pattern: SavedPattern | null): boolean => {
    if (!pattern) return false;
    const hasNotesA = pattern.grids.a.some(row => row.some(step => step));
    const hasNotesB = pattern.grids.b.some(row => row.some(step => step));
    return hasNotesA || hasNotesB;
};

const PatternSlotButton: React.FC<PatternSlotButtonProps> = ({ slotIndex, hasContent, isActive, onClick }) => {
    const buttonClasses = `
        relative w-10 h-10 rounded-md font-bold text-lg transition-all duration-150 active:scale-[0.98]
        flex items-center justify-center
        ${isActive ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-yellow-400' : ''}
        ${hasContent ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}
    `;

    return (
        <button
            onClick={() => onClick(slotIndex)}
            className={buttonClasses}
            aria-label={`Pattern ${slotIndex + 1}. ${isActive ? 'Currently active.' : ''}`}
            aria-pressed={isActive}
        >
            <span className="relative z-10">{slotIndex + 1}</span>
        </button>
    );
};


const Controls: React.FC<ControlsProps> = ({ 
    isPlaying, 
    onPlayToggle, 
    tempo, 
    onTempoChange,
    swing,
    onSwingChange,
    masterVolume, 
    onMasterVolumeChange,
    activePattern,
    onPatternToggle,
    hueRotate,
    onHueRotateChange,
    isColorAnimating,
    onToggleColorAnimation,
    onDownload,
    isRendering,
    savedPatterns,
    currentPatternIndex,
    onSelectPattern,
    onCatClick,
    onClearPattern,
    isCurrentPatternEmpty,
}) => {
    const isDraggingKnob = useRef(false);
    const knobDragStart = useRef({ y: 0, hue: 0, time: 0 });

    const [clearProgress, setClearProgress] = useState(0);
    const [isPoofing, setIsPoofing] = useState(false);
    const clearTimerRef = useRef<number | null>(null);
    const clearRequestRef = useRef<number | null>(null);

    const [isInteractingWithSlider, setIsInteractingWithSlider] = useState(false);

    const handleSliderInteractionStart = useCallback(() => {
        setIsInteractingWithSlider(true);
        const handleInteractionEnd = () => {
            setIsInteractingWithSlider(false);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchend', handleInteractionEnd);
        };
        window.addEventListener('mouseup', handleInteractionEnd);
        window.addEventListener('touchend', handleInteractionEnd);
    }, []);

    const sliderInteractionProps = {
        onMouseDown: handleSliderInteractionStart,
        onTouchStart: handleSliderInteractionStart,
    };

    const HOLD_DURATION = 1000; // 1 second hold

    useEffect(() => {
        if (isPoofing) {
            const timer = setTimeout(() => {
                onClearPattern();
                setIsPoofing(false);
            }, 300); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [isPoofing, onClearPattern]);


    const handleClearStart = useCallback(() => {
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        if (clearRequestRef.current) cancelAnimationFrame(clearRequestRef.current);

        const startTime = Date.now();

        clearTimerRef.current = window.setTimeout(() => {
            setIsPoofing(true);
            setClearProgress(0);
        }, HOLD_DURATION);

        const updateProgress = () => {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / HOLD_DURATION, 1);
            setClearProgress(progress);
            if (progress < 1) {
                clearRequestRef.current = requestAnimationFrame(updateProgress);
            }
        };
        clearRequestRef.current = requestAnimationFrame(updateProgress);

    }, []);

    const handleClearEnd = useCallback(() => {
        if (clearTimerRef.current) {
            clearTimeout(clearTimerRef.current);
            clearTimerRef.current = null;
        }
        if (clearRequestRef.current) {
            cancelAnimationFrame(clearRequestRef.current);
            clearRequestRef.current = null;
        }
        setClearProgress(0);
    }, []);

    const handleKnobInteractionStart = useCallback((startY: number) => {
        isDraggingKnob.current = true;
        knobDragStart.current = { y: startY, hue: hueRotate, time: Date.now() };
    }, [hueRotate]);
    
    const handleKnobInteractionMove = useCallback((currentY: number) => {
        if (!isDraggingKnob.current) return;
        
        const deltaY = knobDragStart.current.y - currentY;
        const newHue = (knobDragStart.current.hue + deltaY * 2) % 360;
        const clampedHue = newHue < 0 ? 360 + newHue : newHue;
        onHueRotateChange(clampedHue);
    }, [onHueRotateChange]);

    const handleKnobInteractionEnd = useCallback((endY: number) => {
        const timeElapsed = Date.now() - knobDragStart.current.time;
        const distanceMoved = Math.abs(knobDragStart.current.y - endY);

        if (isDraggingKnob.current && timeElapsed < 250 && distanceMoved < 10) {
            onToggleColorAnimation();
        }

        isDraggingKnob.current = false;
    }, [onToggleColorAnimation]);
    
    // Mouse Events
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        handleKnobInteractionStart(e.clientY);

        const onMouseMove = (moveEvent: MouseEvent) => {
            handleKnobInteractionMove(moveEvent.clientY);
        };
        const onMouseUp = (upEvent: MouseEvent) => {
            handleKnobInteractionEnd(upEvent.clientY);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [handleKnobInteractionStart, handleKnobInteractionMove, handleKnobInteractionEnd]);


    // Touch Events
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        handleKnobInteractionStart(e.touches[0].clientY);
    }, [handleKnobInteractionStart]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        handleKnobInteractionMove(e.touches[0].clientY);
    }, [handleKnobInteractionMove]);
    
    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        handleKnobInteractionEnd(e.changedTouches[0].clientY);
    }, [handleKnobInteractionEnd]);


    return (
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 p-2">
            <Tooltip text="Download current beat as a .wav file">
                <button
                    onClick={onDownload}
                    disabled={isRendering}
                    className="flex items-center justify-center w-24 h-12 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 active:scale-[0.98] disabled:bg-gray-500 disabled:cursor-not-allowed disabled:text-gray-400"
                    aria-label={isRendering ? 'Rendering your beat' : 'Download your beat'}
                >
                    {isRendering 
                        ? <span className="text-xs tracking-wider animate-pulse">RENDERING</span>
                        : <>
                            <DownloadIcon className="w-5 h-5" />
                            <span className="ml-1.5 text-sm tracking-wider">SAVE</span>
                          </>
                    }
                </button>
            </Tooltip>
            <Tooltip text={isPlaying ? "Pause sequence (Spacebar)" : "Play sequence (Spacebar)"}>
                <button
                    onClick={onPlayToggle}
                    className="flex items-center justify-center w-28 h-12 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 active:scale-[0.98]"
                    aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
                >
                    {isPlaying 
                        ? <PauseIcon className="w-6 h-6" /> 
                        : <PlayIcon className="w-6 h-6" />}
                    <span className="ml-2 text-sm tracking-wider">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>
            </Tooltip>
            <div className="flex flex-col items-center gap-1">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">BEAT SWITCH</span>
                <div className="flex items-center gap-2" role="group" aria-label="Pattern selector">
                    <Tooltip text="Switch to Pattern A">
                        <button
                            onClick={() => onPatternToggle('a')}
                            className={`w-14 h-12 rounded-md font-bold text-lg transition-all duration-150 active:scale-[0.98] ${activePattern === 'a' ? 'bg-yellow-500 text-gray-900 ring-2 ring-offset-2 ring-offset-gray-800 ring-yellow-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            aria-pressed={activePattern === 'a'}
                        >
                            A
                        </button>
                    </Tooltip>
                    <Tooltip text="Switch to Pattern B">
                        <button
                            onClick={() => onPatternToggle('b')}
                            className={`w-14 h-12 rounded-md font-bold text-lg transition-all duration-150 active:scale-[0.98] ${activePattern === 'b' ? 'bg-yellow-500 text-gray-900 ring-2 ring-offset-2 ring-offset-gray-800 ring-yellow-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            aria-pressed={activePattern === 'b'}
                        >
                            B
                        </button>
                    </Tooltip>
                </div>
            </div>

            <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">PATTERN SELECT</span>
                <div className="flex items-center gap-2" role="group" aria-label="Pattern selection slots">
                    {savedPatterns.map((pattern, index) => (
                        <Tooltip key={index} text={`Load Pattern ${index + 1}`}>
                            <PatternSlotButton 
                                slotIndex={index}
                                hasContent={hasContentInPattern(pattern)}
                                isActive={currentPatternIndex === index}
                                onClick={onSelectPattern}
                            />
                        </Tooltip>
                    ))}
                </div>
                {(!isCurrentPatternEmpty || isPoofing) && (
                     <Tooltip text="Hold to erase all notes in current pattern">
                         <button
                            onMouseDown={handleClearStart}
                            onMouseUp={handleClearEnd}
                            onMouseLeave={handleClearEnd}
                            onTouchStart={(e) => { e.preventDefault(); handleClearStart(); }}
                            onTouchEnd={handleClearEnd}
                            className={`relative flex items-center justify-center mt-2 px-3 h-8 bg-red-800/80 text-white font-bold rounded-md hover:bg-red-700/80 transition-transform duration-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 text-xs uppercase tracking-wider overflow-hidden select-none ${isPoofing ? 'animate-poof' : ''}`}
                            style={{ transform: `scale(${1 - clearProgress * 0.15})` }}
                            aria-label="Hold to clear current pattern"
                        >
                            <span className="relative z-10">
                                HOLD TO CLEAR CURRENT PATTERN
                            </span>
                        </button>
                    </Tooltip>
                )}
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex flex-col gap-3">
                    <Tooltip text="Adjust the overall output volume of the drum machine" isInteracting={isInteractingWithSlider}>
                        <div className="flex items-center gap-2">
                            <label htmlFor="master-volume" className="w-16 text-gray-400 flex items-center" aria-label="Master Volume">
                                <VolumeIcon className="w-6 h-6 text-gray-100" />
                            </label>
                            <input
                                type="range"
                                id="master-volume"
                                min={0}
                                max={1}
                                step="0.01"
                                value={masterVolume}
                                onChange={onMasterVolumeChange}
                                {...sliderInteractionProps}
                                className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <span className="text-sm font-bold text-gray-100 w-12 text-center">{Math.round(masterVolume * 100)}%</span>
                        </div>
                    </Tooltip>
                    <Tooltip text="Set the playback speed in Beats Per Minute" isInteracting={isInteractingWithSlider}>
                        <div className="flex items-center gap-2">
                            <label htmlFor="tempo" className="w-16 text-sm text-gray-400 font-bold uppercase tracking-wider">
                                BPM
                            </label>
                            <input
                                type="range"
                                id="tempo"
                                min={MIN_TEMPO}
                                max={MAX_TEMPO}
                                value={tempo}
                                onChange={onTempoChange}
                                {...sliderInteractionProps}
                                className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <span className="text-sm font-bold text-gray-100 w-12 text-center">{tempo}</span>
                        </div>
                    </Tooltip>
                    <Tooltip text="Add a shuffle feel by delaying every second 16th note" isInteracting={isInteractingWithSlider}>
                        <div className="flex items-center gap-2">
                            <label htmlFor="swing" className="w-16 text-sm text-gray-400 font-bold uppercase tracking-wider">
                                Swing
                            </label>
                             <input
                                type="range"
                                id="swing"
                                min={0}
                                max={1}
                                step="0.01"
                                value={swing}
                                onChange={onSwingChange}
                                {...sliderInteractionProps}
                                className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <span className="text-sm font-bold text-gray-100 w-12 text-center">{Math.round(swing*100)}%</span>
                        </div>
                    </Tooltip>
                </div>

                <Tooltip text="Drag to change color scheme. Click to toggle animation.">
                    <div className="flex flex-col items-center gap-2">
                        <label htmlFor="color-knob" className="font-bold text-gray-100 text-sm">
                            6 7
                        </label>
                        <div
                            id="color-knob"
                            role="slider"
                            aria-valuemin={0}
                            aria-valuemax={360}
                            aria-valuenow={Math.round(hueRotate)}
                            aria-label="Color Hue"
                            tabIndex={0}
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            className={`relative w-16 h-16 bg-gray-700 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center select-none shadow-inner transition-transform active:scale-[0.98]
                                        ${isColorAnimating ? 'animate-pulse ring-2 ring-pink-500 ring-offset-2 ring-offset-gray-800' : 'ring-1 ring-gray-600'}`}
                        >
                            {/* Indicator Line */}
                            <div
                                className="absolute w-full h-full"
                                style={{ transform: `rotate(${hueRotate}deg)` }}
                            >
                                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-pink-400 rounded-full" />
                            </div>
                             <span className="text-2xl z-10 pointer-events-none">😎</span>
                        </div>
                    </div>
                </Tooltip>
            </div>

            <Tooltip text={isPlaying ? "Click for a surprise!" : "Press play to wake me up!"}>
                <div
                    onClick={() => isPlaying && onCatClick()}
                    className={isPlaying ? 'cursor-pointer' : ''}
                >
                    <DancingCat isPlaying={isPlaying} tempo={tempo} />
                </div>
            </Tooltip>
        </div>
    );
};

export default React.memo(Controls);
