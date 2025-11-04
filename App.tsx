

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Sequencer from './components/Sequencer';
import Controls from './components/Controls';
import Effects from './components/Effects';
import { useAudioEngine, AllAnalyserNodes } from './hooks/useAudioEngine';
import type { Grid, Instrument, AllInstrumentParams, InstrumentParams, KickDesignerParams, SavedPattern } from './types';
import { NUM_STEPS, INSTRUMENTS, INSTRUMENT_LABELS, DEFAULT_TEMPO, MIN_FILTER_FREQ, MAX_FILTER_FREQ, BASE_INSTRUMENT_COLORS_HSL } from './constants';
import NotationVisualizer from './components/NotationVisualizer';
import CollapsibleSection from './components/CollapsibleSection';
import InstrumentSettings from './components/InstrumentSettings';
import KickDrumDesigner from './components/BassDrumDesigner';
import XYFilterPad from './components/XYFilterPad';
import LoFiRadio from './components/LoFiRadio';
import Settings, { VisualizerType } from './components/Settings';

const createInitialGrid = (): Grid => {
    return Array(INSTRUMENTS.length).fill(null).map(() => Array(NUM_STEPS).fill(false));
};

const initialEffectAnalysers: Omit<AllAnalyserNodes, 'instrumentAnalysers'> = {
    masterAnalyser: null,
    postFilterAnalyser: null,
    reverbAnalyser: null,
    delayAnalyser: null,
    sidechainVisualiserAnalyser: null,
    crushAnalyser: null,
    tapeSaturationAnalyser: null,
    envelopeFilterAnalyser: null,
    lofiDryAnalyser: null,
    lofiWetAnalyser: null,
};

const DEFAULT_INSTRUMENT_PARAMS: AllInstrumentParams = {
    kick: {}, // Kick params are now fully handled by KickDesignerParams
    snare: { tone: 1, decay: 1, attack: 0 },
    hihat: { pitch: 1, decay: 1 },
    snap: { pitch: 1, decay: 1, attack: 0 },
    clave: { pitch: 1, decay: 1 },
    cowbell: { pitch: 1, decay: 1, attack: 0 },
    sample: { pitch: 1, highPass: MIN_FILTER_FREQ, lowPass: MAX_FILTER_FREQ },
};

const DEFAULT_KICK_DESIGNER_PARAMS: KickDesignerParams = {
    pitch: 1,
    decay: 1,
    attack: 0,
    startFreq: 600,
    pitchDropTime: 0.015,
    resonance: 15,
    bodyGain: 0.4,
    clickMix: 0.25,
    clickTone: 2500,
    clickDecay: 0.01,
    saturationAmount: 4.5,
};


const DEFAULT_VOLUMES = [0.3, 0.59, 1, 0.42, 0.29, 0.31, 0.7];

const calculateRandomizeStep = (linearStep: number, intensity: number): number => {
    if (intensity === 0) {
        return linearStep;
    }

    const intensityRatio = intensity / 10;
    const skipProbability = intensityRatio * 0.5;
    if (Math.random() < skipProbability) {
        return -1; // -1 indicates that no step should be played
    }

    const maxOffset = Math.round(intensityRatio * 4);
    if (maxOffset > 0) {
        const randomOffset = Math.floor(Math.random() * (2 * maxOffset + 1)) - maxOffset;
        return (linearStep + randomOffset + NUM_STEPS) % NUM_STEPS;
    }
    
    return linearStep;
};

type ChainMode = 'off' | 'ab' | 'aab' | 'aaab' | 'aabb';

export type EffectName = 'lowPass' | 'highPass' | 'sidechain' | 'crush' | 'tape' | 'envelope' | 'reverb' | 'delay';

const DEFAULT_DJ_SETTINGS = {
    randomizeIntensity: 3,
    chainMode: 'off' as ChainMode,
    isolatorGains: { low: 1, mid: 1, high: 1 },
    lofiMix: 0,
};

const DEFAULT_EFFECTS_SETTINGS = {
    lowPassFreq: MAX_FILTER_FREQ,
    highPassFreq: MIN_FILTER_FREQ,
    reverbMix: 0,
    reverbDecay: 0.4,
    reverbSource: 'all' as Instrument | 'all',
    delayMix: 0,
    delayTime: 0.27,
    delayFeedback: 0.3,
    delaySource: 'all' as Instrument | 'all',
    kickSidechainAmount: 0,
    crushAmount: 0,
    tapeSaturationMix: 0,
    tapeSaturationAmount: 0,
    tapeSaturationTone: MAX_FILTER_FREQ,
    envelopeFilterMix: 0,
    envelopeFilterAmount: 0.5,
    envelopeFilterBaseFreq: 100,
    envelopeFilterQ: 0.25,
};

const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const scramble = (originalText: string) => {
    let scrambled = '';
    for (let i = 0; i < originalText.length; i++) {
        scrambled += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
    }
    return scrambled;
};

const App: React.FC = () => {
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [grids, setGrids] = useState<{ a: Grid, b: Grid }>({
        a: createInitialGrid(),
        b: createInitialGrid(),
    });
    const [activePattern, setActivePattern] = useState<'a' | 'b'>('a');
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [tempo, setTempo] = useState<number>(DEFAULT_TEMPO);
    const [swing, setSwing] = useState<number>(0);
    const [currentStep, setCurrentStep] = useState<number | null>(null);
    const [volumes, setVolumes] = useState<number[]>(DEFAULT_VOLUMES);
    const [masterVolume, setMasterVolume] = useState<number>(0.5);
    const [lowPassFreq, setLowPassFreq] = useState<number>(DEFAULT_EFFECTS_SETTINGS.lowPassFreq);
    const [highPassFreq, setHighPassFreq] = useState<number>(DEFAULT_EFFECTS_SETTINGS.highPassFreq);
    const [reverbMix, setReverbMix] = useState(DEFAULT_EFFECTS_SETTINGS.reverbMix);
    const [reverbDecay, setReverbDecay] = useState(DEFAULT_EFFECTS_SETTINGS.reverbDecay);
    const [reverbSource, setReverbSource] = useState<Instrument | 'all'>(DEFAULT_EFFECTS_SETTINGS.reverbSource);
    const [delayMix, setDelayMix] = useState(DEFAULT_EFFECTS_SETTINGS.delayMix);
    const [delayTime, setDelayTime] = useState(DEFAULT_EFFECTS_SETTINGS.delayTime);
    const [delayFeedback, setDelayFeedback] = useState(DEFAULT_EFFECTS_SETTINGS.delayFeedback);
    const [delaySource, setDelaySource] = useState<Instrument | 'all'>(DEFAULT_EFFECTS_SETTINGS.delaySource);
    const [kickSidechainAmount, setKickSidechainAmount] = useState(DEFAULT_EFFECTS_SETTINGS.kickSidechainAmount);
    const [crushAmount, setCrushAmount] = useState(DEFAULT_EFFECTS_SETTINGS.crushAmount);
    const [tapeSaturationMix, setTapeSaturationMix] = useState(DEFAULT_EFFECTS_SETTINGS.tapeSaturationMix);
    const [tapeSaturationAmount, setTapeSaturationAmount] = useState(DEFAULT_EFFECTS_SETTINGS.tapeSaturationAmount);
    const [tapeSaturationTone, setTapeSaturationTone] = useState(DEFAULT_EFFECTS_SETTINGS.tapeSaturationTone);
    const [envelopeFilterMix, setEnvelopeFilterMix] = useState(DEFAULT_EFFECTS_SETTINGS.envelopeFilterMix);
    const [envelopeFilterAmount, setEnvelopeFilterAmount] = useState(DEFAULT_EFFECTS_SETTINGS.envelopeFilterAmount);
    const [envelopeFilterBaseFreq, setEnvelopeFilterBaseFreq] = useState(DEFAULT_EFFECTS_SETTINGS.envelopeFilterBaseFreq);
    const [envelopeFilterQ, setEnvelopeFilterQ] = useState(DEFAULT_EFFECTS_SETTINGS.envelopeFilterQ);
    const [isRandomizeActive, setIsRandomizeActive] = useState<boolean>(false);
    const [randomizeIntensity, setRandomizeIntensity] = useState<number>(DEFAULT_DJ_SETTINGS.randomizeIntensity);
    const [chainMode, setChainMode] = useState<ChainMode>(DEFAULT_DJ_SETTINGS.chainMode);
    const [hueRotate, setHueRotate] = useState<number>(0);
    const [isColorAnimating, setIsColorAnimating] = useState<boolean>(false);
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [isRendering, setIsRendering] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [instrumentAnalyserNodes, setInstrumentAnalyserNodes] = useState<Record<Instrument, AnalyserNode | null>>({ kick: null, snare: null, hihat: null, snap: null, clave: null, cowbell: null, sample: null });
    const [effectAnalysers, setEffectAnalysers] = useState<Omit<AllAnalyserNodes, 'instrumentAnalysers'>>(initialEffectAnalysers);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [instrumentParams, setInstrumentParams] = useState<AllInstrumentParams>(
        JSON.parse(JSON.stringify(DEFAULT_INSTRUMENT_PARAMS))
    );
    const [kickDesignerParams, setKickDesignerParams] = useState<KickDesignerParams>(
        JSON.parse(JSON.stringify(DEFAULT_KICK_DESIGNER_PARAMS))
    );
    const [savedPatterns, setSavedPatterns] = useState<(SavedPattern | null)[]>(Array(4).fill(null));
    const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
    const [isAppLoaded, setIsAppLoaded] = useState(false);
    const [instrumentVisibility, setInstrumentVisibility] = useState<boolean[]>(Array(INSTRUMENTS.length).fill(true));
    const [effectsEnabled, setEffectsEnabled] = useState<Record<EffectName, boolean>>({
        lowPass: true,
        highPass: true,
        sidechain: true,
        crush: true,
        tape: true,
        envelope: true,
        reverb: true,
        delay: true,
    });
    // New state for DJ effects
    const [lofiMix, setLofiMix] = useState(DEFAULT_DJ_SETTINGS.lofiMix);
    const [isolatorGains, setIsolatorGains] = useState(DEFAULT_DJ_SETTINGS.isolatorGains);
    const [randomizeButtonText, setRandomizeButtonText] = useState('RANDOMIZE');

    // New state for Settings
    const [visualizerType, setVisualizerType] = useState<VisualizerType>('waveform');

    // New state for tracking default settings
    const [isDjSettingsDefault, setIsDjSettingsDefault] = useState(true);
    const [isEffectsSettingsDefault, setIsEffectsSettingsDefault] = useState(true);

    // FIX: Initialize useRef with null to provide an initial value and prevent errors.
    const animationFrameRef = useRef<number | null>(null);
    const countdownTimeoutsRef = useRef<number[]>([]);
    const scrambleIntervalRef = useRef<number | null>(null);

    const schedulerTimerRef = useRef<number | null>(null);
    const visualizerTimerRef = useRef<number | null>(null);
    const nextNoteTime = useRef<number>(0.0);
    const currentStepRef = useRef<number>(0);
    const chainCounterRef = useRef(0);

    const gridsRef = useRef(grids);
    const volumesRef = useRef(volumes);
    const isRandomizeActiveRef = useRef(isRandomizeActive);
    const randomizeIntensityRef = useRef(randomizeIntensity);
    const instrumentParamsRef = useRef(instrumentParams);
    const swingRef = useRef(swing);
    const chainModeRef = useRef(chainMode);
    const activePatternRef = useRef(activePattern); // Ref for scheduler
    const instrumentVisibilityRef = useRef(instrumentVisibility);

    const isCurrentPatternEmpty = useMemo(() => {
        const hasNotes = (grid: Grid) => grid.some(row => row.some(step => step));
        return !hasNotes(grids.a) && !hasNotes(grids.b);
    }, [grids]);

    useEffect(() => {
        gridsRef.current = grids;
        volumesRef.current = volumes;
        isRandomizeActiveRef.current = isRandomizeActive;
        randomizeIntensityRef.current = randomizeIntensity;
        instrumentParamsRef.current = instrumentParams;
        swingRef.current = swing;
        chainModeRef.current = chainMode;
        activePatternRef.current = activePattern;
        instrumentVisibilityRef.current = instrumentVisibility;
    }, [grids, volumes, isRandomizeActive, randomizeIntensity, instrumentParams, swing, chainMode, activePattern, instrumentVisibility]);

    // When the user manually changes the pattern or chain mode, reset the counter.
    useEffect(() => {
        chainCounterRef.current = 0;
    }, [activePattern, chainMode]);
    

    // Load saved patterns from localStorage and initialize working state on first mount
    useEffect(() => {
        const loadedPatterns: (SavedPattern | null)[] = [];
        for (let i = 0; i < 4; i++) {
            try {
                const savedData = localStorage.getItem(`cl607-pattern-${i}`);
                if (savedData) {
                    const parsedData = JSON.parse(savedData) as any;
                    // Backwards compatibility check for old format
                    if (parsedData.grid && !parsedData.grids) {
                        console.log(`Migrating old pattern format for slot ${i}`);
                        const migratedPattern: SavedPattern = {
                            grids: { a: parsedData.grid, b: createInitialGrid() },
                            volumes: parsedData.volumes,
                            tempo: parsedData.tempo,
                            instrumentParams: parsedData.instrumentParams,
                            swing: parsedData.swing ?? 0,
                        };
                        loadedPatterns.push(migratedPattern);
                    } else {
                        loadedPatterns.push(parsedData as SavedPattern);
                    }
                } else {
                    loadedPatterns.push(null);
                }
            } catch (e) {
                console.error(`Failed to load pattern from slot ${i}`, e);
                loadedPatterns.push(null);
            }
        }

        const initialPattern = loadedPatterns[0];
        if (initialPattern) {
            setGrids(initialPattern.grids);
            setVolumes(initialPattern.volumes);
            setTempo(initialPattern.tempo);
            setInstrumentParams(initialPattern.instrumentParams);
            setSwing(initialPattern.swing ?? 0);
        } else {
             const defaultPattern: SavedPattern = {
                grids: { a: createInitialGrid(), b: createInitialGrid() },
                volumes: DEFAULT_VOLUMES,
                tempo: DEFAULT_TEMPO,
                instrumentParams: JSON.parse(JSON.stringify(DEFAULT_INSTRUMENT_PARAMS)),
                swing: 0,
            };
            
            loadedPatterns[0] = defaultPattern;
        }

        setSavedPatterns(loadedPatterns);
        setIsAppLoaded(true);
    }, []);
    
    // Autosave effect: when working state changes, update savedPatterns array and localStorage
    useEffect(() => {
        if (!isAppLoaded) return;

        const patternData: SavedPattern = {
            grids,
            volumes,
            tempo,
            instrumentParams,
            swing,
        };

        const debounceSave = setTimeout(() => {
            setSavedPatterns(prev => {
                const newPatterns = [...prev];
                // Only update if data has actually changed to prevent unnecessary re-renders
                if (JSON.stringify(newPatterns[currentPatternIndex]) !== JSON.stringify(patternData)) {
                    newPatterns[currentPatternIndex] = patternData;
                    try {
                        localStorage.setItem(`cl607-pattern-${currentPatternIndex}`, JSON.stringify(patternData));
                    } catch (e) {
                        console.error(`Failed to save pattern to slot ${currentPatternIndex}`, e);
                    }
                    return newPatterns;
                }
                return prev;
            });
        }, 500); // Debounce saves to avoid excessive writes

        return () => clearTimeout(debounceSave);

    }, [isAppLoaded, grids, volumes, tempo, instrumentParams, swing, currentPatternIndex]);


    const { 
        setup, playKick, playSnare, playHiHat, playSnap, playClave, playCowbell, playSample, startRecording, stopRecording, renderBeatToBuffer, updateInstrumentParameter, rerenderKick,
        setLowPassFrequency, setHighPassFrequency,
        setReverbMix: setAudioEngineReverbMix, 
        setReverbDecay: setAudioEngineReverbDecay,
        setReverbSource: setAudioEngineReverbSource,
        setDelayMix: setAudioEngineDelayMix, 
        setDelayTime: setAudioEngineDelayTime, 
        setDelayFeedback: setAudioEngineDelayFeedback, 
        setDelaySource: setAudioEngineDelaySource,
        setKickSidechainAmount: setAudioEngineKickSidechainAmount,
        setMasterVolume: setAudioEngineMasterVolume,
        setCrushAmount: setAudioEngineCrushAmount,
        setTapeSaturationMix: setAudioEngineTapeSaturationMix,
        setTapeSaturationAmount: setAudioEngineTapeSaturationAmount,
        setTapeSaturationTone: setAudioEngineTapeSaturationTone,
        setEnvelopeFilterMix: setAudioEngineEnvelopeFilterMix,
        setEnvelopeFilterAmount: setAudioEngineEnvelopeFilterAmount,
        setEnvelopeFilterBaseFreq: setAudioEngineEnvelopeFilterBaseFreq,
        setEnvelopeFilterQ: setAudioEngineEnvelopeFilterQ,
        toggleXyFilter,
        setXyFilterParams,
        // FIX: Rename `setLofiMix` from `useAudioEngine` to avoid conflict with state setter
        setLofiMix: setAudioEngineLofiMix,
        setIsoGain,
        playAirhorn,
    } = useAudioEngine();

    const handleStart = useCallback(async () => {
        setIsLoading(true);
        const result = await setup(kickDesignerParams);
        if (result) {
            setInstrumentAnalyserNodes(result.analysers.instrumentAnalysers);
            setEffectAnalysers({
                masterAnalyser: result.analysers.masterAnalyser,
                postFilterAnalyser: result.analysers.postFilterAnalyser,
                reverbAnalyser: result.analysers.reverbAnalyser,
                delayAnalyser: result.analysers.delayAnalyser,
                sidechainVisualiserAnalyser: result.analysers.sidechainVisualiserAnalyser,
                crushAnalyser: result.analysers.crushAnalyser,
                tapeSaturationAnalyser: result.analysers.tapeSaturationAnalyser,
                envelopeFilterAnalyser: result.analysers.envelopeFilterAnalyser,
                lofiDryAnalyser: result.analysers.lofiDryAnalyser,
                lofiWetAnalyser: result.analysers.lofiWetAnalyser,
            });
            setAudioContext(result.context);
            setIsInitialized(true);
        }
        setIsLoading(false);
    }, [setup, kickDesignerParams]);
    
    const playSoundAtTime = useCallback((instrument: Instrument, volume: number, time: number, params: Partial<InstrumentParams>) => {
        switch (instrument) {
            case 'kick': playKick(volume, time, params); break;
            case 'snare': playSnare(volume, time, params); break;
            case 'hihat': playHiHat(volume, time, params); break;
            case 'snap': playSnap(volume, time, params); break;
            case 'clave': playClave(volume, time, params); break;
            case 'cowbell': playCowbell(volume, time, params); break;
            case 'sample': playSample(volume, time, params); break;
        }
    }, [playKick, playSnare, playHiHat, playSnap, playClave, playCowbell, playSample]);

    useEffect(() => {
        if (!audioContext || !isPlaying) {
            clearTimeout(schedulerTimerRef.current!);
            schedulerTimerRef.current = null;
            return;
        }
        
        const schedulerAheadTime = 0.1;
        const schedulerInterval = 25.0;

        const scheduler = () => {
            const currentVolumes = volumesRef.current;
            const randomizeActive = isRandomizeActiveRef.current;
            const intensity = randomizeIntensityRef.current;
            const allParams = instrumentParamsRef.current;
            const currentSwing = swingRef.current;
            const visibility = instrumentVisibilityRef.current;
            
            while (nextNoteTime.current < audioContext.currentTime + schedulerAheadTime) {
                let patternToUse = activePatternRef.current;

                if (currentStepRef.current === 0) {
                    const mode = chainModeRef.current;
                    if (mode !== 'off') {
                        let counter = chainCounterRef.current;
                        counter++;
                        let nextPattern = patternToUse;

                        if (mode === 'ab') {
                            nextPattern = patternToUse === 'a' ? 'b' : 'a';
                            counter = 0;
                        } else if (mode === 'aab') {
                            if (patternToUse === 'a' && counter >= 2) nextPattern = 'b';
                            else if (patternToUse === 'b') { nextPattern = 'a'; counter = 0; }
                        } else if (mode === 'aaab') {
                            if (patternToUse === 'a' && counter >= 3) nextPattern = 'b';
                            else if (patternToUse === 'b') { nextPattern = 'a'; counter = 0; }
                        } else if (mode === 'aabb') {
                            if (patternToUse === 'a' && counter >= 2) nextPattern = 'b';
                            else if (patternToUse === 'b' && counter >= 2) { nextPattern = 'a'; counter = 0; }
                        }

                        chainCounterRef.current = counter;
                        if (nextPattern !== patternToUse) {
                            patternToUse = nextPattern;
                            setActivePattern(nextPattern); 
                        }
                    }
                }
                
                const grid = gridsRef.current[patternToUse];
                const secondsPerStep = 60.0 / tempo / 4.0;
                
                const stepToPlay = randomizeActive
                    ? calculateRandomizeStep(currentStepRef.current, intensity)
                    : currentStepRef.current;
    
                if (stepToPlay > -1) {
                    INSTRUMENTS.forEach((instrument, instrumentIndex) => {
                        if (visibility[instrumentIndex] && grid[instrumentIndex]?.[stepToPlay] && currentVolumes[instrumentIndex] > 0) {
                            playSoundAtTime(instrument, currentVolumes[instrumentIndex], nextNoteTime.current, allParams[instrument]);
                        }
                    });
                }
                
                const swingFactor = 0.5 + (currentSwing * 0.25);
                const isOddStep = currentStepRef.current % 2 !== 0;
                const stepDuration = isOddStep 
                    ? (1 - swingFactor) * 2 * secondsPerStep 
                    : swingFactor * 2 * secondsPerStep;
    
                nextNoteTime.current += stepDuration;
                currentStepRef.current = (currentStepRef.current + 1) % NUM_STEPS;
            }
            schedulerTimerRef.current = window.setTimeout(scheduler, schedulerInterval);
        };

        scheduler();

        return () => {
            clearTimeout(schedulerTimerRef.current!);
            schedulerTimerRef.current = null;
        }
    }, [isPlaying, tempo, audioContext, playSoundAtTime]);
    
    const instrumentColors = useMemo(() => {
        return BASE_INSTRUMENT_COLORS_HSL.map(baseColor => {
            return `hsl(${baseColor.h}, ${baseColor.s}%, ${baseColor.l}%)`;
        });
    }, []);

    useEffect(() => {
        if (!audioContext || !isPlaying) {
            if (visualizerTimerRef.current) cancelAnimationFrame(visualizerTimerRef.current);
            setCurrentStep(null);
            return;
        }

        const visualizerLoop = () => {
            const secondsPerStep = 60.0 / tempo / 4.0;
            // Add a small offset to prevent floating point inaccuracies from showing the previous step
            const timeElapsed = audioContext.currentTime - nextNoteTime.current + (secondsPerStep * NUM_STEPS);
            const stepToShow = Math.floor((timeElapsed / secondsPerStep + currentStepRef.current) % NUM_STEPS);

            setCurrentStep(stepToShow);
            
            visualizerTimerRef.current = requestAnimationFrame(visualizerLoop);
        };

        visualizerLoop();

        return () => {
            if (visualizerTimerRef.current) cancelAnimationFrame(visualizerTimerRef.current);
        }
    }, [isPlaying, audioContext, tempo]);


    const handleToggleStep = useCallback((instrumentIndex: number, stepIndex: number) => {
        setGrids(prevGrids => {
            const newGrid = prevGrids[activePattern].map(row => [...row]);
            newGrid[instrumentIndex][stepIndex] = !newGrid[instrumentIndex][stepIndex];
            return { ...prevGrids, [activePattern]: newGrid };
        });
    }, [activePattern]);

    const handleVolumeChange = useCallback((instrumentIndex: number, volume: number) => {
        setVolumes(prevVolumes => {
            const newVolumes = [...prevVolumes];
            newVolumes[instrumentIndex] = volume;
            return newVolumes;
        });
    }, []);

    const handleInstrumentParamChange = useCallback((instrument: Instrument, param: keyof InstrumentParams, value: number) => {
        setInstrumentParams(prev => {
            const newParams = { ...prev };
            newParams[instrument] = { ...newParams[instrument], [param]: value };
            return newParams;
        });
        if (updateInstrumentParameter) {
            updateInstrumentParameter(instrument, param, value);
        }
    }, [updateInstrumentParameter]);

    const handleKickDesignerParamChange = useCallback((param: keyof KickDesignerParams, value: number) => {
        setKickDesignerParams(prev => ({ ...prev, [param]: value }));
    }, []);
    
    // This effect listens for any changes to the kick designer parameters
    // and triggers a re-render of the kick sound buffer.
    useEffect(() => {
        if (isInitialized && rerenderKick) {
            rerenderKick(kickDesignerParams);
        }
    }, [isInitialized, rerenderKick, kickDesignerParams]);

    const handleStartRecording = useCallback(() => {
        countdownTimeoutsRef.current.forEach(clearTimeout);
        countdownTimeoutsRef.current = [];
        setCountdown(3);

        const t1 = window.setTimeout(() => setCountdown(2), 1000);
        const t2 = window.setTimeout(() => setCountdown(1), 2000);
        const t3 = window.setTimeout(() => {
            setCountdown(null);
            setIsRecording(true);
            startRecording();
        }, 3000);
        
        countdownTimeoutsRef.current = [t1, t2, t3];
    }, [startRecording]);

    const handleStopRecording = useCallback(() => {
        if (countdown !== null) {
            countdownTimeoutsRef.current.forEach(clearTimeout);
            countdownTimeoutsRef.current = [];
            setCountdown(null);
            return;
        }

        if (isRecording) {
            stopRecording();
            setIsRecording(false);
        }
    }, [countdown, isRecording, stopRecording]);

    const handleDownload = useCallback(async () => {
        setIsRendering(true);
        try {
            const wavBlob = await renderBeatToBuffer(
                grids,
                volumes,
                tempo,
                swing,
                masterVolume,
                effectsEnabled.lowPass ? lowPassFreq : MAX_FILTER_FREQ,
                effectsEnabled.highPass ? highPassFreq : MIN_FILTER_FREQ,
                effectsEnabled.reverb ? reverbMix : 0,
                reverbDecay,
                reverbSource,
                effectsEnabled.delay ? delayMix : 0,
                delayTime,
                delayFeedback,
                delaySource,
                effectsEnabled.sidechain ? kickSidechainAmount : 0,
                effectsEnabled.crush ? crushAmount : 0,
                effectsEnabled.tape ? tapeSaturationMix : 0,
                tapeSaturationAmount,
                tapeSaturationTone,
                effectsEnabled.envelope ? envelopeFilterMix : 0,
                envelopeFilterAmount,
                envelopeFilterBaseFreq,
                envelopeFilterQ,
                instrumentVisibility,
                isolatorGains,
                lofiMix
            );

            if (wavBlob) {
                const filename = `CL-607 - ${tempo}bpm.wav`;
                const url = URL.createObjectURL(wavBlob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                console.error("Rendering failed, received null blob.");
                alert("Sorry, there was an error rendering your beat.");
            }
        } catch (error) {
            console.error("Failed to render beat:", error);
            alert("Sorry, there was an error rendering your beat.");
        } finally {
            setIsRendering(false);
        }
    }, [
        renderBeatToBuffer, grids, volumes, tempo, swing, masterVolume, lowPassFreq, highPassFreq,
        reverbMix, reverbDecay, reverbSource, delayMix, delayTime, delayFeedback, delaySource, kickSidechainAmount,
        crushAmount, tapeSaturationMix, tapeSaturationAmount, tapeSaturationTone,
        envelopeFilterMix, envelopeFilterAmount, envelopeFilterBaseFreq, envelopeFilterQ,
        effectsEnabled, instrumentVisibility, isolatorGains, lofiMix,
    ]);

    const handlePlayToggle = useCallback(() => {
        const newIsPlaying = !isPlaying;
        
        if (newIsPlaying && audioContext) {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            nextNoteTime.current = audioContext.currentTime;
            currentStepRef.current = 0;
            setCurrentStep(null);
        }
        
        setIsPlaying(newIsPlaying);
    }, [isPlaying, audioContext]);
    
    const handleSelectPattern = useCallback((newIndex: number) => {
        if (newIndex === currentPatternIndex) return;

        let patternToLoad = savedPatterns[newIndex];
        
        if (!patternToLoad) {
            // This slot is empty. Create a default pattern for it.
            const defaultPattern: SavedPattern = {
                grids: { a: createInitialGrid(), b: createInitialGrid() },
                volumes: DEFAULT_VOLUMES,
                tempo: DEFAULT_TEMPO,
                instrumentParams: JSON.parse(JSON.stringify(DEFAULT_INSTRUMENT_PARAMS)),
                swing: 0,
            };
            
            setSavedPatterns(prev => {
                const newPatterns = [...prev];
                newPatterns[newIndex] = defaultPattern;
                return newPatterns;
            });

            patternToLoad = defaultPattern;
        }

        setGrids(patternToLoad.grids);
        setVolumes(patternToLoad.volumes);
        setTempo(patternToLoad.tempo);
        setInstrumentParams(patternToLoad.instrumentParams);
        setSwing(patternToLoad.swing ?? 0);
        
        setActivePattern('a');
        setCurrentPatternIndex(newIndex);
    }, [currentPatternIndex, savedPatterns]);

    const handleClearPattern = useCallback(() => {
        setGrids({ a: createInitialGrid(), b: createInitialGrid() });
    }, []);

    const handleInstrumentVisibilityChange = useCallback((index: number) => {
        setInstrumentVisibility(prev => {
            const newVisibility = [...prev];
            newVisibility[index] = !newVisibility[index];
            return newVisibility;
        });
    }, []);
    
    const handleToggleEffect = useCallback((effect: EffectName) => {
        setEffectsEnabled(prev => ({ ...prev, [effect]: !prev[effect] }));
    }, []);

    const handleFilterInteractionStart = useCallback(() => toggleXyFilter(true), [toggleXyFilter]);
    const handleFilterInteractionEnd = useCallback(() => toggleXyFilter(false), [toggleXyFilter]);
    const handleFilterChange = useCallback((freq: number, drive: number) => setXyFilterParams(freq, drive), [setXyFilterParams]);

    const handleTempoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTempo(Number(e.target.value)), []);
    const handleSwingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSwing(Number(e.target.value)), []);
    const handleMasterVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setMasterVolume(Number(e.target.value)), []);
    
    const handleRandomizePressStart = useCallback(() => {
        setIsRandomizeActive(true);
        if (scrambleIntervalRef.current) clearInterval(scrambleIntervalRef.current);
        scrambleIntervalRef.current = window.setInterval(() => {
            setRandomizeButtonText(scramble('RANDOMIZE'));
        }, 60);
    }, []);

    const handleRandomizePressEnd = useCallback(() => {
        setIsRandomizeActive(false);
        if (scrambleIntervalRef.current) {
            clearInterval(scrambleIntervalRef.current);
            scrambleIntervalRef.current = null;
        }
        setRandomizeButtonText('RANDOMIZE');
    }, []);

    const handleRandomizeIntensityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRandomizeIntensity(Number(e.target.value)), []);
    const handleToggleColorAnimation = useCallback(() => setIsColorAnimating(p => !p), []);
    const handleIsolatorGainChange = useCallback((band: 'low' | 'mid' | 'high', value: number) => {
        setIsolatorGains(prev => ({ ...prev, [band]: value }));
    }, []);

    const handleShiftPattern = useCallback((direction: 'left' | 'right') => {
        setGrids(prevGrids => {
            const currentGrid = prevGrids[activePattern];
            const newGrid = currentGrid.map(row => {
                const newRow = [...row];
                if (direction === 'left') {
                    const firstStep = newRow.shift();
                    if (firstStep !== undefined) {
                        newRow.push(firstStep);
                    }
                } else { // 'right'
                    const lastStep = newRow.pop();
                    if (lastStep !== undefined) {
                        newRow.unshift(lastStep);
                    }
                }
                return newRow;
            });
            return { ...prevGrids, [activePattern]: newGrid };
        });
    }, [activePattern]);

    useEffect(() => { setLowPassFrequency(effectsEnabled.lowPass ? lowPassFreq : MAX_FILTER_FREQ) }, [lowPassFreq, effectsEnabled.lowPass, setLowPassFrequency]);
    useEffect(() => { setHighPassFrequency(effectsEnabled.highPass ? highPassFreq : MIN_FILTER_FREQ) }, [highPassFreq, effectsEnabled.highPass, setHighPassFrequency]);
    useEffect(() => { setAudioEngineReverbMix(effectsEnabled.reverb ? reverbMix : 0) }, [reverbMix, effectsEnabled.reverb, setAudioEngineReverbMix]);
    useEffect(() => { setAudioEngineReverbDecay(reverbDecay) }, [reverbDecay, setAudioEngineReverbDecay]);
    useEffect(() => { if (setAudioEngineReverbSource) setAudioEngineReverbSource(reverbSource) }, [reverbSource, setAudioEngineReverbSource]);
    useEffect(() => { setAudioEngineDelayMix(effectsEnabled.delay ? delayMix : 0) }, [delayMix, effectsEnabled.delay, setAudioEngineDelayMix]);
    useEffect(() => { setAudioEngineDelayTime(delayTime) }, [delayTime, setAudioEngineDelayTime]);
    useEffect(() => { setAudioEngineDelayFeedback(delayFeedback) }, [delayFeedback, setAudioEngineDelayFeedback]);
    useEffect(() => { if (setAudioEngineDelaySource) setAudioEngineDelaySource(delaySource) }, [delaySource, setAudioEngineDelaySource]);
    useEffect(() => { setAudioEngineKickSidechainAmount(effectsEnabled.sidechain ? kickSidechainAmount : 0) }, [kickSidechainAmount, effectsEnabled.sidechain, setAudioEngineKickSidechainAmount]);
    useEffect(() => { setAudioEngineMasterVolume(masterVolume) }, [masterVolume, setAudioEngineMasterVolume]);
    useEffect(() => { setAudioEngineCrushAmount(effectsEnabled.crush ? crushAmount : 0) }, [crushAmount, effectsEnabled.crush, setAudioEngineCrushAmount]);
    useEffect(() => { setAudioEngineTapeSaturationMix(effectsEnabled.tape ? tapeSaturationMix : 0) }, [tapeSaturationMix, effectsEnabled.tape, setAudioEngineTapeSaturationMix]);
    useEffect(() => { setAudioEngineTapeSaturationAmount(tapeSaturationAmount) }, [tapeSaturationAmount, setAudioEngineTapeSaturationAmount]);
    useEffect(() => { setAudioEngineTapeSaturationTone(tapeSaturationTone) }, [tapeSaturationTone, setAudioEngineTapeSaturationTone]);
    useEffect(() => { setAudioEngineEnvelopeFilterMix(effectsEnabled.envelope ? envelopeFilterMix : 0) }, [envelopeFilterMix, effectsEnabled.envelope, setAudioEngineEnvelopeFilterMix]);
    useEffect(() => { setAudioEngineEnvelopeFilterAmount(envelopeFilterAmount) }, [envelopeFilterAmount, setAudioEngineEnvelopeFilterAmount]);
    useEffect(() => { setAudioEngineEnvelopeFilterBaseFreq(envelopeFilterBaseFreq) }, [envelopeFilterBaseFreq, setAudioEngineEnvelopeFilterBaseFreq]);
    useEffect(() => { setAudioEngineEnvelopeFilterQ(envelopeFilterQ) }, [envelopeFilterQ, setAudioEngineEnvelopeFilterQ]);
    // FIX: Use the renamed `setAudioEngineLofiMix` function to avoid conflict
    useEffect(() => { if (setAudioEngineLofiMix) setAudioEngineLofiMix(lofiMix); }, [lofiMix, setAudioEngineLofiMix]);
    useEffect(() => { if (setIsoGain) setIsoGain('low', isolatorGains.low); }, [isolatorGains.low, setIsoGain]);
    useEffect(() => { if (setIsoGain) setIsoGain('mid', isolatorGains.mid); }, [isolatorGains.mid, setIsoGain]);
    useEffect(() => { if (setIsoGain) setIsoGain('high', isolatorGains.high); }, [isolatorGains.high, setIsoGain]);

    // --- Start: Reset button logic ---
    const handleResetDjSettings = useCallback(() => {
        setRandomizeIntensity(DEFAULT_DJ_SETTINGS.randomizeIntensity);
        setChainMode(DEFAULT_DJ_SETTINGS.chainMode);
        setIsolatorGains({ ...DEFAULT_DJ_SETTINGS.isolatorGains });
        setLofiMix(DEFAULT_DJ_SETTINGS.lofiMix);
    }, []);

    const handleResetEffectsSettings = useCallback(() => {
        setLowPassFreq(DEFAULT_EFFECTS_SETTINGS.lowPassFreq);
        setHighPassFreq(DEFAULT_EFFECTS_SETTINGS.highPassFreq);
        setReverbMix(DEFAULT_EFFECTS_SETTINGS.reverbMix);
        setReverbDecay(DEFAULT_EFFECTS_SETTINGS.reverbDecay);
        setReverbSource(DEFAULT_EFFECTS_SETTINGS.reverbSource);
        setDelayMix(DEFAULT_EFFECTS_SETTINGS.delayMix);
        setDelayTime(DEFAULT_EFFECTS_SETTINGS.delayTime);
        setDelayFeedback(DEFAULT_EFFECTS_SETTINGS.delayFeedback);
        setDelaySource(DEFAULT_EFFECTS_SETTINGS.delaySource);
        setKickSidechainAmount(DEFAULT_EFFECTS_SETTINGS.kickSidechainAmount);
        setCrushAmount(DEFAULT_EFFECTS_SETTINGS.crushAmount);
        setTapeSaturationMix(DEFAULT_EFFECTS_SETTINGS.tapeSaturationMix);
        setTapeSaturationAmount(DEFAULT_EFFECTS_SETTINGS.tapeSaturationAmount);
        setTapeSaturationTone(DEFAULT_EFFECTS_SETTINGS.tapeSaturationTone);
        setEnvelopeFilterMix(DEFAULT_EFFECTS_SETTINGS.envelopeFilterMix);
        setEnvelopeFilterAmount(DEFAULT_EFFECTS_SETTINGS.envelopeFilterAmount);
        setEnvelopeFilterBaseFreq(DEFAULT_EFFECTS_SETTINGS.envelopeFilterBaseFreq);
        setEnvelopeFilterQ(DEFAULT_EFFECTS_SETTINGS.envelopeFilterQ);
    }, []);

    // Effect for checking if DJ settings are default
    useEffect(() => {
        const isDefault =
            randomizeIntensity === DEFAULT_DJ_SETTINGS.randomizeIntensity &&
            chainMode === DEFAULT_DJ_SETTINGS.chainMode &&
            isolatorGains.low === DEFAULT_DJ_SETTINGS.isolatorGains.low &&
            isolatorGains.mid === DEFAULT_DJ_SETTINGS.isolatorGains.mid &&
            isolatorGains.high === DEFAULT_DJ_SETTINGS.isolatorGains.high &&
            lofiMix === DEFAULT_DJ_SETTINGS.lofiMix;
        setIsDjSettingsDefault(isDefault);
    }, [randomizeIntensity, chainMode, isolatorGains, lofiMix]);

    // Effect for checking if effects settings are default
    useEffect(() => {
        const isDefault =
            lowPassFreq === DEFAULT_EFFECTS_SETTINGS.lowPassFreq &&
            highPassFreq === DEFAULT_EFFECTS_SETTINGS.highPassFreq &&
            reverbMix === DEFAULT_EFFECTS_SETTINGS.reverbMix &&
            reverbDecay === DEFAULT_EFFECTS_SETTINGS.reverbDecay &&
            reverbSource === DEFAULT_EFFECTS_SETTINGS.reverbSource &&
            delayMix === DEFAULT_EFFECTS_SETTINGS.delayMix &&
            delayTime === DEFAULT_EFFECTS_SETTINGS.delayTime &&
            delayFeedback === DEFAULT_EFFECTS_SETTINGS.delayFeedback &&
            delaySource === DEFAULT_EFFECTS_SETTINGS.delaySource &&
            kickSidechainAmount === DEFAULT_EFFECTS_SETTINGS.kickSidechainAmount &&
            crushAmount === DEFAULT_EFFECTS_SETTINGS.crushAmount &&
            tapeSaturationMix === DEFAULT_EFFECTS_SETTINGS.tapeSaturationMix &&
            tapeSaturationAmount === DEFAULT_EFFECTS_SETTINGS.tapeSaturationAmount &&
            tapeSaturationTone === DEFAULT_EFFECTS_SETTINGS.tapeSaturationTone &&
            envelopeFilterMix === DEFAULT_EFFECTS_SETTINGS.envelopeFilterMix &&
            envelopeFilterAmount === DEFAULT_EFFECTS_SETTINGS.envelopeFilterAmount &&
            envelopeFilterBaseFreq === DEFAULT_EFFECTS_SETTINGS.envelopeFilterBaseFreq &&
            envelopeFilterQ === DEFAULT_EFFECTS_SETTINGS.envelopeFilterQ;
        setIsEffectsSettingsDefault(isDefault);
    }, [
        lowPassFreq, highPassFreq, reverbMix, reverbDecay, reverbSource, delayMix, delayTime, delayFeedback, delaySource,
        kickSidechainAmount, crushAmount, tapeSaturationMix, tapeSaturationAmount, tapeSaturationTone,
        envelopeFilterMix, envelopeFilterAmount, envelopeFilterBaseFreq, envelopeFilterQ
    ]);

    // Logic for DJ reset button hold-to-confirm
    const [djResetProgress, setDjResetProgress] = useState(0);
    const [isDjResetPoofing, setIsDjResetPoofing] = useState(false);
    const djResetTimerRef = useRef<number | null>(null);
    const djResetRequestRef = useRef<number | null>(null);
    const HOLD_DURATION = 1000;

    useEffect(() => {
        if (isDjResetPoofing) {
            const timer = setTimeout(() => {
                handleResetDjSettings();
                setIsDjResetPoofing(false);
            }, 300); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [isDjResetPoofing, handleResetDjSettings]);

    const handleDjResetStart = useCallback(() => {
        if (djResetTimerRef.current) clearTimeout(djResetTimerRef.current);
        if (djResetRequestRef.current) cancelAnimationFrame(djResetRequestRef.current);

        const startTime = Date.now();
        djResetTimerRef.current = window.setTimeout(() => {
            setIsDjResetPoofing(true);
            setDjResetProgress(0);
        }, HOLD_DURATION);

        const updateProgress = () => {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / HOLD_DURATION, 1);
            setDjResetProgress(progress);
            if (progress < 1) {
                djResetRequestRef.current = requestAnimationFrame(updateProgress);
            }
        };
        djResetRequestRef.current = requestAnimationFrame(updateProgress);
    }, []);

    const handleDjResetEnd = useCallback(() => {
        if (djResetTimerRef.current) {
            clearTimeout(djResetTimerRef.current);
            djResetTimerRef.current = null;
        }
        if (djResetRequestRef.current) {
            cancelAnimationFrame(djResetRequestRef.current);
            djResetRequestRef.current = null;
        }
        setDjResetProgress(0);
    }, []);
    // --- End: Reset button logic ---

    useEffect(() => {
        if (isColorAnimating) {
            const animate = () => {
                setHueRotate(prev => (prev + 1.8) % 360);
                animationFrameRef.current = requestAnimationFrame(animate);
            };
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isColorAnimating]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
                return;
            }
    
            if (event.code === 'Space') {
                event.preventDefault();
                handlePlayToggle();
            }
        };
    
        window.addEventListener('keydown', handleKeyDown);
    
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handlePlayToggle]);

    
    if (!isInitialized) {
        return (
            <div className="min-h-screen text-white flex flex-col items-center justify-center p-4 text-center">
                 <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-100">CL-607 Drum Machine</h1>
                 <p className="text-sm text-gray-400 mt-1 mb-8">by Clark Lambert</p>
                 <button
                     onClick={handleStart}
                     className="flex items-center justify-center w-48 h-16 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 active:scale-[0.98] text-lg uppercase tracking-wider"
                 >
                     Start
                 </button>
            </div>
        );
    }
    
    if (isLoading) {
        return (
            <div className="min-h-screen text-white flex flex-col items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h2 className="mt-4 text-xl font-bold text-white">Initializing Audio Engine...</h2>
                <p className="text-gray-400">Warming up the synthesizers!</p>
            </div>
        )
    }

    const chainOptions: { mode: ChainMode; label: string }[] = [
        { mode: 'off', label: 'OFF' },
        { mode: 'ab', label: 'A-B' },
        { mode: 'aaab', label: 'A-A-A-B' },
        { mode: 'aabb', label: 'A-A-B-B' },
    ];

    return (
        <div 
            className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4"
            style={{ 
                filter: `hue-rotate(${hueRotate}deg)`,
                transition: isColorAnimating ? 'none' : 'filter 0.05s linear'
            }}
        >
            <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6">
                <header className="text-center">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-100">CL-607 Drum Machine</h1>
                </header>
                <main className="flex flex-col gap-6">
                    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl p-2 sm:p-4 shadow-lg ring-1 ring-white/10 flex flex-col gap-4">
                        <Controls 
                            isPlaying={isPlaying}
                            onPlayToggle={handlePlayToggle}
                            tempo={tempo}
                            onTempoChange={handleTempoChange}
                            swing={swing}
                            onSwingChange={handleSwingChange}
                            masterVolume={masterVolume}
                            onMasterVolumeChange={handleMasterVolumeChange}
                            activePattern={activePattern}
                            onPatternToggle={setActivePattern}
                            hueRotate={hueRotate}
                            onHueRotateChange={setHueRotate}
                            isColorAnimating={isColorAnimating}
                            onToggleColorAnimation={handleToggleColorAnimation}
                            onDownload={handleDownload}
                            isRendering={isRendering}
                            savedPatterns={savedPatterns}
                            currentPatternIndex={currentPatternIndex}
                            onSelectPattern={handleSelectPattern}
                            onCatClick={playAirhorn}
                            onClearPattern={handleClearPattern}
                            isCurrentPatternEmpty={isCurrentPatternEmpty}
                        />
                        <Sequencer
                            grid={grids[activePattern]}
                            isPlaying={isPlaying}
                            currentStep={currentStep}
                            onToggleStep={handleToggleStep}
                            volumes={volumes}
                            onVolumeChange={handleVolumeChange}
                            instrumentAnalyserNodes={instrumentAnalyserNodes}
                            instrumentColors={instrumentColors}
                            isRecording={isRecording}
                            countdown={countdown}
                            onStartRecording={handleStartRecording}
                            onStopRecording={handleStopRecording}
                            instrumentVisibility={instrumentVisibility}
                            visualizerType={visualizerType}
                            masterAnalyser={effectAnalysers.masterAnalyser}
                            hueRotate={hueRotate}
                        />
                    </div>
                    <CollapsibleSection title="LIVE DJ" closedTitle="LIVE DJ">
                        {(isOpen) => (
                            <div className="flex flex-wrap items-start justify-center gap-8 p-2">
                                <div className="flex flex-col items-center gap-3 p-3 rounded-lg bg-gray-900/50">
                                    <h4 className="text-xs text-gray-400 uppercase tracking-wider">RANDOMIZER</h4>
                                    <button
                                        onMouseDown={handleRandomizePressStart}
                                        onMouseUp={handleRandomizePressEnd}
                                        onMouseLeave={handleRandomizePressEnd}
                                        onTouchStart={(e) => { e.preventDefault(); handleRandomizePressStart(); }}
                                        onTouchEnd={handleRandomizePressEnd}
                                        className="w-32 h-16 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 active:scale-[0.98] text-lg uppercase tracking-wider"
                                    >
                                        {randomizeButtonText}
                                    </button>
                                    <div className="flex items-center gap-2 w-full max-w-xs pt-2">
                                        <label htmlFor="random-intensity" className="text-xs text-gray-500">CHAOS</label>
                                        <input
                                            type="range"
                                            id="random-intensity"
                                            min={0}
                                            max={10}
                                            step={1}
                                            value={randomizeIntensity}
                                            onChange={handleRandomizeIntensityChange}
                                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex flex-col items-center gap-3 p-3 rounded-lg bg-gray-900/50">
                                    <h4 className="text-xs text-gray-400 uppercase tracking-wider">PATTERN CHAIN</h4>
                                    <div className="flex items-center gap-2">
                                        {chainOptions.map(opt => (
                                            <button 
                                                key={opt.mode}
                                                onClick={() => setChainMode(opt.mode)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${chainMode === opt.mode ? 'bg-green-500 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Isolator */}
                                <div className="flex flex-col items-center gap-3 p-3 rounded-lg bg-gray-900/50">
                                    <h4 className="text-xs text-gray-400 uppercase tracking-wider">ISOLATOR</h4>
                                    <div className="flex items-end gap-8 pt-4">
                                        {(['low', 'mid', 'high'] as const).map((band) => {
                                            const gainValue = isolatorGains[band];
                                            return (
                                                <div key={band} className="flex flex-col items-center gap-2">
                                                    <span className="text-xs text-gray-500 font-bold -mb-2 tabular-nums">{Math.round(gainValue * 100)}</span>
                                                    <div className="h-24 w-8 flex items-center justify-center">
                                                        <input
                                                            type="range"
                                                            min={0}
                                                            max={1.5}
                                                            step="0.01"
                                                            value={gainValue}
                                                            onChange={(e) => handleIsolatorGainChange(band, Number(e.target.value))}
                                                            className="w-24 h-2 appearance-none cursor-pointer accent-teal-400 origin-center -rotate-90"
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold uppercase">{band}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <XYFilterPad 
                                    onFilterChange={handleFilterChange}
                                    onInteractionStart={handleFilterInteractionStart}
                                    onInteractionEnd={handleFilterInteractionEnd}
                                />

                                <LoFiRadio 
                                    isActive={isOpen}
                                    lofiMix={lofiMix}
                                    onLofiMixChange={setLofiMix}
                                    dryAnalyser={effectAnalysers.lofiDryAnalyser}
                                    wetAnalyser={effectAnalysers.lofiWetAnalyser}
                                />

                                 {!isDjSettingsDefault && (
                                    <div className="w-full flex justify-center">
                                        <button
                                            onMouseDown={handleDjResetStart}
                                            onMouseUp={handleDjResetEnd}
                                            onMouseLeave={handleDjResetEnd}
                                            onTouchStart={(e) => { e.preventDefault(); handleDjResetStart(); }}
                                            onTouchEnd={handleDjResetEnd}
                                            className={`relative flex items-center justify-center mt-2 px-3 h-8 bg-gray-600/80 text-white font-bold rounded-md hover:bg-gray-500/80 transition-transform duration-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 text-xs uppercase tracking-wider overflow-hidden select-none ${isDjResetPoofing ? 'animate-poof' : ''}`}
                                            style={{ transform: `scale(${1 - djResetProgress * 0.15})` }}
                                            aria-label="Hold to reset DJ settings to default"
                                        >
                                            <span className="relative z-10">RESET DJ CONTROLS</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CollapsibleSection>
                    <CollapsibleSection title="EFFECTS" closedTitle="EFFECTS">
                        {(isOpen) => <Effects 
                            isActive={isOpen}
                            lowPassFreq={lowPassFreq}
                            highPassFreq={highPassFreq}
                            onLowPassChange={setLowPassFreq}
                            onHighPassChange={setHighPassFreq}
                            reverbMix={reverbMix}
                            reverbDecay={reverbDecay}
                            reverbSource={reverbSource}
                            onReverbMixChange={setReverbMix}
                            onReverbDecayChange={setReverbDecay}
                            onReverbSourceChange={setReverbSource}
                            delayMix={delayMix}
                            delayTime={delayTime}
                            delayFeedback={delayFeedback}
                            delaySource={delaySource}
                            onDelayMixChange={setDelayMix}
                            onDelayTimeChange={setDelayTime}
                            onDelayFeedbackChange={setDelayFeedback}
                            onDelaySourceChange={setDelaySource}
                            kickSidechainAmount={kickSidechainAmount}
                            onKickSidechainAmountChange={setKickSidechainAmount}
                            crushAmount={crushAmount}
                            onCrushAmountChange={setCrushAmount}
                            tapeSaturationMix={tapeSaturationMix}
                            onTapeSaturationMixChange={setTapeSaturationMix}
                            tapeSaturationAmount={tapeSaturationAmount}
                            onTapeSaturationAmountChange={setTapeSaturationAmount}
                            tapeSaturationTone={tapeSaturationTone}
                            onTapeSaturationToneChange={setTapeSaturationTone}
                            envelopeFilterMix={envelopeFilterMix}
                            onEnvelopeFilterMixChange={setEnvelopeFilterMix}
                            envelopeFilterAmount={envelopeFilterAmount}
                            onEnvelopeFilterAmountChange={setEnvelopeFilterAmount}
                            envelopeFilterBaseFreq={envelopeFilterBaseFreq}
                            onEnvelopeFilterBaseFreqChange={setEnvelopeFilterBaseFreq}
                            envelopeFilterQ={envelopeFilterQ}
                            onEnvelopeFilterQChange={setEnvelopeFilterQ}
                            postFilterAnalyser={effectAnalysers.postFilterAnalyser}
                            reverbAnalyser={effectAnalysers.reverbAnalyser}
                            delayAnalyser={effectAnalysers.delayAnalyser}
                            sidechainVisualiserAnalyser={effectAnalysers.sidechainVisualiserAnalyser}
                            crushAnalyser={effectAnalysers.crushAnalyser}
                            tapeSaturationAnalyser={effectAnalysers.tapeSaturationAnalyser}
                            envelopeFilterAnalyser={effectAnalysers.envelopeFilterAnalyser}
                            effectsEnabled={effectsEnabled}
                            onToggleEffect={handleToggleEffect}
                            onReset={handleResetEffectsSettings}
                            isSettingsDefault={isEffectsSettingsDefault}
                        />}
                    </CollapsibleSection>
                    <CollapsibleSection title="INSTRUMENT SETTINGS" closedTitle="INSTRUMENT SETTINGS" defaultOpen={false}>
                        {(isOpen) => <InstrumentSettings
                            isActive={isOpen}
                            params={instrumentParams}
                            instrumentColors={instrumentColors}
                            onParamChange={handleInstrumentParamChange}
                            instrumentVisibility={instrumentVisibility}
                            onVisibilityChange={handleInstrumentVisibilityChange}
                            kickDesignerParams={kickDesignerParams}
                            onKickDesignerParamChange={handleKickDesignerParamChange}
                        />}
                    </CollapsibleSection>
                    <CollapsibleSection title="rhythmic notation (under construction: rests are ugly)" defaultOpen={false}>
                        {(isOpen) => (
                            <NotationVisualizer
                                isActive={isOpen}
                                grid={grids[activePattern]}
                                instrumentColors={instrumentColors}
                            />
                        )}
                    </CollapsibleSection>
                     <Settings
                        visualizer={visualizerType}
                        onVisualizerChange={setVisualizerType}
                        onShiftPattern={handleShiftPattern}
                    />
                </main>
            </div>
        </div>
    );
};

export default App;