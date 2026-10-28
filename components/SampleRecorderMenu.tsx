import React, { useState, useCallback, useRef, useEffect } from 'react';
import SampleVisualizer from './SampleVisualizer';
import { Instrument, InstrumentParams, VisualizerStyle } from '../types';
import { getButtonStyle, getThemeSurface, SampleTrimRange, applyTrimAndFades } from '../utils';
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

interface RecorderThemeTokens {
    container: string;
    dividerBorder: string;
    clusterDivider: string;
    clusterLabel: string;
    telemetryMuted: string;
    telemetryPrimary: string;
    telemetryToast: string;
    sectionTitle: string;
    sectionHint: string;
    paramCard: string;
    paramLabel: string;
    paramValuePrimary: string;
    paramValueSecondary: string;
    paramIconColor: string;
    sliderTrackBg: string;
    sliderFillBg: string;
    sliderAccent: string;
}

const getRecorderThemeTokens = (style: VisualizerStyle): RecorderThemeTokens => {
    switch (style) {
        case 'minimal':
            return {
                container: 'bg-[#0c0c0e] border border-[#222226] rounded-none p-4 sm:p-5 flex flex-col gap-4',
                dividerBorder: 'border-[#222226]',
                clusterDivider: 'bg-[#222226]',
                clusterLabel: "font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.16em] text-[#71717a]",
                telemetryMuted: "font-['IBM_Plex_Mono'] text-[#71717a]",
                telemetryPrimary: "font-['IBM_Plex_Mono'] text-[#f4f4f5] font-semibold",
                telemetryToast: "font-['IBM_Plex_Mono'] text-[#ff3b1d] font-semibold",
                sectionTitle: "font-['IBM_Plex_Mono'] text-xs font-semibold uppercase tracking-[0.16em] text-[#f4f4f5]",
                sectionHint: "font-['IBM_Plex_Mono'] text-[10px] text-[#71717a]",
                paramCard: 'bg-[#111115] border border-[#222226] rounded-none p-3 flex flex-col gap-2.5',
                paramLabel: "font-['IBM_Plex_Mono'] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d4d4d8]",
                paramValuePrimary: "font-['IBM_Plex_Mono'] text-xs font-semibold tabular-nums text-[#f4f4f5]",
                paramValueSecondary: "font-['IBM_Plex_Mono'] text-[10px] tabular-nums text-[#71717a]",
                paramIconColor: 'text-[#ff3b1d]',
                sliderTrackBg: 'bg-[#222226] rounded-none',
                sliderFillBg: 'bg-[#ff3b1d]',
                sliderAccent: 'accent-[#ff3b1d]',
            };
        case 'cyberpunk':
            return {
                container: 'bg-[#07070c] border-2 border-[#00ff9f]/80 rounded-none p-4 sm:p-5 flex flex-col gap-4 shadow-[inset_0_0_18px_rgba(0,255,159,0.08)]',
                dividerBorder: 'border-[#00ff9f]/35',
                clusterDivider: 'bg-[#00ff9f]/35',
                clusterLabel: "font-['JetBrains_Mono'] text-[9px] font-bold uppercase tracking-[0.16em] text-[#00ff9f]/70",
                telemetryMuted: "font-['JetBrains_Mono'] text-[#00ff9f]/80",
                telemetryPrimary: "font-['JetBrains_Mono'] text-[#fcee0a] font-bold",
                telemetryToast: "font-['JetBrains_Mono'] text-[#ff003c] font-bold",
                sectionTitle: "font-['JetBrains_Mono'] text-xs font-bold uppercase tracking-[0.16em] text-[#fcee0a]",
                sectionHint: "font-['JetBrains_Mono'] text-[10px] text-[#00ff9f]/70",
                paramCard: 'bg-[#0b0b14] border border-[#00ff9f]/50 rounded-none p-3 flex flex-col gap-2.5 shadow-[2px_2px_0px_rgba(0,255,159,0.2)]',
                paramLabel: "font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-[0.14em] text-[#00ff9f]",
                paramValuePrimary: "font-['JetBrains_Mono'] text-xs font-bold tabular-nums text-[#fcee0a]",
                paramValueSecondary: "font-['JetBrains_Mono'] text-[10px] tabular-nums text-[#00ff9f]/75",
                paramIconColor: 'text-[#fcee0a]',
                sliderTrackBg: 'bg-[#141424] rounded-none border border-[#00ff9f]/30',
                sliderFillBg: 'bg-[#00ff9f]',
                sliderAccent: 'accent-[#fcee0a]',
            };
        case 'braun':
            return {
                container: 'bg-[#ebe8df] border border-[#c5c1b5] rounded-[8px] p-4 sm:p-5 flex flex-col gap-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
                dividerBorder: 'border-[#c5c1b5]',
                clusterDivider: 'bg-[#c5c1b5]',
                clusterLabel: "font-['IBM_Plex_Mono'] text-[9px] font-semibold uppercase tracking-[0.14em] text-[#6e6a61]",
                telemetryMuted: "font-['IBM_Plex_Mono'] text-[#5c5850]",
                telemetryPrimary: "font-['IBM_Plex_Mono'] text-[#1c1c1a] font-bold",
                telemetryToast: "font-['IBM_Plex_Mono'] text-[#ea5b0c] font-bold",
                sectionTitle: "font-['Plus_Jakarta_Sans'] text-xs font-bold uppercase tracking-[0.14em] text-[#1c1c1a]",
                sectionHint: "font-['IBM_Plex_Mono'] text-[10px] text-[#6e6a61]",
                paramCard: 'bg-[#e0ddd3] border border-[#c2beb2] rounded-[6px] p-3 flex flex-col gap-2.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]',
                paramLabel: "font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-[0.12em] text-[#1c1c1a]",
                paramValuePrimary: "font-['IBM_Plex_Mono'] text-xs font-bold tabular-nums text-[#1c1c1a]",
                paramValueSecondary: "font-['IBM_Plex_Mono'] text-[10px] tabular-nums text-[#5c5850]",
                paramIconColor: 'text-[#ea5b0c]',
                sliderTrackBg: 'bg-[#c5c1b5] rounded-full',
                sliderFillBg: 'bg-[#ea5b0c]',
                sliderAccent: 'accent-[#ea5b0c]',
            };
        case 'bauhaus':
            return {
                container: 'bg-[#f3ede0] border-2 border-[#141413] rounded-none p-4 sm:p-5 flex flex-col gap-4 shadow-[4px_4px_0px_#141413]',
                dividerBorder: 'border-[#141413]/25',
                clusterDivider: 'bg-[#141413]/30',
                clusterLabel: "font-['Outfit'] text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#4a4740]",
                telemetryMuted: "font-['IBM_Plex_Mono'] text-[#4a4740]",
                telemetryPrimary: "font-['IBM_Plex_Mono'] text-[#141413] font-extrabold",
                telemetryToast: "font-['IBM_Plex_Mono'] text-[#d62828] font-extrabold",
                sectionTitle: "font-['Outfit'] text-xs font-extrabold uppercase tracking-[0.16em] text-[#141413]",
                sectionHint: "font-['IBM_Plex_Mono'] text-[10px] text-[#4a4740]",
                paramCard: 'bg-[#faf6ed] border-2 border-[#141413] rounded-none p-3 flex flex-col gap-2.5 shadow-[3px_3px_0px_#141413]',
                paramLabel: "font-['Outfit'] text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#141413]",
                paramValuePrimary: "font-['IBM_Plex_Mono'] text-xs font-bold tabular-nums text-[#141413]",
                paramValueSecondary: "font-['IBM_Plex_Mono'] text-[10px] font-semibold tabular-nums text-[#5c5952]",
                paramIconColor: 'text-[#d62828]',
                sliderTrackBg: 'bg-[#ded6c6] rounded-none border border-[#141413]',
                sliderFillBg: 'bg-[#d62828]',
                sliderAccent: 'accent-[#d62828]',
            };
        case 'nagra':
            return {
                container: 'bg-gradient-to-b from-[#fffdfa]/95 via-[#fff3eb]/95 to-[#fde0d3]/95 border-2 border-white rounded-[28px] p-4 sm:p-5 flex flex-col gap-4 shadow-[0_8px_20px_rgba(59,21,71,0.12),inset_0_2px_4px_#ffffff]',
                dividerBorder: 'border-[#f2b8a2]/60',
                clusterDivider: 'bg-[#e89f88]/50',
                clusterLabel: "font-['Plus_Jakarta_Sans'] text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#7a3763]",
                telemetryMuted: "font-['IBM_Plex_Mono'] text-[#6c2b56]",
                telemetryPrimary: "font-['IBM_Plex_Mono'] text-[#3b1547] font-bold",
                telemetryToast: "font-['IBM_Plex_Mono'] text-[#d92b4b] font-bold",
                sectionTitle: "font-['Plus_Jakarta_Sans'] text-xs font-extrabold uppercase tracking-[0.14em] text-[#3b1547]",
                sectionHint: "font-['Plus_Jakarta_Sans'] text-[11px] font-medium text-[#7a3763]",
                paramCard: 'bg-gradient-to-b from-[#ffffff] to-[#fff0e6] border border-white rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-[0_4px_10px_rgba(59,21,71,0.08),inset_0_1px_2px_#ffffff]',
                paramLabel: "font-['Plus_Jakarta_Sans'] text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#3b1547]",
                paramValuePrimary: "font-['IBM_Plex_Mono'] text-xs font-bold tabular-nums text-[#3b1547]",
                paramValueSecondary: "font-['IBM_Plex_Mono'] text-[10px] font-semibold tabular-nums text-[#7a3763]",
                paramIconColor: 'text-[#e03e52]',
                sliderTrackBg: 'bg-[#f7cbb8] rounded-full',
                sliderFillBg: 'bg-gradient-to-r from-[#ff7a59] to-[#e03e52]',
                sliderAccent: 'accent-[#e03e52]',
            };
        case 'koto':
            return {
                container: 'bg-gradient-to-b from-[#18121a] to-[#100c12] border border-[#d4af37]/35 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-[inset_0_1px_0_rgba(212,175,55,0.18)]',
                dividerBorder: 'border-[#d4af37]/25',
                clusterDivider: 'bg-[#d4af37]/25',
                clusterLabel: "font-['Plus_Jakarta_Sans'] text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9e8f79]",
                telemetryMuted: "font-['IBM_Plex_Mono'] text-[#a69880]",
                telemetryPrimary: "font-['IBM_Plex_Mono'] text-[#f2ece1] font-semibold",
                telemetryToast: "font-['IBM_Plex_Mono'] text-[#e6c665] font-bold",
                sectionTitle: "font-['Cormorant_Garamond'] text-sm font-bold uppercase tracking-[0.16em] text-[#f2ece1]",
                sectionHint: "font-['Plus_Jakarta_Sans'] text-[10px] text-[#9e8f79]",
                paramCard: 'bg-[#140f16] border border-[#d4af37]/30 rounded-xl p-3 flex flex-col gap-2.5 shadow-inner',
                paramLabel: "font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-[0.14em] text-[#e8dfc8]",
                paramValuePrimary: "font-['IBM_Plex_Mono'] text-xs font-semibold tabular-nums text-[#f3d87d]",
                paramValueSecondary: "font-['IBM_Plex_Mono'] text-[10px] tabular-nums text-[#9e8f79]",
                paramIconColor: 'text-[#d4af37]',
                sliderTrackBg: 'bg-[#261d29] rounded-full',
                sliderFillBg: 'bg-[#d4af37]',
                sliderAccent: 'accent-[#d4af37]',
            };
        case 'default':
            return {
                container: 'bg-gradient-to-b from-[#0b1e38] to-[#071326] border border-[#1b3963] rounded-none p-4 sm:p-5 flex flex-col gap-4',
                dividerBorder: 'border-[#1b3963]',
                clusterDivider: 'bg-[#1b3963]',
                clusterLabel: "font-['IBM_Plex_Mono'] text-[9px] font-semibold uppercase tracking-[0.14em] text-[#a8dcff]",
                telemetryMuted: "font-['IBM_Plex_Mono'] text-[#84b3e0]",
                telemetryPrimary: "font-['IBM_Plex_Mono'] text-[#eef7ff] font-semibold",
                telemetryToast: "font-['IBM_Plex_Mono'] text-[#ffc4d6] font-semibold",
                sectionTitle: "font-['IBM_Plex_Mono'] text-xs font-semibold uppercase tracking-[0.14em] text-[#eef7ff]",
                sectionHint: "font-['Plus_Jakarta_Sans'] text-[11px] text-[#a8dcff]",
                paramCard: 'bg-gradient-to-b from-[#0e2545] to-[#08172e] border border-[#1e3f6e] rounded-none p-3 flex flex-col gap-2.5',
                paramLabel: "font-['IBM_Plex_Mono'] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#dff0ff]",
                paramValuePrimary: "font-['IBM_Plex_Mono'] text-xs font-semibold tabular-nums text-[#a8dcff]",
                paramValueSecondary: "font-['IBM_Plex_Mono'] text-[10px] tabular-nums text-[#6d98c7]",
                paramIconColor: 'text-[#ffc4d6]',
                sliderTrackBg: 'bg-[#050e1d] rounded-none',
                sliderFillBg: 'bg-[#a8dcff]',
                sliderAccent: 'accent-[#ffc4d6]',
            };
        case 'classic607':
        default:
            return {
                container: 'bg-[#102a54]/90 border border-blue-400/40 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-inner',
                dividerBorder: 'border-blue-500/40',
                clusterDivider: 'bg-blue-400/40',
                clusterLabel: 'text-[9px] font-bold uppercase tracking-[0.14em] text-blue-300',
                telemetryMuted: 'font-mono text-blue-300/70',
                telemetryPrimary: 'font-mono text-blue-100 font-semibold',
                telemetryToast: 'font-mono text-cyan-300 font-bold',
                sectionTitle: 'text-xs font-bold uppercase tracking-wider text-blue-100',
                sectionHint: 'text-[11px] text-blue-300/80',
                paramCard: 'bg-[#153466] border border-blue-400/40 rounded-lg p-3 flex flex-col gap-2.5 shadow-sm',
                paramLabel: 'text-[11px] font-bold uppercase tracking-wider text-blue-100',
                paramValuePrimary: 'font-mono text-xs font-semibold tabular-nums text-cyan-300',
                paramValueSecondary: 'font-mono text-[10px] tabular-nums text-blue-300/70',
                paramIconColor: 'text-cyan-400',
                sliderTrackBg: 'bg-[#0c2042] rounded-full',
                sliderFillBg: 'bg-cyan-400',
                sliderAccent: 'accent-cyan-400',
            };
    }
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
    trimRange: SampleTrimRange;
    setTrimRange: React.Dispatch<React.SetStateAction<SampleTrimRange>>;
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
    const decay = sampleParams.decay ?? 2;
    const highPass = sampleParams.highPass ?? MIN_FILTER_FREQ;
    const lowPass = sampleParams.lowPass ?? MAX_FILTER_FREQ;
    const isOverlapEnabled = (sampleParams.overlap ?? 0) > 0.5;

    const sampleRate = audioContext?.sampleRate || 44100;
    const hasSample = fullAudioData.length > 0;
    const totalSeconds = hasSample ? fullAudioData.length / sampleRate : 0;
    const selectedSeconds = hasSample ? (trimRange.end - trimRange.start) * totalSeconds : 0;
    const isTrimmedSubregion =
        hasSample &&
        (trimRange.start > 0.005 ||
            trimRange.end < 0.995 ||
            (trimRange.fadeIn ?? 0) > 0.005 ||
            (trimRange.fadeOut ?? 0) > 0.005);

    const areParamsModified =
        Math.abs(pitch - 1) > 0.005 ||
        Math.abs(decay - 2) > 0.005 ||
        highPass > MIN_FILTER_FREQ + 2 ||
        lowPass < MAX_FILTER_FREQ - 50 ||
        isOverlapEnabled;

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
            setTrimRange({ start: 0, end: 1, fadeIn: 0, fadeOut: 0 });
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

    const handleTrim = useCallback((start: number, end: number, fadeIn: number = 0, fadeOut: number = 0) => {
        setTrimRange({ start, end, fadeIn, fadeOut });
    }, [setTrimRange]);

    const getTrimmedData = useCallback(() => {
        if (fullAudioData.length === 0) return EMPTY_SAMPLE_DATA;
        return applyTrimAndFades(fullAudioData, trimRange);
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
        setTrimRange({ start: 0, end: 1, fadeIn: 0, fadeOut: 0 });
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
        setTrimRange({ start: 0, end: 1, fadeIn: 0, fadeOut: 0 });
        showStatusMessage("Normalized to 0 dBFS.");
    };

    const handleReverse = () => {
        const trimmed = getTrimmedData();
        if (trimmed.length === 0) return;
        const reversed = new Float32Array(trimmed).reverse();
        setFullAudioData(reversed);
        setTrimRange({ start: 0, end: 1, fadeIn: 0, fadeOut: 0 });
        showStatusMessage("Sample reversed.");
    };

    const handleRevert = () => {
        if (originalAudioData.length === 0) return;
        setFullAudioData(originalAudioData);
        setTrimRange({ start: 0, end: 1, fadeIn: 0, fadeOut: 0 });
        showStatusMessage("Restored original sample.");
    };

    const handleClear = () => {
        setFullAudioData(new Float32Array(0));
        setTrimRange({ start: 0, end: 1, fadeIn: 0, fadeOut: 0 });
        setPreviewProgress(null);
        showStatusMessage("Sample cleared.");
    };

    const handleResetParams = () => {
        onParamChange('sample', 'pitch', 1);
        onParamChange('sample', 'decay', 2);
        onParamChange('sample', 'highPass', MIN_FILTER_FREQ);
        onParamChange('sample', 'lowPass', MAX_FILTER_FREQ);
        onParamChange('sample', 'overlap', 0);
        showStatusMessage("Sample parameters reset.");
    };

    const handleToggleOverlap = () => {
        const nextOverlap = isOverlapEnabled ? 0 : 1;
        onParamChange('sample', 'overlap', nextOverlap);
        showStatusMessage(
            nextOverlap === 1
                ? "Overlap ON (Poly): Samples layer over each other."
                : "Overlap OFF (Choke): New sample cuts off previous."
        );
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

            const nyquistMax = Math.max(200, sampleRate * 0.46);

            if (highPass > MIN_FILTER_FREQ) {
                const hpFilter = ctx.createBiquadFilter();
                hpFilter.type = 'highpass';
                hpFilter.frequency.value = Math.max(MIN_FILTER_FREQ, Math.min(nyquistMax, highPass));
                lastNode.connect(hpFilter);
                lastNode = hpFilter;
            }

            if (lowPass < MAX_FILTER_FREQ) {
                const lpFilter = ctx.createBiquadFilter();
                lpFilter.type = 'lowpass';
                lpFilter.frequency.value = Math.max(60, Math.min(nyquistMax, lowPass));
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
            setTrimRange({ start: 0, end: 1, fadeIn: 0, fadeOut: 0 });

            // Reset shared sample parameters so they don't double-apply in either tab
            onParamChange('sample', 'pitch', 1);
            onParamChange('sample', 'decay', 2);
            onParamChange('sample', 'highPass', MIN_FILTER_FREQ);
            onParamChange('sample', 'lowPass', MAX_FILTER_FREQ);

            showStatusMessage("Effects applied to sample.");
        } catch (err) {
            console.error("Error applying processing:", err);
            showStatusMessage("Error applying sample effects.");
        }
    };

    const surface = getThemeSurface(visualizerStyle);
    const tokens = getRecorderThemeTokens(visualizerStyle);

    const semitones = Math.round(12 * Math.log2(Math.max(0.25, pitch)) * 10) / 10;
    const semitoneStr = semitones === 0 ? '0.0 st' : `${semitones > 0 ? '+' : ''}${semitones.toFixed(1)} st`;

    // Normalized fill percentages for visual parameter progress bars
    const pitchPercent = Math.max(0, Math.min(100, ((pitch - 0.5) / 1.5) * 100));
    const decayPercent = Math.max(0, Math.min(100, ((decay - 0.1) / 1.9) * 100));
    const hpfPercent = Math.max(0, Math.min(100, freqToSlider(highPass)));
    const lpfPercent = Math.max(0, Math.min(100, freqToSlider(lowPass)));

    return (
        <div
            className={tokens.container}
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

            {/* 1. Top Transport & Telemetry Bar */}
            <div className={`flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b ${tokens.dividerBorder}`}>
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
                            'h-9 px-3.5 text-xs gap-2'
                        )}
                    >
                        <span
                            className={`w-2.5 h-2.5 flex-shrink-0 ${
                                isRecording
                                    ? 'bg-current rounded-[2px] animate-pulse'
                                    : 'rounded-full bg-[#e11d48] shadow-[0_0_6px_rgba(225,29,72,0.7)]'
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
                            'h-9 px-3.5 text-xs gap-1.5'
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
                            'h-9 px-3.5 text-xs gap-1.5'
                        )}
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>LOAD FILE</span>
                    </button>

                    {/* Overlap (Poly) vs Cut (Choke) Voice Mode Toggle */}
                    <button
                        type="button"
                        onClick={handleToggleOverlap}
                        disabled={isRecording}
                        aria-pressed={isOverlapEnabled}
                        title={
                            isOverlapEnabled
                                ? "Overlap / Poly Mode (Active): Samples ring out and overlap each other. Click to switch to Cut / Choke Mode."
                                : "Cut / Choke Mode (Default): Starting a sample cuts off the previous sample. Click to allow samples to overlap (Poly Mode)."
                        }
                        className={getButtonStyle(
                            visualizerStyle,
                            isOverlapEnabled ? 'success' : 'secondary',
                            isOverlapEnabled,
                            isRecording,
                            'h-9 px-3.5 text-xs gap-1.5'
                        )}
                    >
                        {isOverlapEnabled ? (
                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                <polyline points="2 12 12 17 22 12" />
                                <polyline points="2 17 12 22 22 17" />
                            </svg>
                        ) : (
                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18" />
                                <path d="M6 6l12 12" />
                            </svg>
                        )}
                        <span>{isOverlapEnabled ? 'OVERLAP: ON (POLY)' : 'OVERLAP: OFF (CUT)'}</span>
                    </button>
                </div>

                {/* Unboxed Telemetry & Status Feedback */}
                <div className={`flex items-center gap-2 text-xs tabular-nums ${tokens.telemetryMuted}`}>
                    {message ? (
                        <span className={`flex items-center gap-1.5 ${tokens.telemetryToast}`}>
                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>{message}</span>
                        </span>
                    ) : hasSample ? (
                        <>
                            <span className={tokens.telemetryPrimary}>{selectedSeconds.toFixed(2)}s active</span>
                            <span aria-hidden="true" className="opacity-50">·</span>
                            <span>{totalSeconds.toFixed(2)}s total</span>
                            <span aria-hidden="true" className="opacity-50">·</span>
                            <span>{(sampleRate / 1000).toFixed(1)} kHz</span>
                        </>
                    ) : null}
                </div>
            </div>

            {/* 2. High-Contrast Waveform Display & Trim Scope */}
            <div className={`w-full h-40 sm:h-44 overflow-hidden transform-gpu ${surface.scopeBezel}`}>
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

            {/* 3. Clustered Waveform Edit Toolbar (Icon + Concise Label) */}
            <div className="flex flex-wrap items-center justify-between gap-y-2.5 gap-x-3">
                <div className="flex flex-wrap items-center gap-y-2 gap-x-3">
                    {/* Cluster A: Trim */}
                    <div className="flex items-center gap-1.5">
                        <span className={`hidden md:inline mr-1 ${tokens.clusterLabel}`}>Trim</span>
                        <button
                            type="button"
                            onClick={handleCropToTrim}
                            disabled={!isTrimmedSubregion || isRecording}
                            title="Crop sample to the current IN/OUT trim handles"
                            className={getButtonStyle(visualizerStyle, 'secondary', false, !isTrimmedSubregion || isRecording, 'h-8 px-2.5 text-[11px] gap-1.5')}
                        >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="6" cy="6" r="3" />
                                <circle cx="6" cy="18" r="3" />
                                <line x1="20" y1="4" x2="8.12" y2="15.88" />
                                <line x1="14.47" y1="14.48" x2="20" y2="20" />
                                <line x1="8.12" y1="8.12" x2="12" y2="12" />
                            </svg>
                            <span>CROP</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setTrimRange({ start: 0, end: 1, fadeIn: 0, fadeOut: 0 })}
                            disabled={!isTrimmedSubregion || isRecording}
                            title="Expand trim handles to full sample length and reset fades"
                            className={getButtonStyle(visualizerStyle, 'secondary', false, !isTrimmedSubregion || isRecording, 'h-8 px-2.5 text-[11px] gap-1.5')}
                        >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 3 21 3 21 9" />
                                <polyline points="9 21 3 21 3 15" />
                                <line x1="21" y1="3" x2="14" y2="10" />
                                <line x1="3" y1="21" x2="10" y2="14" />
                            </svg>
                            <span>FULL</span>
                        </button>
                    </div>

                    <div className={`hidden sm:block w-px h-5 ${tokens.clusterDivider}`} aria-hidden="true" />

                    {/* Cluster B: Process */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`hidden md:inline mr-1 ${tokens.clusterLabel}`}>Process</span>
                        <button
                            type="button"
                            onClick={handleNormalize}
                            disabled={!hasSample || isRecording}
                            title="Boost peak level of trimmed region to 0 dBFS"
                            className={getButtonStyle(visualizerStyle, 'secondary', false, !hasSample || isRecording, 'h-8 px-2.5 text-[11px] gap-1.5')}
                        >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="3" x2="20" y2="3" />
                                <polyline points="8 10 12 6 16 10" />
                                <line x1="12" y1="6" x2="12" y2="21" />
                            </svg>
                            <span>NORM</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleReverse}
                            disabled={!hasSample || isRecording}
                            title="Reverse the audio waveform"
                            className={getButtonStyle(visualizerStyle, 'secondary', false, !hasSample || isRecording, 'h-8 px-2.5 text-[11px] gap-1.5')}
                        >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="17 1 21 5 17 9" />
                                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                <polyline points="7 23 3 19 7 15" />
                                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                            </svg>
                            <span>REVERSE</span>
                        </button>
                    </div>
                </div>

                {/* Cluster C: Reset */}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleRevert}
                        disabled={originalAudioData.length === 0 || isRecording}
                        title="Restore original unedited recording or file"
                        className={getButtonStyle(visualizerStyle, 'secondary', false, originalAudioData.length === 0 || isRecording, 'h-8 px-2.5 text-[11px] gap-1.5')}
                    >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <polyline points="3 3 3 8 8 8" />
                        </svg>
                        <span>UNDO</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={!hasSample || isRecording}
                        title="Clear sample buffer"
                        className={getButtonStyle(visualizerStyle, 'danger', false, !hasSample || isRecording, 'h-8 px-2.5 text-[11px] gap-1.5')}
                    >
                        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>CLEAR</span>
                    </button>
                </div>
            </div>

            {/* 4. Tone & Envelope Shaping Parameter Cards */}
            <div className={`pt-3.5 border-t ${tokens.dividerBorder} flex flex-col gap-3.5 ${!hasSample || isRecording ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <h5 className={tokens.sectionTitle}>
                            Tone &amp; Envelope Shaping
                        </h5>
                    </div>

                    <div className="flex items-center gap-2">
                        {areParamsModified && (
                            <button
                                type="button"
                                onClick={handleResetParams}
                                className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'h-7 px-2.5 text-[10px] gap-1')}
                            >
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <polyline points="3 3 3 8 8 8" />
                                </svg>
                                <span>RESET PARAMS</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleApplyProcessing}
                            disabled={!hasSample || isRecording}
                            title="Permanently apply Pitch, Decay, and Filter settings to the sample"
                            className={getButtonStyle(visualizerStyle, 'primary', false, !hasSample || isRecording, 'h-7 px-3 text-[10px] gap-1.5')}
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>APPLY EFFECTS</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Card 1: Pitch / Playback Rate */}
                    <div className={tokens.paramCard}>
                        <div className="flex items-center justify-between gap-1">
                            <label htmlFor="sample-rec-pitch" className={`flex items-center gap-1.5 ${tokens.paramLabel}`}>
                                <svg className={`w-3.5 h-3.5 ${tokens.paramIconColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18V5l12-2v13" />
                                    <circle cx="6" cy="18" r="3" />
                                    <circle cx="18" cy="16" r="3" />
                                </svg>
                                <span>Pitch</span>
                            </label>
                            <div className="flex items-baseline gap-1.5">
                                <span className={tokens.paramValuePrimary}>{semitoneStr}</span>
                                <span className={tokens.paramValueSecondary}>({pitch.toFixed(2)}x)</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className={`w-full h-1 overflow-hidden ${tokens.sliderTrackBg}`}>
                                <div
                                    className={`h-full transition-all duration-75 ${tokens.sliderFillBg}`}
                                    style={{ width: `${pitchPercent}%` }}
                                />
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
                                className={`w-full h-1.5 bg-transparent appearance-none cursor-pointer ${tokens.sliderAccent}`}
                            />
                        </div>
                    </div>

                    {/* Card 2: Sustain / Decay Envelope */}
                    <div className={tokens.paramCard}>
                        <div className="flex items-center justify-between gap-1">
                            <label htmlFor="sample-rec-decay" className={`flex items-center gap-1.5 ${tokens.paramLabel}`}>
                                <svg className={`w-3.5 h-3.5 ${tokens.paramIconColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 5c4 10 9 14 18 14" />
                                    <line x1="3" y1="19" x2="21" y2="19" />
                                    <line x1="3" y1="5" x2="3" y2="19" />
                                </svg>
                                <span>Sustain / Decay</span>
                            </label>
                            <div className="flex items-baseline gap-1.5">
                                <span className={tokens.paramValuePrimary}>
                                    {decay >= 1.99 ? 'SUSTAIN' : `${decay.toFixed(2)}s`}
                                </span>
                                <span className={tokens.paramValueSecondary}>
                                    {decay >= 1.99 ? 'FULL' : 'ENV'}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className={`w-full h-1 overflow-hidden ${tokens.sliderTrackBg}`}>
                                <div
                                    className={`h-full transition-all duration-75 ${tokens.sliderFillBg}`}
                                    style={{ width: `${decayPercent}%` }}
                                />
                            </div>
                            <input
                                id="sample-rec-decay"
                                type="range"
                                min="0.1"
                                max="2"
                                step="0.01"
                                value={decay}
                                onChange={(e) => onParamChange('sample', 'decay', parseFloat(e.target.value))}
                                onDoubleClick={() => onParamChange('sample', 'decay', 2)}
                                className={`w-full h-1.5 bg-transparent appearance-none cursor-pointer ${tokens.sliderAccent}`}
                            />
                        </div>
                    </div>

                    {/* Card 3: High Pass Filter (Logarithmic) */}
                    <div className={tokens.paramCard}>
                        <div className="flex items-center justify-between gap-1">
                            <label htmlFor="sample-rec-hpf" className={`flex items-center gap-1.5 ${tokens.paramLabel}`}>
                                <svg className={`w-3.5 h-3.5 ${tokens.paramIconColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 19l6-12h12" />
                                </svg>
                                <span>High Pass</span>
                            </label>
                            <div className="flex items-baseline gap-1.5">
                                <span className={tokens.paramValuePrimary}>{formatFreq(highPass)}</span>
                                <span className={tokens.paramValueSecondary}>HPF</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className={`w-full h-1 overflow-hidden ${tokens.sliderTrackBg}`}>
                                <div
                                    className={`h-full transition-all duration-75 ${tokens.sliderFillBg}`}
                                    style={{ width: `${hpfPercent}%` }}
                                />
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
                                className={`w-full h-1.5 bg-transparent appearance-none cursor-pointer ${tokens.sliderAccent}`}
                            />
                        </div>
                    </div>

                    {/* Card 4: Low Pass Filter (Logarithmic) */}
                    <div className={tokens.paramCard}>
                        <div className="flex items-center justify-between gap-1">
                            <label htmlFor="sample-rec-lpf" className={`flex items-center gap-1.5 ${tokens.paramLabel}`}>
                                <svg className={`w-3.5 h-3.5 ${tokens.paramIconColor}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 7h12l6 12" />
                                </svg>
                                <span>Low Pass</span>
                            </label>
                            <div className="flex items-baseline gap-1.5">
                                <span className={tokens.paramValuePrimary}>{formatFreq(lowPass)}</span>
                                <span className={tokens.paramValueSecondary}>LPF</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className={`w-full h-1 overflow-hidden ${tokens.sliderTrackBg}`}>
                                <div
                                    className={`h-full transition-all duration-75 ${tokens.sliderFillBg}`}
                                    style={{ width: `${lpfPercent}%` }}
                                />
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
                                className={`w-full h-1.5 bg-transparent appearance-none cursor-pointer ${tokens.sliderAccent}`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(SampleRecorderMenu);
