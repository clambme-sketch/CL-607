import React from 'react';
import { KickDesignerParams } from '../types';

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
    displayTransform?: (value: number) => string;
}

const KICK_DESIGNER_CONFIG: ParamConfig[] = [
    // Main Envelope
    { name: 'attack', label: 'Attack', min: 0, max: 1, step: 0.01, displayTransform: (v) => `${(v * 10).toFixed(1)}ms` },
    { name: 'decay', label: 'Decay', min: 0.5, max: 2, step: 0.01 },
    
    // Pitch & Pitch Envelope
    { name: 'pitch', label: 'Pitch', min: 0.5, max: 2, step: 0.01 },
    { name: 'startFreq', label: 'Pitch Env Start', min: 500, max: 5000, step: 100, displayTransform: (v) => `${(v / 1000).toFixed(1)}k` },
    { name: 'pitchDropTime', label: 'Pitch Env Time', min: 0.01, max: 0.15, step: 0.001, displayTransform: (v) => `${(v * 1000).toFixed(0)}ms` },
   
    // Click (Noise Transient)
    { name: 'clickMix', label: 'Click Level', min: 0, max: 1, step: 0.01, displayTransform: (v) => `${(v * 100).toFixed(0)}%` },
    { name: 'clickTone', label: 'Click Tone', min: 1000, max: 10000, step: 100, displayTransform: (v) => `${(v / 1000).toFixed(1)}k` },
    { name: 'clickDecay', label: 'Click Decay', min: 0.005, max: 0.05, step: 0.001, displayTransform: (v) => `${(v * 1000).toFixed(0)}ms` },
    
    // Tone Shaping
    { name: 'bodyGain', label: 'Body Level', min: 0.5, max: 1.2, step: 0.01, displayTransform: (v) => `${(v * 100).toFixed(0)}%` },
    { name: 'saturationAmount', label: 'Saturation', min: 0.5, max: 10, step: 0.1, displayTransform: (v) => v.toFixed(1) },
];


// --- MAIN COMPONENT ---

const KickDrumDesigner: React.FC<KickDrumDesignerProps> = ({ isActive, params, onParamChange }) => {
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
                <input
                    type="range"
                    id={`kick-${paramConfig.name}`}
                    min={paramConfig.min}
                    max={paramConfig.max}
                    step={paramConfig.step}
                    value={value}
                    onChange={(e) => onParamChange(paramConfig.name, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer col-span-2 accent-purple-400"
                />
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