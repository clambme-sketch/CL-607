import React, { useRef, useCallback } from 'react';
import { Grid, Instrument } from '../types';
import { INSTRUMENTS, INSTRUMENT_LABELS } from '../constants';
import SmallOscilloscope from './SmallOscilloscope';
import Oscilloscope from './Oscilloscope';
import StepButton from './StepButton';
import XYOscilloscope from './XYOscilloscope';
import FrequencySpectrumVisualizer from './FrequencySpectrumVisualizer';
import { VisualizerType } from './Settings';

interface SequencerProps {
    grid: Grid;
    isPlaying: boolean;
    currentStep: number | null;
    volumes: number[];
    instrumentAnalyserNodes: Record<Instrument, AnalyserNode | null>;
    instrumentColors: string[];
    isRecording: boolean;
    countdown: number | null;
    onToggleStep: (instrumentIndex: number, stepIndex: number) => void;
    onVolumeChange: (instrumentIndex: number, volume: number) => void;
    onStartRecording: () => void;
    onStopRecording: () => void;
    instrumentVisibility: boolean[];
    visualizerType: VisualizerType;
    masterAnalyser: AnalyserNode | null;
    hueRotate: number;
}

const Sequencer: React.FC<SequencerProps> = ({ 
    grid, 
    isPlaying, 
    currentStep, 
    volumes,
    instrumentAnalyserNodes,
    instrumentColors,
    isRecording,
    countdown,
    onToggleStep,
    onVolumeChange,
    onStartRecording,
    onStopRecording,
    instrumentVisibility,
    visualizerType,
    masterAnalyser,
    hueRotate,
}) => {
    const isDraggingRef = useRef(false);
    const dragModeRef = useRef<'activate' | 'deactivate' | null>(null);
    const lastToggledStep = useRef<string | null>(null); // To prevent re-toggling the same step

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (!(target instanceof HTMLButtonElement && target.dataset.instrumentIndex)) return;

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        isDraggingRef.current = true;

        const instrumentIndex = parseInt(target.dataset.instrumentIndex!, 10);
        const stepIndex = parseInt(target.dataset.stepIndex!, 10);
        const isCurrentlyActive = grid[instrumentIndex]?.[stepIndex];
        
        dragModeRef.current = isCurrentlyActive ? 'deactivate' : 'activate';
        onToggleStep(instrumentIndex, stepIndex);
        lastToggledStep.current = `${instrumentIndex}-${stepIndex}`;
    }, [grid, onToggleStep]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target instanceof HTMLButtonElement && target.dataset.instrumentIndex && target.dataset.stepIndex) {
            const instrumentIndex = parseInt(target.dataset.instrumentIndex, 10);
            const stepIndex = parseInt(target.dataset.stepIndex, 10);
            const stepId = `${instrumentIndex}-${stepIndex}`;

            if (lastToggledStep.current === stepId) return;

            const isCurrentlyActive = grid[instrumentIndex]?.[stepIndex];
            if (dragModeRef.current === 'activate' && !isCurrentlyActive) {
                onToggleStep(instrumentIndex, stepIndex);
                lastToggledStep.current = stepId;
            } else if (dragModeRef.current === 'deactivate' && isCurrentlyActive) {
                onToggleStep(instrumentIndex, stepIndex);
                lastToggledStep.current = stepId;
            }
        }
    }, [grid, onToggleStep]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        isDraggingRef.current = false;
        dragModeRef.current = null;
        lastToggledStep.current = null;
    }, []);


    return (
        <div className="w-full flex flex-col gap-2">
            <div className="flex gap-2 sm:gap-4">
                 {/* Instrument Labels */}
                <div className="flex flex-col gap-1 sm:gap-2 w-16 sm:w-24 flex-shrink-0">
                    {INSTRUMENTS.map((instrument, instrumentIndex) => (
                        instrumentVisibility[instrumentIndex] && (
                            <div 
                                key={instrument}
                                className="rounded-md font-bold text-xs sm:text-sm flex items-center justify-center bg-gray-700 text-gray-300 text-center p-1 h-12 sm:h-14"
                            >
                                {INSTRUMENT_LABELS[instrument]}
                            </div>
                        )
                    ))}
                </div>

                {/* Volume Faders */}
                <div className="flex flex-col gap-1 sm:gap-2 w-8 flex-shrink-0">
                    {INSTRUMENTS.map((instrument, index) => (
                        instrumentVisibility[index] && (
                            <div key={`${instrument}-fader`} className="flex items-center justify-center rounded-md bg-gray-700 h-12 sm:h-14 px-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volumes[index]}
                                    onChange={(e) => onVolumeChange(index, parseFloat(e.target.value))}
                                    className="w-12 h-2 appearance-none cursor-pointer accent-cyan-400 rotate-[-90deg]"
                                    aria-label={`${INSTRUMENT_LABELS[instrument]} volume`}
                                />
                            </div>
                        )
                    ))}
                </div>

                {/* Oscilloscope/Recorder Column */}
                <div className="flex flex-col gap-1 sm:gap-2 w-16 sm:w-24 flex-shrink-0">
                    {INSTRUMENTS.map((instrument, index) => {
                        if (!instrumentVisibility[index]) return null;

                        if (instrument === 'sample') {
                            return (
                                <div key={`${instrument}-recorder`} className="relative flex items-center justify-center rounded-md bg-gray-900 h-12 sm:h-14 px-1.5">
                                    <button
                                        onMouseDown={onStartRecording}
                                        onMouseUp={onStopRecording}
                                        onTouchStart={onStartRecording}
                                        onTouchEnd={onStopRecording}
                                        className={`w-full h-full rounded flex items-center justify-center transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                                            isRecording
                                                ? 'bg-red-700 ring-red-500 animate-pulse'
                                                : countdown
                                                ? 'bg-yellow-500 ring-yellow-400'
                                                : 'bg-gray-700 hover:bg-gray-600 ring-gray-500'
                                        }`}
                                        aria-label={countdown ? `Recording in ${countdown}` : isRecording ? "Stop Recording Sample" : "Hold to Record Sample"}
                                    >
                                        {countdown ? (
                                            <span className="text-white font-bold text-xl tabular-nums">{countdown}</span>
                                        ) : isRecording ? (
                                            <div className="w-2.5 h-2.5 bg-white rounded-sm" />
                                        ) : (
                                            <div className="w-3 h-3 bg-red-500 rounded-full" />
                                        )}
                                    </button>
                                </div>
                            );
                        }
                        return (
                            <div key={`${instrument}-scope`} className="relative flex items-center justify-center rounded-md bg-gray-900 h-12 sm:h-14 px-1">
                                <SmallOscilloscope 
                                    isActive={true}
                                    analyserNode={instrumentAnalyserNodes ? instrumentAnalyserNodes[instrument] : null}
                                    color={instrumentColors[index]}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Grid and Main Oscilloscope Wrapper */}
                <div className="relative flex-1 flex flex-col gap-2">
                    {visualizerType === 'waveform' && (
                        <Oscilloscope analyserNodes={instrumentAnalyserNodes} colors={instrumentColors} />
                    )}
                    {visualizerType === 'lissajous' && (
                        <div 
                            className="absolute inset-0 z-0 rounded-xl overflow-hidden pointer-events-none"
                            style={{ filter: `hue-rotate(-${hueRotate}deg)` }}
                        >
                            <XYOscilloscope
                                isActive={isPlaying}
                                wetAnalyser={masterAnalyser}
                                color="#d1d5db" // gray-300
                            />
                        </div>
                    )}
                    {visualizerType === 'spectrum' && (
                        <div className="absolute inset-0 z-0 rounded-xl overflow-hidden pointer-events-none">
                            <FrequencySpectrumVisualizer
                                isActive={isPlaying}
                                analyserNode={masterAnalyser}
                            />
                        </div>
                    )}
                    
                    {/* Step Grid */}
                    <div 
                        className="relative z-10 flex flex-1 justify-between gap-2 sm:gap-3 md:gap-4 select-none"
                        style={{ touchAction: 'none' }}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    >
                        {[0, 1, 2, 3].map(groupIndex => (
                            <div key={groupIndex} className="grid grid-cols-4 gap-x-1 sm:gap-x-1.5 gap-y-1 sm:gap-y-2 w-full">
                                {INSTRUMENTS.map((instrument, instrumentIndex) => (
                                    instrumentVisibility[instrumentIndex] && (
                                        <React.Fragment key={instrument}>
                                            {Array.from({ length: 4 }).map((__, stepInGroup) => {
                                                const stepIndex = groupIndex * 4 + stepInGroup;
                                                return (
                                                    <StepButton
                                                        key={`${instrument}-${stepIndex}`}
                                                        isActive={grid[instrumentIndex]?.[stepIndex]}
                                                        isPlayingStep={isPlaying && currentStep === stepIndex}
                                                        color={instrumentColors[instrumentIndex]}
                                                        instrumentIndex={instrumentIndex}
                                                        stepIndex={stepIndex}
                                                    />
                                                );
                                            })}
                                        </React.Fragment>
                                    )
                                ))}
                            </div>
                        ))}
                    </div>
                    
                    {/* Step Numbers */}
                    <div className="relative z-10 flex justify-between gap-2 sm:gap-3 md:gap-4">
                        {[0, 1, 2, 3].map(groupIndex => (
                            <div key={groupIndex} className="grid grid-cols-4 gap-1 sm:gap-1.5 w-full">
                                {Array.from({ length: 4 }).map((_, stepInGroup) => {
                                    const stepIndex = groupIndex * 4 + stepInGroup;
                                    const isLit = (stepIndex % 4 === 0);
                                    return (
                                        <div 
                                            key={stepIndex} 
                                            className={`text-center text-xs pt-1 ${isLit ? 'text-gray-400' : 'text-gray-600'}`}
                                        >
                                            {stepIndex + 1}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(Sequencer);