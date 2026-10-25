// CL-607 System & Sequencer Settings (v1.1.0)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Instrument, VisualizerType, VisualizerStyle, PadLabelMode } from '../types';
import { INSTRUMENTS, INSTRUMENT_LABELS } from '../constants';
import CollapsibleSection from './CollapsibleSection';
import Tooltip from './Tooltip';
import { getButtonStyle, getThemeSurface, VISUAL_STYLE_OPTIONS } from '../utils';

interface SettingsProps {
    visualizer: VisualizerType;
    onVisualizerChange: (visualizer: VisualizerType) => void;
    visualizerStyle: VisualizerStyle;
    onVisualizerStyleChange: (style: VisualizerStyle) => void;
    drumKit: '808' | '909' | '727';
    onDrumKitChange: (kit: '808' | '909' | '727') => void;
    onShiftPattern: (direction: 'left' | 'right') => void;
    isPerformanceMode: boolean;
    onTogglePerformanceMode: () => void;
    isSlowComputerMode: boolean;
    onToggleSlowComputerMode: () => void;
    onFactoryReset: () => void;
    tooltipsEnabled: boolean;
    onToggleTooltips: () => void;
    showBeatNumbers: boolean;
    onToggleBeatNumbers: () => void;
    padLabelMode?: PadLabelMode;
    onSetPadLabelMode?: (mode: PadLabelMode) => void;
    beatsPerMeasure: number;
    onBeatsPerMeasureChange: (beats: number) => void;
    keyboardDrummingEnabled: boolean;
    onToggleKeyboardDrumming: () => void;
    keyboardMap: Record<string, Instrument>;
    onUpdateKeyboardMap: (key: string, instrument: Instrument) => void;
    isInvertColors: boolean;
    onToggleInvertColors: () => void;
    showMuteSoloButtons?: boolean;
    onToggleShowMuteSoloButtons?: () => void;
    quantizePatternSwitch?: boolean;
    onToggleQuantizePatternSwitch?: () => void;
    onToggleCappuccinoMode: () => void;
    sixSevenSpeed: number;
    onSixSevenSpeedChange: (speed: number) => void;
    isColorAnimating?: boolean;
    onToggleColorAnimation?: () => void;
    sectionIndex?: number;
    onSectionPointerDown?: (e: React.PointerEvent, index: number) => void;
    isDragging?: boolean;
}

const KIT_OPTIONS: ('808' | '909' | '727')[] = ['808', '909', '727'];

const VISUALIZER_MODES: { id: VisualizerType; label: string }[] = [
    { id: 'waveform', label: 'Waveform' },
    { id: 'lissajous', label: 'Lissajous' },
    { id: 'spectrum', label: 'Spectrum' },
];

const BEATS_PER_MEASURE_OPTIONS = [2, 3, 4, 5, 6, 7];

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
    isSlowComputerMode,
    onToggleSlowComputerMode,
    onFactoryReset,
    tooltipsEnabled,
    onToggleTooltips,
    showBeatNumbers,
    onToggleBeatNumbers,
    padLabelMode,
    onSetPadLabelMode,
    beatsPerMeasure,
    onBeatsPerMeasureChange,
    keyboardDrummingEnabled,
    onToggleKeyboardDrumming,
    keyboardMap,
    onUpdateKeyboardMap,
    isInvertColors,
    onToggleInvertColors,
    showMuteSoloButtons = true,
    onToggleShowMuteSoloButtons,
    quantizePatternSwitch = true,
    onToggleQuantizePatternSwitch,
    onToggleCappuccinoMode,
    sixSevenSpeed,
    onSixSevenSpeedChange,
    sectionIndex,
    onSectionPointerDown,
    isDragging,
}) => {
    const [listeningForInstrument, setListeningForInstrument] = useState<Instrument | null>(null);
    const [isConfirmingReset, setIsConfirmingReset] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const visualStyleClickRef = React.useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

    const effectivePadLabelMode: PadLabelMode = padLabelMode ?? (showBeatNumbers ? 'subdivisions' : 'off');

    const handleToggleSubdivisions = useCallback(() => {
        const nextMode: PadLabelMode = effectivePadLabelMode === 'subdivisions' ? 'off' : 'subdivisions';
        if (onSetPadLabelMode) {
            onSetPadLabelMode(nextMode);
        } else if (onToggleBeatNumbers) {
            onToggleBeatNumbers();
        }
    }, [effectivePadLabelMode, onSetPadLabelMode, onToggleBeatNumbers]);

    const handleToggleSyllables = useCallback(() => {
        const nextMode: PadLabelMode = effectivePadLabelMode === 'syllables' ? 'off' : 'syllables';
        if (onSetPadLabelMode) {
            onSetPadLabelMode(nextMode);
        } else if (onToggleBeatNumbers) {
            onToggleBeatNumbers();
        }
    }, [effectivePadLabelMode, onSetPadLabelMode, onToggleBeatNumbers]);

    const handleVisualStyleHeadingClick = useCallback(() => {
        const now = Date.now();
        if (now - visualStyleClickRef.current.lastTime < 600) {
            visualStyleClickRef.current.count += 1;
        } else {
            visualStyleClickRef.current.count = 1;
        }
        visualStyleClickRef.current.lastTime = now;

        if (visualStyleClickRef.current.count >= 3) {
            visualStyleClickRef.current.count = 0;
            onToggleCappuccinoMode();
        }
    }, [onToggleCappuccinoMode]);

    // Reverse lookup: Instrument -> assigned key
    const getKeyForInstrument = useCallback((inst: Instrument): string => {
        const entry = Object.entries(keyboardMap).find(([, mappedInst]) => mappedInst === inst);
        return entry ? entry[0].toUpperCase() : '—';
    }, [keyboardMap]);

    useEffect(() => {
        if (!listeningForInstrument) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            if (e.key === 'Escape') {
                setListeningForInstrument(null);
                return;
            }

            if (['Shift', 'Control', 'Alt', 'Meta', ' '].includes(e.key)) {
                return;
            }

            const key = e.key.toLowerCase();
            if (key.length === 1) {
                onUpdateKeyboardMap(key, listeningForInstrument);
                setListeningForInstrument(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [listeningForInstrument, onUpdateKeyboardMap]);

    const isSettingsChanged = useMemo(() => {
        if (visualizer !== 'waveform') return true;
        if (visualizerStyle !== 'default') return true;
        if (drumKit !== '808') return true;
        if (!isPerformanceMode) return true;
        if (isSlowComputerMode) return true;
        if (!tooltipsEnabled) return true;
        if (showBeatNumbers || effectivePadLabelMode !== 'off') return true;
        if (beatsPerMeasure !== 4) return true;
        if (!keyboardDrummingEnabled) return true;
        if (isInvertColors) return true;
        if (!showMuteSoloButtons) return true;
        if (!quantizePatternSwitch) return true;
        if (Math.abs(sixSevenSpeed - 1) > 0.01) return true;
        const defaultMap: Record<string, Instrument> = {
            'a': 'kick', 's': 'snare', 'd': 'hihat', 'f': 'snap',
            'g': 'clave', 'h': 'cowbell', 'j': 'sample'
        };
        const currentKeys = Object.keys(keyboardMap);
        const defaultKeys = Object.keys(defaultMap);
        if (currentKeys.length !== defaultKeys.length) return true;
        for (const k of defaultKeys) {
            if (keyboardMap[k] !== defaultMap[k]) return true;
        }
        return false;
    }, [
        visualizer, visualizerStyle, drumKit, isPerformanceMode,
        isSlowComputerMode, tooltipsEnabled, showBeatNumbers,
        effectivePadLabelMode, beatsPerMeasure, keyboardDrummingEnabled,
        isInvertColors, showMuteSoloButtons, quantizePatternSwitch, sixSevenSpeed, keyboardMap
    ]);

    const surface = getThemeSurface(visualizerStyle);

    const sectionTitleClass =
        visualizerStyle === 'default'
            ? 'text-[11px] font-bold uppercase tracking-[0.14em] text-[#a8dcff]'
            : 'text-[11px] font-bold uppercase tracking-[0.14em] text-gray-300';

    const subLabelClass =
        visualizerStyle === 'default'
            ? 'text-[10px] font-bold uppercase tracking-wider text-[#a8dcff]/80'
            : 'text-[10px] font-bold uppercase tracking-wider text-gray-400';

    const rowSurfaceClass = (() => {
        switch (visualizerStyle) {
            case 'default':
                return 'bg-[#0d2140]/90 border border-[#23477a] rounded-lg';
            case 'braun':
                return 'bg-[#e6e3da] border border-[#b8b4a8] rounded-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]';
            case 'bauhaus':
                return 'bg-[#ebe4d5] border-2 border-[#141413] rounded-none shadow-[2px_2px_0px_#141413]';
            case 'nagra':
                return 'bg-gradient-to-b from-[#fffaf6] to-[#fce0d4] border border-white rounded-full shadow-sm';
            case 'koto':
                return 'bg-[#140f16] border border-[#d4af37]/30 rounded-xl';
            case 'cyberpunk':
                return 'bg-[#0d0d14] border border-[#00ff9f]/45 rounded-none';
            case 'minimal':
                return 'bg-[#09090b] border border-[#27272a] rounded-none';
            case 'classic607':
            default:
                return 'bg-[#0b1d3d] border border-blue-400/35 rounded-md';
        }
    })();

    const rowTextClass = (() => {
        switch (visualizerStyle) {
            case 'braun':
                return 'text-[#1c1c1a]';
            case 'bauhaus':
                return 'text-[#141413]';
            case 'nagra':
                return 'text-[#3b1547]';
            case 'koto':
                return 'text-[#f2ece1]';
            case 'cyberpunk':
                return 'text-[#fcee0a]';
            case 'minimal':
                return 'text-[#f4f4f5]';
            case 'default':
                return 'text-[#f0f7ff]';
            case 'classic607':
            default:
                return 'text-[#e6f1ff]';
        }
    })();

    const dividerClass = (() => {
        switch (visualizerStyle) {
            case 'braun':
                return 'border-[#ccc8bc]';
            case 'bauhaus':
                return 'border-[#141413]/30';
            case 'nagra':
                return 'border-[#e8b8aa]/60';
            case 'koto':
                return 'border-[#d4af37]/25';
            case 'cyberpunk':
                return 'border-[#00ff9f]/30';
            case 'minimal':
                return 'border-[#27272a]';
            case 'default':
                return 'border-[#23477a]/60';
            case 'classic607':
            default:
                return 'border-blue-400/30';
        }
    })();

    const getStatusBadgeClass = (isActive: boolean) => {
        switch (visualizerStyle) {
            case 'default':
                return isActive
                    ? 'bg-[#ffc4d6] text-[#051020] rounded'
                    : 'bg-[#071326] text-[#9ecaff] border border-[#23477a] rounded';
            case 'braun':
                return isActive
                    ? 'bg-[#ea5b0c] text-[#faf8f5] border border-[#b84304] rounded-[3px]'
                    : 'bg-[#d5d1c6] text-[#2e2d2a] border border-[#b8b4a8] rounded-[3px]';
            case 'bauhaus':
                return isActive
                    ? 'bg-[#184e9c] text-[#f7f2e7] border border-[#141413] rounded-none'
                    : 'bg-[#d8d0c0] text-[#141413] border border-[#141413] rounded-none';
            case 'nagra':
                return isActive
                    ? 'bg-[#d9325e] text-white rounded-full'
                    : 'bg-[#f3c7ba] text-[#3b1547] rounded-full';
            case 'koto':
                return isActive
                    ? 'bg-[#d4af37] text-[#120d14] rounded'
                    : 'bg-[#231b26] text-[#dfd5c5] border border-[#d4af37]/25 rounded';
            case 'cyberpunk':
                return isActive
                    ? 'bg-[#fcee0a] text-[#050508] rounded-none'
                    : 'bg-[#14141f] text-[#00ff9f] border border-[#00ff9f]/35 rounded-none';
            case 'minimal':
                return isActive
                    ? 'bg-[#f4f4f5] text-[#09090b] rounded-none'
                    : 'bg-[#18181b] text-[#a1a1aa] border border-[#27272a] rounded-none';
            case 'classic607':
            default:
                return isActive
                    ? 'bg-[#38bdf8] text-[#081730] rounded'
                    : 'bg-[#081730] text-[#93c5fd] border border-blue-500/35 rounded';
        }
    };

    return (
        <CollapsibleSection
            title="SETTINGS"
            closedTitle="SETTINGS"
            defaultOpen={false}
            visualizerStyle={visualizerStyle}
            sectionIndex={sectionIndex}
            onSectionPointerDown={onSectionPointerDown}
            isDragging={isDragging}
            onReset={onFactoryReset}
            resetLabel="RESET"
            hasChanges={isSettingsChanged}
        >
            {() => (
            <div className="p-2 sm:p-3 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* COLUMN 1: SOUND ENGINE & SEQUENCER (4 cols) */}
                <div className={`lg:col-span-4 ${surface.sectionCard} p-4 flex flex-col justify-between gap-4`}>
                    <div className="flex flex-col gap-4">
                        <div className={`flex items-center justify-between pb-2 border-b ${dividerClass}`}>
                            <h3 className={sectionTitleClass}>Sound &amp; Sequencer</h3>
                            <span className="text-[10px] font-mono text-gray-400">
                                {drumKit} · {beatsPerMeasure}/4
                            </span>
                        </div>

                        {/* Drum Kit Selector */}
                        <div className="flex flex-col gap-2">
                            <span className={subLabelClass}>Drum Kit</span>
                            <Tooltip text="Switch between 808, 909, and 727 drum kits" wrapperClassName="w-full">
                                <div className="grid grid-cols-3 gap-2.5 w-full">
                                    {KIT_OPTIONS.map((kitId) => {
                                        const isSelected = drumKit === kitId;
                                        return (
                                            <button
                                                key={kitId}
                                                type="button"
                                                onClick={() => onDrumKitChange(kitId)}
                                                className={getButtonStyle(
                                                    visualizerStyle,
                                                    isSelected ? 'primary' : 'secondary',
                                                    isSelected,
                                                    false,
                                                    'w-full h-9 text-xs font-mono font-bold tracking-wider'
                                                )}
                                                aria-pressed={isSelected}
                                            >
                                                {kitId}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Tooltip>
                        </div>

                        {/* Beats Per Measure */}
                        <div className={`flex flex-col gap-2 pt-2.5 border-t ${dividerClass}`}>
                            <div className="flex items-center justify-between">
                                <span className={subLabelClass}>Beats Per Measure</span>
                                <span className="text-[10px] font-mono text-gray-300 tabular-nums">
                                    {beatsPerMeasure}/4 · {beatsPerMeasure * 4} steps
                                </span>
                            </div>
                            <Tooltip text="Set the number of beats per measure" wrapperClassName="w-full">
                                <div className="grid grid-cols-6 gap-2 w-full">
                                    {BEATS_PER_MEASURE_OPTIONS.map((beats) => {
                                        const isSelected = beatsPerMeasure === beats;
                                        return (
                                            <button
                                                key={beats}
                                                type="button"
                                                onClick={() => onBeatsPerMeasureChange(beats)}
                                                className={getButtonStyle(
                                                    visualizerStyle,
                                                    isSelected ? 'primary' : 'secondary',
                                                    isSelected,
                                                    false,
                                                    'w-full h-9 text-xs font-mono font-bold tabular-nums !px-0'
                                                )}
                                                aria-pressed={isSelected}
                                            >
                                                {beats}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Tooltip>
                        </div>

                        {/* Compact Pattern Shift Row */}
                        <div className={`flex items-center justify-between pt-2.5 border-t ${dividerClass}`}>
                            <span className={subLabelClass}>Shift Pattern</span>
                            <div className="flex items-center gap-1.5">
                                <Tooltip text="Rotate all steps in the current pattern one step to the left">
                                    <button
                                        type="button"
                                        onClick={() => onShiftPattern('left')}
                                        className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'h-7 px-2.5 text-[11px] font-mono')}
                                        aria-label="Shift pattern left"
                                    >
                                        ← Left
                                    </button>
                                </Tooltip>
                                <Tooltip text="Rotate all steps in the current pattern one step to the right">
                                    <button
                                        type="button"
                                        onClick={() => onShiftPattern('right')}
                                        className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'h-7 px-2.5 text-[11px] font-mono')}
                                        aria-label="Shift pattern right"
                                    >
                                        Right →
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Pattern & A/B Switch Timing */}
                        {onToggleQuantizePatternSwitch && (
                            <div className={`flex flex-col gap-1.5 pt-2.5 border-t ${dividerClass}`}>
                                <span className={subLabelClass}>Pattern &amp; A/B Switch Timing</span>
                                <Tooltip
                                    text={
                                        quantizePatternSwitch
                                            ? 'Wait until the end of the current measure before switching to the selected pattern or A/B side'
                                            : 'Switch immediately when a new pattern or A/B side is selected'
                                    }
                                    wrapperClassName="w-full"
                                >
                                    <button
                                        type="button"
                                        onClick={onToggleQuantizePatternSwitch}
                                        aria-pressed={quantizePatternSwitch}
                                        className={`w-full h-9 px-3 flex items-center justify-between transition-colors cursor-pointer ${rowSurfaceClass}`}
                                    >
                                        <span className={`text-xs font-bold ${rowTextClass}`}>Wait for End of Measure</span>
                                        <span
                                            className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 ${getStatusBadgeClass(quantizePatternSwitch)}`}
                                        >
                                            {quantizePatternSwitch ? 'END OF BAR' : 'INSTANT'}
                                        </span>
                                    </button>
                                </Tooltip>
                            </div>
                        )}

                        {/* Sequencer Grid Pad Labels */}
                        <div className={`flex flex-col gap-1.5 pt-2.5 border-t ${dividerClass}`}>
                            <span className={subLabelClass}>Sequencer Grid Pads</span>
                            <div className="flex flex-col gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleToggleSubdivisions}
                                    aria-pressed={effectivePadLabelMode === 'subdivisions'}
                                    className={`h-9 px-3 flex items-center justify-between transition-colors cursor-pointer ${rowSurfaceClass}`}
                                >
                                    <span className={`text-xs font-bold ${rowTextClass}`}>Rhythmic Subdivision on Pads</span>
                                    <span
                                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 ${getStatusBadgeClass(effectivePadLabelMode === 'subdivisions')}`}
                                    >
                                        {effectivePadLabelMode === 'subdivisions' ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleToggleSyllables}
                                    aria-pressed={effectivePadLabelMode === 'syllables'}
                                    className={`h-9 px-3 flex items-center justify-between transition-colors cursor-pointer ${rowSurfaceClass}`}
                                >
                                    <span className={`text-xs font-bold ${rowTextClass}`}>Rhythm Syllables on Pads</span>
                                    <span
                                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 ${getStatusBadgeClass(effectivePadLabelMode === 'syllables')}`}
                                    >
                                        {effectivePadLabelMode === 'syllables' ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: APPEARANCE, OSCILLOSCOPE & 67 SPEED (5 cols) */}
                <div className={`lg:col-span-5 ${surface.sectionCard} p-4 flex flex-col justify-between gap-4`}>
                    <div className="flex flex-col gap-3.5">
                        <div className={`flex items-center justify-between pb-2 border-b ${dividerClass}`}>
                            <h3 className={sectionTitleClass}>Appearance &amp; Display</h3>
                            <span className="text-[10px] font-mono text-gray-400">
                                {visualizerStyle === 'minimal' || isSlowComputerMode
                                    ? 'My Computer Is Really Really Slow'
                                    : VISUAL_STYLE_OPTIONS.find(o => o.id === visualizerStyle)?.label || 'Default'}
                            </span>
                        </div>

                        {/* Visual Style Grid (Triple-click "Visual Style" heading for Cappuccino Mode easter egg) */}
                        <div className="flex flex-col gap-2">
                            <span
                                onClick={handleVisualStyleHeadingClick}
                                className={`${subLabelClass} select-none cursor-pointer w-fit`}
                            >
                                Visual Style
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Visual Style">
                                {VISUAL_STYLE_OPTIONS.map((styleOption) => {
                                    const isSelected = visualizerStyle === styleOption.id && !isSlowComputerMode;
                                    return (
                                        <button
                                            key={styleOption.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            onClick={() => onVisualizerStyleChange(styleOption.id)}
                                            className={getButtonStyle(
                                                visualizerStyle,
                                                isSelected ? 'primary' : 'secondary',
                                                isSelected,
                                                false,
                                                'h-9 px-3 text-xs font-bold tracking-wide whitespace-nowrap'
                                            )}
                                        >
                                            {styleOption.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Oscilloscope Mode (only visible if performance mode is turned off) */}
                        {!isPerformanceMode && visualizerStyle !== 'minimal' && (
                            <div className={`flex flex-col gap-1.5 pt-2 border-t ${dividerClass}`}>
                                <span className={subLabelClass}>Oscilloscope Mode</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {VISUALIZER_MODES.map((mode) => {
                                        const isSelected = visualizer === mode.id;
                                        return (
                                            <button
                                                key={mode.id}
                                                type="button"
                                                onClick={() => onVisualizerChange(mode.id)}
                                                className={getButtonStyle(
                                                    visualizerStyle,
                                                    isSelected ? 'primary' : 'secondary',
                                                    isSelected,
                                                    false,
                                                    'h-8 text-xs'
                                                )}
                                                aria-pressed={isSelected}
                                            >
                                                {mode.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 67 Speed Slider (No Tooltips) */}
                        <div className={`flex flex-col gap-1.5 pt-2 border-t ${dividerClass}`}>
                            <div className="flex items-center justify-between">
                                <label htmlFor="67-speed-slider" className={subLabelClass}>
                                    67 Speed
                                </label>
                                <span className={`text-xs font-mono font-bold tabular-nums ${rowTextClass}`}>
                                    {sixSevenSpeed.toFixed(1)}x
                                </span>
                            </div>
                            <input
                                id="67-speed-slider"
                                type="range"
                                min={0.1}
                                max={5}
                                step="0.1"
                                value={sixSevenSpeed}
                                onChange={(e) => onSixSevenSpeedChange(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-400"
                            />
                        </div>

                        {/* Display & Interface Options */}
                        <div className={`flex flex-col gap-2 pt-2 border-t ${dividerClass}`}>
                            <span className={subLabelClass}>Interface Options</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Tooltip text="Reduce visual effects and animations to save CPU and battery" wrapperClassName="w-full">
                                    <button
                                        type="button"
                                        onClick={onTogglePerformanceMode}
                                        aria-pressed={isPerformanceMode}
                                        className={`w-full h-8 px-2.5 flex items-center justify-between transition-colors cursor-pointer ${rowSurfaceClass}`}
                                    >
                                        <span className={`text-[11px] font-bold ${rowTextClass} truncate`}>Performance Mode</span>
                                        <span
                                            className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 ${getStatusBadgeClass(isPerformanceMode)}`}
                                        >
                                            {isPerformanceMode ? 'ON' : 'OFF'}
                                        </span>
                                    </button>
                                </Tooltip>

                                <button
                                    type="button"
                                    onClick={onToggleTooltips}
                                    aria-pressed={tooltipsEnabled}
                                    className={`h-8 px-2.5 flex items-center justify-between transition-colors cursor-pointer ${rowSurfaceClass}`}
                                >
                                    <span className={`text-[11px] font-bold ${rowTextClass} truncate`}>Hover Tooltips</span>
                                    <span
                                        className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 ${getStatusBadgeClass(tooltipsEnabled)}`}
                                    >
                                        {tooltipsEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={onToggleInvertColors}
                                    aria-pressed={isInvertColors}
                                    className={`h-8 px-2.5 flex items-center justify-between transition-colors cursor-pointer ${rowSurfaceClass}`}
                                >
                                    <span className={`text-[11px] font-bold ${rowTextClass} truncate`}>Invert Colors</span>
                                    <span
                                        className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 ${getStatusBadgeClass(isInvertColors)}`}
                                    >
                                        {isInvertColors ? 'ON' : 'OFF'}
                                    </span>
                                </button>

                                <Tooltip text="Show or hide Mute and Solo buttons next to each instrument's volume slider in Instrument Settings" wrapperClassName="w-full">
                                    <button
                                        type="button"
                                        onClick={onToggleShowMuteSoloButtons}
                                        aria-pressed={showMuteSoloButtons}
                                        className={`w-full h-8 px-2.5 flex items-center justify-between transition-colors cursor-pointer ${rowSurfaceClass}`}
                                    >
                                        <span className={`text-[11px] font-bold ${rowTextClass} truncate`}>Mute / Solo Buttons</span>
                                        <span
                                            className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 ${getStatusBadgeClass(showMuteSoloButtons)}`}
                                        >
                                            {showMuteSoloButtons ? 'ON' : 'OFF'}
                                        </span>
                                    </button>
                                </Tooltip>
                            </div>

                            {/* My Computer Is Really Really Slow Mode (Standalone below Interface Options) */}
                            <button
                                type="button"
                                onClick={onToggleSlowComputerMode}
                                aria-pressed={isSlowComputerMode || visualizerStyle === 'minimal'}
                                className={getButtonStyle(
                                    visualizerStyle,
                                    isSlowComputerMode || visualizerStyle === 'minimal' ? 'primary' : 'secondary',
                                    isSlowComputerMode || visualizerStyle === 'minimal',
                                    false,
                                    'w-full h-9 px-3 text-xs font-bold tracking-wider'
                                )}
                            >
                                My Computer Is Really Really Slow
                            </button>
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: KEYBOARD DRUMMING & FACTORY RESET (3 cols) */}
                <div className={`lg:col-span-3 ${surface.sectionCard} p-4 flex flex-col justify-between gap-4`}>
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={onToggleKeyboardDrumming}
                            aria-pressed={keyboardDrummingEnabled}
                            className={`w-full flex items-center justify-between pb-2 border-b ${dividerClass} cursor-pointer text-left focus:outline-none`}
                        >
                            <h3 className={sectionTitleClass}>Keyboard Drumming</h3>
                            <span
                                className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 ${getStatusBadgeClass(keyboardDrummingEnabled)}`}
                            >
                                {keyboardDrummingEnabled ? 'ON' : 'OFF'}
                            </span>
                        </button>

                        <div className={`flex flex-col gap-1.5 transition-opacity ${keyboardDrummingEnabled ? 'opacity-100' : 'opacity-45'}`}>
                            {INSTRUMENTS.map((instrument) => {
                                const isListening = listeningForInstrument === instrument;
                                const assignedKey = getKeyForInstrument(instrument);
                                return (
                                    <div
                                        key={instrument}
                                        className={`h-8 px-2.5 flex items-center justify-between ${rowSurfaceClass}`}
                                    >
                                        <span className={`text-[11px] font-bold ${rowTextClass} truncate pr-2`}>
                                            {INSTRUMENT_LABELS[instrument]}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={!keyboardDrummingEnabled}
                                            onClick={() => setListeningForInstrument(isListening ? null : instrument)}
                                            className={getButtonStyle(
                                                visualizerStyle,
                                                isListening ? 'primary' : 'secondary',
                                                isListening,
                                                !keyboardDrummingEnabled,
                                                `min-w-[54px] h-6 px-2 text-[10px] font-mono ${isListening ? 'animate-pulse' : ''}`
                                            )}
                                        >
                                            {isListening ? 'KEY...' : assignedKey}
                                        </button>
                                    </div>
                                );
                            })}
                            <p className="text-[10px] text-gray-400 leading-snug pt-0.5">
                                Click any key badge to rebind, or press <span className="font-mono font-bold">ESC</span> to cancel.
                            </p>
                        </div>
                    </div>

                    {/* Factory Reset Footer */}
                    <div className={`pt-3 border-t ${dividerClass} flex flex-col gap-2`}>
                        <div className="flex items-center justify-between">
                            <span className={subLabelClass}>System Reset</span>
                            {resetSuccess && (
                                <span className="text-[10px] font-mono font-bold text-emerald-500">
                                    DEFAULTS RESTORED
                                </span>
                            )}
                        </div>
                        {!isConfirmingReset ? (
                            <Tooltip text="Restore all patterns, sounds, effects, and settings to factory defaults without reloading" wrapperClassName="w-full">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setResetSuccess(false);
                                        setIsConfirmingReset(true);
                                    }}
                                    className={getButtonStyle(visualizerStyle, 'danger', false, false, 'w-full h-8 text-xs')}
                                >
                                    Factory Reset
                                </button>
                            </Tooltip>
                        ) : (
                            <div className="grid grid-cols-2 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onFactoryReset();
                                        setIsConfirmingReset(false);
                                        setResetSuccess(true);
                                        window.setTimeout(() => setResetSuccess(false), 3000);
                                    }}
                                    className={getButtonStyle(visualizerStyle, 'danger', true, false, 'h-8 text-[11px]')}
                                >
                                    Confirm Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsConfirmingReset(false)}
                                    className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'h-8 text-[11px]')}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}
        </CollapsibleSection>
    );
};

export default React.memo(Settings);