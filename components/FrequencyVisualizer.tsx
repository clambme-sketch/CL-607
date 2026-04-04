import React, { useRef, useEffect } from 'react';

interface FrequencyVisualizerProps {
    isActive: boolean;
    analyserNode: AnalyserNode | null;
    color: string;
}

const FrequencyVisualizer: React.FC<FrequencyVisualizerProps> = ({ isActive, analyserNode, color }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameId = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!isActive || !analyserNode || !canvas) {
            cancelAnimationFrame(animationFrameId.current);
            if (canvas) {
                const context = canvas.getContext('2d');
                context?.clearRect(0, 0, canvas.width, canvas.height);
            }
            return;
        }

        const context = canvas.getContext('2d');
        if (!context) return;

        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }

        analyserNode.fftSize = 4096; // Increased size for a more detailed view
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            
            analyserNode.getByteFrequencyData(dataArray);
            
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Only draw the first 1/4 of the frequencies (up to ~5.5kHz) as most energy is there
            const drawLength = Math.floor(bufferLength * 0.25);
            const barWidth = (canvas.width / drawLength);
            let x = 0;

            for (let i = 0; i < drawLength; i++) {
                // The values are 0-255. Map them to the canvas height.
                const barHeight = (dataArray[i] / 255) * canvas.height;

                context.fillStyle = color;
                context.fillRect(x, canvas.height - barHeight, barWidth - 0.5, barHeight);
                
                x += barWidth;
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [analyserNode, color, isActive]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
};

export default FrequencyVisualizer;