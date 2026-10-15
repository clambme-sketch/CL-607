import React, { useState, useCallback, useRef, useEffect } from 'react';
import SampleVisualizer from './SampleVisualizer';
import { Instrument, InstrumentParams, VisualizerStyle } from '../types';
import { getButtonStyle, getThemeSurface } from '../utils';
import { MIN_FILTER_FREQ, MAX_FILTER_FREQ } from '../constants';

const EMPTY_VISUALIZER_DATA = new Float32Array(256);
const EMPTY_SAMPLE_DATA = new Float32Array(0);

// Logarithmic frequency slider helpers (matching Effects & InstrumentSettings)
const sliderToFreq = (value: number): number => {
    const min = Math.log(MIN_FILTER_FREQ);
    const max = Math.log(MAX_FILTER_FREQ);
    const scale = (max - min) / 100;
    return Math.exp(min + scale * value);
};

const freqToSlider = (freq: number): number => {
    if (freq <= MIN_FILTER_FREQ) return 0;
    if (freq >= MAX_FILTER_FREQ) return 100;
    const min = Math.log(MIN_FILTER_FREQ);
    const max = Math.log(MAX_FILTER_FREQ);
    const scale = (max - min) / 100;
    return (Math.log(freq) - min) / scale;
};

const formatFreq = (hz: number): string => {
    if (hz >= 1000) {
        return `${(hz / 1000).toFixed(hz >= 10000 ? 1 : 2)} kHz`;
    }
    return `${Math.round(hz)} Hz`;
};

interface SampleRecorderMenuProps {
    isAudioEngineReady: boolean;
    audioContext: AudioContext | null;
    isRecording: boolean;
    onToggleRecording: () => void;
    fullAudioData: Float32Array;
    setFullAudioData: React.Dispatch<React.SetStateAction<Float32Array>>;
    originalAudioData: Float32Array;
    setOriginalAudioData: React.Dispatch<React.SetStateAction<Float32Array>>;
    trimRange: { start: number; end: number };
    setTrimRange: React.Dispatch<React.SetStateAction<{ start: number; end: number }>>;
    sampleParams: InstrumentParams;
    onParamChange: (instrument: Instrument, param: keyof InstrumentParams, value: number) => void;
    playSample: (volume: number, time?: number, params?: Partial<InstrumentParams>) => void;
    visualizerStyle: VisualizerStyle;
}

const SampleRecorderMenu: React.FC<SampleRecorderMenuProps> = ({
    isAudioEngineReady,
    audioContext,
    isRecording,
    onToggleRecording,
    fullAudioData,
    setFullAudioData,
    originalAudioData,
    setOriginalAudioData,
    trimRange,
    setTrimRange,
    sampleParams,
    onParamChange,
    playSample,
    visualizerStyle,
}) => {
    const [message, setMessage] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [recordingElapsed, setRecordingElapsed] = useState(0);
    const [previewProgress, setPreviewProgress] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const messageTimerRef = useRef<number | null>(null);
    const previewRafRef = useRef<number | null>(null);

    const pitch = sampleParams.pitch ?? 1;
    const decay = sampleParams.decay ?? 1;
    const highPass = sampleParams.highPass ?? MIN_FILTER_FREQ;
    const lowPass = sampleParams.lowPass ?? MAX_FILTER_FREQ;

    const sampleRate = audioContext?.sampleRate || 44100;
    const hasSample = fullAudioData.length > 0;
    const totalSeconds = hasSample ? fullAudioData.length / sampleRate : 0;
    const selectedSeconds = hasSample ? (trimRange.end - trimRange.start) * totalSeconds : 0;
    const isTrimmedSubregion = hasSample && (trimRange.start > 0.005 || trimRange.end < 0.995);

    const areParamsModified =
        Math.abs(pitch - 1) > 0.005 ||
        Math.abs(decay - 1) > 0.005 ||
        highPass > MIN_FILTER_FREQ + 2 ||
        lowPass < MAX_FILTER_FREQ - 50;

    const showStatusMessage = useCallback((msg: string) => {
        setMessage(msg);
        if (messageTimerRef.current) {
            window.clearTimeout(messageTimerRef.current);
        }
        messageTimerRef.current = window.setTimeout(() => {
            setMessage(null);
            messageTimerRef.current = null;
        }, 3000);
    }, []);

    useEffect(() => {
        return () => {
            if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
            if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
        };
    }, []);

    // Track elapsed microphone recording time
    useEffect(() => {
        if (!isRecording) {
            setRecordingElapsed(0);
            return;
        }
        const start = performance.now();
        const interval = window.setInterval(() => {
            setRecordingElapsed((performance.now() - start) / 1000);
        }, 100);
        return () => window.clearInterval(interval);
    }, [isRecording]);

    const decodeAndLoadFile = useCallback(async (file: File) => {
        if (!audioContext) {
            showStatusMessage("Start the audio engine first.");
            return;
        }
        if (!file.type.startsWith('audio/') && !/\.(wav|mp3|ogg|flac|m4a|aac|webm)$/i.test(file.name)) {
            showStatusMessage("Please select a valid audio file.");
            return;
        }
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const channelData = audioBuffer.getChannelData(0);
            const data = new Float32Array(channelData);
            setFullAudioData(data);
            setOriginalAudioData(data);
            setTrimRange({ start: 0, end: 1 });
            showStatusMessage(`Loaded "${file.name.replace(/\.[^/.]+$/, '')}" (${audioBuffer.duration.toFixed(2)}s)`);
        } catch (err) {
            console.error("Error decoding audio:", err);
            showStatusMessage("Could not decode audio file.");
        }
    }, [audioContext, setFullAudioData, setOriginalAudioData, setTrimRange, showStatusMessage]);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            await decodeAndLoadFile(file);
        }
    }, [decodeAndLoadFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!isDragOver) setIsDragOver(true);
    }, [isDragOver]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await decodeAndLoadFile(file);
        }
        e.target.value = '';
    }, [decodeAndLoadFile]);

    const handleRecordButtonClick = () => {
        if (!isAudioEngineReady) {
            showStatusMessage("Start the audio engine first.");
            return;
        }
        onToggleRecording();
    };

    const handleTrim = useCallback((start: number, end: number) => {
        setTrimRange({ start, end });
    }, [setTrimRange]);

    const getTrimmedData = useCallback(() => {
        if (fullAudioData.length === 0) return EMPTY_SAMPLE_DATA;
        const startIndex = Math.floor(trimRange.start * fullAudioData.length);
        const endIndex = Math.floor(trimRange.end * fullAudioData.length);
        return fullAudioData.subarray(startIndex, endIndex);
    }, [fullAudioData, trimRange]);

    const handlePreview = useCallback(() => {
        if (!hasSample || isRecording) return;
        playSample(1, undefined, sampleParams);

        if (previewRafRef.current) {
            cancelAnimationFrame(previewRafRef.current);
        }

        const effectiveDurationMs = Math.max(80, (selectedSeconds / Math.max(0.25, pitch)) * 1000);
        const startTime = performance.now();

        const animatePlayhead = (now: number) => {
            const elapsed = now - startTime;
            const progress = elapsed / effectiveDurationMs;
            if (progress < 1) {
                setPreviewProgress(progress);
                previewRafRef.current = requestAnimationFrame(animatePlayhead);
            } else {
                setPreviewProgress(null);
                previewRafRef.current = null;
            }
        };
        setPreviewProgress(0);
        previewRafRef.current = requestAnimationFrame(animatePlayhead);
    }, [hasSample, isRecording, playSample, sampleParams, selectedSeconds, pitch]);

    const handleCropToTrim = () => {
        const trimmed = getTrimmedData();
        if (trimmed.length === 0) return;
        setFullAudioData(new Float32Array(trimmed));
        setTrimRange({ start: 0, end: 1 });
        showStatusMessage("Cropped to selection.");
    };

    const handleNormalize = () => {
        const trimmed = getTrimmedData();
        if (trimmed.length === 0) return;
        let max = 0;
        for (let i = 0; i < trimmed.length; i++) {
            max = Math.max(max, Math.abs(trimmed[i]));
        }
        if (max === 0) return;
        const factor = 1 / max;
        const normalized = new Float32Array(trimmed.length);
        for (let i = 0; i < trimmed.length; i++) {
            normalized[i] = trimmed[i] * factor;
        }
        setFullAudioData(normalized);
        setTrimRange({ start: 0, end: 1 });
        showStatusMessage("Normalized to 0 dBFS.");
    };

    const handleReverse = () => {
        const trimmed = getTrimmedData();
        if (trimmed.length === 0) return;
        const reversed = new Float32Array(trimmed).reverse();
        setFullAudioData(reversed);
        setTrimRange({ start: 0, end: 1 });
        showStatusMessage("Sample reversed.");
    };

    const handleFadeIn = () => {
        const trimmed = getTrimmedData();
        if (trimmed.length === 0) return;
        const faded = new Float32Array(trimmed);
        const fadeLength = Math.floor(faded.length * 0.2);
        for (let i = 0; i < fadeLength; i++) {
            faded[i] *= i / fadeLength;
        }
        setFullAudioData(faded);
        setTrimRange({ start: 0, end: 1 });
        showStatusMessage("20% fade-in applied.");
    };

    const handleFadeOut = () => {
        const trimmed = getTrimmedData();
        if (trimmed.length === 0) return;
        const faded = new Float32Array(trimmed);
        const fadeLength = Math.floor(faded.length * 0.25);
        const fadeStart = faded.length - fadeLength;
        for (let i = 0; i < fadeLength; i++) {
            faded[fadeStart + i] *= 1 - i / fadeLength;
        }
        setFullAudioData(faded);
        setTrimRange({ start: 0, end: 1 });
        showStatusMessage("25% fade-out applied.");
    };

    const handleRevert = () => {
        if (originalAudioData.length === 0) return;
        setFullAudioData(originalAudioData);
        setTrimRange({ start: 0, end: 1 });
        showStatusMessage("Reverted to original sample.");
    };

    const handleClear = () => {
        setFullAudioData(new Float32Array(0));
        setTrimRange({ start: 0, end: 1 });
        setPreviewProgress(null);
        showStatusMessage("Sample cleared.");
    };

    const handleResetParams = () => {
        onParamChange('sample', 'pitch', 1);
        onParamChange('sample', 'decay', 1);
        onParamChange('sample', 'highPass', MIN_FILTER_FREQ);
        onParamChange('sample', 'lowPass', MAX_FILTER_FREQ);
        showStatusMessage("Sample parameters reset.");
    };

    const handleApplyProcessing = async () => {
        const trimmed = getTrimmedData();
        if (trimmed.length === 0) return;

        try {
            const playbackRate = pitch;
            const newLength = Math.max(1, Math.ceil(trimmed.length / playbackRate));

            const ctx = new OfflineAudioContext(1, newLength, sampleRate);
            const buffer = ctx.createBuffer(1, trimmed.length, sampleRate);
            buffer.getChannelData(0).set(trimmed);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = playbackRate;

            let lastNode: AudioNode = source;

            if (highPass > MIN_FILTER_FREQ) {
                const hpFilter = ctx.createBiquadFilter();
                hpFilter.type = 'highpass';
                hpFilter.frequency.value = highPass;
                lastNode.connect(hpFilter);
                lastNode = hpFilter;
            }

            if (lowPass < MAX_FILTER_FREQ) {
                const lpFilter = ctx.createBiquadFilter();
                lpFilter.type = 'lowpass';
                lpFilter.frequency.value = lowPass;
                lastNode.connect(lpFilter);
                lastNode = lpFilter;
            }

            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(1, 0);
            if (decay < 2) {
                gainNode.gain.exponentialRampToValueAtTime(0.001, Math.max(0.01, decay * 2.5));
            }
            lastNode.connect(gainNode);
            lastNode = gainNode;

            lastNode.connect(ctx.destination);
            source.start(0);

            const renderedBuffer = await ctx.startRendering();
            const processedData = new Float32Array(renderedBuffer.getChannelData(0));

            setFullAudioData(processedData);
            setTrimRange({ start: 0, end: 1 });

            // Reset shared sample parameters so they don't double-apply in either tab
            onParamChange('sample', 'pitch', 1);
            onParamChange('sample', 'decay', 1);
            onParamChange('sample', 'highPass', MIN_FILTER_FREQ);
            onParamChange('sample', 'lowPass', MAX_FILTER_FREQ);

            showStatusMessage("Effects baked into sample waveform.");
        } catch (err) {
            console.error("Error applying processing:", err);
            showStatusMessage("Error baking sample effects.");
        }
    };

    const isMinimal = visualizerStyle === 'minimal';
    const surface = getThemeSurface(visualizerStyle);
    const semitones = Math.round(12 * Math.log2(Math.max(0.25, pitch)) * 10) / 10;
    const semitoneStr = semitones === 0 ? '0 st' : `${semitones > 0 ? '+' : ''}${semitones.toFixed(1)} st`;

    return (
        <div
            className={
                isMinimal
                    ? 'bg-[#0e0e11] border border-[#27272a] p-4 sm:p-5 flex flex-col gap-5'
                    : 'bg-gray-900/50 rounded-lg p-4 sm:p-5 flex flex-col gap-5'
            }
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileInputChange}
            />

            {/* Top Transport & Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Record / Stop Button */}
                    <button
                        type="button"
                        onClick={handleRecordButtonClick}
                        className={getButtonStyle(
                            visualizerStyle,
                            isRecording ? 'danger' : 'secondary',
                            isRecording,
                            false,
                            'h-10 px-4 text-xs gap-2'
                        )}
                    >
                        <span
                            className={`w-2.5 h-2.5 flex-shrink-0 ${
                                isRecording
                                    ? 'bg-current rounded-[2px] animate-pulse'
                                    : 'rounded-full bg-[#e11d48]'
                            }`}
                        />
                        <span className="tabular-nums">
                            {isRecording ? `STOP (${recordingElapsed.toFixed(1)}s)` : 'REC MIC'}
                        </span>
                    </button>

                    {/* Preview Button */}
                    <button
                        type="button"
                        onClick={handlePreview}
                        disabled={!hasSample || isRecording}
                        className={getButtonStyle(
                            visualizerStyle,
                            'primary',
                            previewProgress !== null,
                            !hasSample || isRecording,
                            'h-10 px-4 text-xs gap-1.5'
                        )}
                    >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M5.25 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L8.029 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653z" />
                        </svg>
                        <span>PREVIEW</span>
                    </button>

                    {/* Load Audio File Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isRecording}
                        className={getButtonStyle(
                            visualizerStyle,
                            'secondary',
                            false,
                            isRecording,
                            'h-10 px-3.5 text-xs gap-1.5'
                        )}
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>LOAD FILE</span>
                    </button>
                </div>

                {/* Unboxed Telemetry & Status Feedback */}
                <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-gray-400">
                    {message ? (
                        <span className="font-bold text-amber-400">{message}</span>
                    ) : hasSample ? (
                        <>
                            <span className="text-gray-200 font-semibold">{selectedSeconds.toFixed(2)}s active</span>
                            <span aria-hidden="true">·</span>
                            <span>{totalSeconds.toFixed(2)}s total</span>
                            <span aria-hidden="true">·</span>
                            <span>{(sampleRate / 1000).toFixed(1)} kHz</span>
                        </>
                    ) : (
                        <span>Max clip length: 5.0s · Drop WAV/MP3 or record mic</span>
                    )}
                </div>
            </div>

            {/* Waveform Display & Trim Scope */}
            <div className={`w-full h-36 sm:h-40 overflow-hidden transform-gpu ${surface.scopeBezel}`}>
                <SampleVisualizer
                    audioData={hasSample ? fullAudioData : EMPTY_VISUALIZER_DATA}
                    trimRange={trimRange}
                    onTrim={handleTrim}
                    sampleRate={sampleRate}
                    disabled={isRecording}
                    isRecording={isRecording}
                    previewProgress={previewProgress}
                    visualizerStyle={visualizerStyle}
                    isDragOver={isDragOver}
                />
            </div>

            {/* Waveform Edit Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    <button
                        type="button"
                        onClick={handleCropToTrim}
                        disabled={!isTrimmedSubregion || isRecording}
                        title="Crop sample to the current IN/OUT trim handles"
                        className={getButtonStyle(visualizerStyle, 'secondary', false, !isTrimmedSubregion || isRecording, 'h-8 px-3 text-[11px]')}
                    >
                        CROP TRIM
                    </button>
                    <button
                        type="button"
                        onClick={() => setTrimRange({ start: 0, end: 1 })}
                        disabled={!isTrimmedSubregion || isRecording}
                        title="Expand trim handles to full sample length"
                        className={getButtonStyle(visualizerStyle, 'secondary', false, !isTrimmedSubregion || isRecording, 'h-8 px-3 text-[11px]')}
                    >
                        FULL RANGE
                    </button>
                    <button
                        type="button"
                        onClick={handleNormalize}
                        disabled={!hasSample || isRecording}
                        title="Boost peak level of trimmed region to 0 dB"
                        className={getButtonStyle(visualizerStyle, 'secondary', false, !hasSample || isRecording, 'h-8 px-3 text-[11px]')}
                    >
                        NORMALIZE
                    </button>
                    <button
                        type="button"
                        onClick={handleReverse}
                        disabled={!hasSample || isRecording}
                        title="Reverse the audio waveform"
                        className={getButtonStyle(visualizerStyle, 'secondary', false, !hasSample || isRecording, 'h-8 px-3 text-[11px]')}
                    >
                        REVERSE
                    </button>
                    <button
                        type="button"
                        onClick={handleFadeIn}
                        disabled={!hasSample || isRecording}
                        title="Apply a smooth 20% fade-in ramp"
                        className={getButtonStyle(visualizerStyle, 'secondary', false, !hasSample || isRecording, 'h-8 px-3 text-[11px]')}
                    >
                        FADE IN
                    </button>
                    <button
                        type="button"
                        onClick={handleFadeOut}
                        disabled={!hasSample || isRecording}
                        title="Apply a smooth 25% fade-out ramp"
                        className={getButtonStyle(visualizerStyle, 'secondary', false, !hasSample || isRecording, 'h-8 px-3 text-[11px]')}
                    >
                        FADE OUT
                    </button>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleRevert}
                        disabled={originalAudioData.length === 0 || isRecording}
                        title="Restore original unedited recording or file"
                        className={getButtonStyle(visualizerStyle, 'secondary', false, originalAudioData.length === 0 || isRecording, 'h-8 px-3 text-[11px]')}
                    >
                        REVERT
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={!hasSample || isRecording}
                        title="Clear sample buffer"
                        className={getButtonStyle(visualizerStyle, 'danger', false, !hasSample || isRecording, 'h-8 px-3 text-[11px]')}
                    >
                        CLEAR
                    </button>
                </div>
            </div>

            {/* Tone & Envelope Shaping Rack */}
            <div className={`pt-4 border-t border-white/10 flex flex-col gap-4 ${!hasSample || isRecording ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-gray-200">
                            Tone &amp; Envelope Shaping
                        </h5>
                        <span className="text-[11px] text-gray-400 hidden sm:inline">
                            · Double-click any slider to reset
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {areParamsModified && (
                            <button
                                type="button"
                                onClick={handleResetParams}
                                className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'h-7 px-2.5 text-[10px]')}
                            >
                                RESET PARAMS
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleApplyProcessing}
                            disabled={!hasSample || isRecording}
                            title="Permanently render current Pitch, Decay, HPF & LPF into the sample waveform"
                            className={getButtonStyle(visualizerStyle, 'primary', false, !hasSample || isRecording, 'h-7 px-3 text-[10px]')}
                        >
                            BAKE TO WAVEFORM
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    {/* Pitch / Playback Rate */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label htmlFor="sample-rec-pitch" className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                                Pitch
                            </label>
                            <span className="text-[11px] font-mono tabular-nums text-gray-400">
                                {pitch.toFixed(2)}x · {semitoneStr}
                            </span>
                        </div>
                        <input
                            id="sample-rec-pitch"
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.01"
                            value={pitch}
                            onChange={(e) => onParamChange('sample', 'pitch', parseFloat(e.target.value))}
                            onDoubleClick={() => onParamChange('sample', 'pitch', 1)}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                    </div>

                    {/* Decay Envelope */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label htmlFor="sample-rec-decay" className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                                Decay
                            </label>
                            <span className="text-[11px] font-mono tabular-nums text-gray-400">
                                {decay >= 1.99 ? 'SUSTAIN' : `${decay.toFixed(2)}s`}
                            </span>
                        </div>
                        <input
                            id="sample-rec-decay"
                            type="range"
                            min="0.1"
                            max="2"
                            step="0.01"
                            value={decay}
                            onChange={(e) => onParamChange('sample', 'decay', parseFloat(e.target.value))}
                            onDoubleClick={() => onParamChange('sample', 'decay', 1)}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                    </div>

                    {/* High Pass Filter (Logarithmic) */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label htmlFor="sample-rec-hpf" className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                                High Pass
                            </label>
                            <span className="text-[11px] font-mono tabular-nums text-gray-400">
                                {formatFreq(highPass)}
                            </span>
                        </div>
                        <input
                            id="sample-rec-hpf"
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={freqToSlider(highPass)}
                            onChange={(e) => onParamChange('sample', 'highPass', sliderToFreq(parseFloat(e.target.value)))}
                            onDoubleClick={() => onParamChange('sample', 'highPass', MIN_FILTER_FREQ)}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                    </div>

                    {/* Low Pass Filter (Logarithmic) */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label htmlFor="sample-rec-lpf" className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                                Low Pass
                            </label>
                            <span className="text-[11px] font-mono tabular-nums text-gray-400">
                                {formatFreq(lowPass)}
                            </span>
                        </div>
                        <input
                            id="sample-rec-lpf"
                            type="range"
                            min="0"
                            max="100"
                            step="0.5"
                            value={freqToSlider(lowPass)}
                            onChange={(e) => onParamChange('sample', 'lowPass', sliderToFreq(parseFloat(e.target.value)))}
                            onDoubleClick={() => onParamChange('sample', 'lowPass', MAX_FILTER_FREQ)}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(SampleRecorderMenu);
