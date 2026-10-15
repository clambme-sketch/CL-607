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
        
        const bufferLength = 2048;
        
        INSTRUMENTS.forEach(inst => {
            const analyser = analyserNodes[inst];
            if (analyser) {
                if (analyser.fftSize !== bufferLength) {
                    analyser.fftSize = bufferLength;
                }
                if (!dataArraysRef.current[inst] || dataArraysRef.current[inst]?.length !== bufferLength) {
                    dataArraysRef.current[inst] = new Float32Array(bufferLength);
                }
            }
        });

        let wasSilent = false;
        
        const draw = () => {
            animationFrameId.current = requestAnimationFrame(draw);

            let anyActiveSignal = false;
            const activeInstruments: boolean[] = new Array(INSTRUMENTS.length).fill(false);

            for (let index = 0; index < INSTRUMENTS.length; index++) {
                const instrument = INSTRUMENTS[index];
                const analyser = analyserNodes[instrument];
                const dataArray = dataArraysRef.current[instrument];
                if (!analyser || !dataArray) continue;

                analyser.getFloatTimeDomainData(dataArray);

                for (let i = 0; i < bufferLength; i += 16) {
                    if (Math.abs(dataArray[i]) >= 0.01) {
                        activeInstruments[index] = true;
                        anyActiveSignal = true;
                        break;
                    }
                }
            }

            if (!anyActiveSignal) {
                if (!wasSilent) {
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    wasSilent = true;
                }
                return;
            }
            wasSilent = false;

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.globalCompositeOperation = 'lighter';
            context.lineWidth = 2;
            context.lineCap = 'round';
            context.lineJoin = 'round';

            const step = Math.max(4, Math.floor(bufferLength / Math.min(256, Math.max(1, canvas.width))));
            const sliceWidth = canvas.width / bufferLength;

            for (let index = 0; index < INSTRUMENTS.length; index++) {
                if (!activeInstruments[index]) continue;
                const instrument = INSTRUMENTS[index];
                const dataArray = dataArraysRef.current[instrument];
                if (!dataArray) continue;

                context.strokeStyle = colors[index];
                context.beginPath();

                context.moveTo(0, ((dataArray[bufferLength - 1] + 1) * 0.5) * canvas.height);

                for (let i = step; i < bufferLength; i += step) {
                    const dataIndex = bufferLength - 1 - i;
                    const v = (dataArray[dataIndex] + 1) * 0.5;
                    const x = i * sliceWidth;
                    const y = v * canvas.height;
                    context.lineTo(x, y);
                }
                context.stroke();
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, [analyserNodes, colors]);


    return (
        <div className="absolute inset-0 z-0 rounded-xl overflow-hidden pointer-events-none transform-gpu">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
};

export default React.memo(Oscilloscope);