import React, { useRef, useCallback, useState, useEffect } from 'react';
import { MIN_TEMPO, MAX_TEMPO } from '../constants';
import { SavedPattern, VisualizerStyle, LiveRecording } from '../types';
import Tooltip from './Tooltip';
import { getButtonStyle, getThemeSurface } from '../utils';

// --- New Disco Ball Component ---
const DiscoBall: React.FC<{ isPlaying: boolean }> = React.memo(({ isPlaying }) => {
    return (
        <div className={`
            w-12 h-16
            transform-gpu transition-transform duration-500 ease-out
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
                    <style>
                        {`
                            .disco-ball-sway {
                                animation: sway 6s ease-in-out infinite;
                                transform-origin: 25px 40px;
                            }
                            @keyframes sway {
                                0%, 100% { transform: rotate(-10deg); }
                                50% { transform: rotate(10deg); }
                            }
                            .sparkle-1 { animation: sparkle 1.5s ease-in-out infinite; transform-origin: 10px 25px; }
                            .sparkle-2 { animation: sparkle 1.5s ease-in-out infinite 0.3s; transform-origin: 44px 36px; }
                            .sparkle-3 { animation: sparkle 1.5s ease-in-out infinite 0.6s; transform-origin: 18px 51px; }
                            .sparkle-4 { animation: sparkle 1.8s ease-in-out infinite 0.2s; transform-origin: 33px 23px; }
                            .sparkle-5 { animation: sparkle 1.8s ease-in-out infinite 0.9s; transform-origin: 8px 55px; }
                            @keyframes sparkle {
                                0%, 100% { opacity: 0; transform: scale(0.5); }
                                50% { opacity: 1; transform: scale(1); }
                            }
                        `}
                    </style>
                </defs>
                {/* String */}
                <line x1="25" y1="0" x2="25" y2="15" stroke="#4A5568" strokeWidth="1" />
                
                {/* Sparkles (only animate when playing, GPU-composited) */}
                {isPlaying && (
                    <g>
                        <path d="M5 25 L10 20 L15 25 L10 30 Z" fill="#FBBF24" className="sparkle-1"/>
                        <path d="M40 35 L45 32 L48 37 L43 40 Z" fill="#A78BFA" className="sparkle-2"/>
                        <path d="M15 50 L20 48 L22 53 L17 55 Z" fill="#60A5FA" className="sparkle-3"/>
                        <path d="M30 22 L34 20 L36 25 L32 27 Z" fill="#F472B6" className="sparkle-4" />
                        <path d="M8 52 L12 55 L9 59 L5 56 Z" fill="#34D399" className="sparkle-5" />
                    </g>
                )}

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
        <path d="M68,88 Q 78 70 83 80 T 88 85" stroke="#8c6d46" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        
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
        <path d="M68,88 Q 82 72 85 78 T 90 82" stroke="#8c6d46" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        
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
    const tempoRef = useRef(tempo);
    tempoRef.current = tempo;

    useEffect(() => {
        if (!isPlaying) {
            const timer = setTimeout(() => setCurrentFrame(0), 500);
            return () => clearTimeout(timer);
        }

        let timeoutId: number;
        const tick = () => {
            setCurrentFrame(prevFrame => (prevFrame + 1) % catFrames.length);
            const nextIntervalMs = (60 / Math.max(30, tempoRef.current) / 2) * 1000;
            timeoutId = window.setTimeout(tick, nextIntervalMs);
        };

        const initialIntervalMs = (60 / Math.max(30, tempoRef.current) / 2) * 1000;
        timeoutId = window.setTimeout(tick, initialIntervalMs);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [isPlaying]);

    const containerClasses = `
        relative w-32 h-24
        transform-gpu transition-[transform,opacity] duration-500 ease-in-out
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

// --- Dancing Coffee Cup Component (for Cappuccino Mode) ---

const CoffeeCupFrame1: React.FC = () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Steam Left */}
        <path d="M35 25 Q 30 15 35 5" stroke="#E6C9A8" strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round"/>
        <path d="M48 22 Q 43 12 48 2" stroke="#E6C9A8" strokeWidth="3" fill="none" opacity="0.38" strokeLinecap="round"/>
        
        {/* Saucer */}
        <ellipse cx="48" cy="85" rx="30" ry="6" fill="#fdfbf7" stroke="#e5e7eb" strokeWidth="1"/>
        
        <g transform="rotate(-5, 48, 85)">
            {/* Handle */}
            <path d="M70 45 C 82 45, 82 65, 68 70" stroke="#fdfbf7" strokeWidth="5" fill="none" strokeLinecap="round"/>
            {/* Cup Body */}
            <path d="M26 35 L30 80 C 30 86, 66 86, 66 80 L 70 35 Z" fill="#fdfbf7" stroke="#e5e7eb" strokeWidth="1" />
            
            {/* Bandit Mask (TMNT Style) */}
            <path d="M25 56 C 25 45, 45 45, 48 52 C 51 45, 71 45, 71 56 C 71 67, 51 67, 48 60 C 45 67, 25 67, 25 56 Z" fill="#1f2937" />
            {/* Eyes */}
            <ellipse cx="37" cy="56" rx="3.5" ry="3" fill="white" />
            <ellipse cx="59" cy="56" rx="3.5" ry="3" fill="white" />
            {/* Mask Ties (Left) */}
            <path d="M26 56 C 18 52, 10 58, 12 66 L 18 62 C 16 66, 18 68, 22 64 Z" fill="#1f2937" />
            {/* Mask Ties (Right) */}
            <path d="M70 56 C 78 52, 86 58, 84 66 L 78 62 C 80 66, 78 68, 74 64 Z" fill="#1f2937" />

            {/* Liquid Surface */}
            <ellipse cx="48" cy="35" rx="22" ry="7" fill="#6F4E37" />
            {/* Latte Art Heart */}
            <path d="M48 38 C 48 38, 42 34, 42 32 C 42 30, 45 30, 48 33 C 51 30, 54 30, 54 32 C 54 34, 48 38, 48 38 Z" fill="#E6C9A8" opacity="0.9" />
        </g>
    </svg>
);

const CoffeeCupFrame2: React.FC = () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Steam Right */}
        <path d="M61 25 Q 66 15 61 5" stroke="#E6C9A8" strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round"/>
        <path d="M48 22 Q 53 12 48 2" stroke="#E6C9A8" strokeWidth="3" fill="none" opacity="0.38" strokeLinecap="round"/>

        {/* Saucer */}
        <ellipse cx="48" cy="85" rx="30" ry="6" fill="#fdfbf7" stroke="#e5e7eb" strokeWidth="1"/>
        
        <g transform="rotate(5, 48, 85)">
            {/* Handle */}
            <path d="M70 45 C 82 45, 82 65, 68 70" stroke="#fdfbf7" strokeWidth="5" fill="none" strokeLinecap="round"/>
            {/* Cup Body */}
            <path d="M26 35 L30 80 C 30 86, 66 86, 66 80 L 70 35 Z" fill="#fdfbf7" stroke="#e5e7eb" strokeWidth="1" />
            
            {/* Bandit Mask (TMNT Style) */}
            <path d="M25 56 C 25 45, 45 45, 48 52 C 51 45, 71 45, 71 56 C 71 67, 51 67, 48 60 C 45 67, 25 67, 25 56 Z" fill="#1f2937" />
            {/* Eyes */}
            <ellipse cx="37" cy="56" rx="3.5" ry="3" fill="white" />
            <ellipse cx="59" cy="56" rx="3.5" ry="3" fill="white" />
            {/* Mask Ties (Left) */}
            <path d="M26 56 C 18 50, 8 54, 10 62 L 16 60 C 14 64, 16 66, 20 62 Z" fill="#1f2937" />
            {/* Mask Ties (Right) */}
            <path d="M70 56 C 78 50, 88 54, 86 62 L 80 60 C 82 64, 80 66, 76 62 Z" fill="#1f2937" />

            {/* Liquid Surface */}
            <ellipse cx="48" cy="35" rx="22" ry="7" fill="#6F4E37" />
            {/* Latte Art Heart */}
            <path d="M48 38 C 48 38, 42 34, 42 32 C 42 30, 45 30, 48 33 C 51 30, 54 30, 54 32 C 54 34, 48 38, 48 38 Z" fill="#E6C9A8" opacity="0.9" />
        </g>
    </svg>
);

const coffeeFrames = [
    <CoffeeCupFrame1 key="1" />,
    <CoffeeCupFrame2 key="2" />,
];

const DancingCoffeeCup: React.FC<DancingCatProps> = React.memo(({ isPlaying, tempo }) => {
    const [currentFrame, setCurrentFrame] = useState(0);
    const tempoRef = useRef(tempo);
    tempoRef.current = tempo;

    useEffect(() => {
        if (!isPlaying) {
            const timer = setTimeout(() => setCurrentFrame(0), 500);
            return () => clearTimeout(timer);
        }

        let timeoutId: number;
        const tick = () => {
            setCurrentFrame(prevFrame => (prevFrame + 1) % coffeeFrames.length);
            const nextIntervalMs = (60 / Math.max(30, tempoRef.current) / 2) * 1000;
            timeoutId = window.setTimeout(tick, nextIntervalMs);
        };

        const initialIntervalMs = (60 / Math.max(30, tempoRef.current) / 2) * 1000;
        timeoutId = window.setTimeout(tick, initialIntervalMs);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [isPlaying]);

    const containerClasses = `
        relative w-32 h-24
        transform-gpu transition-[transform,opacity] duration-500 ease-in-out
        ${isPlaying ? 'opacity-100' : 'opacity-0 -translate-y-4'}
    `;

    return (
        <div className={containerClasses} aria-hidden="true">
            <div className="absolute left-0 bottom-0">
                {coffeeFrames[currentFrame]}
            </div>
            <div className="absolute right-0 top-0">
                 <DiscoBall isPlaying={isPlaying} />
            </div>
        </div>
    );
});


// --- Main Controls Component ---

interface EditableValueProps {
    valueDisplay: string;
    initialInput: string;
    ariaLabel: string;
    title: string;
    visualizerStyle?: VisualizerStyle;
    onCommit: (rawInput: string) => void;
    isEditing: boolean;
    onStartEdit: () => void;
    onCancelEdit: () => void;
}

const EditableValue: React.FC<EditableValueProps> = React.memo(({
    valueDisplay,
    initialInput,
    ariaLabel,
    title,
    visualizerStyle = 'default',
    onCommit,
    isEditing,
    onStartEdit,
    onCancelEdit,
}) => {
    const [inputValue, setInputValue] = useState(initialInput);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            setInputValue(initialInput);
        }
    }, [isEditing, initialInput]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onCommit(inputValue);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCancelEdit();
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => onCommit(inputValue)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                aria-label={ariaLabel}
                className={`w-14 h-6 text-sm font-bold text-center tabular-nums px-1 outline-none transition-colors ${
                    visualizerStyle === 'minimal'
                        ? 'bg-[#18181b] text-[#f4f4f5] border border-[#ff3b1d]'
                        : visualizerStyle === 'braun'
                        ? 'bg-[#ffffff] text-[#1c1c1a] border border-[#ea5b0c] rounded shadow-inner'
                        : visualizerStyle === 'bauhaus'
                        ? 'bg-[#f7f2e7] text-[#141413] border-2 border-[#d62828]'
                        : visualizerStyle === 'nagra'
                        ? 'bg-white text-[#3b1547] border border-[#ff5e4d] rounded-full shadow-inner'
                        : visualizerStyle === 'koto'
                        ? 'bg-[#120e14] text-[#f2ece1] border border-[#d4af37] rounded'
                        : visualizerStyle === 'cyberpunk'
                        ? 'bg-[#08080c] text-[#00ff9f] border border-[#00ff9f]'
                        : 'bg-gray-800 text-gray-100 border border-blue-500 rounded'
                }`}
            />
        );
    }

    return (
        <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onStartEdit();
                }
            }}
            title={title}
            aria-label={`${ariaLabel}: ${valueDisplay}. Click to type a new value.`}
            className={`w-14 text-sm font-bold text-center tabular-nums cursor-pointer select-none rounded py-0.5 transition-colors border border-transparent ${
                visualizerStyle === 'minimal'
                    ? 'text-gray-100 hover:text-[#ff3b1d] hover:bg-[#18181b] hover:border-[#27272a]'
                    : visualizerStyle === 'braun'
                    ? 'text-gray-100 hover:text-[#ea5b0c] hover:bg-black/20 hover:border-[#c4c0b4]'
                    : visualizerStyle === 'bauhaus'
                    ? 'text-gray-100 hover:text-[#d62828] hover:bg-black/20 hover:border-[#141413]'
                    : visualizerStyle === 'nagra'
                    ? 'text-gray-100 hover:text-[#d9325e] hover:bg-white/70 hover:border-[#ff9466] rounded-full'
                    : visualizerStyle === 'koto'
                    ? 'text-gray-100 hover:text-[#d4af37] hover:bg-[#1d161f] hover:border-[#d4af37]/40'
                    : visualizerStyle === 'cyberpunk'
                    ? 'text-gray-100 hover:text-[#00ff9f] hover:bg-[#00ff9f]/10 hover:border-[#00ff9f]/50'
                    : 'text-gray-100 hover:text-blue-400 hover:bg-gray-700/60 hover:border-gray-600'
            }`}
        >
            {valueDisplay}
        </span>
    );
});

interface ControlsProps {
    isPlaying: boolean;
    onPlayToggle: () => void;
    tempo: number;
    onTempoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDirectTempoChange?: (tempo: number) => void;
    swing: number;
    onSwingChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDirectSwingChange?: (swing: number) => void;
    masterVolume: number;
    onMasterVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDirectMasterVolumeChange?: (volume: number) => void;
    activePattern: 'a' | 'b';
    onPatternToggle: (pattern: 'a' | 'b') => void;
    hueRotate: number;
    onHueRotateChange: (value: number) => void;
    isColorAnimating: boolean;
    onToggleColorAnimation: () => void;
    onDownload: (customFilename?: string, measures?: number, includeTail?: boolean) => void;
    onPrepareDrag?: (measures?: number, includeTail?: boolean) => void;
    onCopy?: () => void;
    isRendering: boolean;
    isPreparingDrag?: boolean;
    isCopying?: boolean;
    dragBlobUrl?: string | null;
    onClearDragUrl?: () => void;
    savedPatterns: (SavedPattern | null)[];
    currentPatternIndex: number;
    onSelectPattern: (slotIndex: number) => void;
    onCatClick: () => void;
    onClearPattern: () => void;
    isCurrentPatternEmpty: boolean;
    isCappuccinoMode?: boolean;
    visualizerStyle?: VisualizerStyle;
    isLiveRecording?: boolean;
    onToggleLiveRecording?: () => void;
    liveRecordings?: LiveRecording[];
    onDeleteLiveRecording?: (id: string) => void;
    onClearAllLiveRecordings?: () => void;
    onRenameLiveRecording?: (id: string, newName: string) => void;
    beatsPerMeasure?: number;
    exportMeasures?: number;
    onExportMeasuresChange?: (measures: number) => void;
    exportIncludeTail?: boolean;
    onExportIncludeTailChange?: (includeTail: boolean) => void;
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

const DragIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="9" cy="5" r="1" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="9" cy="19" r="1" />
        <circle cx="15" cy="5" r="1" />
        <circle cx="15" cy="12" r="1" />
        <circle cx="15" cy="19" r="1" />
    </svg>
);

const ListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const formatDuration = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const totalSecs = Math.floor(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// --- Pattern Slot Button Component ---
interface PatternSlotButtonProps {
    slotIndex: number;
    hasContent: boolean;
    isActive: boolean;
    onClick: (index: number) => void;
    visualizerStyle: import('../types').VisualizerStyle;
}

const hasContentInPattern = (pattern: SavedPattern | null): boolean => {
    if (!pattern) return false;
    const hasNotesA = pattern.grids.a.some(row => row.some(step => step));
    const hasNotesB = pattern.grids.b.some(row => row.some(step => step));
    return hasNotesA || hasNotesB;
};

const PatternSlotButton: React.FC<PatternSlotButtonProps> = React.memo(({ slotIndex, hasContent, isActive, onClick, visualizerStyle }) => {
    const buttonClasses = getButtonStyle(
        visualizerStyle,
        hasContent ? 'primary' : 'secondary',
        isActive,
        false,
        'w-10 h-10 text-lg'
    );

    return (
        <button
            onClick={() => onClick(slotIndex)}
            className={buttonClasses}
            aria-label={`Pattern ${slotIndex + 1}. ${isActive ? 'Currently active.' : ''}`}
            aria-pressed={isActive}
        >
            {/* Subtle hardware status pip when pattern slot has notes */}
            {hasContent && visualizerStyle !== 'default' && (
                <span
                    aria-hidden="true"
                    className={`absolute top-1 right-1 w-1.5 h-1.5 ${
                        visualizerStyle === 'bauhaus' || visualizerStyle === 'cyberpunk' || visualizerStyle === 'minimal' ? 'rounded-none' : 'rounded-full'
                    } ${
                        isActive
                            ? 'bg-current opacity-80'
                            : visualizerStyle === 'minimal'
                            ? 'bg-[#ff3b1d]'
                            : visualizerStyle === 'braun'
                            ? 'bg-[#ea5b0c]'
                            : visualizerStyle === 'bauhaus'
                            ? 'bg-[#f2b705]'
                            : visualizerStyle === 'nagra'
                            ? 'bg-[#ff5e4d] shadow-[0_0_6px_#ff5e4d]'
                            : visualizerStyle === 'koto'
                            ? 'bg-[#d4af37]'
                            : 'bg-[#00ff9f]'
                    }`}
                />
            )}
            <span className="relative z-10">{slotIndex + 1}</span>
        </button>
    );
});


const Controls: React.FC<ControlsProps> = ({ 
    isPlaying, 
    onPlayToggle, 
    tempo, 
    onTempoChange,
    onDirectTempoChange,
    swing,
    onSwingChange,
    onDirectSwingChange,
    masterVolume, 
    onMasterVolumeChange,
    onDirectMasterVolumeChange,
    activePattern,
    onPatternToggle,
    hueRotate,
    onHueRotateChange,
    isColorAnimating,
    onToggleColorAnimation,
    onDownload,
    onPrepareDrag,
    isRendering,
    isPreparingDrag,
    dragBlobUrl,
    onClearDragUrl,
    savedPatterns,
    currentPatternIndex,
    onSelectPattern,
    onCatClick,
    onClearPattern,
    isCurrentPatternEmpty,
    isCappuccinoMode = false,
    visualizerStyle = 'default' as VisualizerStyle,
    isLiveRecording = false,
    onToggleLiveRecording,
    liveRecordings = [],
    onDeleteLiveRecording,
    onClearAllLiveRecordings,
    onRenameLiveRecording,
    beatsPerMeasure = 4,
    exportMeasures: externalExportMeasures,
    onExportMeasuresChange,
    exportIncludeTail: externalExportIncludeTail,
    onExportIncludeTailChange,
}) => {
    const isDraggingKnob = useRef(false);
    const knobDragStart = useRef({ y: 0, hue: 0, time: 0 });

    const [clearProgress, setClearProgress] = useState(0);
    const [isPoofing, setIsPoofing] = useState(false);
    const clearTimerRef = useRef<number | null>(null);
    const clearRequestRef = useRef<number | null>(null);

    const [isInteractingWithSlider, setIsInteractingWithSlider] = useState(false);
    const [editingField, setEditingField] = useState<'volume' | 'tempo' | 'swing' | null>(null);

    // --- Live Recording & Voice Memo List State ---
    const [isRecordingsListOpen, setIsRecordingsListOpen] = useState(false);
    const [liveRecElapsed, setLiveRecElapsed] = useState(0);
    const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
    const [playbackProgress, setPlaybackProgress] = useState<number>(0);
    const [editingRecordingId, setEditingRecordingId] = useState<string | null>(null);
    const [editingRecordingName, setEditingRecordingName] = useState<string>('');
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const recordingsMenuRef = useRef<HTMLDivElement | null>(null);
    const prevRecordingsCountRef = useRef<number>(liveRecordings.length);

    // --- Beat Export Naming & Length State (Save & Drag-and-Drop) ---
    const defaultExportName = `drums_bpm${tempo}`;
    const [exportPromptMode, setExportPromptMode] = useState<'save' | 'drag' | null>(null);
    const [exportName, setExportName] = useState<string>(defaultExportName);
    const [isCustomExportName, setIsCustomExportName] = useState<boolean>(false);
    const [localExportMeasures, setLocalExportMeasures] = useState<number>(1);
    const [localIncludeTail, setLocalIncludeTail] = useState<boolean>(false);
    const exportInputRef = useRef<HTMLInputElement | null>(null);

    const activeExportMeasures = externalExportMeasures ?? localExportMeasures;
    const activeIncludeTail = externalExportIncludeTail ?? localIncludeTail;

    const handleChangeExportMeasures = useCallback((nextMeasures: number) => {
        const clamped = Math.max(1, Math.min(16, Math.round(nextMeasures)));
        setLocalExportMeasures(clamped);
        if (onExportMeasuresChange) {
            onExportMeasuresChange(clamped);
        }
        if (exportPromptMode === 'drag' && onPrepareDrag) {
            onPrepareDrag(clamped, activeIncludeTail);
        }
    }, [onExportMeasuresChange, exportPromptMode, onPrepareDrag, activeIncludeTail]);

    const handleToggleIncludeTail = useCallback(() => {
        const nextTail = !activeIncludeTail;
        setLocalIncludeTail(nextTail);
        if (onExportIncludeTailChange) {
            onExportIncludeTailChange(nextTail);
        }
        if (exportPromptMode === 'drag' && onPrepareDrag) {
            onPrepareDrag(activeExportMeasures, nextTail);
        }
    }, [activeIncludeTail, onExportIncludeTailChange, exportPromptMode, onPrepareDrag, activeExportMeasures]);

    const exportBarDurationSec = (60 / Math.max(30, tempo)) * beatsPerMeasure * activeExportMeasures;

    useEffect(() => {
        if (!isCustomExportName) {
            setExportName(`drums_bpm${tempo}`);
        }
    }, [tempo, isCustomExportName]);

    useEffect(() => {
        if (exportPromptMode && exportInputRef.current) {
            exportInputRef.current.focus();
            exportInputRef.current.select();
        }
    }, [exportPromptMode]);

    const getSanitizedExportFilename = useCallback(() => {
        const raw = (exportName.trim() || defaultExportName).replace(/\.wav$/i, '');
        const clean = raw.replace(/[:/\\?%*|"<>]/g, '_').trim() || defaultExportName;
        return `${clean}.wav`;
    }, [exportName, defaultExportName]);

    useEffect(() => {
        if (!isLiveRecording) {
            setLiveRecElapsed(0);
            return;
        }
        const startTime = Date.now();
        const interval = window.setInterval(() => {
            setLiveRecElapsed((Date.now() - startTime) / 1000);
        }, 250);
        return () => clearInterval(interval);
    }, [isLiveRecording]);

    // Auto-open the recordings list when a new live memo is finished
    useEffect(() => {
        if (liveRecordings.length > prevRecordingsCountRef.current) {
            setExportPromptMode(null);
            setIsRecordingsListOpen(true);
        }
        prevRecordingsCountRef.current = liveRecordings.length;
    }, [liveRecordings.length]);

    // Close recordings or export naming popover on outside click or Escape
    useEffect(() => {
        if (!isRecordingsListOpen && !exportPromptMode) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (recordingsMenuRef.current && !recordingsMenuRef.current.contains(e.target as Node)) {
                setIsRecordingsListOpen(false);
                setEditingRecordingId(null);
                setExportPromptMode(null);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsRecordingsListOpen(false);
                setEditingRecordingId(null);
                setExportPromptMode(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isRecordingsListOpen, exportPromptMode]);

    // Stop preview audio if the active recording is deleted
    useEffect(() => {
        if (playingRecordingId && !liveRecordings.some(r => r.id === playingRecordingId)) {
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current = null;
            }
            setPlayingRecordingId(null);
            setPlaybackProgress(0);
        }
    }, [liveRecordings, playingRecordingId]);

    useEffect(() => {
        return () => {
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current = null;
            }
        };
    }, []);

    const handleTogglePreviewRecording = useCallback((rec: LiveRecording) => {
        if (playingRecordingId === rec.id && previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current = null;
            setPlayingRecordingId(null);
            setPlaybackProgress(0);
            return;
        }

        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current = null;
        }

        const audio = new Audio(rec.url);
        previewAudioRef.current = audio;
        setPlayingRecordingId(rec.id);
        setPlaybackProgress(0);

        audio.ontimeupdate = () => {
            if (audio.duration > 0) {
                setPlaybackProgress(audio.currentTime / audio.duration);
            }
        };
        audio.onended = () => {
            setPlayingRecordingId(null);
            setPlaybackProgress(0);
            previewAudioRef.current = null;
        };
        audio.play().catch((err) => {
            console.error("Failed to play live recording:", err);
            setPlayingRecordingId(null);
        });
    }, [playingRecordingId]);

    const handleDownloadRecording = useCallback((rec: LiveRecording) => {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = rec.url;
        const safeName = rec.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `${safeName || 'CL-607-live'}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, []);

    const surface = getThemeSurface(visualizerStyle);

    const handleCommitVolume = useCallback((raw: string) => {
        setEditingField(null);
        const cleaned = raw.replace('%', '').trim();
        if (!cleaned) return;
        const num = parseFloat(cleaned);
        if (isNaN(num)) return;

        let normalized: number;
        if (cleaned.includes('.') && num <= 1 && num >= 0) {
            normalized = num;
        } else {
            normalized = Math.max(0, Math.min(100, num)) / 100;
        }

        if (onDirectMasterVolumeChange) {
            onDirectMasterVolumeChange(normalized);
        } else {
            onMasterVolumeChange({ target: { value: String(normalized) } } as React.ChangeEvent<HTMLInputElement>);
        }
    }, [onDirectMasterVolumeChange, onMasterVolumeChange]);

    const handleCommitTempo = useCallback((raw: string) => {
        setEditingField(null);
        const cleaned = raw.replace(/bpm/i, '').trim();
        if (!cleaned) return;
        const num = parseInt(cleaned, 10);
        if (isNaN(num)) return;

        const clamped = Math.max(MIN_TEMPO, Math.min(MAX_TEMPO, Math.round(num)));
        if (onDirectTempoChange) {
            onDirectTempoChange(clamped);
        } else {
            onTempoChange({ target: { value: String(clamped) } } as React.ChangeEvent<HTMLInputElement>);
        }
    }, [onDirectTempoChange, onTempoChange]);

    const handleCommitSwing = useCallback((raw: string) => {
        setEditingField(null);
        const cleaned = raw.replace('%', '').trim();
        if (!cleaned) return;
        const num = parseFloat(cleaned);
        if (isNaN(num)) return;

        let normalized: number;
        if (cleaned.includes('.') && num <= 1 && num >= 0) {
            normalized = num;
        } else {
            normalized = Math.max(0, Math.min(100, num)) / 100;
        }

        if (onDirectSwingChange) {
            onDirectSwingChange(normalized);
        } else {
            onSwingChange({ target: { value: String(normalized) } } as React.ChangeEvent<HTMLInputElement>);
        }
    }, [onDirectSwingChange, onSwingChange]);

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
            <div className="relative flex flex-col gap-2" ref={recordingsMenuRef}>
                {/* Cohesive Single Live Record Button with Integrated 3-Lines Menu Action */}
                <div
                    className={getButtonStyle(
                        visualizerStyle,
                        isLiveRecording ? 'danger' : 'secondary',
                        isLiveRecording,
                        false,
                        'w-28 h-10 !p-0 flex items-stretch relative select-none'
                    )}
                >
                    <Tooltip text={isLiveRecording ? "Click to stop recording live audio and save to list" : "Record live master audio (including filter & effect tweaks) like a voice memo"}>
                        <button
                            type="button"
                            onClick={onToggleLiveRecording}
                            className="flex-1 h-full flex items-center justify-center pl-2 pr-1 min-w-0 cursor-pointer bg-transparent border-0 text-inherit font-inherit focus:outline-none hover: opacity-95"
                            aria-label={isLiveRecording ? 'Stop live recording' : 'Start live recording'}
                            aria-pressed={isLiveRecording}
                        >
                            {isLiveRecording ? (
                                <>
                                    <span className="w-2 h-2 bg-current rounded-[2px] animate-pulse flex-shrink-0" />
                                    <span className="ml-1.5 text-[11px] leading-none tracking-wider tabular-nums font-bold">
                                        {formatDuration(liveRecElapsed)}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-[#e11d48] shadow-[0_0_5px_rgba(225,29,72,0.75)] flex-shrink-0" />
                                    <span className="ml-1 text-[11px] leading-none tracking-wider truncate font-bold">
                                        LIVE REC
                                    </span>
                                </>
                            )}
                        </button>
                    </Tooltip>

                    {/* Integrated Cohesive Divider */}
                    <span
                        aria-hidden="true"
                        className={`self-stretch ${
                            visualizerStyle === 'bauhaus'
                                ? 'w-[2px] my-0 bg-[#141413]'
                                : visualizerStyle === 'cyberpunk'
                                ? 'w-[1.5px] my-1 bg-current opacity-40'
                                : 'w-[1px] my-1.5 bg-current opacity-25'
                        }`}
                    />

                    {/* Integrated 3-Lines List Trigger on Right Side of the Same Button */}
                    <Tooltip text={`Open Live Recordings list (${liveRecordings.length})`}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setExportPromptMode(null);
                                setIsRecordingsListOpen(prev => !prev);
                            }}
                            className={`w-7 h-full flex items-center justify-center flex-shrink-0 cursor-pointer bg-transparent border-0 text-inherit focus:outline-none relative transition-colors ${
                                isRecordingsListOpen ? 'bg-black/15' : 'hover:bg-black/10'
                            }`}
                            aria-label={`Live recordings list (${liveRecordings.length} saved)`}
                            aria-expanded={isRecordingsListOpen}
                        >
                            <ListIcon className="w-3.5 h-3.5" />
                            {liveRecordings.length > 0 && (
                                <span
                                    className={`absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 text-[9px] font-bold leading-none flex items-center justify-center rounded-full z-20 ${
                                        visualizerStyle === 'cyberpunk'
                                            ? 'bg-[#fcee0a] text-[#050508] border border-[#050508] rounded-none'
                                            : visualizerStyle === 'bauhaus'
                                            ? 'bg-[#d62828] text-[#faf6ed] border border-[#141413] rounded-none'
                                            : visualizerStyle === 'minimal'
                                            ? 'bg-[#ff3b1d] text-[#09090b] rounded-none'
                                            : visualizerStyle === 'braun'
                                            ? 'bg-[#ea5b0c] text-white'
                                            : visualizerStyle === 'nagra'
                                            ? 'bg-[#d9325e] text-white border border-white'
                                            : visualizerStyle === 'koto'
                                            ? 'bg-[#d4af37] text-[#120d14]'
                                            : 'bg-blue-500 text-white'
                                    }`}
                                >
                                    {liveRecordings.length}
                                </span>
                            )}
                        </button>
                    </Tooltip>
                </div>

                {/* Solid, Opaque Live Recordings Popover Menu */}
                {isRecordingsListOpen && (
                    <div
                        className={`absolute left-0 top-11 z-50 w-80 sm:w-96 p-3.5 flex flex-col gap-2.5 ${
                            visualizerStyle === 'cyberpunk'
                                ? 'bg-[#07070c] border-2 border-[#00ff9f] rounded-none text-[#fcee0a] shadow-[6px_6px_0px_#ff003c]'
                                : visualizerStyle === 'braun'
                                ? 'bg-[#f4f2ec] border-2 border-[#a8a498] rounded-lg text-[#1c1c1a] shadow-[0_16px_36px_rgba(0,0,0,0.35),inset_0_1px_0_#ffffff]'
                                : visualizerStyle === 'bauhaus'
                                ? 'bg-[#f7f2e7] border-[3px] border-[#141413] rounded-none text-[#141413] shadow-[6px_6px_0px_#141413]'
                                : visualizerStyle === 'nagra'
                                ? 'bg-gradient-to-b from-[#fffdfa] via-[#fff0e6] to-[#fbd5c5] border-2 border-white rounded-[24px] text-[#3b1547] shadow-[0_18px_40px_rgba(45,16,56,0.45),inset_0_2px_0_#ffffff]'
                                : visualizerStyle === 'koto'
                                ? 'bg-[#140f16] border-2 border-[#d4af37] rounded-xl text-[#f2ece1] shadow-[0_18px_44px_rgba(0,0,0,0.9)]'
                                : visualizerStyle === 'minimal'
                                ? 'bg-[#09090b] border-2 border-[#f4f4f5] rounded-none text-[#f4f4f5] shadow-[0_12px_30px_rgba(0,0,0,0.9)]'
                                : 'bg-[#111827] border-2 border-[#374151] rounded-xl text-[#f9fafb] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
                        }`}
                        role="dialog"
                        aria-label="Live Recordings"
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-current/20">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#e11d48]" />
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-100">
                                    Live Recordings ({liveRecordings.length})
                                </h4>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {liveRecordings.length > 1 && onClearAllLiveRecordings && (
                                    <button
                                        type="button"
                                        onClick={onClearAllLiveRecordings}
                                        className={getButtonStyle(visualizerStyle, 'danger', false, false, 'h-6 px-2 text-[10px]')}
                                    >
                                        CLEAR ALL
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsRecordingsListOpen(false)}
                                    className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'w-6 h-6 !px-0 text-xs')}
                                    aria-label="Close live recordings list"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {liveRecordings.length === 0 ? (
                            <div className="py-6 px-3 text-center flex flex-col items-center gap-1.5">
                                <p className="text-xs font-bold text-gray-100">
                                    No live recordings yet
                                </p>
                                <p className="text-[11px] text-gray-300 leading-relaxed">
                                    Click <span className="font-bold">LIVE REC</span> while playing to capture your live beat, filter sweeps, and effect tweaks in real time.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-0.5">
                                {liveRecordings.map((rec) => {
                                    const isPlayingThis = playingRecordingId === rec.id;
                                    const isEditingThis = editingRecordingId === rec.id;
                                    const safeFilename = `${rec.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'CL-607-live'}.wav`;

                                    return (
                                        <div
                                            key={rec.id}
                                            className={`p-2.5 flex flex-col gap-2 ${
                                                visualizerStyle === 'cyberpunk'
                                                    ? 'bg-[#10101a] border border-[#00ff9f]/50 rounded-none'
                                                    : visualizerStyle === 'braun'
                                                    ? 'bg-[#e6e3da] border border-[#c4c0b4] rounded-md'
                                                    : visualizerStyle === 'bauhaus'
                                                    ? 'bg-[#ebe4d5] border-2 border-[#141413] rounded-none'
                                                    : visualizerStyle === 'nagra'
                                                    ? 'bg-[#fff8f3] border border-[#f4b6a0] rounded-2xl shadow-sm'
                                                    : visualizerStyle === 'koto'
                                                    ? 'bg-[#1f1722] border border-[#d4af37]/40 rounded-lg'
                                                    : visualizerStyle === 'minimal'
                                                    ? 'bg-[#141418] border border-[#2e2e36] rounded-none'
                                                    : 'bg-[#1f2937] border border-[#374151] rounded-lg'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                {/* Play / Pause Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleTogglePreviewRecording(rec)}
                                                    className={getButtonStyle(
                                                        visualizerStyle,
                                                        isPlayingThis ? 'primary' : 'secondary',
                                                        isPlayingThis,
                                                        false,
                                                        'w-8 h-8 !px-0 flex-shrink-0'
                                                    )}
                                                    aria-label={isPlayingThis ? `Pause ${rec.name}` : `Play ${rec.name}`}
                                                >
                                                    {isPlayingThis ? (
                                                        <PauseIcon className="w-4 h-4" />
                                                    ) : (
                                                        <PlayIcon className="w-4 h-4" />
                                                    )}
                                                </button>

                                                {/* Title & Metadata */}
                                                <div className="flex-1 min-w-0 flex flex-col">
                                                    {isEditingThis ? (
                                                        <input
                                                            type="text"
                                                            value={editingRecordingName}
                                                            autoFocus
                                                            onChange={(e) => setEditingRecordingName(e.target.value)}
                                                            onBlur={() => {
                                                                if (onRenameLiveRecording) {
                                                                    onRenameLiveRecording(rec.id, editingRecordingName);
                                                                }
                                                                setEditingRecordingId(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    if (onRenameLiveRecording) {
                                                                        onRenameLiveRecording(rec.id, editingRecordingName);
                                                                    }
                                                                    setEditingRecordingId(null);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingRecordingId(null);
                                                                }
                                                            }}
                                                            className="w-full text-xs font-bold bg-black/20 text-gray-100 px-1.5 py-0.5 rounded border border-current/30 outline-none"
                                                        />
                                                    ) : (
                                                        <span
                                                            onClick={() => {
                                                                setEditingRecordingId(rec.id);
                                                                setEditingRecordingName(rec.name);
                                                            }}
                                                            title="Click to rename take"
                                                            className="text-xs font-bold text-gray-100 truncate cursor-pointer hover:underline"
                                                        >
                                                            {rec.name}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-gray-400 tabular-nums">
                                                        {formatDuration(rec.duration)} • {rec.createdAt}
                                                    </span>
                                                </div>

                                                {/* Action Buttons: Drag to DAW, Download WAV, Delete */}
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        draggable={true}
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('DownloadURL', `audio/wav:${safeFilename}:${rec.url}`);
                                                        }}
                                                        title="Drag this recording into your DAW or desktop folder"
                                                        className={getButtonStyle(
                                                            visualizerStyle,
                                                            'secondary',
                                                            false,
                                                            false,
                                                            'w-7 h-7 !px-0 cursor-grab active:cursor-grabbing'
                                                        )}
                                                        aria-label={`Drag ${rec.name} to export`}
                                                    >
                                                        <DragIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadRecording(rec)}
                                                        title="Save recording as .wav"
                                                        className={getButtonStyle(
                                                            visualizerStyle,
                                                            'secondary',
                                                            false,
                                                            false,
                                                            'w-7 h-7 !px-0'
                                                        )}
                                                        aria-label={`Download ${rec.name}`}
                                                    >
                                                        <DownloadIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    {onDeleteLiveRecording && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onDeleteLiveRecording(rec.id)}
                                                            title="Delete recording"
                                                            className={getButtonStyle(
                                                                visualizerStyle,
                                                                'danger',
                                                                false,
                                                                false,
                                                                'w-7 h-7 !px-0'
                                                            )}
                                                            aria-label={`Delete ${rec.name}`}
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Playback Progress Bar */}
                                            {isPlayingThis && (
                                                <div className="w-full h-1 bg-black/25 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-current transition-all duration-100"
                                                        style={{ width: `${Math.min(100, Math.round(playbackProgress * 100))}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Solid, Opaque Beat Naming & Export Popover (for Drag & Drop and Save) */}
                {exportPromptMode && (
                    <div
                        className={`absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 p-3.5 flex flex-col gap-3 ${
                            visualizerStyle === 'cyberpunk'
                                ? 'bg-[#07070c] border-2 border-[#00ff9f] rounded-none text-[#fcee0a] shadow-[6px_6px_0px_#ff003c]'
                                : visualizerStyle === 'braun'
                                ? 'bg-[#f4f2ec] border-2 border-[#a8a498] rounded-lg text-[#1c1c1a] shadow-[0_16px_36px_rgba(0,0,0,0.35),inset_0_1px_0_#ffffff]'
                                : visualizerStyle === 'bauhaus'
                                ? 'bg-[#f7f2e7] border-[3px] border-[#141413] rounded-none text-[#141413] shadow-[6px_6px_0px_#141413]'
                                : visualizerStyle === 'nagra'
                                ? 'bg-gradient-to-b from-[#fffdfa] via-[#fff0e6] to-[#fbd5c5] border-2 border-white rounded-[24px] text-[#3b1547] shadow-[0_18px_40px_rgba(45,16,56,0.45),inset_0_2px_0_#ffffff]'
                                : visualizerStyle === 'koto'
                                ? 'bg-[#140f16] border-2 border-[#d4af37] rounded-xl text-[#f2ece1] shadow-[0_18px_44px_rgba(0,0,0,0.9)]'
                                : visualizerStyle === 'minimal'
                                ? 'bg-[#09090b] border-2 border-[#f4f4f5] rounded-none text-[#f4f4f5] shadow-[0_12px_30px_rgba(0,0,0,0.9)]'
                                : 'bg-[#111827] border-2 border-[#374151] rounded-xl text-[#f9fafb] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
                        }`}
                        role="dialog"
                        aria-label={exportPromptMode === 'save' ? 'Name and save beat' : 'Name and drag beat'}
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-current/20">
                            <div className="flex items-center gap-2">
                                {exportPromptMode === 'save' ? (
                                    <DownloadIcon className="w-3.5 h-3.5" />
                                ) : (
                                    <DragIcon className="w-3.5 h-3.5" />
                                )}
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-100">
                                    {exportPromptMode === 'save' ? 'Save Beat (.wav)' : 'Drag & Drop Beat (.wav)'}
                                </h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setExportPromptMode(null)}
                                className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'w-6 h-6 !px-0 text-xs')}
                                aria-label="Close naming dialog"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="beat-export-filename" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    File Name
                                </label>
                                {isCustomExportName && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCustomExportName(false);
                                            setExportName(`drums_bpm${tempo}`);
                                        }}
                                        className="text-[10px] font-bold underline opacity-80 hover:opacity-100 cursor-pointer bg-transparent border-0 text-inherit"
                                    >
                                        Reset to {defaultExportName}
                                    </button>
                                )}
                            </div>
                            <div
                                className={`flex items-center px-2.5 py-1.5 ${
                                    visualizerStyle === 'cyberpunk'
                                        ? 'bg-[#10101a] border border-[#00ff9f] rounded-none'
                                        : visualizerStyle === 'braun'
                                        ? 'bg-[#e6e3da] border border-[#a8a498] rounded-md'
                                        : visualizerStyle === 'bauhaus'
                                        ? 'bg-[#ebe4d5] border-2 border-[#141413] rounded-none'
                                        : visualizerStyle === 'nagra'
                                        ? 'bg-[#fff8f3] border border-[#f4b6a0] rounded-xl'
                                        : visualizerStyle === 'koto'
                                        ? 'bg-[#1f1722] border border-[#d4af37]/60 rounded-lg'
                                        : visualizerStyle === 'minimal'
                                        ? 'bg-[#141418] border border-[#52525b] rounded-none'
                                        : 'bg-[#1f2937] border border-[#4b5563] rounded-lg'
                                }`}
                            >
                                <input
                                    id="beat-export-filename"
                                    ref={exportInputRef}
                                    type="text"
                                    value={exportName}
                                    placeholder={defaultExportName}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setExportName(val);
                                        setIsCustomExportName(val.trim() !== '' && val.trim() !== defaultExportName);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (exportPromptMode === 'save') {
                                                const finalName = exportName.trim() || defaultExportName;
                                                onDownload(finalName, activeExportMeasures, activeIncludeTail);
                                                setExportPromptMode(null);
                                            } else {
                                                setExportPromptMode(null);
                                            }
                                        }
                                    }}
                                    className="flex-1 min-w-0 bg-transparent border-0 text-xs font-mono font-bold text-gray-100 focus:outline-none"
                                />
                                <span className="ml-1.5 text-[11px] font-mono font-bold text-gray-400 select-none">
                                    .wav
                                </span>
                            </div>
                        </div>

                        {/* Export Measures Selector */}
                        <div className="flex flex-col gap-1.5 pt-1 border-t border-current/15">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    Measures
                                </span>
                                <span className="text-[10px] font-mono tabular-nums text-gray-300">
                                    {activeExportMeasures} {activeExportMeasures === 1 ? 'bar' : 'bars'} · {exportBarDurationSec.toFixed(1)}s{activeIncludeTail ? ' + tail' : ''}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                {[1, 2, 4, 8].map((count) => (
                                    <button
                                        key={count}
                                        type="button"
                                        onClick={() => handleChangeExportMeasures(count)}
                                        className={getButtonStyle(
                                            visualizerStyle,
                                            activeExportMeasures === count ? 'primary' : 'secondary',
                                            activeExportMeasures === count,
                                            false,
                                            'flex-1 h-7 text-xs tabular-nums'
                                        )}
                                    >
                                        {count}
                                    </button>
                                ))}
                                <div className="flex items-center gap-0.5 ml-1">
                                    <button
                                        type="button"
                                        onClick={() => handleChangeExportMeasures(activeExportMeasures - 1)}
                                        disabled={activeExportMeasures <= 1}
                                        title="Decrease measures"
                                        aria-label="Decrease measures"
                                        className={getButtonStyle(
                                            visualizerStyle,
                                            'secondary',
                                            false,
                                            activeExportMeasures <= 1,
                                            'w-6 h-7 !px-0 text-xs'
                                        )}
                                    >
                                        −
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleChangeExportMeasures(activeExportMeasures + 1)}
                                        disabled={activeExportMeasures >= 16}
                                        title="Increase measures"
                                        aria-label="Increase measures"
                                        className={getButtonStyle(
                                            visualizerStyle,
                                            'secondary',
                                            false,
                                            activeExportMeasures >= 16,
                                            'w-6 h-7 !px-0 text-xs'
                                        )}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Let Tails Ring Out Checkbox */}
                        <label
                            htmlFor="export-include-tail"
                            className={`flex items-start gap-2.5 p-2 cursor-pointer select-none transition-colors ${
                                visualizerStyle === 'cyberpunk'
                                    ? 'bg-[#10101a] border border-[#00ff9f]/60 rounded-none'
                                    : visualizerStyle === 'braun'
                                    ? 'bg-[#e6e3da] border border-[#c4c0b4] rounded-md'
                                    : visualizerStyle === 'bauhaus'
                                    ? 'bg-[#ebe4d5] border-2 border-[#141413] rounded-none'
                                    : visualizerStyle === 'nagra'
                                    ? 'bg-[#fff8f3] border border-[#f4b6a0] rounded-xl'
                                    : visualizerStyle === 'koto'
                                    ? 'bg-[#1f1722] border border-[#d4af37]/40 rounded-lg'
                                    : visualizerStyle === 'minimal'
                                    ? 'bg-[#141418] border border-[#3f3f46] rounded-none'
                                    : 'bg-[#1f2937]/90 border border-[#374151] rounded-lg hover:border-gray-500'
                            }`}
                        >
                            <input
                                id="export-include-tail"
                                type="checkbox"
                                checked={activeIncludeTail}
                                onChange={handleToggleIncludeTail}
                                className="mt-0.5 w-3.5 h-3.5 rounded accent-blue-500 cursor-pointer flex-shrink-0"
                            />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] font-bold text-gray-100">
                                    Let Tails Ring Out
                                </span>
                                <span className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                                    Extends clip so reverb, delay &amp; final notes decay naturally without cutting off.
                                </span>
                            </div>
                        </label>

                        {exportPromptMode === 'save' ? (
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setExportPromptMode(null)}
                                    className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'h-8 px-3 text-xs')}
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="button"
                                    disabled={isRendering || isPreparingDrag}
                                    onClick={() => {
                                        const finalName = exportName.trim() || defaultExportName;
                                        onDownload(finalName, activeExportMeasures, activeIncludeTail);
                                        setExportPromptMode(null);
                                    }}
                                    className={getButtonStyle(visualizerStyle, 'primary', false, isRendering || isPreparingDrag, 'h-8 px-3.5 text-xs')}
                                >
                                    {isRendering ? 'RENDERING...' : (
                                        <>
                                            <DownloadIcon className="w-3.5 h-3.5 mr-1.5" />
                                            SAVE .WAV
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 pt-1">
                                <button
                                    type="button"
                                    draggable={!!dragBlobUrl && !isPreparingDrag}
                                    disabled={isPreparingDrag || isRendering}
                                    onClick={() => {
                                        if (!dragBlobUrl && !isPreparingDrag && onPrepareDrag) {
                                            onPrepareDrag(activeExportMeasures, activeIncludeTail);
                                        }
                                    }}
                                    onDragStart={(e) => {
                                        if (dragBlobUrl) {
                                            const safeFile = getSanitizedExportFilename();
                                            e.dataTransfer.setData('DownloadURL', `audio/wav:${safeFile}:${dragBlobUrl}`);
                                        }
                                    }}
                                    className={getButtonStyle(
                                        visualizerStyle,
                                        dragBlobUrl ? 'success' : 'primary',
                                        false,
                                        isPreparingDrag || isRendering,
                                        `w-full h-9 text-xs ${dragBlobUrl ? 'cursor-grab active:cursor-grabbing' : ''}`
                                    )}
                                >
                                    {isPreparingDrag ? (
                                        <span className="animate-pulse">RENDERING AUDIO...</span>
                                    ) : dragBlobUrl ? (
                                        <>
                                            <DragIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                                            <span className="truncate">DRAG {getSanitizedExportFilename()}</span>
                                        </>
                                    ) : (
                                        <span>PREPARE DRAG &amp; DROP</span>
                                    )}
                                </button>
                                <div className="flex items-center justify-between gap-2">
                                    {dragBlobUrl && onClearDragUrl ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClearDragUrl();
                                                setExportPromptMode(null);
                                            }}
                                            className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'h-7 px-2.5 text-[10px]')}
                                        >
                                            RESET
                                        </button>
                                    ) : <span />}
                                    <button
                                        type="button"
                                        onClick={() => setExportPromptMode(null)}
                                        className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'h-7 px-3 text-[10px]')}
                                    >
                                        DONE
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <Tooltip text={dragBlobUrl ? `Drag "${getSanitizedExportFilename()}" into your DAW or folder, or click to rename/reset.` : "Name & prepare beat for drag-and-drop export"}>
                    <button
                        onClick={() => {
                            setIsRecordingsListOpen(false);
                            if (!isCustomExportName) {
                                setExportName(`drums_bpm${tempo}`);
                            }
                            setExportPromptMode(prev => prev === 'drag' ? null : 'drag');
                            if (!dragBlobUrl && !isPreparingDrag && onPrepareDrag) {
                                onPrepareDrag(activeExportMeasures, activeIncludeTail);
                            }
                        }}
                        draggable={!!dragBlobUrl}
                        onDragStart={(e) => {
                            if (dragBlobUrl) {
                                const safeFile = getSanitizedExportFilename();
                                e.dataTransfer.setData('DownloadURL', `audio/wav:${safeFile}:${dragBlobUrl}`);
                            }
                        }}
                        disabled={isPreparingDrag || isRendering}
                        className={getButtonStyle(visualizerStyle, dragBlobUrl ? 'success' : 'secondary', exportPromptMode === 'drag', isPreparingDrag || isRendering, `w-28 h-10 ${dragBlobUrl ? 'cursor-grab active:cursor-grabbing' : ''}`)}
                        aria-label={dragBlobUrl ? `Drag ${getSanitizedExportFilename()} to export` : isPreparingDrag ? 'Preparing export' : 'Prepare export'}
                    >
                        {isPreparingDrag 
                            ? <span className="text-xs tracking-wider animate-pulse">RENDERING</span>
                            : dragBlobUrl
                                ? <>
                                    <DragIcon className="w-4 h-4" />
                                    <span className="ml-1.5 text-xs tracking-wider">DRAG ME</span>
                                  </>
                                : <>
                                    <DragIcon className="w-4 h-4" />
                                    <span className="ml-1.5 text-xs tracking-wider">DRAG & DROP</span>
                                  </>
                        }
                    </button>
                </Tooltip>
                <Tooltip text={`Name and download beat as .wav (default: drums_bpm${tempo}.wav)`}>
                    <button
                        onClick={() => {
                            setIsRecordingsListOpen(false);
                            if (!isCustomExportName) {
                                setExportName(`drums_bpm${tempo}`);
                            }
                            setExportPromptMode(prev => prev === 'save' ? null : 'save');
                        }}
                        disabled={isRendering || isPreparingDrag}
                        className={getButtonStyle(visualizerStyle, 'secondary', exportPromptMode === 'save', isRendering || isPreparingDrag, 'w-28 h-10')}
                        aria-label={isRendering ? 'Rendering your beat' : 'Download your beat'}
                    >
                        {isRendering 
                            ? <span className="text-xs tracking-wider animate-pulse">RENDERING</span>
                            : <>
                                <DownloadIcon className="w-4 h-4" />
                                <span className="ml-1.5 text-xs tracking-wider">SAVE</span>
                              </>
                        }
                    </button>
                </Tooltip>
            </div>
            <Tooltip text={isPlaying ? "Pause sequence (Spacebar)" : "Play sequence (Spacebar)"}>
                <button
                    onClick={onPlayToggle}
                    className={getButtonStyle(visualizerStyle, 'primary', false, false, 'w-28 h-12')}
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
                            className={getButtonStyle(visualizerStyle, 'secondary', activePattern === 'a', false, 'w-14 h-12 text-lg')}
                            aria-pressed={activePattern === 'a'}
                        >
                            A
                        </button>
                    </Tooltip>
                    <Tooltip text="Switch to Pattern B">
                        <button
                            onClick={() => onPatternToggle('b')}
                            className={getButtonStyle(visualizerStyle, 'secondary', activePattern === 'b', false, 'w-14 h-12 text-lg')}
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
                                visualizerStyle={visualizerStyle}
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
                            className={`${getButtonStyle(visualizerStyle, 'danger', false, false, 'mt-2 px-3 h-8 text-xs overflow-hidden')} ${isPoofing ? 'animate-poof' : ''}`}
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
                    <Tooltip text="Adjust the overall output volume of the drum machine" isInteracting={isInteractingWithSlider || editingField === 'volume'}>
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
                            <EditableValue
                                valueDisplay={`${Math.round(masterVolume * 100)}%`}
                                initialInput={String(Math.round(masterVolume * 100))}
                                ariaLabel="Master volume percent"
                                title="Click to type master volume (0-100)"
                                visualizerStyle={visualizerStyle}
                                isEditing={editingField === 'volume'}
                                onStartEdit={() => setEditingField('volume')}
                                onCancelEdit={() => setEditingField(null)}
                                onCommit={handleCommitVolume}
                            />
                        </div>
                    </Tooltip>
                    <Tooltip text="Set the playback speed in Beats Per Minute" isInteracting={isInteractingWithSlider || editingField === 'tempo'}>
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
                            <EditableValue
                                valueDisplay={String(tempo)}
                                initialInput={String(tempo)}
                                ariaLabel="Tempo in BPM"
                                title={`Click to type BPM (${MIN_TEMPO}-${MAX_TEMPO})`}
                                visualizerStyle={visualizerStyle}
                                isEditing={editingField === 'tempo'}
                                onStartEdit={() => setEditingField('tempo')}
                                onCancelEdit={() => setEditingField(null)}
                                onCommit={handleCommitTempo}
                            />
                        </div>
                    </Tooltip>
                    <Tooltip text="Add a shuffle feel by delaying every second 16th note" isInteracting={isInteractingWithSlider || editingField === 'swing'}>
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
                            <EditableValue
                                valueDisplay={`${Math.round(swing * 100)}%`}
                                initialInput={String(Math.round(swing * 100))}
                                ariaLabel="Swing percent"
                                title="Click to type swing percent (0-100)"
                                visualizerStyle={visualizerStyle}
                                isEditing={editingField === 'swing'}
                                onStartEdit={() => setEditingField('swing')}
                                onCancelEdit={() => setEditingField(null)}
                                onCommit={handleCommitSwing}
                            />
                        </div>
                    </Tooltip>
                </div>

                {visualizerStyle !== 'minimal' && (
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
                                className={`relative w-16 h-16 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center select-none transition-transform active:scale-[0.98] ${
                                    visualizerStyle === 'braun'
                                        ? 'bg-gradient-to-b from-[#faf8f5] to-[#dcd9d0] border border-[#a8a498] shadow-[0_3px_6px_rgba(0,0,0,0.18),inset_0_1px_0_#fff]'
                                        : visualizerStyle === 'bauhaus'
                                        ? 'bg-[#f2b705] border-2 border-[#141413] shadow-[3px_3px_0px_#141413]'
                                        : visualizerStyle === 'nagra'
                                        ? 'bg-gradient-to-b from-[#fff8eb] via-[#ffc4a3] to-[#f77b65] border-2 border-white shadow-[0_6px_16px_rgba(217,50,94,0.3),inset_0_2px_4px_#ffffff]'
                                        : visualizerStyle === 'koto'
                                        ? 'bg-gradient-to-b from-[#241b26] to-[#110c13] border border-[#d4af37]/60 shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(212,175,55,0.3)]'
                                        : visualizerStyle === 'cyberpunk'
                                        ? 'bg-[#0a0a0f] border-2 border-[#00ff9f] shadow-[3px_3px_0px_#ff003c]'
                                        : 'bg-gray-700 shadow-inner ring-1 ring-gray-600'
                                } ${isColorAnimating ? 'animate-pulse ring-2 ring-pink-500 ring-offset-2' : ''}`}
                            >
                                {/* Indicator Line */}
                                <div
                                    className="absolute w-full h-full"
                                    style={{ transform: `rotate(${hueRotate}deg)` }}
                                >
                                    <div
                                        className={`absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3.5 ${
                                            visualizerStyle === 'braun'
                                                ? 'bg-[#ea5b0c] rounded-full'
                                                : visualizerStyle === 'bauhaus'
                                                ? 'bg-[#d62828] border border-[#141413]'
                                                : visualizerStyle === 'nagra'
                                                ? 'bg-[#d9325e] rounded-full shadow-[0_0_6px_#ff5e4d]'
                                                : visualizerStyle === 'koto'
                                                ? 'bg-[#d4af37] rounded-full shadow-[0_0_5px_#d4af37]'
                                                : visualizerStyle === 'cyberpunk'
                                                ? 'bg-[#fcee0a]'
                                                : 'bg-pink-400 rounded-full'
                                        }`}
                                    />
                                </div>
                                <span className="text-2xl z-10 pointer-events-none">😎</span>
                            </div>
                        </div>
                    </Tooltip>
                )}
            </div>

            {(visualizerStyle !== 'minimal' || isCappuccinoMode) && (
                <div
                    onClick={() => isPlaying && onCatClick()}
                    className={isPlaying ? 'cursor-pointer' : ''}
                >
                    {isCappuccinoMode ? (
                        <DancingCoffeeCup isPlaying={isPlaying} tempo={tempo} />
                    ) : (
                        <DancingCat isPlaying={isPlaying} tempo={tempo} />
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(Controls);