import React, { useRef, useEffect } from 'react';

interface XYOscilloscopeProps {
    isActive: boolean;
    wetAnalyser: AnalyserNode | null;
    color?: string;
}

const XYOscilloscope: React.FC<XYOscilloscopeProps> = ({ isActive, wetAnalyser, color = '#f59e0b' }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameId = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isActive || !wetAnalyser) {
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

        const bufferLength = 256;
        if (wetAnalyser.fftSize !== bufferLength) {
            wetAnalyser.fftSize = bufferLength;
        }

        const wetData = new Float32Array(bufferLength);
        let wasSilent = false;

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);

            wetAnalyser.getFloatTimeDomainData(wetData);

            let isSilent = true;
            for (let i = 0; i < bufferLength; i += 8) {
                if (Math.abs(wetData[i]) > 0.002) {
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
            context.beginPath();

            for (let i = 0; i < bufferLength; i++) {
                const offset = 8; // A small offset to create a phase-shifted signal for the Lissajous figure.
                const xSignal = wetData[i];
                const ySignal = wetData[(i + offset) % bufferLength];

                // Amplify signal for a "zoomed-in" effect
                const amplifiedX = xSignal * 1.5;
                const amplifiedY = ySignal * 1.5;

                // Map amplified signal to canvas coordinates
                const x = (amplifiedX + 1) * 0.5 * canvas.width;
                const y = canvas.height - ((amplifiedY + 1) * 0.5 * canvas.height);

                if (i === 0) {
                    context.moveTo(x, y);
                } else {
                    context.lineTo(x, y);
                }
            }
            context.stroke();
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [isActive, wetAnalyser, color]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
};

export default React.memo(XYOscilloscope);