import React, { useState, useRef, useEffect, useCallback } from 'react';
import CollapsibleSection from './CollapsibleSection';
import Tooltip from './Tooltip';

export type VisualizerType = 'waveform' | 'lissajous' | 'spectrum';

interface SettingsProps {
    visualizer: VisualizerType;
    onVisualizerChange: (type: VisualizerType) => void;
    onShiftPattern: (direction: 'left' | 'right') => void;
    isPerformanceMode: boolean;
    onTogglePerformanceMode: () => void;
    onFactoryReset: () => void;
    tooltipsEnabled: boolean;
    onToggleTooltips: () => void;
    showBeatNumbers: boolean;
    onToggleBeatNumbers: () => void;
    beatsPerMeasure: number;
    onBeatsPerMeasureChange: (beats: number) => void;
    dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
    isDragging?: boolean;
}

// --- Sub-components (moved outside the main component function) ---

const RadioButton = ({ id, value, checked, onChange, label, type, disabled }: { id: string, value: any, checked: boolean, onChange: (val: any) => void, label: string, type: string, disabled?: boolean }) => (
    <label htmlFor={id} className={`flex items-center gap-2 text-sm text-gray-300 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        <input
            type="radio"
            id={id}
            name={type}
            value={value}
            checked={checked}
            onChange={() => onChange(value)}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600 ring-offset-gray-800 focus:ring-2 disabled:opacity-50"
        />
        {label}
    </label>
);

const ToggleSwitch: React.FC<{ isEnabled: boolean; onToggle: () => void; label: string; id: string }> = ({ isEnabled, onToggle, label, id }) => (
     <label htmlFor={id} className="flex items-center cursor-pointer">
        <span className="text-sm text-gray-300 mr-3">{label}</span>
        <div className="relative">
            <input id={id} type="checkbox" className="sr-only" checked={isEnabled} onChange={onToggle} />
            <div className={`block w-11 h-6 rounded-full transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-gray-600'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${isEnabled ? 'transform translate-x-5' : ''}`}></div>
        </div>
    </label>
);

const ArrowLeftIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.06 10l3.73 3.71a.75.75 0 11-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z" clipRule="evenodd" />
    </svg>
);

const ArrowRightIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25-4.25a.75.75 0 01-1.06 0z" clipRule="evenodd" />
    </svg>
);


const Settings: React.FC<SettingsProps> = ({ visualizer, onVisualizerChange, onShiftPattern, isPerformanceMode, onTogglePerformanceMode, onFactoryReset, tooltipsEnabled, onToggleTooltips, showBeatNumbers, onToggleBeatNumbers, beatsPerMeasure, onBeatsPerMeasureChange, dragHandleProps, isDragging }) => {
    // --- Factory Reset Button Logic ---
    const [resetProgress, setResetProgress] = useState(0);
    const [isPoofing, setIsPoofing] = useState(false);
    const resetTimerRef = useRef<number | null>(null);
    const resetRequestRef = useRef<number | null>(null);
    const HOLD_DURATION = 1500; // Longer hold time for a destructive action

    useEffect(() => {
        if (isPoofing) {
            const timer = setTimeout(() => {
                onFactoryReset();
                // No need to setIsPoofing(false) as the page will reload/reset state
            }, 300); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [isPoofing, onFactoryReset]);

    const handleResetStart = useCallback(() => {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        if (resetRequestRef.current) cancelAnimationFrame(resetRequestRef.current);

        const startTime = Date.now();
        resetTimerRef.current = window.setTimeout(() => {
            setIsPoofing(true);
            setResetProgress(0);
        }, HOLD_DURATION);

        const updateProgress = () => {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / HOLD_DURATION, 1);
            setResetProgress(progress);
            if (progress < 1) {
                resetRequestRef.current = requestAnimationFrame(updateProgress);
            }
        };
        resetRequestRef.current = requestAnimationFrame(updateProgress);
    }, []);

    const handleResetEnd = useCallback(() => {
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
        if (resetRequestRef.current) {
            cancelAnimationFrame(resetRequestRef.current);
            resetRequestRef.current = null;
        }
        setResetProgress(0);
    }, []);

    return (
        <CollapsibleSection title="Settings" dragHandleProps={dragHandleProps} isDragging={isDragging}>
            {(isOpen) => (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
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
                                    disabled={isPerformanceMode}
                                />
                                <RadioButton
                                    type="visualizer"
                                    id="vis-lissajous"
                                    value="lissajous"
                                    checked={visualizer === 'lissajous'}
                                    onChange={onVisualizerChange}
                                    label="Lissajous (Master)"
                                    disabled={isPerformanceMode}
                                />
                                <RadioButton
                                    type="visualizer"
                                    id="vis-spectrum"
                                    value="spectrum"
                                    checked={visualizer === 'spectrum'}
                                    onChange={onVisualizerChange}
                                    label="Frequency Spectrum"
                                    disabled={isPerformanceMode}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Beats Per Measure</h4>
                             <p className="text-xs text-gray-500 -mt-2">Changes the time signature.</p>
                            <div className="flex items-center gap-2">
                                {[3, 4, 5, 6, 7].map(bpm => (
                                    <Tooltip key={bpm} text={`${bpm}/4 Time Signature`}>
                                        <button
                                            onClick={() => onBeatsPerMeasureChange(bpm)}
                                            className={`flex items-center justify-center w-10 h-10 rounded-md font-bold text-lg transition-all duration-150 active:scale-[0.98] ${
                                                beatsPerMeasure === bpm
                                                    ? 'bg-blue-600 text-white ring-2 ring-offset-2 ring-offset-gray-800 ring-blue-500'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            {bpm}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Shift Active Pattern</h4>
                            <p className="text-xs text-gray-500 -mt-2">Nudge all notes left or right.</p>
                            <div className="flex items-center gap-2">
                                <Tooltip text="Shift pattern notes left">
                                    <button
                                        onClick={() => onShiftPattern('left')}
                                        className="flex items-center justify-center w-12 h-10 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 active:scale-[0.98]"
                                        aria-label="Shift pattern left"
                                    >
                                        <ArrowLeftIcon />
                                    </button>
                                </Tooltip>
                                <Tooltip text="Shift pattern notes right">
                                    <button
                                        onClick={() => onShiftPattern('right')}
                                        className="flex items-center justify-center w-12 h-10 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 active:scale-[0.98]"
                                        aria-label="Shift pattern right"
                                    >
                                        <ArrowRightIcon />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">UI & Performance</h4>
                            <p className="text-xs text-gray-500 -mt-2">Customize the user interface.</p>
                            <div className="flex flex-col gap-3">
                                <Tooltip text="Show or hide helpful tooltips throughout the app">
                                    <ToggleSwitch
                                        id="tooltip-toggle"
                                        isEnabled={tooltipsEnabled}
                                        onToggle={onToggleTooltips}
                                        label="Enable Tooltips"
                                    />
                                </Tooltip>
                                <Tooltip text="Show rhythmic subdivisions (1e&a) on each sequencer step">
                                     <ToggleSwitch
                                        id="beat-numbers-toggle"
                                        isEnabled={showBeatNumbers}
                                        onToggle={onToggleBeatNumbers}
                                        label="Show Beat Subdivisions"
                                    />
                                </Tooltip>
                                <Tooltip text="Disable all animations for improved performance">
                                    <ToggleSwitch
                                        id="perf-toggle"
                                        isEnabled={isPerformanceMode}
                                        onToggle={onTogglePerformanceMode}
                                        label="Performance Mode"
                                    />
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 mt-8 pt-6 flex flex-col items-center">
                        <p className="text-xs text-gray-400 text-center max-w-xs mb-2">
                            This will erase all patterns and settings. Please refresh the page after a factory reset.
                        </p>
                        <Tooltip text="Hold to erase all patterns and restore all settings to their original defaults.">
                            <button
                                onMouseDown={handleResetStart}
                                onMouseUp={handleResetEnd}
                                onMouseLeave={handleResetEnd}
                                onTouchStart={(e) => { e.preventDefault(); handleResetStart(); }}
                                onTouchEnd={handleResetEnd}
                                className={`relative flex items-center justify-center mt-2 px-4 h-10 bg-red-900/80 text-white font-bold rounded-md hover:bg-red-800/80 transition-transform duration-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 text-sm uppercase tracking-wider overflow-hidden select-none ${isPoofing ? 'animate-poof' : ''}`}
                                style={{ transform: `scale(${1 - resetProgress * 0.15})` }}
                                aria-label="Hold to factory reset the application"
                            >
                                <span className="relative z-10">
                                    FACTORY RESET
                                </span>
                            </button>
                        </Tooltip>
                    </div>
                </>
            )}
        </CollapsibleSection>
    );
};

export default Settings;