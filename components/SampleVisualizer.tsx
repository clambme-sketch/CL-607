import React, { useRef, useEffect, useState } from 'react';

interface SampleVisualizerProps {
    audioData: Float32Array;
    onTrim: (start: number, end: number) => void;
    maxPlaybackSeconds?: number;
    sampleRate?: number;
    disabled?: boolean;
}

const SampleVisualizer: React.FC<SampleVisualizerProps> = ({ 
    audioData, 
    onTrim, 
    maxPlaybackSeconds = 5,
    sampleRate = 44100,
    disabled = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [trimRange, setTrimRange] = useState({ start: 0, end: 1 });
    const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

    // Calculate the maximum allowed width of the selection based on maxPlaybackSeconds
    const maxSelectionRatio = Math.min(1, (maxPlaybackSeconds * sampleRate) / Math.max(1, audioData.length));

    useEffect(() => {
        // Enforce max playback limit on initial load or when audio data changes
        if (trimRange.end - trimRange.start > maxSelectionRatio) {
            setTrimRange(prev => ({ ...prev, end: prev.start + maxSelectionRatio }));
        }
    }, [audioData, maxSelectionRatio]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        const sliceWidth = canvas.width / audioData.length;
        for (let i = 0; i < audioData.length; i++) {
            const x = i * sliceWidth;
            const y = (audioData[i] + 1) / 2 * canvas.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw unselected areas (darkened)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, trimRange.start * canvas.width, canvas.height);
        ctx.fillRect(trimRange.end * canvas.width, 0, canvas.width * (1 - trimRange.end), canvas.height);

        // Draw trim handles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(trimRange.start * canvas.width, 0, 4, canvas.height);
        ctx.fillRect(trimRange.end * canvas.width - 4, 0, 4, canvas.height);

        // Draw max length indicator if selection is at max length
        if (Math.abs((trimRange.end - trimRange.start) - maxSelectionRatio) < 0.001 && maxSelectionRatio < 1) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // Red tint for max length
            ctx.fillRect(trimRange.start * canvas.width, 0, (trimRange.end - trimRange.start) * canvas.width, canvas.height);
        }

    }, [audioData, trimRange, maxSelectionRatio]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (disabled || audioData.length <= 256) return; // Disable trimming for empty/placeholder data or when disabled
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left) / rect.width;
        
        // Increased hit area for easier grabbing
        if (Math.abs(x - trimRange.start) < 0.08) setDragging('start');
        else if (Math.abs(x - trimRange.end) < 0.08) setDragging('end');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        
        if (dragging === 'start') {
            let newStart = Math.min(x, trimRange.end - 0.01); // Prevent crossing
            // Enforce max length
            if (trimRange.end - newStart > maxSelectionRatio) {
                newStart = trimRange.end - maxSelectionRatio;
            }
            setTrimRange(prev => ({ ...prev, start: newStart }));
        } else {
            let newEnd = Math.max(x, trimRange.start + 0.01); // Prevent crossing
            // Enforce max length
            if (newEnd - trimRange.start > maxSelectionRatio) {
                newEnd = trimRange.start + maxSelectionRatio;
            }
            setTrimRange(prev => ({ ...prev, end: newEnd }));
        }
    };

    const handleMouseUp = () => {
        if (dragging) {
            setDragging(null);
            onTrim(trimRange.start, trimRange.end);
        }
    };

    return (
        <div className="relative w-full h-full">
            <canvas
                ref={canvasRef}
                width={600}
                height={150}
                className="w-full h-full bg-gray-800 cursor-col-resize"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
            <div className="absolute top-2 left-2 text-[10px] text-gray-400 font-mono bg-gray-900/80 px-1 rounded">
                Max: {maxPlaybackSeconds}s
            </div>
            {audioData.length > 256 && (
                <div className="absolute bottom-2 right-2 text-[10px] text-blue-400 font-mono bg-gray-900/80 px-1 rounded">
                    Selected: {((trimRange.end - trimRange.start) * (audioData.length / sampleRate)).toFixed(2)}s
                </div>
            )}
        </div>
    );
};

export default SampleVisualizer;
