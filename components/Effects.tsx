import React, { useCallback, useState, useRef, useEffect } from 'react';
import { MIN_FILTER_FREQ, MAX_FILTER_FREQ, INSTRUMENTS, INSTRUMENT_LABELS } from '../constants';
import SmallOscilloscope from './SmallOscilloscope';
import FrequencyVisualizer from './FrequencyVisualizer';
import GainReductionMeter from './GainReductionMeter';
import { Instrument } from '../types';
import { EffectName } from '../App';
import Tooltip from './Tooltip';

interface EffectsProps {
    isActive: boolean;
    lowPassFreq: number;
    highPassFreq: number;
    onLowPassChange: (value: number) => void;
    onHighPassChange: (value: number) => void;
    reverbMix: number;
    reverbDecay: number;
    reverbSource: Instrument | 'all';
    onReverbMixChange: (value: number) => void;
    onReverbDecayChange: (value: number) => void;
    onReverbSourceChange: (source: Instrument | 'all') => void;
    delayMix: number;
    delayTime: number;
    delayFeedback: number;
    delaySource: Instrument | 'all';
    onDelayMixChange: (value: number) => void;
    onDelayTimeChange: (value: number) => void;
    onDelayFeedbackChange: (value: number) => void;
    onDelaySourceChange: (source: Instrument | 'all') => void;
    kickSidechainAmount: number;
    onKickSidechainAmountChange: (value: number) => void;
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

const ToggleSwitch: React.FC<{ isEnabled: boolean; onToggle: () => void; accentColor: string }> = ({ isEnabled, onToggle, accentColor }) => (
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


const Effects: React.FC<EffectsProps> = ({
    isActive,
    lowPassFreq,
    highPassFreq,
    onLowPassChange,
    onHighPassChange,
    reverbMix,
    reverbDecay,
    reverbSource,
    onReverbMixChange,
    onReverbDecayChange,
    onReverbSourceChange,
    delayMix,
    delayTime,
    delayFeedback,
    delaySource,
    onDelayMixChange,
    onDelayTimeChange,
    onDelayFeedbackChange,
    onDelaySourceChange,
    kickSidechainAmount,
    onKickSidechainAmountChange,
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
}) => {
    const [isInteractingWithSlider, setIsInteractingWithSlider] = useState(false);

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
    const handleReverbSourceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => onReverbSourceChange(e.target.value as Instrument | 'all'), [onReverbSourceChange]);
    const handleDelayMixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onDelayMixChange(Number(e.target.value)), [onDelayMixChange]);
    const handleDelayTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onDelayTimeChange(Number(e.target.value)), [onDelayTimeChange]);
    const handleDelayFeedbackChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onDelayFeedbackChange(Number(e.target.value)), [onDelayFeedbackChange]);
    const handleDelaySourceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => onDelaySourceChange(e.target.value as Instrument | 'all'), [onDelaySourceChange]);
    const handleKickSidechainChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onKickSidechainAmountChange(Number(e.target.value)), [onKickSidechainAmountChange]);
    const handleCrushChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onCrushAmountChange(Number(e.target.value)), [onCrushAmountChange]);
    const handleTapeSaturationMixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onTapeSaturationMixChange(Number(e.target.value)), [onTapeSaturationMixChange]);
    const handleTapeSaturationAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onTapeSaturationAmountChange(Number(e.target.value)), [onTapeSaturationAmountChange]);
    const handleTapeSaturationToneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onTapeSaturationToneChange(sliderToFreq(Number(e.target.value))), [onTapeSaturationToneChange]);
    const handleEnvelopeFilterMixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onEnvelopeFilterMixChange(Number(e.target.value)), [onEnvelopeFilterMixChange]);
    const handleEnvelopeFilterAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onEnvelopeFilterAmountChange(Number(e.target.value)), [onEnvelopeFilterAmountChange]);
    const handleEnvelopeFilterBaseFreqChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onEnvelopeFilterBaseFreqChange(sliderToFreq(Number(e.target.value))), [onEnvelopeFilterBaseFreqChange]);
    const handleEnvelopeFilterQChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onEnvelopeFilterQChange(Number(e.target.value)), [onEnvelopeFilterQChange]);

    const decayInSeconds = (0.1 + reverbDecay * 5.9).toFixed(1);

    const effectContainerClasses = (isEnabled: boolean) => `flex flex-col items-center gap-3 w-full transition-opacity duration-200 ${isEnabled ? '' : 'opacity-50'}`;

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

    const StaticVisualizerPlaceholder = () => <div className="relative w-full h-8 bg-gray-900 rounded-md" />;

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-start justify-center gap-6 sm:gap-8">
                <div className={effectContainerClasses(effectsEnabled.lowPass)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <label htmlFor="lowpass" className="text-xs text-gray-400 uppercase tracking-wider whitespace-nowrap">LOW PASS FILTER</label>
                        <Tooltip text="Enable/Disable the Low Pass Filter">
                            <ToggleSwitch isEnabled={effectsEnabled.lowPass} onToggle={() => onToggleEffect('lowPass')} accentColor="#3b82f6" />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md"><FrequencyVisualizer isActive={isActive && effectsEnabled.lowPass} analyserNode={postFilterAnalyser} color="#3b82f6" /></div>}
                    <Tooltip text="Cuts high frequencies, making the sound darker or muffled" isInteracting={isInteractingWithSlider}>
                        <input type="range" id="lowpass" min={0} max={100} value={freqToSlider(lowPassFreq)} onChange={handleLowPassSliderChange} {...sliderInteractionProps} disabled={!effectsEnabled.lowPass} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:accent-gray-500" />
                    </Tooltip>
                    <span className="text-xs text-gray-500">{Math.round(lowPassFreq)} Hz</span>
                </div>

                <div className={effectContainerClasses(effectsEnabled.highPass)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <label htmlFor="highpass" className="text-xs text-gray-400 uppercase tracking-wider whitespace-nowrap">HIGH PASS FILTER</label>
                         <Tooltip text="Enable/Disable the High Pass Filter">
                            <ToggleSwitch isEnabled={effectsEnabled.highPass} onToggle={() => onToggleEffect('highPass')} accentColor="#3b82f6" />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md"><FrequencyVisualizer isActive={isActive && effectsEnabled.highPass} analyserNode={postFilterAnalyser} color="#3b82f6" /></div>}
                    <Tooltip text="Cuts low frequencies, making the sound thinner" isInteracting={isInteractingWithSlider}>
                        <input type="range" id="highpass" min={0} max={100} value={freqToSlider(highPassFreq)} onChange={handleHighPassSliderChange} {...sliderInteractionProps} disabled={!effectsEnabled.highPass} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:accent-gray-500" />
                    </Tooltip>
                    <span className="text-xs text-gray-500">{Math.round(highPassFreq)} Hz</span>
                </div>

                <div className={effectContainerClasses(effectsEnabled.sidechain)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <label htmlFor="sidechain" className="text-xs text-gray-400 uppercase tracking-wider">KICK SIDECHAIN</label>
                        <Tooltip text="Ducks the volume of other instruments when the kick hits">
                            <ToggleSwitch isEnabled={effectsEnabled.sidechain} onToggle={() => onToggleEffect('sidechain')} accentColor="#3b82f6" />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md"><GainReductionMeter isActive={isActive && effectsEnabled.sidechain} analyserNode={sidechainVisualiserAnalyser} color="#3b82f6" /></div>}
                    <Tooltip text="Amount of volume reduction applied to other tracks when the kick hits" isInteracting={isInteractingWithSlider}>
                        <input type="range" id="sidechain" min={0} max={1} step="0.01" value={kickSidechainAmount} onChange={handleKickSidechainChange} {...sliderInteractionProps} disabled={!effectsEnabled.sidechain} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:accent-gray-500" />
                    </Tooltip>
                    <span className="text-xs text-gray-500">{Math.round(kickSidechainAmount * 100)}%</span>
                </div>
                
                <div className={effectContainerClasses(effectsEnabled.crush)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <label htmlFor="crush" className="text-xs text-gray-400 uppercase tracking-wider">BITCRUSHER</label>
                        <Tooltip text="Reduces audio bit depth and sample rate for a crunchy, lo-fi sound">
                            <ToggleSwitch isEnabled={effectsEnabled.crush} onToggle={() => onToggleEffect('crush')} accentColor="#f97316" />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md"><SmallOscilloscope isActive={isActive && effectsEnabled.crush} analyserNode={crushAnalyser} color="#f97316" activeAmount={crushAmount} /></div>}
                    <Tooltip text="Controls the intensity of the bit and sample rate reduction" isInteracting={isInteractingWithSlider}>
                        <input type="range" id="crush" min={0} max={1} step="0.01" value={crushAmount} onChange={handleCrushChange} {...sliderInteractionProps} disabled={!effectsEnabled.crush} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500 disabled:accent-gray-500" />
                    </Tooltip>
                    <span className="text-xs text-gray-500">{Math.round(crushAmount * 100)}%</span>
                </div>

                <div className={effectContainerClasses(effectsEnabled.tape)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">TAPE SATURATION</span>
                        <Tooltip text="Adds warmth and harmonic distortion, like analog tape">
                            <ToggleSwitch isEnabled={effectsEnabled.tape} onToggle={() => onToggleEffect('tape')} accentColor="#eab308" />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md"><SmallOscilloscope isActive={isActive && effectsEnabled.tape} analyserNode={tapeSaturationAnalyser} color="#eab308" /></div>}
                    <div className={`w-full flex flex-col gap-3 p-3 rounded-lg bg-gray-900/50 ${!effectsEnabled.tape ? 'pointer-events-none' : ''}`}>
                        <Tooltip text="How hard the signal hits the 'tape', increasing distortion" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="tape-amount" className="text-gray-500 w-12 flex-shrink-0">DRIVE</label>
                                <input type="range" id="tape-amount" min={0} max={1} step="0.01" value={tapeSaturationAmount} onChange={handleTapeSaturationAmountChange} {...sliderInteractionProps} disabled={!effectsEnabled.tape} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{Math.round(tapeSaturationAmount * 100)}%</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="A filter to tame high-end harshness from saturation" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="tape-tone" className="text-gray-500 w-12 flex-shrink-0">TONE</label>
                                <input type="range" id="tape-tone" min={0} max={100} value={freqToSlider(tapeSaturationTone)} onChange={handleTapeSaturationToneChange} {...sliderInteractionProps} disabled={!effectsEnabled.tape} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{Math.round(tapeSaturationTone/1000)}k</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="Blends between the clean (dry) and saturated (wet) signal" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="tape-mix" className="text-gray-500 w-12 flex-shrink-0">MIX</label>
                                <input type="range" id="tape-mix" min={0} max={1} step="0.01" value={tapeSaturationMix} onChange={handleTapeSaturationMixChange} {...sliderInteractionProps} disabled={!effectsEnabled.tape} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{Math.round(tapeSaturationMix * 100)}%</span>
                            </div>
                        </Tooltip>
                    </div>
                </div>

                <div className={effectContainerClasses(effectsEnabled.envelope)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">ENVELOPE FILTER</span>
                        <Tooltip text="A filter that opens and closes based on the input signal's volume (auto-wah)">
                            <ToggleSwitch isEnabled={effectsEnabled.envelope} onToggle={() => onToggleEffect('envelope')} accentColor="#ec4899" />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md"><SmallOscilloscope isActive={isActive && effectsEnabled.envelope} analyserNode={envelopeFilterAnalyser} color="#ec4899" /></div>}
                    <div className={`w-full flex flex-col gap-3 p-3 rounded-lg bg-gray-900/50 ${!effectsEnabled.envelope ? 'pointer-events-none' : ''}`}>
                        <Tooltip text="The filter's base or starting frequency" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="env-freq" className="text-gray-500 w-12 flex-shrink-0">FREQ</label>
                                <input type="range" id="env-freq" min={0} max={100} value={freqToSlider(envelopeFilterBaseFreq)} onChange={handleEnvelopeFilterBaseFreqChange} {...sliderInteractionProps} disabled={!effectsEnabled.envelope} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{Math.round(envelopeFilterBaseFreq)}Hz</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="The resonance or 'peak' of the filter, making the effect more pronounced" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="env-q" className="text-gray-500 w-12 flex-shrink-0">Q</label>
                                <input type="range" id="env-q" min={0} max={1} step="0.01" value={envelopeFilterQ} onChange={handleEnvelopeFilterQChange} {...sliderInteractionProps} disabled={!effectsEnabled.envelope} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{Math.round(envelopeFilterQ * 100)}%</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="How much the input volume affects the filter frequency (auto-wah sensitivity)" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="env-depth" className="text-gray-500 w-12 flex-shrink-0">DEPTH</label>
                                <input type="range" id="env-depth" min={0} max={1} step="0.01" value={envelopeFilterAmount} onChange={handleEnvelopeFilterAmountChange} {...sliderInteractionProps} disabled={!effectsEnabled.envelope} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{Math.round(envelopeFilterAmount * 100)}%</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="Blends between the clean (dry) and filtered (wet) signal" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="env-mix" className="text-gray-500 w-12 flex-shrink-0">MIX</label>
                                <input type="range" id="env-mix" min={0} max={1} step="0.01" value={envelopeFilterMix} onChange={handleEnvelopeFilterMixChange} {...sliderInteractionProps} disabled={!effectsEnabled.envelope} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{Math.round(envelopeFilterMix * 100)}%</span>
                            </div>
                        </Tooltip>
                    </div>
                </div>
                
                <div className={effectContainerClasses(effectsEnabled.reverb)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">REVERB</span>
                         <Tooltip text="Adds spatial depth and ambiance">
                            <ToggleSwitch isEnabled={effectsEnabled.reverb} onToggle={() => onToggleEffect('reverb')} accentColor="#a855f7" />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md"><SmallOscilloscope isActive={isActive && effectsEnabled.reverb} analyserNode={reverbAnalyser} color="#a855f7" /></div>}
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
                        <Tooltip text="The length of the reverb tail" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="reverb-decay" className="text-gray-500 w-12 flex-shrink-0">DECAY</label>
                                <input type="range" id="reverb-decay" min={0} max={1} step="0.01" value={reverbDecay} onChange={handleReverbDecayChange} {...sliderInteractionProps} disabled={!effectsEnabled.reverb} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{decayInSeconds}s</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="Blends between the clean (dry) and reverberated (wet) signal" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="reverb-mix" className="text-gray-500 w-12 flex-shrink-0">MIX</label>
                                <input type="range" id="reverb-mix" min={0} max={1} step="0.01" value={reverbMix} onChange={handleReverbMixChange} {...sliderInteractionProps} disabled={!effectsEnabled.reverb} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{Math.round(reverbMix * 100)}%</span>
                            </div>
                        </Tooltip>
                    </div>
                </div>
                
                <div className={effectContainerClasses(effectsEnabled.delay)}>
                    <div className="w-full flex justify-between items-center px-1">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">DELAY</span>
                        <Tooltip text="Creates rhythmic echoes of the sound">
                            <ToggleSwitch isEnabled={effectsEnabled.delay} onToggle={() => onToggleEffect('delay')} accentColor="#22c55e" />
                        </Tooltip>
                    </div>
                    {isPerformanceMode ? <StaticVisualizerPlaceholder /> : <div className="relative w-full h-8 bg-gray-900 rounded-md"><SmallOscilloscope isActive={isActive && effectsEnabled.delay} analyserNode={delayAnalyser} color="#22c55e" /></div>}
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
                        <Tooltip text="The time between each echo" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="delay-time" className="text-gray-500 w-12 flex-shrink-0">TIME</label>
                                <input type="range" id="delay-time" min={0} max={1} step="0.01" value={delayTime} onChange={handleDelayTimeChange} {...sliderInteractionProps} disabled={!effectsEnabled.delay} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{Math.round(delayTime * 1000)}ms</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="The number of echoes; how much of the output is fed back into the input" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="delay-feedback" className="text-gray-500 w-12 flex-shrink-0">FDBK</label>
                                <input type="range" id="delay-feedback" min={0} max={0.95} step="0.01" value={delayFeedback} onChange={handleDelayFeedbackChange} {...sliderInteractionProps} disabled={!effectsEnabled.delay} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{Math.round(delayFeedback * 100)}%</span>
                            </div>
                        </Tooltip>
                        <Tooltip text="Blends between the clean (dry) and delayed (wet) signal" isInteracting={isInteractingWithSlider}>
                            <div className="flex items-center gap-2 text-xs">
                                <label htmlFor="delay-mix" className="text-gray-500 w-12 flex-shrink-0">MIX</label>
                                <input type="range" id="delay-mix" min={0} max={1} step="0.01" value={delayMix} onChange={handleDelayMixChange} {...sliderInteractionProps} disabled={!effectsEnabled.delay} className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500 disabled:accent-gray-500" />
                                <span className="text-gray-500 w-10 text-right">{Math.round(delayMix * 100)}%</span>
                            </div>
                        </Tooltip>
                    </div>
                </div>
            </div>
            {!isSettingsDefault && (
                <Tooltip text="Hold to reset all effect parameters to their defaults">
                    <button
                        onMouseDown={handleResetStart}
                        onMouseUp={handleResetEnd}
                        onMouseLeave={handleResetEnd}
                        onTouchStart={(e) => { e.preventDefault(); handleResetStart(); }}
                        onTouchEnd={handleResetEnd}
                        className={`relative flex items-center justify-center mt-2 px-3 h-8 bg-gray-600/80 text-white font-bold rounded-md hover:bg-gray-500/80 transition-transform duration-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 text-xs uppercase tracking-wider overflow-hidden select-none ${isPoofing ? 'animate-poof' : ''}`}
                        style={{ transform: `scale(${1 - resetProgress * 0.15})` }}
                        aria-label="Hold to reset effects to default"
                    >
                        <span className="relative z-10">
                            HOLD TO RESET EFFECTS
                        </span>
                    </button>
                </Tooltip>
            )}
        </div>
    );
};

export default React.memo(Effects);
