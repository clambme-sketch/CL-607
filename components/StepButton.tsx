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
                return `w-full h-12 sm:h-14 rounded-md cursor-pointer transition-all duration-150 border transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-[#090514] border-cyan-900/50 hover:bg-[#1a0b2e]' : 'border-transparent'}`;
            case 'minimal':
                return `w-full h-12 sm:h-14 rounded-sm cursor-pointer transition-all duration-150 border transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-white border-gray-200 hover:bg-gray-50' : 'border-transparent'}`;
            case 'retro':
                return `w-full h-12 sm:h-14 rounded-sm cursor-pointer transition-all duration-150 border-2 border-b-4 border-r-4 transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-[#f4f4e8] border-[#d0d0c0] hover:bg-[#ffffff]' : 'border-transparent'}`;
            case 'mpc':
                return `w-full h-12 sm:h-14 rounded-none cursor-pointer transition-all duration-150 border-2 border-b-4 border-r-4 border-[#333333] transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-[#D3D3D3] hover:bg-[#C0C0C0]' : 'border-transparent'}`;
            case 'cyberpunk':
                return `w-full h-12 sm:h-14 rounded-none cursor-pointer transition-all duration-150 border transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-[#0a0a0c] border-[#00ff9f]/30 hover:bg-[#00ff9f]/10' : 'border-transparent'}`;
            default:
                return `w-full h-12 sm:h-14 rounded-md cursor-pointer transition-all duration-150 border transform active:scale-[0.97] flex items-center justify-center ${!isActive ? 'bg-black/25 hover:bg-black/50 border-white/10' : 'border-transparent'}`;
        }
    };

    const getRingClasses = () => {
        if (!isPlayingStep) return '';
        switch (visualizerStyle) {
            case 'neon': return 'ring-2 ring-offset-2 ring-offset-[#090514] ring-cyan-400';
            case 'minimal': return 'ring-2 ring-offset-2 ring-offset-white ring-black';
            case 'retro': return 'ring-2 ring-offset-2 ring-offset-[#2b2b2b] ring-[#ff7700]';
            case 'mpc': return 'ring-2 ring-offset-2 ring-offset-[#D3D3D3] ring-[#FF8C00]';
            case 'cyberpunk': return 'ring-2 ring-offset-2 ring-offset-black ring-[#00ff9f]';
            default: return 'ring-2 ring-offset-2 ring-offset-gray-800 ring-cyan-300';
        }
    };

    const getShadowClasses = () => {
        if (!isDownbeat) return '';
        switch (visualizerStyle) {
            case 'neon': return 'shadow-[0_0_8px_rgba(34,211,238,0.2)]';
            case 'minimal': return 'shadow-sm';
            case 'retro': return 'shadow-sm';
            case 'mpc': return 'shadow-[2px_2px_0px_rgba(0,0,0,0.3)]';
            case 'cyberpunk': return 'shadow-[0_0_5px_rgba(0,255,159,0.5)]';
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
                return { backgroundColor: color, borderColor: '#a0a090', borderBottomWidth: '2px', borderRightWidth: '2px', transform: 'translate(2px, 2px)' };
            case 'mpc':
                return { backgroundColor: color, boxShadow: `inset 2px 2px 0px rgba(255,255,255,0.3), inset -2px -2px 0px rgba(0,0,0,0.3)` };
            case 'cyberpunk':
                return { backgroundColor: color, boxShadow: `4px 4px 0px #00ff9f`, transform: 'translate(-2px, -2px)' };
            default:
                return { backgroundColor: color, boxShadow: `${isDownbeat ? '0 0 5px rgba(200,220,255,0.3), ' : ''}0 0 9px ${color}` };
        }
    };

    const activeStyle = getActiveStyle();

    const getLabelClasses = () => {
        const base = `text-sm sm:text-base font-bold pointer-events-none transition-colors ${beatLabel === '1' || beatLabel === '2' || beatLabel === '3' || beatLabel === '4' ? 'font-extrabold' : ''}`;
        
        switch (visualizerStyle) {
            case 'neon':
                return `${base} ${isActive ? 'text-white' : 'text-cyan-800'}`;
            case 'minimal':
                return `${base} ${isActive ? 'text-white' : 'text-gray-400'}`;
            case 'retro':
                return `${base} font-sans ${isActive ? 'text-white' : 'text-[#a0a090]'}`;
            case 'mpc':
                return `${base} font-sans ${isActive ? 'text-black' : 'text-[#5a4a35]'}`;
            case 'cyberpunk':
                return `${base} font-mono uppercase ${isActive ? 'text-black' : 'text-[#00ff9f]/50'}`;
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