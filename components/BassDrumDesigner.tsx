import React, { useState, useCallback } from 'react';
import { KickDesignerParams } from '../types';
import Tooltip from './Tooltip';

interface KickDrumDesignerProps {
    isActive: boolean;
    params: KickDesignerParams;
    onParamChange: (param: keyof KickDesignerParams, value: number) => void;
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

const KickDrumDesigner: React.FC<KickDrumDesignerProps> = ({ isActive, params, onParamChange }) => {
    const [isInteracting, setIsInteracting] = useState(false);

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
                    />
                </Tooltip>
                <span className="text-xs text-gray-500 text-right tabular-nums col-span-1">
                    {paramConfig.displayTransform ? paramConfig.displayTransform(value) : value.toFixed(2)}
                </span>
            </div>
         );
    }

    return (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {KICK_DESIGNER_CONFIG.map(p => renderParamSlider(p))}
        </div>
    );
};

export default React.memo(KickDrumDesigner);
