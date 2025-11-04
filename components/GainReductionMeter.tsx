import React, { useRef, useEffect } from 'react';

interface GainReductionMeterProps {
    isActive: boolean;
    analyserNode: AnalyserNode | null;
    color: string;
}

const GainReductionMeter: React.FC<GainReductionMeterProps> = ({ isActive, analyserNode, color }) => {
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
        
        // A smaller FFT size is fine since we only need peak amplitude, not frequency detail.
        analyserNode.fftSize = 128;
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            
            analyserNode.getByteTimeDomainData(dataArray);
            
            // Find the maximum deviation from the center line (128)
            let maxAmplitude = 0;
            for (let i = 0; i < bufferLength; i++) {
                const amplitude = Math.abs(dataArray[i] - 128);
                if (amplitude > maxAmplitude) {
                    maxAmplitude = amplitude;
                }
            }
            
            // Normalize the value to a 0-1 range (128 is the max possible deviation)
            const normalizedValue = maxAmplitude / 128.0;

            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the meter bar filling from the top down
            const meterHeight = normalizedValue * canvas.height;
            
            context.fillStyle = color;
            context.fillRect(0, 0, canvas.width, meterHeight);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [analyserNode, color, isActive]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
};

export default GainReductionMeter;