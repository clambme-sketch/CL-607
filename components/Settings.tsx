import React, { useState, useRef, useEffect, useCallback } from 'react';
import CollapsibleSection from './CollapsibleSection';
import Tooltip from './Tooltip';
import { Instrument, VisualizerType, VisualizerStyle } from '../types';
import { getButtonStyle } from '../utils';

interface SettingsProps {
    visualizer: VisualizerType;
    onVisualizerChange: (type: VisualizerType) => void;
    visualizerStyle: VisualizerStyle;
    onVisualizerStyleChange: (style: VisualizerStyle) => void;
    drumKit: '808' | '909' | '727';
    onDrumKitChange: (kit: '808' | '909' | '727') => void;
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
    keyboardDrummingEnabled: boolean;
    onToggleKeyboardDrumming: () => void;
    keyboardMap: Record<string, Instrument>;
    onUpdateKeyboardMap: (key: string, instrument: Instrument) => void;
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


const Settings: React.FC<SettingsProps> = ({ 
    visualizer, 
    onVisualizerChange, 
    visualizerStyle,
    onVisualizerStyleChange,
    drumKit,
    onDrumKitChange,
    onShiftPattern, 
    isPerformanceMode, 
    onTogglePerformanceMode, 
    onFactoryReset, 
    tooltipsEnabled, 
    onToggleTooltips, 
    showBeatNumbers, 
    onToggleBeatNumbers, 
    beatsPerMeasure, 
    onBeatsPerMeasureChange, 
    keyboardDrummingEnabled,
    onToggleKeyboardDrumming,
    keyboardMap,
    onUpdateKeyboardMap,
    dragHandleProps, 
    isDragging 
}) => {
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

    const [editingKeyFor, setEditingKeyFor] = useState<Instrument | null>(null);

    useEffect(() => {
        if (!editingKeyFor) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            const key = e.key.toLowerCase();
            
            // Allow alphanumeric keys and some common symbols
            if (/^[a-z0-9;:'",.<>/?\\|\[\]{}!@#$%^&*()_+-=]$/.test(key)) {
                onUpdateKeyboardMap(key, editingKeyFor);
                setEditingKeyFor(null);
            } else if (e.key === 'Escape') {
                setEditingKeyFor(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingKeyFor, onUpdateKeyboardMap]);

    return (
        <CollapsibleSection title="Settings" dragHandleProps={dragHandleProps} isDragging={isDragging}>
            {(isOpen) => (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Visuals Section */}
                        <div className="flex flex-col gap-6">
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
                                <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Visual Style</h4>
                                <div className="flex flex-col gap-2">
                                    <RadioButton
                                        type="visualizerStyle"
                                        id="style-default"
                                        value="default"
                                        checked={visualizerStyle === 'default'}
                                        onChange={onVisualizerStyleChange}
                                        label="Default"
                                    />
                                    <RadioButton
                                        type="visualizerStyle"
                                        id="style-neon"
                                        value="neon"
                                        checked={visualizerStyle === 'neon'}
                                        onChange={onVisualizerStyleChange}
                                        label="Neon Dreams"
                                    />
                                    <RadioButton
                                        type="visualizerStyle"
                                        id="style-minimal"
                                        value="minimal"
                                        checked={visualizerStyle === 'minimal'}
                                        onChange={onVisualizerStyleChange}
                                        label="Minimalist"
                                    />
                                    <RadioButton
                                        type="visualizerStyle"
                                        id="style-retro"
                                        value="retro"
                                        checked={visualizerStyle === 'retro'}
                                        onChange={onVisualizerStyleChange}
                                        label="Retro Terminal"
                                    />
                                    <RadioButton
                                        type="visualizerStyle"
                                        id="style-mpc"
                                        value="mpc"
                                        checked={visualizerStyle === 'mpc'}
                                        onChange={onVisualizerStyleChange}
                                        label="MPC Inspired"
                                    />
                                    <RadioButton
                                        type="visualizerStyle"
                                        id="style-cyberpunk"
                                        value="cyberpunk"
                                        checked={visualizerStyle === 'cyberpunk'}
                                        onChange={onVisualizerStyleChange}
                                        label="Cyberpunk"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Drum Kit</h4>
                                <div className="flex flex-col gap-2">
                                    <RadioButton
                                        type="drumKit"
                                        id="kit-808"
                                        value="808"
                                        checked={drumKit === '808'}
                                        onChange={onDrumKitChange}
                                        label="Classic 808"
                                    />
                                    <RadioButton
                                        type="drumKit"
                                        id="kit-909"
                                        value="909"
                                        checked={drumKit === '909'}
                                        onChange={onDrumKitChange}
                                        label="Roland 909"
                                    />
                                    <RadioButton
                                        type="drumKit"
                                        id="kit-727"
                                        value="727"
                                        checked={drumKit === '727'}
                                        onChange={onDrumKitChange}
                                        label="Roland 727 (Latin)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sequencer Controls Section */}
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-3">
                                <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Beats Per Measure</h4>
                                 <p className="text-xs text-gray-500 -mt-2">Changes the time signature.</p>
                                <div className="flex items-center gap-2">
                                    {[3, 4, 5, 6, 7].map(bpm => (
                                        <Tooltip key={bpm} text={`${bpm}/4 Time Signature`}>
                                            <button
                                                onClick={() => onBeatsPerMeasureChange(bpm)}
                                                className={getButtonStyle(visualizerStyle, beatsPerMeasure === bpm ? 'primary' : 'secondary', beatsPerMeasure === bpm, false, 'flex items-center justify-center w-10 h-10 text-lg')}
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
                                            className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'flex items-center justify-center w-12 h-10')}
                                            aria-label="Shift pattern left"
                                        >
                                            <ArrowLeftIcon />
                                        </button>
                                    </Tooltip>
                                    <Tooltip text="Shift pattern notes right">
                                        <button
                                            onClick={() => onShiftPattern('right')}
                                            className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'flex items-center justify-center w-12 h-10')}
                                            aria-label="Shift pattern right"
                                        >
                                            <ArrowRightIcon />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>

                        {/* Keyboard Drumming Section */}
                        <div className="flex flex-col gap-3">
                            <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Keyboard Drumming</h4>
                            <p className="text-xs text-gray-500 -mt-2">Play drums with your keyboard.</p>
                            <div className="flex flex-col gap-3">
                                <Tooltip text="Enable playing drums using your computer keyboard">
                                    <ToggleSwitch
                                        id="keyboard-drumming-toggle"
                                        isEnabled={keyboardDrummingEnabled}
                                        onToggle={onToggleKeyboardDrumming}
                                        label="Enable Keyboard Drumming"
                                    />
                                </Tooltip>
                                
                                {keyboardDrummingEnabled && (
                                    <div className="mt-2 flex flex-col gap-2 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                                        <div className="text-xs text-gray-400 mb-1">Click a key to remap it, then press the new key.</div>
                                        {(['kick', 'snare', 'hihat', 'snap', 'clave', 'cowbell', 'sample'] as Instrument[]).map((inst) => {
                                            // Find the key mapped to this instrument
                                            const mappedKey = Object.entries(keyboardMap).find(([_, i]) => i === inst)?.[0] || 'Unmapped';
                                            const isEditing = editingKeyFor === inst;
                                            
                                            return (
                                                <div key={inst} className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-300 capitalize">{inst}</span>
                                                    <button
                                                        onClick={() => setEditingKeyFor(isEditing ? null : inst)}
                                                        className={getButtonStyle(visualizerStyle, isEditing ? 'primary' : 'secondary', isEditing, false, `px-3 py-1 font-mono text-xs ${isEditing ? 'animate-pulse' : ''}`)}
                                                    >
                                                        {isEditing ? 'Press any key...' : mappedKey.toUpperCase()}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* UI & Performance Section */}
                        <div className="flex flex-col gap-3">
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
                                className={`${getButtonStyle(visualizerStyle, 'danger', false, false, 'mt-2 px-4 h-10 text-sm overflow-hidden')} ${isPoofing ? 'animate-poof' : ''}`}
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