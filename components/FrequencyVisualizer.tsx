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

        if (analyserNode.fftSize !== 1024) {
            analyserNode.fftSize = 1024;
        }
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const drawLength = Math.floor(bufferLength * 0.25);
        const barWidth = canvas.width / drawLength;
        const rectWidth = Math.max(0.5, barWidth - 0.5);
        let wasSilent = false;

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            
            analyserNode.getByteFrequencyData(dataArray);

            let isSilent = true;
            for (let i = 0; i < drawLength; i += 4) {
                if (dataArray[i] > 0) {
                    isSilent = false;
                    break;
                }
            }

            if (isSilent && wasSilent) {
                return;
            }
            wasSilent = isSilent;
            
            context.clearRect(0, 0, canvas.width, canvas.height);
            if (isSilent) return;
            
            let x = 0;
            context.fillStyle = color;
            for (let i = 0; i < drawLength; i++) {
                const val = dataArray[i];
                if (val > 0) {
                    const barHeight = (val / 255) * canvas.height;
                    context.fillRect(x, canvas.height - barHeight, rectWidth, barHeight);
                }
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

export default React.memo(FrequencyVisualizer);