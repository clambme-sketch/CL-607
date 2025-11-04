import React from 'react';
import CollapsibleSection from './CollapsibleSection';
import { INSTRUMENTS, INSTRUMENT_LABELS } from '../constants';

export type VisualizerType = 'waveform' | 'lissajous' | 'spectrum';

interface SettingsProps {
    visualizer: VisualizerType;
    onVisualizerChange: (type: VisualizerType) => void;
    onShiftPattern: (direction: 'left' | 'right') => void;
}

// --- Sub-components (moved outside the main component function) ---

const RadioButton = ({ id, value, checked, onChange, label, type }: { id: string, value: any, checked: boolean, onChange: (val: any) => void, label: string, type: string }) => (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
        <input
            type="radio"
            id={id}
            name={type}
            value={value}
            checked={checked}
            onChange={() => onChange(value)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600 ring-offset-gray-800 focus:ring-2"
        />
        {label}
    </label>
);

const ArrowLeftIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z" clipRule="evenodd" />
    </svg>
);

const ArrowRightIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z" clipRule="evenodd" />
    </svg>
);


const Settings: React.FC<SettingsProps> = ({ visualizer, onVisualizerChange, onShiftPattern }) => {
    return (
        <CollapsibleSection title="Settings">
            {(isOpen) => (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col gap-3">
                        <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Sequencer Background</h4>
                        <div className="flex flex-col gap-2">
                            <RadioButton
                                type="visualizer"
                                id="vis-waveform"
                                value="waveform"
                                checked={visualizer === 'waveform'}
                                onChange={onVisualizerChange}
                                label="Multi-Waveform"
                            />
                             <RadioButton
                                type="visualizer"
                                id="vis-lissajous"
                                value="lissajous"
                                checked={visualizer === 'lissajous'}
                                onChange={onVisualizerChange}
                                label="Lissajous (Master)"
                            />
                            <RadioButton
                                type="visualizer"
                                id="vis-spectrum"
                                value="spectrum"
                                checked={visualizer === 'spectrum'}
                                onChange={onVisualizerChange}
                                label="Frequency Spectrum"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Shift Active Pattern</h4>
                        <p className="text-xs text-gray-500 -mt-2">Nudge all notes left or right.</p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onShiftPattern('left')}
                                className="flex items-center justify-center w-12 h-10 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 active:scale-[0.98]"
                                aria-label="Shift pattern left"
                            >
                                <ArrowLeftIcon />
                            </button>
                            <button
                                onClick={() => onShiftPattern('right')}
                                className="flex items-center justify-center w-12 h-10 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 active:scale-[0.98]"
                                aria-label="Shift pattern right"
                            >
                                <ArrowRightIcon />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CollapsibleSection>
    );
};

export default Settings;