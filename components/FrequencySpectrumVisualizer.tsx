import React, { useRef, useEffect } from 'react';

interface FrequencySpectrumVisualizerProps {
    isActive: boolean;
    analyserNode: AnalyserNode | null;
}

const FrequencySpectrumVisualizer: React.FC<FrequencySpectrumVisualizerProps> = ({ isActive, analyserNode }) => {
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

        analyserNode.fftSize = 1024;
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            
            analyserNode.getByteFrequencyData(dataArray);
            
            context.fillStyle = 'rgba(10, 10, 20, 0.2)'; // Dark blue with alpha for fade effect
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 1.25;
            let x = 0;

            const gradient = context.createLinearGradient(0, canvas.height / 2, 0, canvas.height);
            gradient.addColorStop(0, '#6366f1'); // indigo-500
            gradient.addColorStop(0.5, '#a855f7'); // purple-500
            gradient.addColorStop(1, '#ec4899'); // pink-500
            context.fillStyle = gradient;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * (canvas.height / 2) * 1.2;
                
                // Symmetrical drawing from the center
                const y = canvas.height / 2 - barHeight;
                context.fillRect(x, y, barWidth, barHeight * 2);
                
                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [analyserNode, isActive]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
};

export default React.memo(FrequencySpectrumVisualizer);