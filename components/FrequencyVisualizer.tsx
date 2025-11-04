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

        analyserNode.fftSize = 256; // Smaller size for a less detailed, more performant view
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            
            analyserNode.getByteFrequencyData(dataArray);
            
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 1.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                // The values are 0-255. Map them to the canvas height.
                const barHeight = (dataArray[i] / 255) * canvas.height;

                context.fillStyle = color;
                context.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1; // Add 1 for spacing between bars
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