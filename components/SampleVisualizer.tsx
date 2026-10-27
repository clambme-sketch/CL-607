import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VisualizerStyle } from '../types';

interface SampleVisualizerProps {
    audioData: Float32Array;
    trimRange?: { start: number; end: number };
    onTrim: (start: number, end: number) => void;
    maxPlaybackSeconds?: number;
    sampleRate?: number;
    disabled?: boolean;
    isRecording?: boolean;
    previewProgress?: number | null;
    visualizerStyle?: VisualizerStyle;
    isDragOver?: boolean;
}

interface ScopeTheme {
    bgTop: string;
    bgBottom: string;
    rulerBg: string;
    rulerBorder: string;
    rulerTick: string;
    rulerText: string;
    grid: string;
    zeroLine: string;
    waveFillTop: string;
    waveFillBottom: string;
    waveBars: string;
    wavePeak: string;
    waveGlow: string;
    maskFill: string;
    handleColor: string;
    handleTextBg: string;
    handleTextColor: string;
    borderAccent: string;
    playhead: string;
    badgeClass: string;
    badgeLabelClass: string;
    badgeValueClass: string;
    emptyTitleClass: string;
    emptySubClass: string;
    emptyAccentClass: string;
}

const getScopeTheme = (style: VisualizerStyle): ScopeTheme => {
    switch (style) {
        case 'minimal':
            return {
                bgTop: '#09090b',
                bgBottom: '#0c0c0f',
                rulerBg: '#111115',
                rulerBorder: 'rgba(255, 255, 255, 0.10)',
                rulerTick: 'rgba(255, 255, 255, 0.28)',
                rulerText: '#a1a1aa',
                grid: 'rgba(255, 255, 255, 0.05)',
                zeroLine: 'rgba(255, 255, 255, 0.16)',
                waveFillTop: 'rgba(244, 244, 245, 0.28)',
                waveFillBottom: 'rgba(244, 244, 245, 0.06)',
                waveBars: 'rgba(228, 228, 231, 0.55)',
                wavePeak: '#ffffff',
                waveGlow: 'rgba(255, 255, 255, 0.35)',
                maskFill: 'rgba(9, 9, 11, 0.78)',
                handleColor: '#ff3b1d',
                handleTextBg: '#ff3b1d',
                handleTextColor: '#09090b',
                borderAccent: 'rgba(255, 59, 29, 0.65)',
                playhead: '#ff3b1d',
                badgeClass: 'bg-[#111115]/90 border border-[#27272a] text-[#a1a1aa] rounded-none',
                badgeLabelClass: 'text-[#71717a]',
                badgeValueClass: 'text-[#f4f4f5] font-semibold',
                emptyTitleClass: 'text-[#f4f4f5]',
                emptySubClass: 'text-[#a1a1aa]',
                emptyAccentClass: 'text-[#ff3b1d]',
            };
        case 'cyberpunk':
            return {
                bgTop: '#05050a',
                bgBottom: '#090912',
                rulerBg: '#0b0b16',
                rulerBorder: 'rgba(0, 255, 159, 0.28)',
                rulerTick: 'rgba(0, 255, 159, 0.45)',
                rulerText: '#00ff9f',
                grid: 'rgba(0, 255, 159, 0.08)',
                zeroLine: 'rgba(0, 255, 159, 0.24)',
                waveFillTop: 'rgba(0, 255, 159, 0.34)',
                waveFillBottom: 'rgba(0, 255, 159, 0.06)',
                waveBars: 'rgba(0, 255, 159, 0.62)',
                wavePeak: '#6fffc2',
                waveGlow: 'rgba(0, 255, 159, 0.55)',
                maskFill: 'rgba(4, 4, 9, 0.80)',
                handleColor: '#fcee0a',
                handleTextBg: '#fcee0a',
                handleTextColor: '#050508',
                borderAccent: 'rgba(252, 238, 10, 0.75)',
                playhead: '#ff003c',
                badgeClass: 'bg-[#080811]/95 border border-[#00ff9f]/50 text-[#00ff9f] rounded-none',
                badgeLabelClass: 'text-[#00ff9f]/70',
                badgeValueClass: 'text-[#fcee0a] font-bold',
                emptyTitleClass: 'text-[#fcee0a]',
                emptySubClass: 'text-[#00ff9f]/80',
                emptyAccentClass: 'text-[#ff003c]',
            };
        case 'braun':
            return {
                bgTop: '#161614',
                bgBottom: '#1e1e1b',
                rulerBg: '#22221f',
                rulerBorder: 'rgba(255, 255, 255, 0.12)',
                rulerTick: 'rgba(230, 227, 218, 0.35)',
                rulerText: '#b8b4a8',
                grid: 'rgba(255, 255, 255, 0.06)',
                zeroLine: 'rgba(255, 255, 255, 0.18)',
                waveFillTop: 'rgba(234, 91, 12, 0.36)',
                waveFillBottom: 'rgba(234, 91, 12, 0.08)',
                waveBars: 'rgba(234, 91, 12, 0.65)',
                wavePeak: '#ff7a2e',
                waveGlow: 'rgba(234, 91, 12, 0.45)',
                maskFill: 'rgba(16, 16, 14, 0.76)',
                handleColor: '#faf8f5',
                handleTextBg: '#faf8f5',
                handleTextColor: '#181816',
                borderAccent: 'rgba(234, 91, 12, 0.65)',
                playhead: '#22c55e',
                badgeClass: 'bg-[#22221f]/90 border border-[#3a3935] text-[#b8b4a8] rounded-[4px]',
                badgeLabelClass: 'text-[#8c887e]',
                badgeValueClass: 'text-[#faf8f5] font-semibold',
                emptyTitleClass: 'text-[#faf8f5]',
                emptySubClass: 'text-[#b8b4a8]',
                emptyAccentClass: 'text-[#ea5b0c]',
            };
        case 'bauhaus':
            return {
                bgTop: '#141413',
                bgBottom: '#1c1b19',
                rulerBg: '#201f1d',
                rulerBorder: 'rgba(247, 242, 231, 0.22)',
                rulerTick: 'rgba(247, 242, 231, 0.45)',
                rulerText: '#ebe4d5',
                grid: 'rgba(247, 242, 231, 0.08)',
                zeroLine: 'rgba(247, 242, 231, 0.24)',
                waveFillTop: 'rgba(242, 183, 5, 0.38)',
                waveFillBottom: 'rgba(242, 183, 5, 0.08)',
                waveBars: 'rgba(242, 183, 5, 0.72)',
                wavePeak: '#ffd13b',
                waveGlow: 'rgba(242, 183, 5, 0.4)',
                maskFill: 'rgba(14, 14, 13, 0.78)',
                handleColor: '#d62828',
                handleTextBg: '#d62828',
                handleTextColor: '#ffffff',
                borderAccent: 'rgba(214, 40, 40, 0.85)',
                playhead: '#1d4ed8',
                badgeClass: 'bg-[#141413] border-2 border-[#f7f2e7]/40 text-[#ebe4d5] rounded-none',
                badgeLabelClass: 'text-[#b8b2a6]',
                badgeValueClass: 'text-[#f2b705] font-extrabold',
                emptyTitleClass: 'text-[#f7f2e7]',
                emptySubClass: 'text-[#d4cdc0]',
                emptyAccentClass: 'text-[#f2b705]',
            };
        case 'nagra':
            return {
                bgTop: '#1b092e',
                bgBottom: '#2d1142',
                rulerBg: '#250d3b',
                rulerBorder: 'rgba(255, 196, 163, 0.24)',
                rulerTick: 'rgba(255, 214, 186, 0.45)',
                rulerText: '#fddbd0',
                grid: 'rgba(255, 196, 163, 0.09)',
                zeroLine: 'rgba(255, 196, 163, 0.26)',
                waveFillTop: 'rgba(255, 158, 109, 0.42)',
                waveFillBottom: 'rgba(255, 107, 139, 0.10)',
                waveBars: 'rgba(255, 158, 109, 0.72)',
                wavePeak: '#ffe885',
                waveGlow: 'rgba(255, 176, 136, 0.55)',
                maskFill: 'rgba(18, 5, 32, 0.74)',
                handleColor: '#ffe885',
                handleTextBg: '#ffe885',
                handleTextColor: '#230d38',
                borderAccent: 'rgba(255, 232, 133, 0.70)',
                playhead: '#ffffff',
                badgeClass: 'bg-[#230d38]/90 border border-[#ffb088]/40 text-[#fddbd0] rounded-full px-2.5',
                badgeLabelClass: 'text-[#f4b8c4]',
                badgeValueClass: 'text-[#ffe885] font-bold',
                emptyTitleClass: 'text-[#fff5ee]',
                emptySubClass: 'text-[#fddbd0]',
                emptyAccentClass: 'text-[#ffe885]',
            };
        case 'koto':
            return {
                bgTop: '#0b080d',
                bgBottom: '#140f17',
                rulerBg: '#16111a',
                rulerBorder: 'rgba(212, 175, 55, 0.25)',
                rulerTick: 'rgba(212, 175, 55, 0.45)',
                rulerText: '#d4af37',
                grid: 'rgba(212, 175, 55, 0.07)',
                zeroLine: 'rgba(212, 175, 55, 0.22)',
                waveFillTop: 'rgba(212, 175, 55, 0.34)',
                waveFillBottom: 'rgba(212, 175, 55, 0.06)',
                waveBars: 'rgba(212, 175, 55, 0.62)',
                wavePeak: '#f3d87d',
                waveGlow: 'rgba(212, 175, 55, 0.45)',
                maskFill: 'rgba(9, 6, 11, 0.78)',
                handleColor: '#f2ece1',
                handleTextBg: '#d4af37',
                handleTextColor: '#120e14',
                borderAccent: 'rgba(212, 175, 55, 0.65)',
                playhead: '#e15b42',
                badgeClass: 'bg-[#140f16]/90 border border-[#d4af37]/35 text-[#c7baa5] rounded-lg',
                badgeLabelClass: 'text-[#9e8f79]',
                badgeValueClass: 'text-[#f3d87d] font-semibold',
                emptyTitleClass: 'text-[#f2ece1]',
                emptySubClass: 'text-[#b8aa96]',
                emptyAccentClass: 'text-[#d4af37]',
            };
        case 'default':
            return {
                bgTop: '#050e1d',
                bgBottom: '#091930',
                rulerBg: '#08162b',
                rulerBorder: 'rgba(142, 202, 255, 0.22)',
                rulerTick: 'rgba(142, 202, 255, 0.45)',
                rulerText: '#8ecaff',
                grid: 'rgba(142, 202, 255, 0.07)',
                zeroLine: 'rgba(142, 202, 255, 0.24)',
                waveFillTop: 'rgba(142, 202, 255, 0.36)',
                waveFillBottom: 'rgba(21, 53, 100, 0.12)',
                waveBars: 'rgba(142, 202, 255, 0.75)',
                wavePeak: '#e6f3ff',
                waveGlow: 'rgba(142, 202, 255, 0.45)',
                maskFill: 'rgba(4, 10, 22, 0.80)',
                handleColor: '#f4a8c4',
                handleTextBg: '#f4a8c4',
                handleTextColor: '#061121',
                borderAccent: 'rgba(142, 202, 255, 0.65)',
                playhead: '#f4a8c4',
                badgeClass: 'bg-[#071428]/95 border border-[#1e3f6e] text-[#d4ebff] rounded-none',
                badgeLabelClass: 'text-[#8ecaff]',
                badgeValueClass: 'text-[#e6f3ff] font-semibold',
                emptyTitleClass: 'text-[#e6f3ff]',
                emptySubClass: 'text-[#8ecaff]',
                emptyAccentClass: 'text-[#f4a8c4]',
            };
        case 'classic607':
        default:
            return {
                bgTop: '#090f1d',
                bgBottom: '#0f172a',
                rulerBg: '#111c33',
                rulerBorder: 'rgba(148, 163, 184, 0.16)',
                rulerTick: 'rgba(148, 163, 184, 0.35)',
                rulerText: '#94a3b8',
                grid: 'rgba(148, 163, 184, 0.07)',
                zeroLine: 'rgba(148, 163, 184, 0.22)',
                waveFillTop: 'rgba(56, 189, 248, 0.34)',
                waveFillBottom: 'rgba(56, 189, 248, 0.06)',
                waveBars: 'rgba(56, 189, 248, 0.62)',
                wavePeak: '#7dd3fc',
                waveGlow: 'rgba(56, 189, 248, 0.45)',
                maskFill: 'rgba(6, 10, 22, 0.76)',
                handleColor: '#f8fafc',
                handleTextBg: '#38bdf8',
                handleTextColor: '#090f1d',
                borderAccent: 'rgba(56, 189, 248, 0.65)',
                playhead: '#f59e0b',
                badgeClass: 'bg-slate-900/90 border border-slate-700/80 text-slate-300 rounded-md',
                badgeLabelClass: 'text-slate-400',
                badgeValueClass: 'text-sky-300 font-semibold',
                emptyTitleClass: 'text-slate-100',
                emptySubClass: 'text-slate-400',
                emptyAccentClass: 'text-sky-400',
            };
    }
};

const SampleVisualizer: React.FC<SampleVisualizerProps> = ({
    audioData,
    trimRange: externalTrimRange,
    onTrim,
    maxPlaybackSeconds = 5,
    sampleRate = 44100,
    disabled = false,
    isRecording = false,
    previewProgress = null,
    visualizerStyle = 'default' as VisualizerStyle,
    isDragOver = false,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [canvasSize, setCanvasSize] = useState<{ width: number; height: number; dpr: number }>({
        width: 900,
        height: 160,
        dpr: 1,
    });
    const [trimRange, setTrimRange] = useState<SampleTrimRange>(
        externalTrimRange ?? { start: 0, end: 1, fadeIn: 0, fadeOut: 0 }
    );
    const [dragging, setDragging] = useState<'start' | 'end' | 'region' | 'fadeIn' | 'fadeOut' | null>(null);
    const [hoverZone, setHoverZone] = useState<'handle' | 'fadeHandle' | 'region' | 'outside' | null>(null);
    const dragOriginRef = useRef<{ x: number; start: number; end: number; fadeIn: number; fadeOut: number }>({
        x: 0,
        start: 0,
        end: 1,
        fadeIn: 0,
        fadeOut: 0,
    });

    const hasRealSample = audioData.length > 256;
    const totalDurationSec = hasRealSample ? audioData.length / sampleRate : 0;

    // Calculate maximum allowed selection ratio based on maxPlaybackSeconds
    const maxSelectionRatio = Math.min(1, (maxPlaybackSeconds * sampleRate) / Math.max(1, audioData.length));

    // Track container dimensions & devicePixelRatio for crisp oscilloscope rendering
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateSize = () => {
            const rect = container.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            if (rect.width > 0 && rect.height > 0) {
                setCanvasSize({
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    dpr,
                });
            }
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(container);
        window.addEventListener('resize', updateSize);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, []);

    useEffect(() => {
        if (!dragging && externalTrimRange) {
            const clampedEnd = Math.min(externalTrimRange.end, externalTrimRange.start + maxSelectionRatio);
            setTrimRange({
                start: externalTrimRange.start,
                end: clampedEnd,
                fadeIn: externalTrimRange.fadeIn ?? 0,
                fadeOut: externalTrimRange.fadeOut ?? 0,
            });
        }
    }, [externalTrimRange, maxSelectionRatio, dragging]);

    useEffect(() => {
        if (trimRange.end - trimRange.start > maxSelectionRatio) {
            setTrimRange(prev => ({ ...prev, end: prev.start + maxSelectionRatio }));
        }
    }, [audioData, maxSelectionRatio, trimRange.end, trimRange.start]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height, dpr } = canvasSize;
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
        }

        ctx.save();
        ctx.scale(dpr, dpr);

        const rulerHeight = 20;
        const waveTop = rulerHeight;
        const waveHeight = Math.max(40, height - rulerHeight);
        const midY = waveTop + waveHeight / 2;
        const theme = getScopeTheme(visualizerStyle);

        // 1. Background gradient
        const bgGrad = ctx.createLinearGradient(0, waveTop, 0, height);
        bgGrad.addColorStop(0, theme.bgTop);
        bgGrad.addColorStop(1, theme.bgBottom);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. Top Time Ruler Bar
        ctx.fillStyle = theme.rulerBg;
        ctx.fillRect(0, 0, width, rulerHeight);
        ctx.strokeStyle = theme.rulerBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, rulerHeight + 0.5);
        ctx.lineTo(width, rulerHeight + 0.5);
        ctx.stroke();

        // Time ruler ticks & labels
        const displayDuration = hasRealSample ? totalDurationSec : maxPlaybackSeconds;
        let majorStep = 1.0;
        if (displayDuration <= 0.6) majorStep = 0.1;
        else if (displayDuration <= 1.5) majorStep = 0.25;
        else if (displayDuration <= 3.5) majorStep = 0.5;
        else majorStep = 1.0;
        const minorStep = majorStep / 5;

        ctx.fillStyle = theme.rulerText;
        ctx.strokeStyle = theme.rulerTick;
        ctx.font = '600 9px "IBM Plex Mono", "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';

        const numMinorSteps = Math.min(200, Math.floor(displayDuration / minorStep));
        ctx.beginPath();
        for (let stepIdx = 0; stepIdx <= numMinorSteps; stepIdx++) {
            const t = stepIdx * minorStep;
            const x = Math.round((t / Math.max(0.001, displayDuration)) * width) + 0.5;
            if (x > width) break;
            const isMajor = stepIdx % 5 === 0;
            const tickLen = isMajor ? 6 : 3;
            ctx.moveTo(x, rulerHeight - tickLen);
            ctx.lineTo(x, rulerHeight);

            if (isMajor && x < width - 24) {
                const label = majorStep < 0.5 ? `${t.toFixed(2)}s` : `${t.toFixed(1)}s`;
                ctx.fillText(label, x + 3, rulerHeight / 2);
            }
        }
        ctx.stroke();

        // 3. Oscilloscope Sub-Grid & Zero-Crossing Axis
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let q = 1; q < 8; q++) {
            const gx = Math.round((width * q) / 8) + 0.5;
            ctx.moveTo(gx, waveTop);
            ctx.lineTo(gx, height);
        }
        const upperQuarter = Math.round(waveTop + waveHeight * 0.25) + 0.5;
        const lowerQuarter = Math.round(waveTop + waveHeight * 0.75) + 0.5;
        ctx.moveTo(0, upperQuarter);
        ctx.lineTo(width, upperQuarter);
        ctx.moveTo(0, lowerQuarter);
        ctx.lineTo(width, lowerQuarter);
        ctx.stroke();

        // Zero-crossing center line
        ctx.strokeStyle = theme.zeroLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, Math.round(midY) + 0.5);
        ctx.lineTo(width, Math.round(midY) + 0.5);
        ctx.stroke();

        if (!hasRealSample) {
            ctx.restore();
            return;
        }

        const startX = Math.round(trimRange.start * width);
        const endX = Math.round(trimRange.end * width);
        const selWidth = Math.max(2, endX - startX);
        const fadeInRatio = Math.max(0, Math.min(1, trimRange.fadeIn ?? 0));
        const fadeOutRatio = Math.max(0, Math.min(1 - fadeInRatio, trimRange.fadeOut ?? 0));
        const fadeInX = Math.round(startX + fadeInRatio * selWidth);
        const fadeOutX = Math.round(endX - fadeOutRatio * selWidth);

        // 4. Compute min/max envelope per pixel column (applying real-time fade taper inside selection)
        const samplesPerCol = Math.max(1, Math.floor(audioData.length / width));
        const mins = new Float32Array(width);
        const maxs = new Float32Array(width);
        const ampRadius = (waveHeight / 2) * 0.88;

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            const startIdx = Math.floor((i / width) * audioData.length);
            const endIdx = Math.min(audioData.length, startIdx + samplesPerCol);
            for (let idx = startIdx; idx < endIdx; idx++) {
                const datum = audioData[idx];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            if (min > max) {
                min = 0;
                max = 0;
            }
            let fadeGain = 1.0;
            if (!isRecording && i >= startX && i <= endX) {
                if (fadeInX > startX && i < fadeInX) {
                    fadeGain *= (i - startX) / Math.max(1, fadeInX - startX);
                }
                if (fadeOutX < endX && i > fadeOutX) {
                    fadeGain *= (endX - i) / Math.max(1, endX - fadeOutX);
                }
            }
            mins[i] = min * fadeGain;
            maxs[i] = max * fadeGain;
        }

        // 5. Dual-layer Waveform Rendering
        // Pass A: Translucent vertical gradient envelope fill
        const waveGrad = ctx.createLinearGradient(0, waveTop, 0, height);
        if (isRecording) {
            waveGrad.addColorStop(0, 'rgba(239, 68, 68, 0.42)');
            waveGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.14)');
            waveGrad.addColorStop(1, 'rgba(239, 68, 68, 0.42)');
        } else {
            waveGrad.addColorStop(0, theme.waveFillTop);
            waveGrad.addColorStop(0.5, theme.waveFillBottom);
            waveGrad.addColorStop(1, theme.waveFillTop);
        }

        ctx.fillStyle = waveGrad;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        for (let i = 0; i < width; i++) {
            ctx.lineTo(i, midY - maxs[i] * ampRadius);
        }
        for (let i = width - 1; i >= 0; i--) {
            ctx.lineTo(i, midY - mins[i] * ampRadius);
        }
        ctx.closePath();
        ctx.fill();

        // Pass B: Vertical min/max energy bars (every 2px for crisp studio meter look)
        ctx.strokeStyle = isRecording ? 'rgba(248, 113, 113, 0.65)' : theme.waveBars;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < width; i += 2) {
            const yTop = midY - maxs[i] * ampRadius;
            const yBot = midY - mins[i] * ampRadius;
            ctx.moveTo(i + 0.5, yTop);
            ctx.lineTo(i + 0.5, yBot);
        }
        ctx.stroke();

        // Pass C: High-contrast luminous upper & lower peak contour trace
        ctx.save();
        ctx.strokeStyle = isRecording ? '#fca5a5' : theme.wavePeak;
        ctx.lineWidth = 1.4;
        ctx.shadowColor = isRecording ? 'rgba(239, 68, 68, 0.5)' : theme.waveGlow;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        for (let i = 0; i < width; i++) {
            const yTop = midY - maxs[i] * ampRadius;
            if (i === 0) ctx.moveTo(i, yTop);
            else ctx.lineTo(i, yTop);
        }
        for (let i = 0; i < width; i++) {
            const yBot = midY - mins[i] * ampRadius;
            if (i === 0) ctx.moveTo(i, yBot);
            else ctx.lineTo(i, yBot);
        }
        ctx.stroke();
        ctx.restore();

        // 6. Trim Overlay, Out-of-Bounds Mask, Fade Taper Curves & Tactile Handles
        if (!isRecording) {
            // Dim unselected left & right zones
            ctx.fillStyle = theme.maskFill;
            if (startX > 0) {
                ctx.fillRect(0, waveTop, startX, waveHeight);
            }
            if (endX < width) {
                ctx.fillRect(endX, waveTop, width - endX, waveHeight);
            }

            // Shaded Fade-In & Fade-Out Taper Wedges + Slope Lines
            if (fadeInX > startX) {
                ctx.save();
                ctx.fillStyle = theme.maskFill;
                ctx.beginPath();
                ctx.moveTo(startX, waveTop);
                ctx.lineTo(fadeInX, waveTop);
                ctx.lineTo(startX, height);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = theme.handleTextBg;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(startX, height - 2);
                ctx.lineTo(fadeInX, waveTop + 2);
                ctx.stroke();
                ctx.restore();
            }

            if (fadeOutX < endX) {
                ctx.save();
                ctx.fillStyle = theme.maskFill;
                ctx.beginPath();
                ctx.moveTo(fadeOutX, waveTop);
                ctx.lineTo(endX, waveTop);
                ctx.lineTo(endX, height);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = theme.handleTextBg;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(fadeOutX, waveTop + 2);
                ctx.lineTo(endX, height - 2);
                ctx.stroke();
                ctx.restore();
            }

            // Active region top & bottom border rails
            ctx.fillStyle = theme.borderAccent;
            ctx.fillRect(startX, waveTop, selWidth, 2);
            ctx.fillRect(startX, height - 2, selWidth, 2);

            // Max length warning tint if selection hits maxPlaybackSeconds cap
            if (Math.abs((trimRange.end - trimRange.start) - maxSelectionRatio) < 0.001 && maxSelectionRatio < 1) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
                ctx.fillRect(startX, waveTop, selWidth, waveHeight);
            }

            // Left (IN) Handle Bracket
            ctx.fillStyle = theme.handleColor;
            ctx.fillRect(startX, waveTop, 2.5, waveHeight);
            ctx.fillRect(startX, height - 4, 10, 4);
            // Left handle center grip pill
            ctx.fillRect(startX, midY - 12, 6, 24);

            // Right (OUT) Handle Bracket
            ctx.fillRect(Math.max(0, endX - 2.5), waveTop, 2.5, waveHeight);
            ctx.fillRect(Math.max(0, endX - 10), height - 4, 10, 4);
            // Right handle center grip pill
            ctx.fillRect(Math.max(0, endX - 6), midY - 12, 6, 24);

            // Top-Left (Fade-In) & Top-Right (Fade-Out) Draggable Fader Handles
            const drawFadeHandle = (xPos: number, isLeft: boolean, isActiveDrag: boolean) => {
                const clampedX = isLeft
                    ? Math.max(startX + 6, Math.min(endX - 6, xPos))
                    : Math.max(startX + 6, Math.min(endX - 6, xPos));
                const handleY = waveTop + 10;
                const r = isActiveDrag ? 7 : 6;

                ctx.save();
                ctx.fillStyle = theme.handleTextBg;
                ctx.strokeStyle = theme.bgTop;
                ctx.lineWidth = 1.5;

                // Diamond / Flag Fade Handle
                ctx.beginPath();
                ctx.moveTo(clampedX, handleY - r);
                ctx.lineTo(clampedX + r, handleY);
                ctx.lineTo(clampedX, handleY + r);
                ctx.lineTo(clampedX - r, handleY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Inner center dot
                ctx.fillStyle = theme.handleTextColor;
                ctx.beginPath();
                ctx.arc(clampedX, handleY, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            };

            drawFadeHandle(fadeInX, true, dragging === 'fadeIn');
            drawFadeHandle(fadeOutX, false, dragging === 'fadeOut');

            // Animated playhead during Preview
            if (previewProgress !== null && previewProgress >= 0 && previewProgress <= 1) {
                const playX = startX + previewProgress * selWidth;
                ctx.save();
                ctx.strokeStyle = theme.playhead;
                ctx.lineWidth = 2;
                ctx.shadowColor = theme.playhead;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.moveTo(playX, 0);
                ctx.lineTo(playX, height);
                ctx.stroke();

                // Playhead cap on ruler
                ctx.fillStyle = theme.playhead;
                ctx.beginPath();
                ctx.moveTo(playX - 5, 0);
                ctx.lineTo(playX + 5, 0);
                ctx.lineTo(playX, 7);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        ctx.restore();
    }, [
        audioData,
        trimRange,
        maxSelectionRatio,
        hasRealSample,
        totalDurationSec,
        maxPlaybackSeconds,
        isRecording,
        previewProgress,
        visualizerStyle,
        canvasSize,
        dragging,
    ]);

    const getPointerCoords = useCallback((clientX: number, clientY: number): { x: number; yPx: number } => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return { x: 0, yPx: 0 };
        return {
            x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
            yPx: clientY - rect.top,
        };
    }, []);

    const updateHoverCursor = useCallback((clientX: number, clientY: number) => {
        if (disabled || !hasRealSample) {
            setHoverZone(null);
            return;
        }
        const { x, yPx } = getPointerCoords(clientX, clientY);
        const selSpan = Math.max(0.01, trimRange.end - trimRange.start);
        const fadeInNormX = trimRange.start + (trimRange.fadeIn ?? 0) * selSpan;
        const fadeOutNormX = trimRange.end - (trimRange.fadeOut ?? 0) * selSpan;

        const isTopFadeBand = yPx >= 14 && yPx <= 48;
        const fadeHitRadius = 0.038;
        const handleHitRadius = 0.035;

        if (isTopFadeBand && (Math.abs(x - fadeInNormX) <= fadeHitRadius || Math.abs(x - fadeOutNormX) <= fadeHitRadius)) {
            setHoverZone('fadeHandle');
        } else if (Math.abs(x - trimRange.start) <= handleHitRadius || Math.abs(x - trimRange.end) <= handleHitRadius) {
            setHoverZone('handle');
        } else if (x > trimRange.start && x < trimRange.end) {
            setHoverZone('region');
        } else {
            setHoverZone('outside');
        }
    }, [disabled, hasRealSample, getPointerCoords, trimRange]);

    const beginPointerDrag = useCallback((clientX: number, clientY: number) => {
        if (disabled || !hasRealSample) return;
        const { x, yPx } = getPointerCoords(clientX, clientY);
        const selSpan = Math.max(0.01, trimRange.end - trimRange.start);
        const fadeInVal = trimRange.fadeIn ?? 0;
        const fadeOutVal = trimRange.fadeOut ?? 0;
        const fadeInNormX = trimRange.start + fadeInVal * selSpan;
        const fadeOutNormX = trimRange.end - fadeOutVal * selSpan;

        const isTopFadeBand = yPx >= 12 && yPx <= 48;
        const fadeHitRadius = 0.042;
        const handleHitRadius = 0.04;

        const distFadeIn = Math.abs(x - fadeInNormX);
        const distFadeOut = Math.abs(x - fadeOutNormX);
        const distStart = Math.abs(x - trimRange.start);
        const distEnd = Math.abs(x - trimRange.end);

        // Check top fade handles first when clicking in the upper fade band
        if (isTopFadeBand && (distFadeIn <= fadeHitRadius || distFadeOut <= fadeHitRadius)) {
            if (distFadeIn <= distFadeOut) {
                setDragging('fadeIn');
            } else {
                setDragging('fadeOut');
            }
            dragOriginRef.current = { x, start: trimRange.start, end: trimRange.end, fadeIn: fadeInVal, fadeOut: fadeOutVal };
            return;
        }

        if (distStart <= handleHitRadius && distStart <= distEnd) {
            setDragging('start');
            dragOriginRef.current = { x, start: trimRange.start, end: trimRange.end, fadeIn: fadeInVal, fadeOut: fadeOutVal };
        } else if (distEnd <= handleHitRadius) {
            setDragging('end');
            dragOriginRef.current = { x, start: trimRange.start, end: trimRange.end, fadeIn: fadeInVal, fadeOut: fadeOutVal };
        } else if (x > trimRange.start && x < trimRange.end) {
            setDragging('region');
            dragOriginRef.current = { x, start: trimRange.start, end: trimRange.end, fadeIn: fadeInVal, fadeOut: fadeOutVal };
        } else if (x < trimRange.start) {
            const newStart = Math.max(0, Math.min(x, trimRange.end - 0.01));
            const clampedStart = trimRange.end - newStart > maxSelectionRatio ? trimRange.end - maxSelectionRatio : newStart;
            const next: SampleTrimRange = { start: clampedStart, end: trimRange.end, fadeIn: fadeInVal, fadeOut: fadeOutVal };
            setTrimRange(next);
            onTrim(next.start, next.end, next.fadeIn, next.fadeOut);
            setDragging('start');
            dragOriginRef.current = { x, start: next.start, end: next.end, fadeIn: fadeInVal, fadeOut: fadeOutVal };
        } else {
            const newEnd = Math.min(1, Math.max(x, trimRange.start + 0.01));
            const clampedEnd = newEnd - trimRange.start > maxSelectionRatio ? trimRange.start + maxSelectionRatio : newEnd;
            const next: SampleTrimRange = { start: trimRange.start, end: clampedEnd, fadeIn: fadeInVal, fadeOut: fadeOutVal };
            setTrimRange(next);
            onTrim(next.start, next.end, next.fadeIn, next.fadeOut);
            setDragging('end');
            dragOriginRef.current = { x, start: next.start, end: next.end, fadeIn: fadeInVal, fadeOut: fadeOutVal };
        }
    }, [disabled, hasRealSample, getPointerCoords, trimRange, maxSelectionRatio, onTrim]);

    const movePointerDrag = useCallback((clientX: number, clientY: number) => {
        if (!dragging) {
            updateHoverCursor(clientX, clientY);
            return;
        }
        const { x } = getPointerCoords(clientX, clientY);

        if (dragging === 'fadeIn') {
            const selSpan = Math.max(0.01, trimRange.end - trimRange.start);
            const maxFadeIn = Math.max(0, Math.min(0.95, 1 - (trimRange.fadeOut ?? 0)));
            let nextFadeIn = Math.max(0, Math.min(maxFadeIn, (x - trimRange.start) / selSpan));
            if (nextFadeIn < 0.008) nextFadeIn = 0;
            setTrimRange(prev => ({ ...prev, fadeIn: nextFadeIn }));
        } else if (dragging === 'fadeOut') {
            const selSpan = Math.max(0.01, trimRange.end - trimRange.start);
            const maxFadeOut = Math.max(0, Math.min(0.95, 1 - (trimRange.fadeIn ?? 0)));
            let nextFadeOut = Math.max(0, Math.min(maxFadeOut, (trimRange.end - x) / selSpan));
            if (nextFadeOut < 0.008) nextFadeOut = 0;
            setTrimRange(prev => ({ ...prev, fadeOut: nextFadeOut }));
        } else if (dragging === 'start') {
            let newStart = Math.min(x, trimRange.end - 0.01);
            if (trimRange.end - newStart > maxSelectionRatio) {
                newStart = trimRange.end - maxSelectionRatio;
            }
            setTrimRange(prev => ({ ...prev, start: Math.max(0, newStart) }));
        } else if (dragging === 'end') {
            let newEnd = Math.max(x, trimRange.start + 0.01);
            if (newEnd - trimRange.start > maxSelectionRatio) {
                newEnd = trimRange.start + maxSelectionRatio;
            }
            setTrimRange(prev => ({ ...prev, end: Math.min(1, newEnd) }));
        } else if (dragging === 'region') {
            const delta = x - dragOriginRef.current.x;
            const width = dragOriginRef.current.end - dragOriginRef.current.start;
            let newStart = dragOriginRef.current.start + delta;
            let newEnd = dragOriginRef.current.end + delta;
            if (newStart < 0) {
                newStart = 0;
                newEnd = width;
            }
            if (newEnd > 1) {
                newEnd = 1;
                newStart = Math.max(0, 1 - width);
            }
            setTrimRange(prev => ({ ...prev, start: newStart, end: newEnd }));
        }
    }, [dragging, updateHoverCursor, getPointerCoords, trimRange, maxSelectionRatio]);

    const endPointerDrag = useCallback(() => {
        if (dragging) {
            setDragging(null);
            onTrim(trimRange.start, trimRange.end, trimRange.fadeIn ?? 0, trimRange.fadeOut ?? 0);
        }
    }, [dragging, onTrim, trimRange]);

    const handleDoubleClick = useCallback((clientX: number, clientY: number) => {
        if (disabled || !hasRealSample) return;
        const { x, yPx } = getPointerCoords(clientX, clientY);
        const selSpan = Math.max(0.01, trimRange.end - trimRange.start);
        const fadeInNormX = trimRange.start + (trimRange.fadeIn ?? 0) * selSpan;
        const fadeOutNormX = trimRange.end - (trimRange.fadeOut ?? 0) * selSpan;
        if (yPx <= 52) {
            if (Math.abs(x - fadeInNormX) <= 0.05) {
                const next = { ...trimRange, fadeIn: 0 };
                setTrimRange(next);
                onTrim(next.start, next.end, 0, next.fadeOut ?? 0);
            } else if (Math.abs(x - fadeOutNormX) <= 0.05) {
                const next = { ...trimRange, fadeOut: 0 };
                setTrimRange(next);
                onTrim(next.start, next.end, next.fadeIn ?? 0, 0);
            }
        }
    }, [disabled, hasRealSample, getPointerCoords, trimRange, onTrim]);

    const startSec = trimRange.start * totalDurationSec;
    const endSec = trimRange.end * totalDurationSec;
    const selectedDurationSec = Math.max(0, endSec - startSec);
    const theme = getScopeTheme(visualizerStyle);

    const cursorClass = !hasRealSample || disabled
        ? 'cursor-default'
        : dragging === 'region'
        ? 'cursor-grabbing'
        : dragging === 'start' || dragging === 'end' || dragging === 'fadeIn' || dragging === 'fadeOut' || hoverZone === 'handle' || hoverZone === 'fadeHandle'
        ? 'cursor-ew-resize'
        : hoverZone === 'region'
        ? 'cursor-grab'
        : 'cursor-crosshair';

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full select-none overflow-hidden ${cursorClass}`}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full block"
                onMouseDown={(e) => beginPointerDrag(e.clientX, e.clientY)}
                onMouseMove={(e) => movePointerDrag(e.clientX, e.clientY)}
                onMouseUp={endPointerDrag}
                onDoubleClick={(e) => handleDoubleClick(e.clientX, e.clientY)}
                onMouseLeave={() => {
                    setHoverZone(null);
                    endPointerDrag();
                }}
                onTouchStart={(e) => {
                    if (e.touches.length > 0) beginPointerDrag(e.touches[0].clientX, e.touches[0].clientY);
                }}
                onTouchMove={(e) => {
                    if (e.touches.length > 0) movePointerDrag(e.touches[0].clientX, e.touches[0].clientY);
                }}
                onTouchEnd={endPointerDrag}
            />

            {/* Empty State Overlay */}
            {!hasRealSample && !isRecording && (
                <div className="absolute inset-x-0 top-5 bottom-0 flex items-center justify-center pointer-events-none px-4 text-center">
                    <span className={`text-xs font-bold uppercase tracking-wider ${theme.emptyTitleClass}`}>
                        No Sample Loaded
                    </span>
                </div>
            )}

            {/* Recording State Overlay */}
            {isRecording && (
                <div className="absolute top-6 left-3 flex items-center gap-2 pointer-events-none bg-black/70 border border-red-500/40 px-2.5 py-1 rounded">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-red-400">
                        Capturing Live Input...
                    </span>
                </div>
            )}

            {/* Drag-and-Drop Overlay */}
            {isDragOver && (
                <div className="absolute inset-0 bg-slate-950/85 border-2 border-dashed border-sky-400 flex flex-col items-center justify-center gap-1.5 pointer-events-none z-20">
                    <svg className="w-6 h-6 text-sky-400 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-widest text-sky-200">
                        Drop Audio File to Load Sample
                    </span>
                </div>
            )}

            {/* Theme-Matched HUD Telemetry Badges inside Scope */}
            {hasRealSample && !isRecording && (
                <>
                    <div className={`absolute bottom-2 left-2.5 pointer-events-none text-[10px] font-mono tabular-nums px-2 py-0.5 flex items-center gap-1.5 shadow-sm ${theme.badgeClass}`}>
                        <span className={theme.badgeLabelClass}>IN</span>
                        <span className={theme.badgeValueClass}>{startSec.toFixed(2)}s</span>
                        <span className="opacity-40">·</span>
                        <span className={theme.badgeLabelClass}>OUT</span>
                        <span className={theme.badgeValueClass}>{endSec.toFixed(2)}s</span>
                    </div>
                    <div className={`absolute bottom-2 right-2.5 pointer-events-none text-[10px] font-mono tabular-nums px-2 py-0.5 flex items-center gap-1.5 shadow-sm ${theme.badgeClass}`}>
                        <span className={theme.badgeLabelClass}>WINDOW</span>
                        <span className={theme.badgeValueClass}>{selectedDurationSec.toFixed(2)}s</span>
                        <span className="opacity-40">/</span>
                        <span>{totalDurationSec.toFixed(2)}s</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default SampleVisualizer;
