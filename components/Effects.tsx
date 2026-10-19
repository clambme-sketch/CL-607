import React, { useCallback, useState, useRef, useEffect } from 'react';
import { MIN_FILTER_FREQ, MAX_FILTER_FREQ, INSTRUMENTS, INSTRUMENT_LABELS } from '../constants';
import SmallOscilloscope from './SmallOscilloscope';
import FrequencyVisualizer from './FrequencyVisualizer';
import GainReductionMeter from './GainReductionMeter';
import { Instrument, VisualizerStyle, DelayDivision, ReverbType } from '../types';
import { EffectName } from '../App';
import Tooltip from './Tooltip';
import { getButtonStyle } from '../utils';

export const REVERB_TYPE_OPTIONS: { id: ReverbType; label: string; tooltip: string }[] = [
    { id: 'room', label: 'ROOM', tooltip: 'Tight, punchy studio drum room with natural early reflections' },
    { id: 'plate', label: 'PLATE', tooltip: 'Classic studio plate with instant diffusion and bright sheen' },
    { id: 'hall', label: 'HALL', tooltip: 'Lush, spacious concert hall with smooth blooming attack' },
];

export const DELAY_DIVISION_OPTIONS: { id: DelayDivision; label: string; beats: number; tooltip: string }[] = [
    { id: '1/32', label: '1/32', beats: 0.125, tooltip: '1/32 note echo (1/8 of a beat)' },
    { id: '1/16T', label: '1/16T', beats: 1 / 6, tooltip: '1/16 note triplet echo (1/6 of a beat)' },
    { id: '1/16', label: '1/16', beats: 0.25, tooltip: '1/16 note echo (1/4 of a beat)' },
    { id: '1/8T', label: '1/8T', beats: 1 / 3, tooltip: '1/8 note triplet echo (1/3 of a beat)' },
    { id: '1/8', label: '1/8', beats: 0.5, tooltip: '1/8 note echo (1/2 of a beat)' },
    { id: '1/8D', label: '1/8.', beats: 0.75, tooltip: 'Dotted 1/8 note echo (3/4 of a beat)' },
    { id: '1/4T', label: '1/4T', beats: 2 / 3, tooltip: '1/4 note triplet echo (2/3 of a beat)' },
    { id: '1/4', label: '1/4', beats: 1.0, tooltip: '1/4 note echo (1 full beat)' },
    { id: '1/4D', label: '1/4.', beats: 1.5, tooltip: 'Dotted 1/4 note echo (1.5 beats)' },
    { id: '1/2', label: '1/2', beats: 2.0, tooltip: '1/2 note echo (2 beats)' },
];

export const getDelayDivisionTimeSeconds = (division: DelayDivision, tempo: number): number => {
    const found = DELAY_DIVISION_OPTIONS.find(d => d.id === division);
    const beats = found ? found.beats : 0.5;
    return Math.min(2.5, Math.max(0.005, (60 / tempo) * beats));
};

interface EffectsProps {
    isActive: boolean;
    lowPassFreq: number;
    highPassFreq: number;
    onLowPassChange: (value: number) => void;
    onHighPassChange: (value: number) => void;
    reverbMix: number;
    reverbDecay: number;
    reverbType: ReverbType;
    reverbTone: number;
    reverbSource: Instrument | 'all';
    onReverbMixChange: (value: number) => void;
    onReverbDecayChange: (value: number) => void;
    onReverbTypeChange: (type: ReverbType) => void;
    onReverbToneChange: (value: number) => void;
    onReverbSourceChange: (source: Instrument | 'all') => void;
    delayMix: number;
    delayTime: number;
    delayFeedback: number;
    delaySource: Instrument | 'all';
    delaySyncDivision: DelayDivision | null;
    tempo: number;
    onDelayMixChange: (value: number) => void;
    onDelayTimeChange: (value: number) => void;
    onDelayFeedbackChange: (value: number) => void;
    onDelaySourceChange: (source: Instrument | 'all') => void;
    onDelaySyncDivisionChange: (division: DelayDivision | null) => void;
    kickSidechainAmount: number;
    kickSidechainThreshold: number;
    kickSidechainRatio: number;
    onKickSidechainAmountChange: (value: number) => void;
    onKickSidechainThresholdChange: (value: number) => void;
    onKickSidechainRatioChange: (value: number) => void;
    crushAmount: number;
    onCrushAmountChange: (value: number) => void;
    tapeSaturationMix: number;
    onTapeSaturationMixChange: (value: number) => void;
    tapeSaturationAmount: number;
    onTapeSaturationAmountChange: (value: number) => void;
    tapeSaturationTone: number;
    onTapeSaturationToneChange: (value: number) => void;
    envelopeFilterMix: number;
    onEnvelopeFilterMixChange: (value: number) => void;
    envelopeFilterAmount: number;
    onEnvelopeFilterAmountChange: (value: number) => void;
    envelopeFilterBaseFreq: number;
    onEnvelopeFilterBaseFreqChange: (value: number) => void;
    envelopeFilterQ: number;
    onEnvelopeFilterQChange: (value: number) => void;
    postFilterAnalyser: AnalyserNode | null;
    reverbAnalyser: AnalyserNode | null;
    delayAnalyser: AnalyserNode | null;
    sidechainVisualiserAnalyser: AnalyserNode | null;
    crushAnalyser: AnalyserNode | null;
    tapeSaturationAnalyser: AnalyserNode | null;
    envelopeFilterAnalyser: AnalyserNode | null;
    effectsEnabled: Record<EffectName, boolean>;
    onToggleEffect: (effect: EffectName) => void;
    onReset: () => void;
    isSettingsDefault: boolean;
    isPerformanceMode: boolean;
    visualizerStyle?: VisualizerStyle;
}

// Convert a linear slider value (0-100) to a logarithmic frequency scale
const sliderToFreq = (value: number): number => {
    const min = Math.log(MIN_FILTER_FREQ);
    const max = Math.log(MAX_FILTER_FREQ);
    const scale = (max - min) / 100;
    return Math.exp(min + scale * value);
};

// Convert a frequency to a linear slider value (0-100)
const freqToSlider = (freq: number): number => {
    if (freq <= MIN_FILTER_FREQ) return 0;
    if (freq >= MAX_FILTER_FREQ) return 100;
    const min = Math.log(MIN_FILTER_FREQ);
    const max = Math.log(MAX_FILTER_FREQ);
    const scale = (max - min) / 100;
    return (Math.log(freq) - min) / scale;
};

const REVERB_TONE_MIN = 500;
const REVERB_TONE_MAX = 20000;
const sliderToReverbTone = (value: number): number => {
    const min = Math.log(REVERB_TONE_MIN);
    const max = Math.log(REVERB_TONE_MAX);
    return Math.exp(min + ((max - min) / 100) * value);
};
const reverbToneToSlider = (freq: number): number => {
    const clamped = Math.max(REVERB_TONE_MIN, Math.min(REVERB_TONE_MAX, freq));
    const min = Math.log(REVERB_TONE_MIN);
    const max = Math.log(REVERB_TONE_MAX);
    return ((Math.log(clamped) - min) / (max - min)) * 100;
};

const ToggleSwitch: React.FC<{ isEnabled: boolean; onToggle: () => void; accentColor: string; isMinimal?: boolean }> = ({ isEnabled, onToggle, accentColor, isMinimal }) => {
    if (isMinimal) {
        return (
            <button
                type="button"
                onClick={onToggle}
                role="switch"
                aria-checked={isEnabled}
                className={`px-2 py-0.5 text-[10px] font-['IBM_Plex_Mono'] font-medium border cursor-pointer ${
                    isEnabled
                        ? 'bg-[#f4f4f5] text-[#09090b] border-[#f4f4f5]'
                        : 'bg-[#09090b] text-[#52525b] border-[#27272a]'
                }`}
            >
                {isEnabled ? 'ON' : 'OFF'}
            </button>
        );
    }
    return (
        <button
            onClick={onToggle}
            role="switch"
            aria-checked={isEnabled}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800`}
            style={{
                backgroundColor: isEnabled ? accentColor : '#9ca3af', // gray-400
                boxShadow: isEnabled ? `0 0 8px ${accentColor}`: 'none',
            }}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
        </button>
    );
};


const Effects: React.FC<EffectsProps> = ({
    isActive,
    lowPassFreq,
    highPassFreq,
    onLowPassChange,
    onHighPassChange,
    reverbMix,
    reverbDecay,
    reverbType,
    reverbTone,
    reverbSource,
    onReverbMixChange,
    onReverbDecayChange,
    onReverbTypeChange,
    onReverbToneChange,
    onReverbSourceChange,
    delayMix,
    delayTime,
    delayFeedback,
    delaySource,
    delaySyncDivision,
    tempo,
    onDelayMixChange,
    onDelayTimeChange,
    onDelayFeedbackChange,
    onDelaySourceChange,
    onDelaySyncDivisionChange,
    kickSidechainAmount,
    kickSidechainThreshold,
    kickSidechainRatio,
    onKickSidechainAmountChange,
    onKickSidechainThresholdChange,
    onKickSidechainRatioChange,
    crushAmount,
    onCrushAmountChange,
    tapeSaturationMix,
    onTapeSaturationMixChange,
    tapeSaturationAmount,
    onTapeSaturationAmountChange,
    tapeSaturationTone,
    onTapeSaturationToneChange,
    envelopeFilterMix,
    onEnvelopeFilterMixChange,
    envelopeFilterAmount,
    onEnvelopeFilterAmountChange,
    envelopeFilterBaseFreq,
    onEnvelopeFilterBaseFreqChange,
    envelopeFilterQ,
    onEnvelopeFilterQChange,
    postFilterAnalyser,
    reverbAnalyser,
    delayAnalyser,
    sidechainVisualiserAnalyser,
    crushAnalyser,
    tapeSaturationAnalyser,
    envelopeFilterAnalyser,
    effectsEnabled,
    onToggleEffect,
    onReset,
    isSettingsDefault,
    isPerformanceMode,
    visualizerStyle = 'default',
}) => {
    const [isInteractingWithSlider, setIsInteractingWithSlider] = useState(false);
    const isMinimal = visualizerStyle === 'minimal';

    const handleSliderInteractionStart = useCallback(() => {
        setIsInteractingWithSlider(true);
        const handleInteractionEnd = () => {
            setIsInteractingWithSlider(false);
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
    
    const handleLowPassSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onLowPassChange(sliderToFreq(Number(e.target.value))), [onLowPassChange]);
    const handleHighPassSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onHighPassChange(sliderToFreq(Number(e.target.value))), [onHighPassChange]);
    const handleReverbMixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onReverbMixChange(Number(e.target.value)), [onReverbMixChange]);
    const handleReverbDecayChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onReverbDecayChange(Number(e.target.value)), [onReverbDecayChange]);
    const handleReverbToneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onReverbToneChange(sliderToReverbTone(Number(e.target.value))), [onReverbToneChange]);
    const handleReverbSourceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => onReverbSourceChange(e.target.value as Instrument | 'all'), [onReverbSourceChange]);
    const handleDelayMixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onDelayMixChange(Number(e.target.value)), [onDelayMixChange]);
    const handleDelayTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onDelaySyncDivisionChange(null);
        onDelayTimeChange(Number(e.target.value));
    }, [onDelayTimeChange, onDelaySyncDivisionChange]);
    const handleDelayTimeNudge = useCallback((deltaMs: number) => {
        onDelaySyncDivisionChange(null);
        const nextSec = Math.min(2.0, Math.max(0.005, Math.round((delayTime * 1000) + deltaMs) / 1000));
        onDelayTimeChange(nextSec);
    }, [delayTime, onDelayTimeChange, onDelaySyncDivisionChange]);
    const handleSelectDelayDivision = useCallback((div: DelayDivision) => {
        if (delaySyncDivision === div) {
            onDelaySyncDivisionChange(null);
        } else {
            onDelaySyncDivisionChange(div);
            onDelayTimeChange(getDelayDivisionTimeSeconds(div, tempo));
        }
    }, [delaySyncDivision, onDelaySyncDivisionChange, onDelayTimeChange, tempo]);
    const handleDelayFeedbackChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onDelayFeedbackChange(Number(e.target.value)), [onDelayFeedbackChange]);
    const handleDelaySourceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => onDelaySourceChange(e.target.value as Instrument | 'all'), [onDelaySourceChange]);
    const handleKickSidechainChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onKickSidechainAmountChange(Number(e.target.value)), [onKickSidechainAmountChange]);
    const handleKickSidechainThresholdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onKickSidechainThresholdChange(Number(e.target.value)), [onKickSidechainThresholdChange]);
    const handleKickSidechainRatioChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onKickSidechainRatioChange(Number(e.target.value)), [onKickSidechainRatioChange]);
    const handleCrushChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onCrushAmountChange(Number(e.target.value)), [onCrushAmountChange]);
    const handleTapeSaturationMixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onTapeSaturationMixChange(Number(e.target.value)), [onTapeSaturationMixChange]);
    const handleTapeSaturationAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onTapeSaturationAmountChange(Number(e.target.value)), [onTapeSaturationAmountChange]);
    const handleTapeSaturationToneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onTapeSaturationToneChange(sliderToFreq(Number(e.target.value))), [onTapeSaturationToneChange]);
    const handleEnvelopeFilterMixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onEnvelopeFilterMixChange(Number(e.target.value)), [onEnvelopeFilterMixChange]);
    const handleEnvelopeFilterAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onEnvelopeFilterAmountChange(Number(e.target.value)), [onEnvelopeFilterAmountChange]);
    const handleEnvelopeFilterBaseFreqChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onEnvelopeFilterBaseFreqChange(sliderToFreq(Number(e.target.value))), [onEnvelopeFilterBaseFreqChange]);
    const handleEnvelopeFilterQChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onEnvelopeFilterQChange(Number(e.target.value)), [onEnvelopeFilterQChange]);

    const decayInSeconds = (0.1 + reverbDecay * 5.9).toFixed(1);

    const effectContainerClasses = (isEnabled: boolean) =>
        `flex flex-col items-center gap-3 w-full ${isMinimal ? 'p-3.5 border border-[#222226] bg-[#0e0e11]' : 'transition-opacity duration-200'} ${isEnabled ? '' : 'opacity-50'}`;

    // --- Reset Button Logic ---
    const [resetProgress, setResetProgress] = useState(0);
    const [isPoofing, setIsPoofing] = useState(false);
    const resetTimerRef = useRef<number | null>(null);
    const resetRequestRef = useRef<number | null>(null);
    const HOLD_DURATION = 1000;

    useEffect(() => {
        if (isPoofing) {
            const timer = setTimeout(() => {
                onReset();
                setIsPoofing(false);
            }, 300); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [isPoofing, onReset]);

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
    // --- End Reset Button Logic ---

    const StaticVisualizerPlaceholder = () => isMinimal ? null : <div className="relative w-full h-8 bg-gray-900 rounded-md" />;

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-start justify-center gap-6 sm:gap-8">
                <div className={effectContainerClasses(effectsEnabled.lowPass)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <label htmlFor="lowpass" className="text-xs text-gray-400 uppercase tracking-wider whitespace-nowrap">LOW PASS FILTER</label>
                        <Tooltip text="Enable/Disable the Low Pass Filter">
                            <ToggleSwitch isEnabled={effectsEnabled.lowPass} onToggle={() => onToggleEffect('lowPass')} accentColor="#3b82f6" isMinimal={isMinimal} />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md transform-gpu"><FrequencyVisualizer isActive={isActive && effectsEnabled.lowPass} analyserNode={postFilterAnalyser} color="#3b82f6" /></div>}
                    <Tooltip text="Cuts high frequencies, making the sound darker or muffled" isInteracting={isInteractingWithSlider}>
                        <input type="range" id="lowpass" min={0} max={100} value={freqToSlider(lowPassFreq)} onChange={handleLowPassSliderChange} {...sliderInteractionProps} disabled={!effectsEnabled.lowPass} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:accent-gray-500" />
                    </Tooltip>
                    <span className="text-xs text-gray-500 tabular-nums">{Math.round(lowPassFreq)} Hz</span>
                </div>

                <div className={effectContainerClasses(effectsEnabled.highPass)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <label htmlFor="highpass" className="text-xs text-gray-400 uppercase tracking-wider whitespace-nowrap">HIGH PASS FILTER</label>
                         <Tooltip text="Enable/Disable the High Pass Filter">
                            <ToggleSwitch isEnabled={effectsEnabled.highPass} onToggle={() => onToggleEffect('highPass')} accentColor="#3b82f6" isMinimal={isMinimal} />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md transform-gpu"><FrequencyVisualizer isActive={isActive && effectsEnabled.highPass} analyserNode={postFilterAnalyser} color="#3b82f6" /></div>}
                    <Tooltip text="Cuts low frequencies, making the sound thinner" isInteracting={isInteractingWithSlider}>
                        <input type="range" id="highpass" min={0} max={100} value={freqToSlider(highPassFreq)} onChange={handleHighPassSliderChange} {...sliderInteractionProps} disabled={!effectsEnabled.highPass} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:accent-gray-500" />
                    </Tooltip>
                    <span className="text-xs text-gray-500 tabular-nums">{Math.round(highPassFreq)} Hz</span>
                </div>

                <div className={effectContainerClasses(effectsEnabled.sidechain)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <label htmlFor="sidechain" className="text-xs text-gray-400 uppercase tracking-wider">KICK SIDECHAIN</label>
                        <Tooltip text="Ducks the volume of other instruments when the kick hits">
                            <ToggleSwitch isEnabled={effectsEnabled.sidechain} onToggle={() => onToggleEffect('sidechain')} accentColor="#3b82f6" isMinimal={isMinimal} />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md transform-gpu"><GainReductionMeter isActive={isActive && effectsEnabled.sidechain} analyserNode={sidechainVisualiserAnalyser} color="#3b82f6" activeAmount={kickSidechainAmount} /></div>}
                    <Tooltip text="Amount of volume reduction applied to other tracks when the kick hits" isInteracting={isInteractingWithSlider}>
                        <input type="range" id="sidechain" min={0} max={1} step="0.01" value={kickSidechainAmount} onChange={handleKickSidechainChange} {...sliderInteractionProps} disabled={!effectsEnabled.sidechain} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:accent-gray-500" />
                    </Tooltip>
                    <span className="text-xs text-gray-500 tabular-nums">{Math.round(kickSidechainAmount * 100)}%</span>
                    <Tooltip text="Threshold for sidechain ducking" isInteracting={isInteractingWithSlider}>
                        <div className="flex items-center gap-2 text-xs w-full">
                            <label htmlFor="sidechain-threshold" className="text-gray-500 w-12 flex-shrink-0">THRESH</label>
                            <input type="range" id="sidechain-threshold" min={-60} max={0} step="1" value={kickSidechainThreshold} onChange={handleKickSidechainThresholdChange} {...sliderInteractionProps} disabled={!effectsEnabled.sidechain} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:accent-gray-500" />
                            <span className="text-gray-500 w-10 text-right tabular-nums">{kickSidechainThreshold}dB</span>
                        </div>
                    </Tooltip>
                    <Tooltip text="Ratio for sidechain ducking" isInteracting={isInteractingWithSlider}>
                        <div className="flex items-center gap-2 text-xs w-full">
                            <label htmlFor="sidechain-ratio" className="text-gray-500 w-12 flex-shrink-0">RATIO</label>
                            <input type="range" id="sidechain-ratio" min={1} max={20} step="0.1" value={kickSidechainRatio} onChange={handleKickSidechainRatioChange} {...sliderInteractionProps} disabled={!effectsEnabled.sidechain} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:accent-gray-500" />
                            <span className="text-gray-500 w-10 text-right tabular-nums">{kickSidechainRatio}:1</span>
                        </div>
                    </Tooltip>
                </div>
                
                <div className={effectContainerClasses(effectsEnabled.crush)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <label htmlFor="crush" className="text-xs text-gray-400 uppercase tracking-wider">BITCRUSHER</label>
                        <Tooltip text="Reduces audio bit depth and sample rate for a crunchy, lo-fi sound">
                            <ToggleSwitch isEnabled={effectsEnabled.crush} onToggle={() => onToggleEffect('crush')} accentColor="#f97316" isMinimal={isMinimal} />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md transform-gpu"><SmallOscilloscope isActive={isActive && effectsEnabled.crush} analyserNode={crushAnalyser} color="#f97316" activeAmount={crushAmount} /></div>}
                    <Tooltip text="Controls the intensity of the bit and sample rate reduction" isInteracting={isInteractingWithSlider}>
                        <input type="range" id="crush" min={0} max={1} step="0.01" value={crushAmount} onChange={handleCrushChange} {...sliderInteractionProps} disabled={!effectsEnabled.crush} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500 disabled:accent-gray-500" />
                    </Tooltip>
                    <span className="text-xs text-gray-500 tabular-nums">{Math.round(crushAmount * 100)}%</span>
                </div>

                <div className={effectContainerClasses(effectsEnabled.tape)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">TAPE SATURATION</span>
                        <Tooltip text="Adds warmth and harmonic distortion, like analog tape">
                            <ToggleSwitch isEnabled={effectsEnabled.tape} onToggle={() => onToggleEffect('tape')} accentColor="#eab308" isMinimal={isMinimal} />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md transform-gpu"><SmallOscilloscope isActive={isActive && effectsEnabled.tape} analyserNode={tapeSaturationAnalyser} color="#eab308" activeAmount={tapeSaturationMix} /></div>}
                    <div className={`w-full flex flex-col gap-3 p-3 rounded-lg bg-gray-900/50 ${!effectsEnabled.tape ? 'pointer-events-none' : ''}`}>
                        <Tooltip text="How hard the signal hits the 'tape', increasing distortion" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="tape-amount" className="text-gray-500 w-12 flex-shrink-0">DRIVE</label>
                                <input type="range" id="tape-amount" min={0} max={1} step="0.01" value={tapeSaturationAmount} onChange={handleTapeSaturationAmountChange} {...sliderInteractionProps} disabled={!effectsEnabled.tape} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{Math.round(tapeSaturationAmount * 100)}%</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="A filter to tame high-end harshness from saturation" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="tape-tone" className="text-gray-500 w-12 flex-shrink-0">TONE</label>
                                <input type="range" id="tape-tone" min={0} max={100} value={freqToSlider(tapeSaturationTone)} onChange={handleTapeSaturationToneChange} {...sliderInteractionProps} disabled={!effectsEnabled.tape} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{Math.round(tapeSaturationTone/1000)}k</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="Blends between the clean (dry) and saturated (wet) signal" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="tape-mix" className="text-gray-500 w-12 flex-shrink-0">MIX</label>
                                <input type="range" id="tape-mix" min={0} max={1} step="0.01" value={tapeSaturationMix} onChange={handleTapeSaturationMixChange} {...sliderInteractionProps} disabled={!effectsEnabled.tape} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{Math.round(tapeSaturationMix * 100)}%</span>
                            </div>
                        </Tooltip>
                    </div>
                </div>

                <div className={effectContainerClasses(effectsEnabled.envelope)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">ENVELOPE FILTER</span>
                        <Tooltip text="A filter that opens and closes based on the input signal's volume (auto-wah)">
                            <ToggleSwitch isEnabled={effectsEnabled.envelope} onToggle={() => onToggleEffect('envelope')} accentColor="#ec4899" isMinimal={isMinimal} />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md transform-gpu"><SmallOscilloscope isActive={isActive && effectsEnabled.envelope} analyserNode={envelopeFilterAnalyser} color="#ec4899" activeAmount={envelopeFilterMix} /></div>}
                    <div className={`w-full flex flex-col gap-3 p-3 rounded-lg bg-gray-900/50 ${!effectsEnabled.envelope ? 'pointer-events-none' : ''}`}>
                        <Tooltip text="The filter's base or starting frequency" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="env-freq" className="text-gray-500 w-12 flex-shrink-0">FREQ</label>
                                <input type="range" id="env-freq" min={0} max={100} value={freqToSlider(envelopeFilterBaseFreq)} onChange={handleEnvelopeFilterBaseFreqChange} {...sliderInteractionProps} disabled={!effectsEnabled.envelope} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{Math.round(envelopeFilterBaseFreq)}Hz</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="The resonance or 'peak' of the filter, making the effect more pronounced" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="env-q" className="text-gray-500 w-12 flex-shrink-0">Q</label>
                                <input type="range" id="env-q" min={0} max={1} step="0.01" value={envelopeFilterQ} onChange={handleEnvelopeFilterQChange} {...sliderInteractionProps} disabled={!effectsEnabled.envelope} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{Math.round(envelopeFilterQ * 100)}%</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="How much the input volume affects the filter frequency (auto-wah sensitivity)" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="env-depth" className="text-gray-500 w-12 flex-shrink-0">DEPTH</label>
                                <input type="range" id="env-depth" min={0} max={1} step="0.01" value={envelopeFilterAmount} onChange={handleEnvelopeFilterAmountChange} {...sliderInteractionProps} disabled={!effectsEnabled.envelope} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{Math.round(envelopeFilterAmount * 100)}%</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="Blends between the clean (dry) and filtered (wet) signal" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="env-mix" className="text-gray-500 w-12 flex-shrink-0">MIX</label>
                                <input type="range" id="env-mix" min={0} max={1} step="0.01" value={envelopeFilterMix} onChange={handleEnvelopeFilterMixChange} {...sliderInteractionProps} disabled={!effectsEnabled.envelope} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{Math.round(envelopeFilterMix * 100)}%</span>
                            </div>
                        </Tooltip>
                    </div>
                </div>
                
                <div className={effectContainerClasses(effectsEnabled.reverb)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">REVERB</span>
                         <Tooltip text="Adds spatial depth and ambiance">
                            <ToggleSwitch isEnabled={effectsEnabled.reverb} onToggle={() => onToggleEffect('reverb')} accentColor="#a855f7" isMinimal={isMinimal} />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md transform-gpu"><SmallOscilloscope isActive={isActive && effectsEnabled.reverb} analyserNode={reverbAnalyser} color="#a855f7" activeAmount={reverbMix} /></div>}
                    <div className={`w-full flex flex-col gap-3 p-3 rounded-lg bg-gray-900/50 ${!effectsEnabled.reverb ? 'pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2 text-xs">
                            <label htmlFor="reverb-source" className="text-gray-500 w-12 flex-shrink-0">SRC</label>
                            <select id="reverb-source" value={reverbSource} onChange={handleReverbSourceChange} disabled={!effectsEnabled.reverb} className="bg-gray-700 border-gray-600 text-white text-xs rounded-md focus:ring-purple-500 focus:border-purple-500 block w-full p-1.5 disabled:opacity-70">
                                <option value="all">All Instruments</option>
                                {INSTRUMENTS.map(instrument => (
                                    <option key={instrument} value={instrument}>{INSTRUMENT_LABELS[instrument]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5 text-xs">
                            <span className="text-gray-500 font-mono text-[10px] uppercase tracking-wider">SPACE</span>
                            <div className="grid grid-cols-3 gap-1.5 w-full">
                                {REVERB_TYPE_OPTIONS.map((opt) => {
                                    const isSelected = reverbType === opt.id;
                                    return (
                                        <Tooltip key={opt.id} text={opt.tooltip}>
                                            <button
                                                type="button"
                                                disabled={!effectsEnabled.reverb}
                                                onClick={() => onReverbTypeChange(opt.id)}
                                                className={getButtonStyle(
                                                    visualizerStyle as VisualizerStyle,
                                                    isSelected ? 'primary' : 'secondary',
                                                    isSelected,
                                                    !effectsEnabled.reverb,
                                                    '!px-1.5 !py-1 !text-[10px] font-mono w-full'
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </div>
                        <Tooltip text="The length of the reverb tail" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="reverb-decay" className="text-gray-500 w-12 flex-shrink-0">DECAY</label>
                                <input type="range" id="reverb-decay" min={0} max={1} step="0.01" value={reverbDecay} onChange={handleReverbDecayChange} {...sliderInteractionProps} disabled={!effectsEnabled.reverb} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{decayInSeconds}s</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="High-frequency damping filter to make the reverb warmer or brighter" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="reverb-tone" className="text-gray-500 w-12 flex-shrink-0">TONE</label>
                                <input type="range" id="reverb-tone" min={0} max={100} step="1" value={reverbToneToSlider(reverbTone)} onChange={handleReverbToneChange} {...sliderInteractionProps} disabled={!effectsEnabled.reverb} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{reverbTone >= 1000 ? `${(reverbTone / 1000).toFixed(1)}k` : `${Math.round(reverbTone)}Hz`}</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="Blends between the clean (dry) and reverberated (wet) signal" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="reverb-mix" className="text-gray-500 w-12 flex-shrink-0">MIX</label>
                                <input type="range" id="reverb-mix" min={0} max={1} step="0.01" value={reverbMix} onChange={handleReverbMixChange} {...sliderInteractionProps} disabled={!effectsEnabled.reverb} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{Math.round(reverbMix * 100)}%</span>
                            </div>
                        </Tooltip>
                    </div>
                </div>
                
                <div className={effectContainerClasses(effectsEnabled.delay)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">DELAY</span>
                        <Tooltip text="Creates rhythmic echoes of the sound">
                            <ToggleSwitch isEnabled={effectsEnabled.delay} onToggle={() => onToggleEffect('delay')} accentColor="#22c55e" isMinimal={isMinimal} />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md transform-gpu"><SmallOscilloscope isActive={isActive && effectsEnabled.delay} analyserNode={delayAnalyser} color="#22c55e" activeAmount={delayMix} /></div>}
                    <div className={`w-full flex flex-col gap-3 p-3 rounded-lg bg-gray-900/50 ${!effectsEnabled.delay ? 'pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2 text-xs">
                            <label htmlFor="delay-source" className="text-gray-500 w-12 flex-shrink-0">SRC</label>
                            <select id="delay-source" value={delaySource} onChange={handleDelaySourceChange} disabled={!effectsEnabled.delay} className="bg-gray-700 border-gray-600 text-white text-xs rounded-md focus:ring-green-500 focus:border-green-500 block w-full p-1.5 disabled:opacity-70">
                                <option value="all">All Instruments</option>
                                {INSTRUMENTS.map(instrument => (
                                    <option key={instrument} value={instrument}>{INSTRUMENT_LABELS[instrument]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 font-mono text-[10px] uppercase tracking-wider">BPM SYNC</span>
                                <Tooltip text="Switch to free millisecond delay time">
                                    <button
                                        type="button"
                                        disabled={!effectsEnabled.delay}
                                        onClick={() => onDelaySyncDivisionChange(null)}
                                        className={getButtonStyle(
                                            visualizerStyle as VisualizerStyle,
                                            delaySyncDivision === null ? 'success' : 'secondary',
                                            delaySyncDivision === null,
                                            !effectsEnabled.delay,
                                            '!px-1.5 !py-0.5 !text-[10px] font-mono'
                                        )}
                                    >
                                        FREE MS
                                    </button>
                                </Tooltip>
                            </div>
                            <div className="grid grid-cols-5 gap-1 w-full">
                                {DELAY_DIVISION_OPTIONS.map((opt) => {
                                    const isSelected = delaySyncDivision === opt.id;
                                    const syncMs = Math.round(getDelayDivisionTimeSeconds(opt.id, tempo) * 1000);
                                    return (
                                        <Tooltip key={opt.id} text={`${opt.tooltip} (${syncMs}ms at ${tempo} BPM)`}>
                                            <button
                                                type="button"
                                                disabled={!effectsEnabled.delay}
                                                onClick={() => handleSelectDelayDivision(opt.id)}
                                                className={getButtonStyle(
                                                    visualizerStyle as VisualizerStyle,
                                                    isSelected ? 'success' : 'secondary',
                                                    isSelected,
                                                    !effectsEnabled.delay,
                                                    '!px-1 !py-1 !text-[10px] font-mono w-full'
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </div>
                        <Tooltip text="Fine delay time in milliseconds (1ms increments; dragging switches from BPM sync to Free MS)" isInteracting={isInteractingWithSlider}>
                            <div className="flex flex-col gap-1 text-xs">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="delay-time" className="text-gray-500 flex-shrink-0">TIME</label>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            disabled={!effectsEnabled.delay}
                                            onClick={() => handleDelayTimeNudge(-1)}
                                            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-gray-700/80 hover:bg-gray-600 text-gray-300 cursor-pointer disabled:opacity-50"
                                            aria-label="Decrease delay time by 1 millisecond"
                                        >
                                            -1
                                        </button>
                                        <span className="text-gray-400 font-mono tabular-nums min-w-[3.75rem] text-center">
                                            {Math.round(delayTime * 1000)}ms
                                        </span>
                                        <button
                                            type="button"
                                            disabled={!effectsEnabled.delay}
                                            onClick={() => handleDelayTimeNudge(1)}
                                            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-gray-700/80 hover:bg-gray-600 text-gray-300 cursor-pointer disabled:opacity-50"
                                            aria-label="Increase delay time by 1 millisecond"
                                        >
                                            +1
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    id="delay-time"
                                    min={0.005}
                                    max={Math.max(1.5, Math.ceil(delayTime * 100) / 100)}
                                    step="0.001"
                                    value={delayTime}
                                    onChange={handleDelayTimeChange}
                                    {...sliderInteractionProps}
                                    disabled={!effectsEnabled.delay}
                                    className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500 disabled:accent-gray-500"
                                />
                            </div>
                        </Tooltip>
                        <Tooltip text="The number of echoes; how much of the output is fed back into the input" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="delay-feedback" className="text-gray-500 w-12 flex-shrink-0">FDBK</label>
                                <input type="range" id="delay-feedback" min={0} max={0.95} step="0.01" value={delayFeedback} onChange={handleDelayFeedbackChange} {...sliderInteractionProps} disabled={!effectsEnabled.delay} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{Math.round(delayFeedback * 100)}%</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="Blends between the clean (dry) and delayed (wet) signal" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="delay-mix" className="text-gray-500 w-12 flex-shrink-0">MIX</label>
                                <input type="range" id="delay-mix" min={0} max={1} step="0.01" value={delayMix} onChange={handleDelayMixChange} {...sliderInteractionProps} disabled={!effectsEnabled.delay} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right tabular-nums">{Math.round(delayMix * 100)}%</span>
                            </div>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(Effects);
