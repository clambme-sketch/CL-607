import React, { useRef, useEffect } from 'react';
import { Instrument } from '../types';
import { INSTRUMENTS } from '../constants';

interface OscilloscopeProps {
    analyserNodes: Record<Instrument, AnalyserNode | null>;
    colors: string[];
}

const Oscilloscope: React.FC<OscilloscopeProps> = ({ analyserNodes, colors }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameId = useRef<number>(0);
    const dataArraysRef = useRef<Record<Instrument, Float32Array | null>>({
        kick: null, snare: null, hihat: null, snap: null, clave: null, cowbell: null, sample: null,
    });

    useEffect(() => {
        if (!canvasRef.current || !analyserNodes) {
            cancelAnimationFrame(animationFrameId.current);
            return;
        }

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }
        
        // Increased bufferLength to "zoom out" and show more of the waveform over time.
        const bufferLength = 8192;
        
        INSTRUMENTS.forEach(inst => {
            const analyser = analyserNodes[inst];
            if (analyser) {
                analyser.fftSize = bufferLength;
                if (!dataArraysRef.current[inst] || dataArraysRef.current[inst]?.length !== bufferLength) {
                    dataArraysRef.current[inst] = new Float32Array(bufferLength);
                }
            }
        });
        
        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);

            context.clearRect(0, 0, canvas.width, canvas.height);
            // Use 'lighter' for an additive color blending effect where waveforms overlap.
            context.globalCompositeOperation = 'lighter';

            INSTRUMENTS.forEach((instrument, index) => {
                const analyser = analyserNodes[instrument];
                const dataArray = dataArraysRef.current[instrument];
                
                if (!analyser || !dataArray) return;

                analyser.getFloatTimeDomainData(dataArray);

                // Optimization: Check for silence to avoid drawing flat lines.
                let peak = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const absVal = Math.abs(dataArray[i]);
                    if (absVal > peak) peak = absVal;
                }
                if (peak < 0.01) return;

                context.lineWidth = 1.5;
                context.strokeStyle = colors[index];
                context.shadowColor = colors[index];
                context.shadowBlur = 8;
                context.lineCap = 'round';
                context.lineJoin = 'round';
                context.beginPath();

                const sliceWidth = canvas.width * 1.0 / bufferLength;
                
                // Start path at the left edge, using the oldest sample in the buffer to reverse direction.
                context.moveTo(0, (dataArray[bufferLength - 1] + 1) / 2 * canvas.height);

                for (let i = 1; i < bufferLength; i++) {
                    // Read the data array backwards to make the wave appear to move from left to right.
                    const dataIndex = bufferLength - 1 - i;
                    const v = (dataArray[dataIndex] + 1) / 2; // Normalize from [-1, 1] to [0, 1]
                    const x = i * sliceWidth;
                    const y = v * canvas.height;
                    context.lineTo(x, y);
                }
                context.stroke();
            });
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [analyserNodes, colors]);


    return (
        <div className="absolute inset-0 z-0 rounded-xl overflow-hidden pointer-events-none">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
};

export default React.memo(Oscilloscope);