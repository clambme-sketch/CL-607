import React, { useRef, useEffect } from 'react';

interface GainReductionMeterProps {
    isActive: boolean;
    analyserNode: AnalyserNode | null;
    color: string;
    activeAmount?: number;
}

const GainReductionMeter: React.FC<GainReductionMeterProps> = ({ isActive, analyserNode, color, activeAmount }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameId = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!isActive || !analyserNode || !canvas || (activeAmount !== undefined && activeAmount < 0.01)) {
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
        
        if (analyserNode.fftSize !== 128) {
            analyserNode.fftSize = 128;
        }
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let wasSilent = false;

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            
            analyserNode.getByteTimeDomainData(dataArray);
            
            let maxAmplitude = 0;
            for (let i = 0; i < bufferLength; i++) {
                const amplitude = Math.abs(dataArray[i] - 128);
                if (amplitude > maxAmplitude) {
                    maxAmplitude = amplitude;
                }
            }
            
            const isSilent = maxAmplitude <= 1;
            if (isSilent && wasSilent) {
                return;
            }
            wasSilent = isSilent;

            context.clearRect(0, 0, canvas.width, canvas.height);
            if (isSilent) return;
            
            const normalizedValue = maxAmplitude / 128.0;
            const meterHeight = normalizedValue * canvas.height;
            
            context.fillStyle = color;
            context.fillRect(0, 0, canvas.width, meterHeight);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [analyserNode, color, isActive, activeAmount]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
};

export default React.memo(GainReductionMeter);