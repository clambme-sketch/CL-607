import React, { useState, useCallback, useEffect } from 'react';
import { useAudioEngine } from '../hooks/useAudioEngine';
import SampleVisualizer from './SampleVisualizer';
import { Instrument, InstrumentParams, VisualizerStyle } from '../types';
import { getButtonStyle } from '../utils';

interface SampleRecorderMenuProps {
    isAudioEngineReady: boolean;
    audioContext: AudioContext | null;
    startRecording: () => void;
    stopRecording: () => void;
    getRecordedAudioData: () => Float32Array;
    setSampleAudioData: (data: Float32Array) => void;
    updateInstrumentParameter: (instrument: Instrument, param: keyof InstrumentParams, value: number) => void;
    playSample: (volume: number, time?: number, params?: Partial<InstrumentParams>) => void;
    visualizerStyle: VisualizerStyle;
}

const SampleRecorderMenu: React.FC<SampleRecorderMenuProps> = ({ 
    isAudioEngineReady, 
    audioContext,
    startRecording, 
    stopRecording, 
    getRecordedAudioData,
    setSampleAudioData,
    updateInstrumentParameter,
    playSample,
    visualizerStyle
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [fullAudioData, setFullAudioData] = useState<Float32Array>(new Float32Array(0));
    const [trimRange, setTrimRange] = useState({ start: 0, end: 1 });
    const [message, setMessage] = useState<string | null>(null);
    const recordingTimeoutRef = React.useRef<number | null>(null);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        if (!audioContext) {
            setMessage("Please start the audio engine first.");
            setTimeout(() => setMessage(null), 3000);
            return;
        }
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('audio/')) {
            setMessage("Please drop an audio file.");
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const channelData = audioBuffer.getChannelData(0);
            setFullAudioData(new Float32Array(channelData));
            setTrimRange({ start: 0, end: 1 });
            setMessage("Sample loaded.");
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error("Error decoding audio:", err);
            setMessage("Error loading audio file.");
            setTimeout(() => setMessage(null), 3000);
        }
    }, [audioContext]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    useEffect(() => {
        let intervalId: number;
        if (isRecording) {
            intervalId = window.setInterval(() => {
                const data = getRecordedAudioData();
                if (data.length > 0) {
                    setFullAudioData(data);
                }
            }, 100);
        }
        return () => {
            if (intervalId) window.clearInterval(intervalId);
        };
    }, [isRecording, getRecordedAudioData]);

    const stopRecordingAction = useCallback(() => {
        const data = getRecordedAudioData();
        stopRecording();
        setIsRecording(false);
        setFullAudioData(data);
        setTrimRange({ start: 0, end: 1 });
        if (recordingTimeoutRef.current) {
            window.clearTimeout(recordingTimeoutRef.current);
            recordingTimeoutRef.current = null;
        }
    }, [stopRecording, getRecordedAudioData]);

    const handleToggleRecording = () => {
        if (!isAudioEngineReady) {
            setMessage("Please start the audio engine first.");
            setTimeout(() => setMessage(null), 3000);
            return;
        }
        if (isRecording) {
            stopRecordingAction();
        } else {
            // Reset before starting
            setFullAudioData(new Float32Array(0));
            setTrimRange({ start: 0, end: 1 });
            startRecording();
            setIsRecording(true);
            
            // Auto-stop after 10 seconds
            recordingTimeoutRef.current = window.setTimeout(() => {
                stopRecordingAction();
                setMessage("Maximum recording time (10s) reached.");
                setTimeout(() => setMessage(null), 3000);
            }, 10000);
        }
    };

    const handleTrim = useCallback((start: number, end: number) => {
        setTrimRange({ start, end });
    }, []);

    // Update the audio engine whenever fullAudioData or trimRange changes
    useEffect(() => {
        if (fullAudioData.length === 0) {
            setSampleAudioData(new Float32Array(0));
            return;
        }
        const startIndex = Math.floor(trimRange.start * fullAudioData.length);
        const endIndex = Math.floor(trimRange.end * fullAudioData.length);
        const trimmed = fullAudioData.slice(startIndex, endIndex);
        setSampleAudioData(trimmed);
    }, [fullAudioData, trimRange, setSampleAudioData]);

    const getTrimmedData = () => {
        if (fullAudioData.length === 0) return new Float32Array(0);
        const startIndex = Math.floor(trimRange.start * fullAudioData.length);
        const endIndex = Math.floor(trimRange.end * fullAudioData.length);
        return fullAudioData.slice(startIndex, endIndex);
    };

    const handleNormalize = () => {
        const trimmed = getTrimmedData();
        if (trimmed.length === 0) return;
        let max = 0;
        for (let i = 0; i < trimmed.length; i++) {
            max = Math.max(max, Math.abs(trimmed[i]));
        }
        if (max === 0) return;
        const factor = 1 / max;
        const normalized = new Float32Array(trimmed.length);
        for (let i = 0; i < trimmed.length; i++) {
            normalized[i] = trimmed[i] * factor;
        }
        setFullAudioData(normalized);
        setTrimRange({ start: 0, end: 1 });
        setMessage("Audio normalized.");
        setTimeout(() => setMessage(null), 3000);
    };

    const handleReverse = () => {
        const trimmed = getTrimmedData();
        if (trimmed.length === 0) return;
        const reversed = new Float32Array(trimmed).reverse();
        setFullAudioData(reversed);
        setTrimRange({ start: 0, end: 1 });
        setMessage("Audio reversed.");
        setTimeout(() => setMessage(null), 3000);
    };

    const handleFadeIn = () => {
        const trimmed = getTrimmedData();
        if (trimmed.length === 0) return;
        const faded = new Float32Array(trimmed);
        const fadeLength = Math.floor(faded.length * 0.2); // 20% fade
        for (let i = 0; i < fadeLength; i++) {
            faded[i] *= (i / fadeLength);
        }
        setFullAudioData(faded);
        setTrimRange({ start: 0, end: 1 });
        setMessage("Fade in applied.");
        setTimeout(() => setMessage(null), 3000);
    };

    const [pitch, setPitch] = useState(1);
    const [decay, setDecay] = useState(1);
    const [highPass, setHighPass] = useState(20);
    const [lowPass, setLowPass] = useState(20000);

    const handlePitchChange = (val: number) => {
        setPitch(val);
        updateInstrumentParameter('sample', 'pitch', val);
    };

    const handleDecayChange = (val: number) => {
        setDecay(val);
        updateInstrumentParameter('sample', 'decay', val);
    };

    const handleHighPassChange = (val: number) => {
        setHighPass(val);
        updateInstrumentParameter('sample', 'highPass', val);
    };

    const handleLowPassChange = (val: number) => {
        setLowPass(val);
        updateInstrumentParameter('sample', 'lowPass', val);
    };

    const handleApplyProcessing = async () => {
        const trimmed = getTrimmedData();
        if (trimmed.length === 0) return;

        try {
            const playbackRate = pitch;
            const newLength = Math.ceil(trimmed.length / playbackRate);
            const sampleRate = 44100; // Assuming 44100, standard for Web Audio
            
            const ctx = new OfflineAudioContext(1, newLength, sampleRate);
            const buffer = ctx.createBuffer(1, trimmed.length, sampleRate);
            buffer.getChannelData(0).set(trimmed);
            
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = playbackRate;
            
            let lastNode: AudioNode = source;
            
            if (highPass > 0) {
                const hpFilter = ctx.createBiquadFilter();
                hpFilter.type = 'highpass';
                hpFilter.frequency.value = highPass;
                lastNode.connect(hpFilter);
                lastNode = hpFilter;
            }
            
            if (lowPass < 20000) {
                const lpFilter = ctx.createBiquadFilter();
                lpFilter.type = 'lowpass';
                lpFilter.frequency.value = lowPass;
                lastNode.connect(lpFilter);
                lastNode = lpFilter;
            }
            
            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(1, 0);
            // Decay is in seconds, we need to scale it by playbackRate if we want it to match real time
            // Actually, decay is just a time in seconds.
            gainNode.gain.exponentialRampToValueAtTime(0.01, Math.max(0.01, decay));
            lastNode.connect(gainNode);
            lastNode = gainNode;
            
            lastNode.connect(ctx.destination);
            source.start(0);
            
            const renderedBuffer = await ctx.startRendering();
            const processedData = renderedBuffer.getChannelData(0);
            
            setFullAudioData(processedData);
            setTrimRange({ start: 0, end: 1 });
            
            // Reset UI parameters
            setPitch(1);
            setDecay(1);
            setHighPass(20);
            setLowPass(20000);
            
            // Reset instrument parameters so they don't double-apply
            updateInstrumentParameter('sample', 'pitch', 1);
            updateInstrumentParameter('sample', 'decay', 1);
            updateInstrumentParameter('sample', 'highPass', 20);
            updateInstrumentParameter('sample', 'lowPass', 20000);
            
            setMessage("Processing applied destructively to sample.");
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error("Error applying processing:", err);
            setMessage("Error applying processing.");
            setTimeout(() => setMessage(null), 3000);
        }
    };

    return (
        <div className="bg-gray-900/50 rounded-lg p-4 flex flex-col gap-4" onDrop={handleDrop} onDragOver={handleDragOver}>
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm uppercase tracking-wider text-white">
                    SAMPLE RECORDER
                </h4>
                {message && <div className="text-xs text-red-400 font-bold">{message}</div>}
            </div>
            
            <div className="flex flex-row gap-4 items-center">
                <button
                    onClick={handleToggleRecording}
                    className={getButtonStyle(visualizerStyle, isRecording ? 'danger' : 'secondary', isRecording, false, `w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-[10px] uppercase tracking-wider transition-all ${isRecording ? 'animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]' : ''}`)}
                >
                    {isRecording ? 'STOP' : 'REC'}
                </button>
                <div className="flex-1 min-w-0 h-20 bg-gray-900 rounded-md border border-gray-700 overflow-hidden">
                    <SampleVisualizer audioData={fullAudioData.length > 0 ? fullAudioData : new Float32Array(256)} onTrim={handleTrim} disabled={isRecording} />
                </div>
            </div>

            {fullAudioData.length > 0 && !isRecording && (
                <div className="flex flex-col gap-2 mt-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setFullAudioData(new Float32Array(0));
                                setTrimRange({ start: 0, end: 1 });
                            }}
                            className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'flex-1 px-4 py-2 text-xs')}
                        >
                            BACK
                        </button>
                        <button
                            onClick={handleNormalize}
                            className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'flex-1 px-4 py-2 text-xs')}
                        >
                            NORMALIZE
                        </button>
                        <button
                            onClick={handleReverse}
                            className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'flex-1 px-4 py-2 text-xs')}
                        >
                            REVERSE
                        </button>
                        <button
                            onClick={handleFadeIn}
                            className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'flex-1 px-4 py-2 text-xs')}
                        >
                            FADE IN
                        </button>
                        <button
                            onClick={() => playSample(1)}
                            className={getButtonStyle(visualizerStyle, 'primary', false, false, 'flex-1 px-4 py-2 text-xs')}
                        >
                            PREVIEW
                        </button>
                    </div>
                </div>
            )}
            
            <div className={`flex flex-col gap-2 mt-2 bg-gray-800/50 p-3 rounded-md ${isRecording || fullAudioData.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                <h5 className="text-xs font-bold text-gray-400 uppercase">Processing</h5>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Pitch</label>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.01"
                            value={pitch}
                            onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                            className="w-full accent-blue-500"
                        />
                        <div className="text-[10px] text-gray-500 text-right">{pitch.toFixed(2)}x</div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Decay</label>
                        <input
                            type="range"
                            min="0.1"
                            max="2"
                            step="0.01"
                            value={decay}
                            onChange={(e) => handleDecayChange(parseFloat(e.target.value))}
                            className="w-full accent-blue-500"
                        />
                        <div className="text-[10px] text-gray-500 text-right">{decay.toFixed(2)}s</div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">High Pass</label>
                        <input
                            type="range"
                            min="20"
                            max="5000"
                            step="10"
                            value={highPass}
                            onChange={(e) => handleHighPassChange(parseFloat(e.target.value))}
                            className="w-full accent-blue-500"
                        />
                        <div className="text-[10px] text-gray-500 text-right">{highPass} Hz</div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Low Pass</label>
                        <input
                            type="range"
                            min="500"
                            max="20000"
                            step="100"
                            value={lowPass}
                            onChange={(e) => handleLowPassChange(parseFloat(e.target.value))}
                            className="w-full accent-blue-500"
                        />
                        <div className="text-[10px] text-gray-500 text-right">{lowPass} Hz</div>
                    </div>
                </div>
                <button
                    onClick={handleApplyProcessing}
                    className={getButtonStyle(visualizerStyle, 'primary', false, false, 'mt-2 px-4 py-2 text-xs')}
                >
                    APPLY EFFECTS TO SAMPLE
                </button>
            </div>
        </div>
    );
};

export default SampleRecorderMenu;
