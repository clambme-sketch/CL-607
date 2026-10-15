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

        if (analyserNode.fftSize !== 2048) {
            analyserNode.fftSize = 2048;
        }
        const bufferLength = analyserNode.fftSize;
        const dataArray = new Float32Array(bufferLength);
        let wasSilent = false;

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            
            analyserNode.getFloatTimeDomainData(dataArray);

            let isSilent = true;
            for (let i = 0; i < bufferLength; i += 16) {
                if (Math.abs(dataArray[i]) > 0.002) {
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

            context.lineWidth = 1.5;
            context.strokeStyle = color;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.beginPath();

            const step = Math.max(4, Math.floor(bufferLength / Math.max(1, canvas.width)));
            const sliceWidth = canvas.width / bufferLength;
            
            // Start path at the left edge, using the oldest sample in the buffer to reverse direction.
            context.moveTo(0, ((dataArray[bufferLength - 1] + 1) * 0.5) * canvas.height);

            for (let i = step; i < bufferLength; i += step) {
                // Read the data array backwards to make the wave appear to move from left to right.
                const dataIndex = bufferLength - 1 - i;
                const v = (dataArray[dataIndex] + 1) * 0.5;
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

export default React.memo(SmallOscilloscope);