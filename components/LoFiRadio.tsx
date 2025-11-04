import React from 'react';
import XYOscilloscope from './XYOscilloscope';

interface LoFiRadioProps {
    isActive: boolean;
    lofiMix: number;
    onLofiMixChange: (value: number) => void;
    dryAnalyser: AnalyserNode | null;
    wetAnalyser: AnalyserNode | null;
}

const LoFiRadio: React.FC<LoFiRadioProps> = ({ isActive, lofiMix, onLofiMixChange, dryAnalyser, wetAnalyser }) => {
    return (
        <div className="w-48 p-3 rounded-lg bg-gray-900/50 flex flex-col items-center gap-3">
            {/* Radio Body */}
            <div className="w-full h-28 bg-yellow-900/40 rounded-md border-2 border-yellow-900/80 shadow-inner flex p-2 gap-2">
                {/* Speaker Grill */}
                <div 
                    className="w-1/3 h-full bg-repeat rounded-sm opacity-50"
                    style={{ backgroundImage: 'radial-gradient(#a16207 1px, transparent 1px)', backgroundSize: '4px 4px' }} 
                />
                {/* Dial and Scope */}
                <div className="w-2/3 h-full bg-black/50 rounded-sm relative overflow-hidden">
                    <XYOscilloscope isActive={isActive} wetAnalyser={wetAnalyser} />
                </div>
            </div>
            {/* Controls */}
            <div className="w-full flex flex-col items-center gap-2 text-xs">
                <div className="w-full flex items-center gap-2">
                    <label htmlFor="lofi-mix" className="text-gray-500 w-10 flex-shrink-0">LO-FI</label>
                    <input 
                        type="range" 
                        id="lofi-mix" 
                        min={0} 
                        max={1} 
                        step={0.01} 
                        value={lofiMix} 
                        onChange={(e) => onLofiMixChange(Number(e.target.value))} 
                        className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                </div>
            </div>
        </div>
    );
};

export default LoFiRadio;