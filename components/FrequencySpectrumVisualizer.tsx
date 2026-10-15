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

        if (analyserNode.fftSize !== 2048) {
            analyserNode.fftSize = 2048;
        }
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const gradient = context.createLinearGradient(0, canvas.height / 2, 0, canvas.height);
        gradient.addColorStop(0, '#6366f1'); // indigo-500
        gradient.addColorStop(0.5, '#a855f7'); // purple-500
        gradient.addColorStop(1, '#ec4899'); // pink-500

        const drawLength = Math.floor(bufferLength * 0.25);
        const barWidth = canvas.width / drawLength;
        const rectWidth = Math.max(0.5, barWidth - 0.5);
        const halfHeight = canvas.height / 2;
        let silentFrames = 0;

        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);
            
            analyserNode.getByteFrequencyData(dataArray);

            let hasEnergy = false;
            for (let i = 0; i < drawLength; i += 4) {
                if (dataArray[i] > 0) {
                    hasEnergy = true;
                    break;
                }
            }

            if (!hasEnergy) {
                silentFrames++;
                if (silentFrames > 20) {
                    if (silentFrames === 21) {
                        context.clearRect(0, 0, canvas.width, canvas.height);
                    }
                    return;
                }
            } else {
                silentFrames = 0;
            }
            
            context.fillStyle = 'rgba(10, 10, 20, 0.2)'; // Dark blue with alpha for fade effect
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            if (!hasEnergy) return;

            let x = 0;
            context.fillStyle = gradient;

            for (let i = 0; i < drawLength; i++) {
                const val = dataArray[i];
                if (val > 0) {
                    const barHeight = (val / 255) * halfHeight * 1.2;
                    context.fillRect(x, halfHeight - barHeight, rectWidth, barHeight * 2);
                }
                x += barWidth;
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