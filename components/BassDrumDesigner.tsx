import React, { useState, useCallback } from 'react';
import { KickDesignerParams, VisualizerStyle } from '../types';
import Tooltip from './Tooltip';
import { getButtonStyle } from '../utils';

interface KickDrumDesignerProps {
    isActive: boolean;
    params: KickDesignerParams;
    onParamChange: (param: keyof KickDesignerParams, value: number) => void;
    volume?: number;
    onVolumeChange?: (value: number) => void;
    color?: string;
    isMuted?: boolean;
    isSoloed?: boolean;
    onToggleMute?: () => void;
    onToggleSolo?: () => void;
    showMuteSoloButtons?: boolean;
    visualizerStyle?: VisualizerStyle;
}

// --- PARAMETER CONFIG ---

type ParamConfig = {
    name: keyof KickDesignerParams;
    label: string;
    min: number;
    max: number;
    step: number;
    tooltip: string;
    displayTransform?: (value: number) => string;
}

const KICK_DESIGNER_CONFIG: ParamConfig[] = [
    // Main Envelope
    { name: 'attack', label: 'Attack', min: 0, max: 1, step: 0.01, tooltip: "Softens the initial transient of the kick drum.", displayTransform: (v) => `${(v * 10).toFixed(1)}ms` },
    { name: 'decay', label: 'Decay', min: 0.5, max: 2, step: 0.01, tooltip: "Controls the overall length of the kick drum sound." },
    
    // Pitch & Pitch Envelope
    { name: 'pitch', label: 'Pitch', min: 0.5, max: 2, step: 0.01, tooltip: "Sets the fundamental (bass) frequency of the kick." },
    { name: 'startFreq', label: 'Pitch Env Start', min: 500, max: 5000, step: 100, tooltip: "The starting frequency of the kick's pitch drop.", displayTransform: (v) => `${(v / 1000).toFixed(1)}k` },
    { name: 'pitchDropTime', label: 'Pitch Env Time', min: 0.01, max: 0.15, step: 0.001, tooltip: "How quickly the pitch drops from start to fundamental.", displayTransform: (v) => `${(v * 1000).toFixed(0)}ms` },
   
    // Click (Noise Transient)
    { name: 'clickMix', label: 'Click Level', min: 0, max: 1, step: 0.01, tooltip: "The volume of the initial 'beater' noise.", displayTransform: (v) => `${(v * 100).toFixed(0)}%` },
    { name: 'clickTone', label: 'Click Tone', min: 1000, max: 10000, step: 100, tooltip: "The frequency of the initial 'beater' noise.", displayTransform: (v) => `${(v / 1000).toFixed(1)}k` },
    { name: 'clickDecay', label: 'Click Decay', min: 0.005, max: 0.05, step: 0.001, tooltip: "The length of the initial 'beater' noise.", displayTransform: (v) => `${(v * 1000).toFixed(0)}ms` },
    
    // Tone Shaping
    { name: 'bodyGain', label: 'Body Level', min: 0.5, max: 1.2, step: 0.01, tooltip: "The volume of the kick's sine wave component.", displayTransform: (v) => `${(v * 100).toFixed(0)}%` },
    { name: 'saturationAmount', label: 'Saturation', min: 0.5, max: 10, step: 0.1, tooltip: "Adds harmonic distortion for warmth and grit.", displayTransform: (v) => v.toFixed(1) },
];


// --- MAIN COMPONENT ---

const KickDrumDesigner: React.FC<KickDrumDesignerProps> = ({
    isActive,
    params,
    onParamChange,
    volume = 0.3,
    onVolumeChange,
    color,
    isMuted = false,
    isSoloed = false,
    onToggleMute,
    onToggleSolo,
    showMuteSoloButtons = true,
    visualizerStyle = 'default',
}) => {
    const [isInteracting, setIsInteracting] = useState(false);
    const isMinimal = visualizerStyle === 'minimal';

    const handleSliderInteractionStart = useCallback(() => {
        setIsInteracting(true);
        const handleInteractionEnd = () => {
            setIsInteracting(false);
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

    if (!isActive) {
        return null;
    }

    const renderParamSlider = (paramConfig: ParamConfig) => {
         const value = params[paramConfig.name];
         return (
            <div key={paramConfig.name} className="grid grid-cols-4 items-center gap-2">
                <label htmlFor={`kick-${paramConfig.name}`} className="text-xs text-gray-400 col-span-1">
                    {paramConfig.label}
                </label>
                <Tooltip text={paramConfig.tooltip} isInteracting={isInteracting} wrapperClassName="col-span-2">
                    <input
                        type="range"
                        id={`kick-${paramConfig.name}`}
                        min={paramConfig.min}
                        max={paramConfig.max}
                        step={paramConfig.step}
                        value={value}
                        onChange={(e) => onParamChange(paramConfig.name, parseFloat(e.target.value))}
                        {...sliderInteractionProps}
                        className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-400"
                        style={color ? { accentColor: color } : undefined}
                    />
                </Tooltip>
                <span className="font-mono text-xs text-gray-500 text-right tabular-nums col-span-1">
                    {paramConfig.displayTransform ? paramConfig.displayTransform(value) : value.toFixed(2)}
                </span>
            </div>
         );
    };

    return (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {onVolumeChange && (
                <div className="grid grid-cols-4 items-center gap-2">
                    <label htmlFor="kick-volume" className="text-xs text-gray-400 col-span-1">
                        Volume
                    </label>
                    <div className="col-span-2 flex items-center gap-1.5">
                        <Tooltip
                            text="Adjust Kick volume (synced with sequencer track slider)."
                            isInteracting={isInteracting}
                            wrapperClassName="flex-1 min-w-0"
                        >
                            <input
                                type="range"
                                id="kick-volume"
                                min={0}
                                max={1}
                                step={0.01}
                                value={volume}
                                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                {...sliderInteractionProps}
                                className={`w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-400 ${isMuted ? 'opacity-40' : ''}`}
                                style={color ? { accentColor: color } : undefined}
                            />
                        </Tooltip>
                        {showMuteSoloButtons && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <Tooltip text={isMuted ? "Unmute Kick" : "Mute Kick"}>
                                    <button
                                        type="button"
                                        onClick={onToggleMute}
                                        aria-pressed={isMuted}
                                        aria-label="Mute Kick"
                                        className={
                                            isMinimal
                                                ? `px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                                                    isMuted
                                                        ? 'bg-[#ff3b1d] text-[#09090b] border-[#ff3b1d]'
                                                        : 'bg-[#141417] text-[#a1a1aa] border-[#27272a] hover:text-[#f4f4f5]'
                                                }`
                                                : getButtonStyle(
                                                    visualizerStyle,
                                                    isMuted ? 'danger' : 'secondary',
                                                    isMuted,
                                                    false,
                                                    '!px-1.5 !py-0.5 !text-[10px] font-mono uppercase tracking-wider'
                                                )
                                        }
                                    >
                                        Mute
                                    </button>
                                </Tooltip>
                                <Tooltip text={isSoloed ? "Unsolo Kick" : "Solo Kick"}>
                                    <button
                                        type="button"
                                        onClick={onToggleSolo}
                                        aria-pressed={isSoloed}
                                        aria-label="Solo Kick"
                                        className={
                                            isMinimal
                                                ? `px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                                                    isSoloed
                                                        ? 'bg-[#facc15] text-[#09090b] border-[#facc15]'
                                                        : 'bg-[#141417] text-[#a1a1aa] border-[#27272a] hover:text-[#f4f4f5]'
                                                }`
                                                : getButtonStyle(
                                                    visualizerStyle,
                                                    isSoloed ? 'primary' : 'secondary',
                                                    isSoloed,
                                                    false,
                                                    '!px-1.5 !py-0.5 !text-[10px] font-mono uppercase tracking-wider'
                                                )
                                        }
                                    >
                                        Solo
                                    </button>
                                </Tooltip>
                            </div>
                        )}
                    </div>
                    <span className="font-mono text-xs text-gray-500 text-right tabular-nums col-span-1">
                        {Math.round(volume * 100)}%
                    </span>
                </div>
            )}
            {KICK_DESIGNER_CONFIG.map(p => renderParamSlider(p))}
        </div>
    );
};

export default React.memo(KickDrumDesigner);
