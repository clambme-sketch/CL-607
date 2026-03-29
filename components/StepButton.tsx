import React from 'react';
import { VisualizerStyle } from '../types';

interface StepButtonProps {
    isActive: boolean;
    isPlayingStep: boolean;
    color: string;
    instrumentIndex: number;
    stepIndex: number;
    beatLabel?: string;
    visualizerStyle?: VisualizerStyle;
}

const StepButton: React.FC<StepButtonProps> = ({
    isActive,
    isPlayingStep,
    color,
    instrumentIndex,
    stepIndex,
    beatLabel,
    visualizerStyle = 'default',
}) => {
    const isDownbeat = stepIndex % 4 === 0;

    const getBaseClasses = () => {
        switch (visualizerStyle) {
            case 'neon':
                return `w-full h-12 sm:h-14 rounded-md cursor-pointer transition-all duration-150 border transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-[#0a0a1a] border-purple-900/30' : 'border-transparent'}`;
            case 'minimal':
                return `w-full h-12 sm:h-14 rounded-sm cursor-pointer transition-all duration-150 border transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-white border-gray-200 hover:bg-gray-50' : 'border-transparent'}`;
            case 'retro':
                return `w-full h-12 sm:h-14 rounded-none cursor-pointer transition-all duration-150 border-2 transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-[#1a1510] border-[#3a3025] hover:bg-[#2a2015]' : 'border-transparent'}`;
            case 'mpc':
                return `w-full h-12 sm:h-14 rounded-none cursor-pointer transition-all duration-150 border-2 border-b-4 border-r-4 border-[#333333] transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-[#D3D3D3] hover:bg-[#C0C0C0]' : 'border-transparent'}`;
            case 'cyberpunk':
                return `w-full h-12 sm:h-14 rounded-none cursor-pointer transition-all duration-150 border border-cyan-500 transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-black/50 hover:bg-black/70' : 'border-transparent'}`;
            default:
                return `w-full h-12 sm:h-14 rounded-md cursor-pointer transition-all duration-150 border transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-black/25 hover:bg-black/50 border-white/10' : 'border-transparent'}`;
        }
    };

    const getRingClasses = () => {
        if (!isPlayingStep) return '';
        switch (visualizerStyle) {
            case 'neon': return 'ring-2 ring-offset-2 ring-offset-[#050510] ring-fuchsia-400';
            case 'minimal': return 'ring-2 ring-offset-2 ring-offset-[#f5f5f5] ring-black';
            case 'retro': return 'ring-2 ring-offset-2 ring-offset-[#2b2118] ring-orange-500';
            case 'mpc': return 'ring-2 ring-offset-2 ring-offset-[#D3D3D3] ring-[#FF8C00]';
            case 'cyberpunk': return 'ring-2 ring-offset-2 ring-offset-black ring-cyan-400';
            default: return 'ring-2 ring-offset-2 ring-offset-gray-800 ring-cyan-300';
        }
    };

    const getShadowClasses = () => {
        if (!isDownbeat) return '';
        switch (visualizerStyle) {
            case 'neon': return 'shadow-[0_0_8px_rgba(255,0,255,0.2)]';
            case 'minimal': return 'shadow-sm';
            case 'retro': return '';
            case 'mpc': return 'shadow-[2px_2px_0px_rgba(0,0,0,0.3)]';
            case 'cyberpunk': return 'shadow-[0_0_5px_rgba(0,255,255,0.5)]';
            default: return 'shadow-[0_0_5px_rgba(200,220,255,0.3)]';
        }
    };

    const stepButtonClasses = `
        ${getBaseClasses()}
        ${getRingClasses()}
        ${getShadowClasses()}
    `;
    
    const getActiveStyle = () => {
        if (!isActive) return {};
        
        switch (visualizerStyle) {
            case 'neon':
                return { backgroundColor: color, boxShadow: `0 0 15px ${color}, inset 0 0 10px rgba(255,255,255,0.5)` };
            case 'minimal':
                return { backgroundColor: color };
            case 'retro':
                return { backgroundColor: color, boxShadow: `inset 2px 2px 0px rgba(255,255,255,0.3), inset -2px -2px 0px rgba(0,0,0,0.3)` };
            case 'mpc':
                return { backgroundColor: color, boxShadow: `inset 2px 2px 0px rgba(255,255,255,0.3), inset -2px -2px 0px rgba(0,0,0,0.3)` };
            case 'cyberpunk':
                return { backgroundColor: color, boxShadow: `0 0 15px ${color}, inset 0 0 10px rgba(255,255,255,0.5)` };
            default:
                return { backgroundColor: color, boxShadow: `${isDownbeat ? '0 0 5px rgba(200,220,255,0.3), ' : ''}0 0 9px ${color}` };
        }
    };

    const activeStyle = getActiveStyle();

    const getLabelClasses = () => {
        const base = `text-sm sm:text-base font-bold pointer-events-none transition-colors ${beatLabel === '1' || beatLabel === '2' || beatLabel === '3' || beatLabel === '4' ? 'font-extrabold' : ''}`;
        
        switch (visualizerStyle) {
            case 'minimal':
                return `${base} ${isActive ? 'text-white' : 'text-gray-400'}`;
            case 'retro':
                return `${base} font-mono ${isActive ? 'text-[#2b2118]' : 'text-[#5a4a35]'}`;
            case 'mpc':
                return `${base} font-sans ${isActive ? 'text-black' : 'text-[#5a4a35]'}`;
            case 'cyberpunk':
                return `${base} font-mono ${isActive ? 'text-white' : 'text-cyan-900'}`;
            default:
                return `${base} ${isActive ? 'text-gray-900' : 'text-gray-400'}`;
        }
    };

    const labelClasses = getLabelClasses();

    return (
        <button
            data-instrument-index={instrumentIndex}
            data-step-index={stepIndex}
            className={stepButtonClasses}
            style={activeStyle}
            aria-label={`Step ${stepIndex + 1}`}
            aria-pressed={isActive}
        >
            {beatLabel && (
                <span className={labelClasses}>
                    {beatLabel}
                </span>
            )}
        </button>
    );
};

// Memoize the component to prevent re-renders unless its specific props change.
// This is critical for performance when the playhead is moving.
export default React.memo(StepButton);