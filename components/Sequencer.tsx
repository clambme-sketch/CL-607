import React, { useRef, useCallback, useMemo } from 'react';
import { Grid, Instrument, VisualizerType, VisualizerStyle, PadLabelMode } from '../types';
import { INSTRUMENTS, INSTRUMENT_LABELS } from '../constants';
import { getThemeSurface, getButtonStyle } from '../utils';
import SmallOscilloscope from './SmallOscilloscope';
import Oscilloscope from './Oscilloscope';
import StepButton from './StepButton';
import XYOscilloscope from './XYOscilloscope';
import FrequencySpectrumVisualizer from './FrequencySpectrumVisualizer';
import Tooltip from './Tooltip';

interface SequencerProps {
    grid: Grid;
    isPlaying: boolean;
    currentStep: number | null;
    volumes: number[];
    instrumentAnalyserNodes: Record<Instrument, AnalyserNode | null>;
    instrumentColors: string[];
    isRecording: boolean;
    onToggleStep: (instrumentIndex: number, stepIndex: number) => void;
    onVolumeChange: (instrumentIndex: number, volume: number) => void;
    onToggleRecording: () => void;
    instrumentVisibility: boolean[];
    visualizerType: VisualizerType;
    visualizerStyle: VisualizerStyle;
    masterAnalyser: AnalyserNode | null;
    hueRotate: number;
    isPerformanceMode: boolean;
    showBeatNumbers?: boolean;
    padLabelMode?: PadLabelMode;
    beatsPerMeasure: number;
}

const Sequencer: React.FC<SequencerProps> = ({ 
    grid, 
    isPlaying, 
    currentStep, 
    volumes, 
    instrumentAnalyserNodes,
    instrumentColors,
    isRecording,
    onToggleStep,
    onVolumeChange,
    onToggleRecording,
    instrumentVisibility,
    visualizerType,
    visualizerStyle,
    masterAnalyser,
    hueRotate,
    isPerformanceMode,
    showBeatNumbers = false,
    padLabelMode,
    beatsPerMeasure,
}) => {
    const isDraggingRef = useRef(false);
    const dragModeRef = useRef<'activate' | 'deactivate' | null>(null);
    const lastToggledStep = useRef<string | null>(null); // To prevent re-toggling the same step
    const gridRef = useRef(grid);
    gridRef.current = grid;
    const surface = getThemeSurface(visualizerStyle);

    const effectivePadLabelMode: PadLabelMode = padLabelMode ?? (showBeatNumbers ? 'subdivisions' : 'off');

    const SUBDIVISION_LABELS = useMemo(() => {
        if (effectivePadLabelMode !== 'subdivisions') return [];
        const labels: string[] = [];
        for (let i = 0; i < beatsPerMeasure; i++) {
            labels.push(String(i + 1), 'e', '&', 'a');
        }
        return labels;
    }, [beatsPerMeasure, effectivePadLabelMode]);

    const SYLLABLE_LABELS_BY_ROW = useMemo(() => {
        if (effectivePadLabelMode !== 'syllables') return [];
        const numSteps = beatsPerMeasure * 4;

        return INSTRUMENTS.map((_, instIdx) => {
            const row = grid[instIdx] || [];
            const syllables: (string | undefined)[] = Array(numSteps).fill(undefined);

            // Precompute active offsets per beat so we can detect cross-beat Dotted Quarter Notes ('ta-i')
            const beatOffsetsList: number[][] = [];
            for (let beat = 0; beat < beatsPerMeasure; beat++) {
                const beatStart = beat * 4;
                const activeOffsets: number[] = [];
                for (let offset = 0; offset < 4; offset++) {
                    if (row[beatStart + offset]) {
                        activeOffsets.push(offset);
                    }
                }
                beatOffsetsList.push(activeOffsets);
            }

            for (let beat = 0; beat < beatsPerMeasure; beat++) {
                const beatStart = beat * 4;
                const activeOffsets = beatOffsetsList[beat];
                const nextBeatOffsets = beat + 1 < beatsPerMeasure ? beatOffsetsList[beat + 1] : null;

                if (activeOffsets.length === 0) continue;

                // Cross-beat Dotted Quarter Note ('ta-i') when downbeat sustains into '&' of next beat
                if (
                    activeOffsets.length === 1 &&
                    activeOffsets[0] === 0 &&
                    nextBeatOffsets !== null &&
                    nextBeatOffsets.length > 0 &&
                    nextBeatOffsets[0] === 2
                ) {
                    syllables[beatStart] = 'ta-i';
                    continue;
                }

                // Single hit on 'e' of the beat -> 16th note 'ki'
                if (activeOffsets.length === 1 && activeOffsets[0] === 1) {
                    syllables[beatStart + 1] = 'ki';
                    continue;
                }

                for (let idx = 0; idx < activeOffsets.length; idx++) {
                    const currentOffset = activeOffsets[idx];
                    const nextOffset = idx + 1 < activeOffsets.length ? activeOffsets[idx + 1] : 4;
                    const spanSteps = nextOffset - currentOffset;

                    let syl: string;
                    if (spanSteps === 4) {
                        syl = 'ta';
                    } else if (spanSteps === 3) {
                        syl = 'ti-i';
                    } else if (spanSteps === 2) {
                        syl = 'ti';
                    } else {
                        syl = currentOffset % 2 === 0 ? 'ti' : 'ki';
                    }
                    syllables[beatStart + currentOffset] = syl;
                }
            }

            return syllables;
        });
    }, [grid, beatsPerMeasure, effectivePadLabelMode]);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (!(target instanceof HTMLButtonElement && target.dataset.instrumentIndex)) return;

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        isDraggingRef.current = true;

        const instrumentIndex = parseInt(target.dataset.instrumentIndex!, 10);
        const stepIndex = parseInt(target.dataset.stepIndex!, 10);
        const isCurrentlyActive = gridRef.current[instrumentIndex]?.[stepIndex];
        
        dragModeRef.current = isCurrentlyActive ? 'deactivate' : 'activate';
        onToggleStep(instrumentIndex, stepIndex);
        lastToggledStep.current = `${instrumentIndex}-${stepIndex}`;
    }, [onToggleStep]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target instanceof HTMLButtonElement && target.dataset.instrumentIndex && target.dataset.stepIndex) {
            const instrumentIndex = parseInt(target.dataset.instrumentIndex, 10);
            const stepIndex = parseInt(target.dataset.stepIndex, 10);
            const stepId = `${instrumentIndex}-${stepIndex}`;

            if (lastToggledStep.current === stepId) return;

            const isCurrentlyActive = gridRef.current[instrumentIndex]?.[stepIndex];
            if (dragModeRef.current === 'activate' && !isCurrentlyActive) {
                onToggleStep(instrumentIndex, stepIndex);
                lastToggledStep.current = stepId;
            } else if (dragModeRef.current === 'deactivate' && isCurrentlyActive) {
                onToggleStep(instrumentIndex, stepIndex);
                lastToggledStep.current = stepId;
            }
        }
    }, [onToggleStep]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        isDraggingRef.current = false;
        dragModeRef.current = null;
        lastToggledStep.current = null;
    }, []);


    const isMinimal = visualizerStyle === 'minimal';
    const rowHeightClass = isMinimal ? 'h-11 sm:h-12' : 'h-12 sm:h-14';

    const hideTrackScopes = isMinimal || isPerformanceMode;

    const COBALT_BADGE_GRADIENTS = [
        'linear-gradient(180deg, #387fd6 0%, #194582 100%)',
        'linear-gradient(180deg, #306fc4 0%, #163c73 100%)',
        'linear-gradient(180deg, #2860b0 0%, #133365 100%)',
        'linear-gradient(180deg, #21519c 0%, #102b57 100%)',
        'linear-gradient(180deg, #1b4387 0%, #0d234a 100%)',
        'linear-gradient(180deg, #153673 0%, #0a1c3d 100%)',
        'linear-gradient(180deg, #102a5e 0%, #081632 100%)',
    ];

    const instrumentLabelsColumn = useMemo(() => (
        <div className={`flex flex-col gap-1 sm:gap-2 ${hideTrackScopes ? (visualizerStyle === 'nagra' ? 'w-28 sm:w-32' : 'w-24 sm:w-28') : (visualizerStyle === 'nagra' ? 'w-20 sm:w-24' : 'w-16 sm:w-24')} flex-shrink-0`}>
            {INSTRUMENTS.map((instrument, instrumentIndex) => (
                instrumentVisibility[instrumentIndex] && (
                    <div 
                        key={instrument}
                        style={
                            visualizerStyle === 'default'
                                ? { background: COBALT_BADGE_GRADIENTS[instrumentIndex % COBALT_BADGE_GRADIENTS.length] }
                                : undefined
                        }
                        className={`relative font-bold text-xs flex items-center ${
                            hideTrackScopes && instrument === 'sample'
                                ? visualizerStyle === 'nagra'
                                    ? 'justify-between pl-5 pr-2.5'
                                    : 'justify-between pl-3 pr-2'
                                : 'justify-center text-center p-1'
                        } ${rowHeightClass} select-none ${surface.instrumentBadge}`}
                    >
                        {/* Left color indicator bar for hardware authenticity */}
                        {visualizerStyle !== 'classic607' && (
                            <span
                                aria-hidden="true"
                                className={`absolute ${
                                    isMinimal
                                        ? 'left-0 top-0 bottom-0 w-[3px]'
                                        : visualizerStyle === 'default'
                                        ? 'left-1.5 top-2.5 bottom-2.5 w-1 rounded-full'
                                        : visualizerStyle === 'nagra'
                                        ? 'left-2.5 top-2.5 bottom-2.5 w-1.5 rounded-full'
                                        : 'left-1 top-2 bottom-2 w-1'
                                } ${visualizerStyle === 'koto' || visualizerStyle === 'braun' ? 'rounded-full' : ''}`}
                                style={{ backgroundColor: instrumentColors[instrumentIndex] }}
                            />
                        )}
                        <span className={`relative z-10 ${
                            visualizerStyle === 'nagra'
                                ? hideTrackScopes && instrument === 'sample'
                                    ? 'pl-0.5'
                                    : 'pl-3'
                                : visualizerStyle !== 'classic607'
                                ? 'pl-1.5'
                                : ''
                        }`}>
                            {INSTRUMENT_LABELS[instrument]}
                        </span>
                        {hideTrackScopes && instrument === 'sample' && (
                            <Tooltip text={isRecording ? "Click to stop recording sample" : "Click to start recording from your microphone"}>
                                <button
                                    type="button"
                                    onClick={onToggleRecording}
                                    className={`relative z-10 ${
                                        isMinimal
                                            ? `px-1.5 py-0.5 text-[10px] font-['IBM_Plex_Mono'] font-semibold border cursor-pointer ${
                                                isRecording
                                                    ? 'bg-[#ff3b1d] text-[#09090b] border-[#ff3b1d]'
                                                    : 'bg-[#09090b] text-[#ff3b1d] border-[#ff3b1d]/60 hover:border-[#ff3b1d]'
                                            }`
                                            : getButtonStyle(
                                                visualizerStyle,
                                                isRecording ? 'danger' : 'secondary',
                                                isRecording,
                                                false,
                                                `w-6 h-6 !p-0 flex-shrink-0 ${isRecording ? 'animate-pulse' : ''}`
                                            )
                                    }`}
                                    aria-label={isRecording ? 'Stop Recording Sample' : 'Record Sample'}
                                >
                                    {isMinimal ? (
                                        isRecording ? 'STOP' : 'REC'
                                    ) : isRecording ? (
                                        <div className="w-2 h-2 bg-current rounded-sm" />
                                    ) : (
                                        <div className="w-2.5 h-2.5 bg-[#d9381e] rounded-full shadow-[0_0_5px_rgba(217,56,30,0.7)]" />
                                    )}
                                </button>
                            </Tooltip>
                        )}
                    </div>
                )
            ))}
        </div>
    ), [hideTrackScopes, isMinimal, instrumentVisibility, rowHeightClass, surface.instrumentBadge, visualizerStyle, instrumentColors, onToggleRecording, isRecording]);

    const volumeFadersColumn = useMemo(() => (
        <div className="flex flex-col gap-1 sm:gap-2 w-8 flex-shrink-0">
            {INSTRUMENTS.map((instrument, index) => (
                instrumentVisibility[index] && (
                    <div key={`${instrument}-fader`} className={`flex items-center justify-center ${rowHeightClass} px-2 ${surface.faderBay}`}>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volumes[index]}
                            onChange={(e) => onVolumeChange(index, parseFloat(e.target.value))}
                            className="w-10 sm:w-12 h-2 appearance-none cursor-pointer accent-cyan-400 rotate-[-90deg]"
                            aria-label={`${INSTRUMENT_LABELS[instrument]} volume`}
                        />
                    </div>
                )
            ))}
        </div>
    ), [instrumentVisibility, rowHeightClass, surface.faderBay, volumes, onVolumeChange]);

    const oscilloscopeColumn = useMemo(() => {
        if (hideTrackScopes) return null;
        return (
            <div className="flex flex-col gap-1 sm:gap-2 w-16 sm:w-24 flex-shrink-0">
                {INSTRUMENTS.map((instrument, index) => {
                    if (!instrumentVisibility[index]) return null;

                    if (instrument === 'sample') {
                        return (
                            <div key={`${instrument}-recorder`} className={`relative flex items-center justify-center h-12 sm:h-14 p-1 ${surface.scopeBezel}`}>
                                <Tooltip text={isRecording ? "Click to stop recording sample" : "Click to start recording from your microphone"}>
                                    <button
                                        onClick={onToggleRecording}
                                        className={getButtonStyle(
                                            visualizerStyle,
                                            isRecording ? 'danger' : 'secondary',
                                            isRecording,
                                            false,
                                            `w-full h-full ${isRecording ? 'animate-pulse' : ''}`
                                        )}
                                        aria-label={isRecording ? "Stop Recording Sample" : "Record Sample"}
                                    >
                                        {isRecording ? (
                                            <div className="w-2.5 h-2.5 bg-current rounded-sm" />
                                        ) : (
                                            <div className="w-3 h-3 bg-[#d9381e] rounded-full shadow-[0_0_6px_rgba(217,56,30,0.7)]" />
                                        )}
                                    </button>
                                </Tooltip>
                            </div>
                        );
                    }
                    return (
                        <div key={`${instrument}-scope`} className={`relative flex items-center justify-center h-12 sm:h-14 px-1 overflow-hidden transform-gpu ${surface.scopeBezel}`}>
                            <SmallOscilloscope 
                                isActive={true}
                                analyserNode={instrumentAnalyserNodes ? instrumentAnalyserNodes[instrument] : null}
                                color={instrumentColors[index]}
                            />
                        </div>
                    );
                })}
            </div>
        );
    }, [hideTrackScopes, instrumentVisibility, surface.scopeBezel, isRecording, onToggleRecording, visualizerStyle, instrumentAnalyserNodes, instrumentColors]);

    const stepNumbersFooter = useMemo(() => (
        <div className="relative z-10 flex justify-between gap-2 sm:gap-3 md:gap-4">
            {[...Array(beatsPerMeasure).keys()].map(groupIndex => (
                <div key={groupIndex} className="grid grid-cols-4 gap-1 sm:gap-1.5 w-full">
                    {Array.from({ length: 4 }).map((_, stepInGroup) => {
                        const stepIndex = groupIndex * 4 + stepInGroup;
                        const isLit = (stepIndex % 4 === 0);
                        return (
                            <div 
                                key={stepIndex} 
                                className={`text-center text-xs pt-1 tabular-nums ${isLit ? surface.stepNumLit : surface.stepNumDim}`}
                            >
                                {stepIndex + 1}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    ), [beatsPerMeasure, surface.stepNumLit, surface.stepNumDim]);

    return (
        <div className="w-full flex flex-col gap-2">
            <div className="flex gap-2 sm:gap-3">
                {instrumentLabelsColumn}
                {volumeFadersColumn}
                {oscilloscopeColumn}

                {/* Grid and Main Oscilloscope Wrapper */}
                <div className="relative flex-1 flex flex-col gap-2">
                    {!isPerformanceMode && !isMinimal && (
                        <>
                            {visualizerType === 'waveform' && (
                                <Oscilloscope analyserNodes={instrumentAnalyserNodes} colors={instrumentColors} />
                            )}
                            {visualizerType === 'lissajous' && (
                                <div 
                                    className="absolute inset-0 z-0 rounded-xl overflow-hidden pointer-events-none transform-gpu"
                                    style={{ filter: `hue-rotate(-${hueRotate}deg)` }}
                                >
                                    <XYOscilloscope
                                        isActive={isPlaying}
                                        wetAnalyser={masterAnalyser}
                                        color={visualizerStyle === 'braun' || visualizerStyle === 'bauhaus' || visualizerStyle === 'nagra' ? '#3b1547' : '#d1d5db'}
                                    />
                                </div>
                            )}
                            {visualizerType === 'spectrum' && (
                                <div className="absolute inset-0 z-0 rounded-xl overflow-hidden pointer-events-none transform-gpu">
                                    <FrequencySpectrumVisualizer
                                        isActive={isPlaying}
                                        analyserNode={masterAnalyser}
                                    />
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* Step Grid */}
                    <div 
                        className="relative z-10 transform-gpu flex flex-1 justify-between gap-2 sm:gap-3 md:gap-4 select-none"
                        style={{ touchAction: 'none' }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    >
                        {[...Array(beatsPerMeasure).keys()].map(groupIndex => (
                            <div key={groupIndex} className="grid grid-cols-4 gap-x-1 sm:gap-x-1.5 gap-y-1 sm:gap-y-2 w-full">
                                {INSTRUMENTS.map((instrument, instrumentIndex) => (
                                    instrumentVisibility[instrumentIndex] && (
                                        <React.Fragment key={instrument}>
                                            {Array.from({ length: 4 }).map((__, stepInGroup) => {
                                                const stepIndex = groupIndex * 4 + stepInGroup;
                                                const isStepActive = Boolean(grid[instrumentIndex]?.[stepIndex]);
                                                const stepLabel =
                                                    effectivePadLabelMode === 'subdivisions'
                                                        ? SUBDIVISION_LABELS[stepIndex]
                                                        : effectivePadLabelMode === 'syllables' && isStepActive
                                                        ? SYLLABLE_LABELS_BY_ROW[instrumentIndex]?.[stepIndex]
                                                        : undefined;
                                                return (
                                                    <StepButton
                                                        key={`${instrument}-${stepIndex}`}
                                                        isActive={isStepActive}
                                                        isPlayingStep={isPlaying && currentStep === stepIndex}
                                                        color={instrumentColors[instrumentIndex]}
                                                        instrumentIndex={instrumentIndex}
                                                        stepIndex={stepIndex}
                                                        beatLabel={stepLabel}
                                                        visualizerStyle={visualizerStyle}
                                                    />
                                                );
                                            })}
                                        </React.Fragment>
                                    )
                                ))}
                            </div>
                        ))}
                    </div>
                    
                    {stepNumbersFooter}
                </div>
            </div>
        </div>
    );
};

export default React.memo(Sequencer);