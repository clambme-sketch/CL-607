import React, { useRef, useEffect } from 'react';

interface SmallOscilloscopeProps {
    isActive: boolean;
    analyserNode: AnalyserNode | null;
    color: string;
    activeAmount?: number;
}

const SmallOscilloscope: React.FC<SmallOscilloscopeProps> = ({ isActive, analyserNode, color, activeAmount }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameId = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Performance Optimization: Stop rendering if the section is closed or the effect mix is zero.
        if (!isActive || !analyserNode || (activeAmount !== undefined && activeAmount < 0.01)) {
            cancelAnimationFrame(animationFrameId.current);
            context.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }

        analyserNode.fftSize = 1024; // Reduced for performance in a small view.
        const bufferLength = analyserNode.fftSize;
        const dataArray = new Float32Array(bufferLength);

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            
            analyserNode.getFloatTimeDomainData(dataArray);
            
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.lineWidth = 1.5;
            context.strokeStyle = color;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.beginPath();

            const sliceWidth = canvas.width * 1.0 / bufferLength;
            
            // Start path at the left edge, using the oldest sample in the buffer to reverse direction.
            context.moveTo(0, (dataArray[bufferLength - 1] + 1) / 2 * canvas.height);

            for (let i = 1; i < bufferLength; i++) {
                // Read the data array backwards to make the wave appear to move from left to right.
                const dataIndex = bufferLength - 1 - i;
                const v = (dataArray[dataIndex] + 1) / 2;
                const x = i * sliceWidth;
                const y = v * canvas.height;
                context.lineTo(x, y);
            }
            context.stroke();
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [isActive, analyserNode, color, activeAmount]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
};

export default SmallOscilloscope;