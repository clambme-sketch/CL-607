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

const getScopeTheme = (style: VisualizerStyle) => {
    switch (style) {
        case 'minimal':
            return {
                bg: '#09090b',
                grid: 'rgba(255, 255, 255, 0.06)',
                zeroLine: 'rgba(255, 255, 255, 0.14)',
                waveFill: 'rgba(244, 244, 245, 0.18)',
                waveStroke: '#f4f4f5',
                waveDimStroke: '#52525b',
                maskFill: 'rgba(9, 9, 11, 0.74)',
                handleColor: '#ff3b1d',
                borderAccent: 'rgba(255, 59, 29, 0.45)',
                playhead: '#ff3b1d',
                badgeBg: '#141418',
                badgeText: '#a1a1aa',
                badgeAccent: '#f4f4f5',
            };
        case 'cyberpunk':
            return {
                bg: '#050508',
                grid: 'rgba(0, 255, 159, 0.09)',
                zeroLine: 'rgba(0, 255, 159, 0.22)',
                waveFill: 'rgba(0, 255, 159, 0.20)',
                waveStroke: '#00ff9f',
                waveDimStroke: 'rgba(0, 255, 159, 0.35)',
                maskFill: 'rgba(5, 5, 8, 0.76)',
                handleColor: '#fcee0a',
                borderAccent: 'rgba(252, 238, 10, 0.55)',
                playhead: '#ff003c',
                badgeBg: '#0c0c14',
                badgeText: '#00ff9f',
                badgeAccent: '#fcee0a',
            };
        case 'braun':
            return {
                bg: '#1c1c1a',
                grid: 'rgba(255, 255, 255, 0.07)',
                zeroLine: 'rgba(255, 255, 255, 0.16)',
                waveFill: 'rgba(234, 91, 12, 0.24)',
                waveStroke: '#ea5b0c',
                waveDimStroke: '#78746a',
                maskFill: 'rgba(18, 18, 16, 0.72)',
                handleColor: '#faf8f5',
                borderAccent: 'rgba(234, 91, 12, 0.5)',
                playhead: '#22c55e',
                badgeBg: 'rgba(28, 28, 26, 0.9)',
                badgeText: '#a8a498',
                badgeAccent: '#faf8f5',
            };
        case 'bauhaus':
            return {
                bg: '#181816',
                grid: 'rgba(247, 242, 231, 0.08)',
                zeroLine: 'rgba(247, 242, 231, 0.2)',
                waveFill: 'rgba(242, 183, 5, 0.26)',
                waveStroke: '#f2b705',
                waveDimStroke: '#78746a',
                maskFill: 'rgba(16, 16, 14, 0.74)',
                handleColor: '#d62828',
                borderAccent: 'rgba(214, 40, 40, 0.65)',
                playhead: '#faf6ed',
                badgeBg: '#141413',
                badgeText: '#ebe4d5',
                badgeAccent: '#f2b705',
            };
        case 'nagra':
            return {
                bg: '#230d38',
                grid: 'rgba(255, 196, 163, 0.10)',
                zeroLine: 'rgba(255, 196, 163, 0.22)',
                waveFill: 'rgba(255, 148, 102, 0.28)',
                waveStroke: '#ff9466',
                waveDimStroke: '#8c536e',
                maskFill: 'rgba(24, 8, 38, 0.68)',
                handleColor: '#ffe885',
                borderAccent: 'rgba(255, 232, 133, 0.55)',
                playhead: '#ffffff',
                badgeBg: 'rgba(35, 13, 56, 0.88)',
                badgeText: '#fddbd0',
                badgeAccent: '#ffe885',
            };
        case 'koto':
            return {
                bg: '#0b080c',
                grid: 'rgba(212, 175, 55, 0.08)',
                zeroLine: 'rgba(212, 175, 55, 0.20)',
                waveFill: 'rgba(212, 175, 55, 0.22)',
                waveStroke: '#d4af37',
                waveDimStroke: '#6b5b3e',
                maskFill: 'rgba(8, 6, 10, 0.74)',
                handleColor: '#e8dfc8',
                borderAccent: 'rgba(212, 175, 55, 0.5)',
                playhead: '#d9462f',
                badgeBg: 'rgba(18, 14, 20, 0.9)',
                badgeText: '#a69880',
                badgeAccent: '#d4af37',
            };
        default:
            return {
                bg: '#0f172a',
                grid: 'rgba(148, 163, 184, 0.08)',
                zeroLine: 'rgba(148, 163, 184, 0.18)',
                waveFill: 'rgba(56, 189, 248, 0.22)',
                waveStroke: '#38bdf8',
                waveDimStroke: '#475569',
                maskFill: 'rgba(2, 6, 23, 0.68)',
                handleColor: '#f8fafc',
                borderAccent: 'rgba(56, 189, 248, 0.45)',
                playhead: '#f59e0b',
                badgeBg: 'rgba(15, 23, 42, 0.88)',
                badgeText: '#94a3b8',
                badgeAccent: '#38bdf8',
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
    visualizerStyle = 'default',
    isDragOver = false,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [trimRange, setTrimRange] = useState(externalTrimRange ?? { start: 0, end: 1 });
    const [dragging, setDragging] = useState<'start' | 'end' | 'region' | null>(null);
    const dragOriginRef = useRef<{ x: number; start: number; end: number }>({ x: 0, start: 0, end: 1 });

    const hasRealSample = audioData.length > 256;
    const totalDurationSec = hasRealSample ? audioData.length / sampleRate : 0;

    // Calculate the maximum allowed width of the selection based on maxPlaybackSeconds
    const maxSelectionRatio = Math.min(1, (maxPlaybackSeconds * sampleRate) / Math.max(1, audioData.length));

    useEffect(() => {
        if (!dragging && externalTrimRange) {
            const clampedEnd = Math.min(externalTrimRange.end, externalTrimRange.start + maxSelectionRatio);
            setTrimRange({ start: externalTrimRange.start, end: clampedEnd });
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

        const width = canvas.width;
        const height = canvas.height;
        const midY = height / 2;
        const theme = getScopeTheme(visualizerStyle);

        // Background
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, width, height);

        // Subtle oscilloscope grid
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let q = 1; q < 8; q++) {
            const gx = Math.round((width * q) / 8) + 0.5;
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, height);
        }
        ctx.moveTo(0, Math.round(height * 0.25) + 0.5);
        ctx.lineTo(width, Math.round(height * 0.25) + 0.5);
        ctx.moveTo(0, Math.round(height * 0.75) + 0.5);
        ctx.lineTo(width, Math.round(height * 0.75) + 0.5);
        ctx.stroke();

        // Center zero-crossing reference line
        ctx.strokeStyle = theme.zeroLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, Math.round(midY) + 0.5);
        ctx.lineTo(width, Math.round(midY) + 0.5);
        ctx.stroke();

        if (!hasRealSample) {
            return;
        }

        // Compute min/max envelope per pixel column
        const step = Math.max(1, Math.floor(audioData.length / width));
        const mins = new Float32Array(width);
        const maxs = new Float32Array(width);

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            const startIdx = Math.floor((i / width) * audioData.length);
            const endIdx = Math.min(audioData.length, startIdx + step);
            for (let idx = startIdx; idx < endIdx; idx++) {
                const datum = audioData[idx];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            if (min > max) {
                min = 0;
                max = 0;
            }
            mins[i] = min;
            maxs[i] = max;
        }

        // Draw filled waveform envelope
        ctx.fillStyle = isRecording ? 'rgba(239, 68, 68, 0.25)' : theme.waveFill;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        for (let i = 0; i < width; i++) {
            const yTop = midY - maxs[i] * (midY * 0.88);
            ctx.lineTo(i, yTop);
        }
        for (let i = width - 1; i >= 0; i--) {
            const yBot = midY - mins[i] * (midY * 0.88);
            ctx.lineTo(i, yBot);
        }
        ctx.closePath();
        ctx.fill();

        // Draw crisp vertical waveform peaks
        ctx.strokeStyle = isRecording ? '#ef4444' : theme.waveStroke;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        for (let i = 0; i < width; i++) {
            const yTop = midY - maxs[i] * (midY * 0.88);
            const yBot = midY - mins[i] * (midY * 0.88);
            ctx.moveTo(i + 0.5, yTop);
            ctx.lineTo(i + 0.5, yBot);
        }
        ctx.stroke();

        if (!isRecording) {
            const startX = Math.round(trimRange.start * width);
            const endX = Math.round(trimRange.end * width);
            const selWidth = Math.max(2, endX - startX);

            // Dim unselected left & right zones
            ctx.fillStyle = theme.maskFill;
            if (startX > 0) {
                ctx.fillRect(0, 0, startX, height);
            }
            if (endX < width) {
                ctx.fillRect(endX, 0, width - endX, height);
            }

            // Active region top & bottom border accent
            ctx.fillStyle = theme.borderAccent;
            ctx.fillRect(startX, 0, selWidth, 2);
            ctx.fillRect(startX, height - 2, selWidth, 2);

            // Max length warning tint if selection hits maxPlaybackSeconds cap
            if (Math.abs((trimRange.end - trimRange.start) - maxSelectionRatio) < 0.001 && maxSelectionRatio < 1) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
                ctx.fillRect(startX, 0, selWidth, height);
            }

            // Start & End Trim Handles with bracket grips
            ctx.fillStyle = theme.handleColor;
            // Left handle line + top/bottom tabs
            ctx.fillRect(startX, 0, 2.5, height);
            ctx.fillRect(startX, 0, 9, 5);
            ctx.fillRect(startX, height - 5, 9, 5);
            // Center grip notch on left handle
            ctx.fillRect(startX, midY - 10, 5, 20);

            // Right handle line + top/bottom tabs
            ctx.fillRect(Math.max(0, endX - 2.5), 0, 2.5, height);
            ctx.fillRect(Math.max(0, endX - 9), 0, 9, 5);
            ctx.fillRect(Math.max(0, endX - 9), height - 5, 9, 5);
            // Center grip notch on right handle
            ctx.fillRect(Math.max(0, endX - 5), midY - 10, 5, 20);

            // Animated playhead during Preview
            if (previewProgress !== null && previewProgress >= 0 && previewProgress <= 1) {
                const playX = startX + previewProgress * selWidth;
                ctx.strokeStyle = theme.playhead;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(playX, 0);
                ctx.lineTo(playX, height);
                ctx.stroke();
            }
        }
    }, [audioData, trimRange, maxSelectionRatio, hasRealSample, isRecording, previewProgress, visualizerStyle]);

    const getNormalizedX = useCallback((clientX: number): number => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return 0;
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }, []);

    const beginPointerDrag = useCallback((clientX: number) => {
        if (disabled || !hasRealSample) return;
        const x = getNormalizedX(clientX);
        const handleHitRadius = 0.045;

        const distStart = Math.abs(x - trimRange.start);
        const distEnd = Math.abs(x - trimRange.end);

        if (distStart <= handleHitRadius && distStart <= distEnd) {
            setDragging('start');
            dragOriginRef.current = { x, start: trimRange.start, end: trimRange.end };
        } else if (distEnd <= handleHitRadius) {
            setDragging('end');
            dragOriginRef.current = { x, start: trimRange.start, end: trimRange.end };
        } else if (x > trimRange.start && x < trimRange.end) {
            setDragging('region');
            dragOriginRef.current = { x, start: trimRange.start, end: trimRange.end };
        } else if (x < trimRange.start) {
            // Jump start handle if clicked outside left
            const newStart = Math.max(0, Math.min(x, trimRange.end - 0.01));
            const clampedStart = trimRange.end - newStart > maxSelectionRatio ? trimRange.end - maxSelectionRatio : newStart;
            const next = { start: clampedStart, end: trimRange.end };
            setTrimRange(next);
            onTrim(next.start, next.end);
            setDragging('start');
            dragOriginRef.current = { x, start: next.start, end: next.end };
        } else {
            // Jump end handle if clicked outside right
            const newEnd = Math.min(1, Math.max(x, trimRange.start + 0.01));
            const clampedEnd = newEnd - trimRange.start > maxSelectionRatio ? trimRange.start + maxSelectionRatio : newEnd;
            const next = { start: trimRange.start, end: clampedEnd };
            setTrimRange(next);
            onTrim(next.start, next.end);
            setDragging('end');
            dragOriginRef.current = { x, start: next.start, end: next.end };
        }
    }, [disabled, hasRealSample, getNormalizedX, trimRange, maxSelectionRatio, onTrim]);

    const movePointerDrag = useCallback((clientX: number) => {
        if (!dragging) return;
        const x = getNormalizedX(clientX);

        if (dragging === 'start') {
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
            setTrimRange({ start: newStart, end: newEnd });
        }
    }, [dragging, getNormalizedX, trimRange.start, trimRange.end, maxSelectionRatio]);

    const endPointerDrag = useCallback(() => {
        if (dragging) {
            setDragging(null);
            onTrim(trimRange.start, trimRange.end);
        }
    }, [dragging, onTrim, trimRange.start, trimRange.end]);

    const startSec = trimRange.start * totalDurationSec;
    const endSec = trimRange.end * totalDurationSec;
    const selectedDurationSec = Math.max(0, endSec - startSec);

    return (
        <div
            className={`relative w-full h-full select-none overflow-hidden ${
                hasRealSample && !disabled ? 'cursor-ew-resize' : 'cursor-default'
            }`}
        >
            <canvas
                ref={canvasRef}
                width={900}
                height={180}
                className="w-full h-full block"
                onMouseDown={(e) => beginPointerDrag(e.clientX)}
                onMouseMove={(e) => movePointerDrag(e.clientX)}
                onMouseUp={endPointerDrag}
                onMouseLeave={endPointerDrag}
                onTouchStart={(e) => {
                    if (e.touches.length > 0) beginPointerDrag(e.touches[0].clientX);
                }}
                onTouchMove={(e) => {
                    if (e.touches.length > 0) movePointerDrag(e.touches[0].clientX);
                }}
                onTouchEnd={endPointerDrag}
            />

            {/* Empty State Overlay */}
            {!hasRealSample && !isRecording && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center gap-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-gray-300">
                        <svg className="w-4 h-4 opacity-75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12h3l2-7 4 14 4-10 2 3h5" />
                        </svg>
                        <span>No Sample Loaded</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                        Click <span className="font-bold text-gray-200">REC</span> to sample from microphone, or <span className="font-bold text-gray-200">LOAD FILE</span> / drop an audio file here
                    </p>
                </div>
            )}

            {/* Recording State Overlay */}
            {isRecording && (
                <div className="absolute top-2.5 left-3 flex items-center gap-2 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-red-400">
                        Capturing Microphone Audio...
                    </span>
                </div>
            )}

            {/* Drag-and-Drop Overlay */}
            {isDragOver && (
                <div className="absolute inset-0 bg-blue-950/80 border-2 border-dashed border-sky-400 flex items-center justify-center pointer-events-none z-20">
                    <span className="text-xs font-bold uppercase tracking-widest text-sky-200">
                        Drop Audio File to Load Sample
                    </span>
                </div>
            )}

            {/* Subtle Corner Telemetry inside Scope */}
            {hasRealSample && !isRecording && (
                <>
                    <div className="absolute top-2 left-2.5 pointer-events-none text-[10px] font-mono tabular-nums text-gray-300/90 bg-black/55 px-1.5 py-0.5">
                        IN {startSec.toFixed(2)}s · OUT {endSec.toFixed(2)}s
                    </div>
                    <div className="absolute bottom-2 right-2.5 pointer-events-none text-[10px] font-mono tabular-nums text-gray-200 bg-black/55 px-1.5 py-0.5">
                        LEN {selectedDurationSec.toFixed(2)}s / {totalDurationSec.toFixed(2)}s
                    </div>
                </>
            )}
        </div>
    );
};

export default SampleVisualizer;
