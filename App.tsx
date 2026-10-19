import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Sequencer from './components/Sequencer';
import Controls from './components/Controls';
import Effects, { getDelayDivisionTimeSeconds } from './components/Effects';
import { useAudioEngine, AllAnalyserNodes } from './hooks/useAudioEngine';
import type { Grid, Instrument, AllInstrumentParams, InstrumentParams, KickDesignerParams, SavedPattern, VisualizerType, VisualizerStyle, LiveRecording, StutterDivision, BeatRepeatDivision, DelayDivision, ReverbType, PadLabelMode, NotationTextMode } from './types';
import { INSTRUMENTS, INSTRUMENT_LABELS, DEFAULT_TEMPO, MIN_FILTER_FREQ, MAX_FILTER_FREQ, BASE_INSTRUMENT_COLORS_HSL } from './constants';
import NotationVisualizer from './components/NotationVisualizer';
import CollapsibleSection from './components/CollapsibleSection';
import InstrumentSettings from './components/InstrumentSettings';
import SampleRecorderMenu from './components/SampleRecorderMenu';
import XYFilterPad from './components/XYFilterPad';
import LoFiRadio from './components/LoFiRadio';
import Settings from './components/Settings';
import Tooltip from './components/Tooltip';
import { getButtonStyle, getThemeSurface, safeGetItem, safeSetItem, safeRemoveItem } from './utils';

const createInitialGrid = (numSteps: number): Grid => {
    return Array(INSTRUMENTS.length).fill(null).map(() => Array(numSteps).fill(false));
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

const calculateRandomizeStep = (linearStep: number, intensity: number, numSteps: number): number => {
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
        return (linearStep + randomOffset + numSteps) % numSteps;
    }
    
    return linearStep;
};

type ChainMode = 'off' | 'ab' | 'aab' | 'aaab' | 'aabb';

export type EffectName = 'lowPass' | 'highPass' | 'sidechain' | 'crush' | 'tape' | 'envelope' | 'reverb' | 'delay';

const sliderToFreq = (value: number): number => {
    const min = Math.log(MIN_FILTER_FREQ);
    const max = Math.log(MAX_FILTER_FREQ);
    const scale = (max - min) / 100;
    return Math.exp(min + scale * value);
};

const freqToSlider = (freq: number): number => {
    if (freq <= MIN_FILTER_FREQ) return 0;
    if (freq >= MAX_FILTER_FREQ) return 100;
    const min = Math.log(MIN_FILTER_FREQ);
    const max = Math.log(MAX_FILTER_FREQ);
    const scale = (max - min) / 100;
    return (Math.log(freq) - min) / scale;
};

const STUTTER_DIVISIONS: StutterDivision[] = ['1/4', '1/8', '1/8T', '1/16', '1/16T', '1/32'];

const BEAT_REPEAT_DIVISIONS: { id: BeatRepeatDivision; label: string; steps: number; tooltip: string }[] = [
    { id: '2BEATS', label: '2 BEATS', steps: 8, tooltip: 'Repeat a 2-beat (half-bar / 8-step) phrase' },
    { id: '1BEAT', label: '1 BEAT', steps: 4, tooltip: 'Repeat a 1-beat (quarter-note / 4-step) phrase' },
    { id: '1/2BEAT', label: '1/2 BEAT', steps: 2, tooltip: 'Repeat a 1/2-beat (eighth-note / 2-step) phrase' },
    { id: '1/4BEAT', label: '1/4 BEAT', steps: 1, tooltip: 'Repeat a 1/4-beat (sixteenth-note / 1-step) slice' },
];

const getBeatRepeatSteps = (div: BeatRepeatDivision, numSteps: number): number => {
    switch (div) {
        case '2BEATS': return Math.min(8, Math.max(1, numSteps));
        case '1BEAT': return Math.min(4, Math.max(1, numSteps));
        case '1/2BEAT': return Math.min(2, Math.max(1, numSteps));
        case '1/4BEAT': return 1;
        default: return 4;
    }
};

const DJ_EFFECT_SHORTCUT_OPTIONS: {
    id: EffectName;
    shortName: string;
    menuName: string;
    paramLabel: string;
    accentClass: string;
    tooltip: string;
}[] = [
    { id: 'delay', shortName: 'DELAY', menuName: 'DELAY', paramLabel: 'MIX', accentClass: 'accent-green-500', tooltip: 'Adjust Delay wet/dry mix (click name to switch effect)' },
    { id: 'reverb', shortName: 'REVERB', menuName: 'REVERB', paramLabel: 'MIX', accentClass: 'accent-purple-500', tooltip: 'Adjust Reverb wet/dry mix (click name to switch effect)' },
    { id: 'tape', shortName: 'TAPE SAT', menuName: 'TAPE SATURATION', paramLabel: 'MIX', accentClass: 'accent-yellow-500', tooltip: 'Adjust Tape Saturation wet/dry mix (click name to switch effect)' },
    { id: 'envelope', shortName: 'ENV FILTER', menuName: 'ENVELOPE FILTER', paramLabel: 'MIX', accentClass: 'accent-pink-500', tooltip: 'Adjust Envelope Filter wet/dry mix (click name to switch effect)' },
    { id: 'crush', shortName: 'BITCRUSH', menuName: 'BITCRUSHER', paramLabel: 'MIX', accentClass: 'accent-orange-500', tooltip: 'Adjust Bitcrusher intensity (click name to switch effect)' },
    { id: 'sidechain', shortName: 'SIDECHAIN', menuName: 'KICK SIDECHAIN', paramLabel: 'MIX', accentClass: 'accent-blue-500', tooltip: 'Adjust Kick Sidechain ducking amount (click name to switch effect)' },
    { id: 'lowPass', shortName: 'LOW PASS', menuName: 'LOW PASS FILTER', paramLabel: 'FREQ', accentClass: 'accent-blue-500', tooltip: 'Adjust Low Pass Filter cutoff frequency (click name to switch effect)' },
    { id: 'highPass', shortName: 'HIGH PASS', menuName: 'HIGH PASS FILTER', paramLabel: 'FREQ', accentClass: 'accent-blue-500', tooltip: 'Adjust High Pass Filter cutoff frequency (click name to switch effect)' },
];

// --- ZIP ARCHIVE HELPER FOR INDIVIDUAL STEMS EXPORT ---
const crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[i] = c >>> 0;
    }
    return table;
})();

const computeCrc32 = (data: Uint8Array): number => {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
};

const createZipBlob = async (files: { path: string; blob: Blob }[]): Promise<Blob> => {
    const encoder = new TextEncoder();
    const entries: {
        nameBytes: Uint8Array;
        dataBytes: Uint8Array;
        crc: number;
        offset: number;
    }[] = [];

    let offset = 0;
    const chunks: Uint8Array[] = [];

    for (const file of files) {
        const nameBytes = encoder.encode(file.path);
        const arrayBuf = await file.blob.arrayBuffer();
        const dataBytes = new Uint8Array(arrayBuf);
        const crc = computeCrc32(dataBytes);

        const localHeader = new Uint8Array(30 + nameBytes.length);
        const view = new DataView(localHeader.buffer);
        view.setUint32(0, 0x04034b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 0, true);
        view.setUint16(8, 0, true);
        view.setUint16(10, 0, true);
        view.setUint16(12, 0x21, true);
        view.setUint32(14, crc, true);
        view.setUint32(18, dataBytes.length, true);
        view.setUint32(22, dataBytes.length, true);
        view.setUint16(26, nameBytes.length, true);
        view.setUint16(28, 0, true);
        localHeader.set(nameBytes, 30);

        entries.push({ nameBytes, dataBytes, crc, offset });
        chunks.push(localHeader, dataBytes);
        offset += localHeader.length + dataBytes.length;
    }

    const centralDirOffset = offset;
    let centralDirSize = 0;

    for (const entry of entries) {
        const centralHeader = new Uint8Array(46 + entry.nameBytes.length);
        const view = new DataView(centralHeader.buffer);
        view.setUint32(0, 0x02014b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 20, true);
        view.setUint16(8, 0, true);
        view.setUint16(10, 0, true);
        view.setUint16(12, 0, true);
        view.setUint16(14, 0x21, true);
        view.setUint32(16, entry.crc, true);
        view.setUint32(20, entry.dataBytes.length, true);
        view.setUint32(24, entry.dataBytes.length, true);
        view.setUint16(28, entry.nameBytes.length, true);
        view.setUint16(30, 0, true);
        view.setUint16(32, 0, true);
        view.setUint16(34, 0, true);
        view.setUint16(36, 0, true);
        view.setUint32(38, 0, true);
        view.setUint32(42, entry.offset, true);
        centralHeader.set(entry.nameBytes, 46);

        chunks.push(centralHeader);
        centralDirSize += centralHeader.length;
    }

    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true);
    eocdView.setUint16(6, 0, true);
    eocdView.setUint16(8, entries.length, true);
    eocdView.setUint16(10, entries.length, true);
    eocdView.setUint32(12, centralDirSize, true);
    eocdView.setUint32(16, centralDirOffset, true);
    eocdView.setUint16(20, 0, true);
    chunks.push(eocd);

    return new Blob(chunks, { type: 'application/zip' });
};

const DEFAULT_DJ_SETTINGS = {
    randomizeIntensity: 3,
    chainMode: 'off' as ChainMode,
    isolatorGains: { low: 1, mid: 1, high: 1 },
    lofiMix: 0,
    stutterDivision: '1/16' as StutterDivision,
    stutterSource: 'clave' as Instrument | 'all',
    stutterSwingLocked: true,
    beatRepeatDivision: '1BEAT' as BeatRepeatDivision,
    tapeStopDuration: 0.64,
};

const DEFAULT_EFFECTS_SETTINGS = {
    lowPassFreq: MAX_FILTER_FREQ,
    highPassFreq: MIN_FILTER_FREQ,
    reverbMix: 0,
    reverbDecay: 0.4,
    reverbType: 'plate' as ReverbType,
    reverbTone: 12000,
    reverbSource: 'all' as Instrument | 'all',
    delayMix: 0,
    delayTime: getDelayDivisionTimeSeconds('1/8', DEFAULT_TEMPO),
    delayFeedback: 0.3,
    delaySource: 'all' as Instrument | 'all',
    delaySyncDivision: '1/8' as DelayDivision | null,
    kickSidechainAmount: 0,
    kickSidechainThreshold: -20,
    kickSidechainRatio: 4,
    crushAmount: 0,
    tapeSaturationMix: 0,
    tapeSaturationAmount: 1,
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
    const [isPreparingDrag, setIsPreparingDrag] = useState<boolean>(false);
    const [dragBlobUrl, setDragBlobUrl] = useState<string | null>(null);
    const [exportMeasures, setExportMeasures] = useState<number>(1);
    const [exportIncludeTail, setExportIncludeTail] = useState<boolean>(false);
    const [beatsPerMeasure, setBeatsPerMeasure] = useState<number>(4);
    const [grids, setGrids] = useState<{ a: Grid, b: Grid }>({
        a: createInitialGrid(16),
        b: createInitialGrid(16),
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
    const [reverbType, setReverbType] = useState<ReverbType>(DEFAULT_EFFECTS_SETTINGS.reverbType);
    const [reverbTone, setReverbTone] = useState(DEFAULT_EFFECTS_SETTINGS.reverbTone);
    const [reverbSource, setReverbSource] = useState<Instrument | 'all'>(DEFAULT_EFFECTS_SETTINGS.reverbSource);
    const [delayMix, setDelayMix] = useState(DEFAULT_EFFECTS_SETTINGS.delayMix);
    const [delayTime, setDelayTime] = useState(DEFAULT_EFFECTS_SETTINGS.delayTime);
    const [delayFeedback, setDelayFeedback] = useState(DEFAULT_EFFECTS_SETTINGS.delayFeedback);
    const [delaySource, setDelaySource] = useState<Instrument | 'all'>(DEFAULT_EFFECTS_SETTINGS.delaySource);
    const [delaySyncDivision, setDelaySyncDivision] = useState<DelayDivision | null>(DEFAULT_EFFECTS_SETTINGS.delaySyncDivision);
    const [kickSidechainAmount, setKickSidechainAmount] = useState(DEFAULT_EFFECTS_SETTINGS.kickSidechainAmount);
    const [kickSidechainThreshold, setKickSidechainThreshold] = useState(DEFAULT_EFFECTS_SETTINGS.kickSidechainThreshold);
    const [kickSidechainRatio, setKickSidechainRatio] = useState(DEFAULT_EFFECTS_SETTINGS.kickSidechainRatio);
    const [crushAmount, setCrushAmount] = useState(DEFAULT_EFFECTS_SETTINGS.crushAmount);
    const [tapeSaturationMix, setTapeSaturationMix] = useState(DEFAULT_EFFECTS_SETTINGS.tapeSaturationMix);
    const [tapeSaturationAmount, setTapeSaturationAmount] = useState(DEFAULT_EFFECTS_SETTINGS.tapeSaturationAmount);
    const [tapeSaturationTone, setTapeSaturationTone] = useState(DEFAULT_EFFECTS_SETTINGS.tapeSaturationTone);
    const [envelopeFilterMix, setEnvelopeFilterMix] = useState(DEFAULT_EFFECTS_SETTINGS.envelopeFilterMix);
    const [envelopeFilterAmount, setEnvelopeFilterAmount] = useState(DEFAULT_EFFECTS_SETTINGS.envelopeFilterAmount);
    const [envelopeFilterBaseFreq, setEnvelopeFilterBaseFreq] = useState(DEFAULT_EFFECTS_SETTINGS.envelopeFilterBaseFreq);
    const [envelopeFilterQ, setEnvelopeFilterQ] = useState(DEFAULT_EFFECTS_SETTINGS.envelopeFilterQ);
    const [isRandomizeActive, setIsRandomizeActive] = useState<boolean>(false);
    const [isXyFilterHeld, setIsXyFilterHeld] = useState<boolean>(false);
    const [isTapeStopActive, setIsTapeStopActive] = useState<boolean>(false);
    const [tapeStopDuration, setTapeStopDuration] = useState<number>(DEFAULT_DJ_SETTINGS.tapeStopDuration);
    const tapeStopStartTimeRef = useRef<number>(0);
    const tapeStopReleaseTimerRef = useRef<number | null>(null);
    const [isStutterActive, setIsStutterActive] = useState<boolean>(false);
    const [isStutterHeld, setIsStutterHeld] = useState<boolean>(false);
    const [stutterDivision, setStutterDivision] = useState<StutterDivision>(DEFAULT_DJ_SETTINGS.stutterDivision);
    const [stutterSource, setStutterSource] = useState<Instrument | 'all'>(DEFAULT_DJ_SETTINGS.stutterSource);
    const [isStutterSwingLocked, setIsStutterSwingLocked] = useState<boolean>(() => {
        const saved = safeGetItem('cl607-stutterSwingLocked');
        return saved !== null ? JSON.parse(saved) : DEFAULT_DJ_SETTINGS.stutterSwingLocked;
    });
    const isStutterSwingLockedRef = useRef<boolean>(isStutterSwingLocked);
    const [isBeatRepeatActive, setIsBeatRepeatActive] = useState<boolean>(false);
    const [isBeatRepeatHeld, setIsBeatRepeatHeld] = useState<boolean>(false);
    const [beatRepeatDivision, setBeatRepeatDivision] = useState<BeatRepeatDivision>(DEFAULT_DJ_SETTINGS.beatRepeatDivision);
    const [ beatRepeatAnchorStep, setBeatRepeatAnchorStep ] = useState<number>(0);
    const beatRepeatAnchorStepRef = useRef<number>(0);
    const isBeatRepeatActiveRef = useRef<boolean>(false);
    const beatRepeatDivisionRef = useRef<BeatRepeatDivision>(DEFAULT_DJ_SETTINGS.beatRepeatDivision);
    const stutterSourceRef = useRef<Instrument | 'all'>(DEFAULT_DJ_SETTINGS.stutterSource);
    const stutterDivisionRef = useRef<StutterDivision>(DEFAULT_DJ_SETTINGS.stutterDivision);
    const [djShortcutEffects, setDjShortcutEffects] = useState<[EffectName, EffectName]>(['delay', 'reverb']);
    const [openDjShortcutDropdown, setOpenDjShortcutDropdown] = useState<0 | 1 | null>(null);
    const djShortcutsRef = useRef<HTMLDivElement | null>(null);
    const [randomizeIntensity, setRandomizeIntensity] = useState<number>(DEFAULT_DJ_SETTINGS.randomizeIntensity);
    const [chainMode, setChainMode] = useState<ChainMode>(DEFAULT_DJ_SETTINGS.chainMode);
    const [hueRotate, setHueRotate] = useState<number>(0);
    const [isColorAnimating, setIsColorAnimating] = useState<boolean>(false);
    const [sixSevenSpeed, setSixSevenSpeed] = useState<number>(() => {
        const savedSpeed = safeGetItem('cl607-sixSevenSpeed');
        if (savedSpeed !== null) {
            const parsed = parseFloat(savedSpeed);
            if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 5) {
                return parsed;
            }
        }
        return 1;
    });
    const sixSevenSpeedRef = useRef<number>(sixSevenSpeed);
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [isLiveRecording, setIsLiveRecording] = useState<boolean>(false);
    const [liveRecordings, setLiveRecordings] = useState<LiveRecording[]>([]);
    const liveRecordingCounterRef = useRef<number>(1);
    const [fullAudioData, setFullAudioData] = useState<Float32Array>(() => new Float32Array(0));
    const [originalAudioData, setOriginalAudioData] = useState<Float32Array>(() => new Float32Array(0));
    const [trimRange, setTrimRange] = useState<{ start: number; end: number }>({ start: 0, end: 1 });
    const [isRendering, setIsRendering] = useState<boolean>(false);
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
    const [visualizerStyle, setVisualizerStyle] = useState<VisualizerStyle>(() => {
        const savedSlowMode = safeGetItem('cl607-slowComputerMode');
        if (savedSlowMode !== null) {
            try {
                if (JSON.parse(savedSlowMode)) return 'minimal';
            } catch {}
        }
        const savedStyle = safeGetItem('cl607-visualizerStyle');
        const validStyles: VisualizerStyle[] = ['default', 'cyberpunk', 'braun', 'bauhaus', 'nagra', 'koto', 'minimal'];
        if (savedStyle && validStyles.includes(savedStyle as VisualizerStyle)) {
            return savedStyle as VisualizerStyle;
        }
        return 'default';
    });
    const [drumKit, setDrumKit] = useState<'808' | '909' | '727'>('808');
    const [isPerformanceMode, setIsPerformanceMode] = useState<boolean>(true);
    const [isSlowComputerMode, setIsSlowComputerMode] = useState<boolean>(() => {
        const savedSlowMode = safeGetItem('cl607-slowComputerMode');
        if (savedSlowMode !== null) {
            try {
                return Boolean(JSON.parse(savedSlowMode));
            } catch {}
        }
        return safeGetItem('cl607-visualizerStyle') === 'minimal';
    });
    const [tooltipsEnabled, setTooltipsEnabled] = useState<boolean>(() => {
        const saved = safeGetItem('cl607-tooltipsEnabled-v2');
        if (saved !== null) {
            try {
                return Boolean(JSON.parse(saved));
            } catch {}
        }
        return false;
    });
    const [padLabelMode, setPadLabelMode] = useState<PadLabelMode>(() => {
        const savedMode = safeGetItem('cl607-padLabelMode');
        if (savedMode === 'subdivisions' || savedMode === 'syllables' || savedMode === 'off') {
            return savedMode;
        }
        const savedBeatNumbers = safeGetItem('cl607-showBeatNumbers');
        if (savedBeatNumbers !== null) {
            try {
                return JSON.parse(savedBeatNumbers) ? 'subdivisions' : 'off';
            } catch {}
        }
        return 'off';
    });
    const showBeatNumbers = padLabelMode === 'subdivisions';
    const [notationTextMode, setNotationTextMode] = useState<NotationTextMode>(() => {
        const saved = safeGetItem('cl607-notationTextMode');
        if (saved === 'subdivisions' || saved === 'syllables' || saved === 'off') {
            return saved;
        }
        return 'syllables';
    });
    const [isInvertColors, setIsInvertColors] = useState<boolean>(() => {
        const savedInvert = safeGetItem('cl607-invertColors');
        if (savedInvert !== null) {
            try {
                return Boolean(JSON.parse(savedInvert));
            } catch {}
        }
        return false;
    });
    const preSlowSettingsRef = useRef<{ visualizerStyle: VisualizerStyle; isPerformanceMode: boolean; tooltipsEnabled: boolean }>({
        visualizerStyle: 'default',
        isPerformanceMode: true,
        tooltipsEnabled: false,
    });
    
    // Keyboard drumming state
    const [keyboardDrummingEnabled, setKeyboardDrummingEnabled] = useState<boolean>(true);
    const [keyboardMap, setKeyboardMap] = useState<Record<string, Instrument>>({
        'a': 'kick',
        's': 'snare',
        'd': 'hihat',
        'f': 'snap',
        'g': 'clave',
        'h': 'cowbell',
        'j': 'sample'
    });

    // New state for tracking default settings
    const [isDjSettingsDefault, setIsDjSettingsDefault] = useState(true);
    const [isEffectsSettingsDefault, setIsEffectsSettingsDefault] = useState(true);
    const [isAudioEngineReady, setIsAudioEngineReady] = useState(false);

    // State for hiding tooltips while dragging sliders
    const [isInteractingWithSlider, setIsInteractingWithSlider] = useState(false);
    
    // State for drag and drop section reordering
    const [sectionOrder, setSectionOrder] = useState<string[]>(['dj', 'effects', 'instruments', 'recorder', 'notation', 'settings']);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const longPressTimeoutRef = useRef<number | undefined>(undefined);
    const sectionsContainerRef = useRef<HTMLDivElement>(null);
    const draggedItemIndexRef = useRef<number | null>(null);

    // --- Cappuccino Mode & Editable Header Title State ---
    const [isCappuccinoMode, setIsCappuccinoMode] = useState(false);
    const [customTitle, setCustomTitle] = useState<string>('CL-607 Drum Machine');
    const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const titleClickRef = useRef({ count: 0, lastTime: 0 });


    // FIX: Initialize useRef with null to provide an initial value and prevent errors.
    const animationFrameRef = useRef<number | null>(null);
    const recordingTimeoutRef = useRef<number | null>(null);
    const scrambleIntervalRef = useRef<number | null>(null);

    const schedulerTimerRef = useRef<number | null>(null);
    const schedulerWorkerRef = useRef<Worker | null>(null);
    const visualizerTimerRef = useRef<number | null>(null);
    const nextNoteTime = useRef<number>(0.0);
    const currentStepRef = useRef<number>(0);
    const chainCounterRef = useRef(0);
    const notesInQueueRef = useRef<Array<{ step: number; time: number }>>([]);

    const gridsRef = useRef(grids);
    const volumesRef = useRef(volumes);
    const tempoRef = useRef(tempo);
    const isRandomizeActiveRef = useRef(isRandomizeActive);
    const randomizeIntensityRef = useRef(randomizeIntensity);
    const instrumentParamsRef = useRef(instrumentParams);
    const swingRef = useRef(swing);
    const chainModeRef = useRef(chainMode);
    const activePatternRef = useRef(activePattern); // Ref for scheduler
    const instrumentVisibilityRef = useRef(instrumentVisibility);
    const beatsPerMeasureRef = useRef(beatsPerMeasure);

    const isCurrentPatternEmpty = useMemo(() => {
        const hasNotes = (grid: Grid) => grid.some(row => row.some(step => step));
        return !hasNotes(grids.a) && !hasNotes(grids.b);
    }, [grids]);

    useEffect(() => {
        gridsRef.current = grids;
        volumesRef.current = volumes;
        tempoRef.current = tempo;
        isRandomizeActiveRef.current = isRandomizeActive;
        randomizeIntensityRef.current = randomizeIntensity;
        instrumentParamsRef.current = instrumentParams;
        swingRef.current = swing;
        chainModeRef.current = chainMode;
        activePatternRef.current = activePattern;
        instrumentVisibilityRef.current = instrumentVisibility;
        beatsPerMeasureRef.current = beatsPerMeasure;
        isBeatRepeatActiveRef.current = isBeatRepeatActive || isBeatRepeatHeld;
        beatRepeatDivisionRef.current = beatRepeatDivision;
        stutterSourceRef.current = stutterSource;
        stutterDivisionRef.current = stutterDivision;
        isStutterSwingLockedRef.current = isStutterSwingLocked;
        sixSevenSpeedRef.current = sixSevenSpeed;
    }, [grids, volumes, tempo, isRandomizeActive, randomizeIntensity, instrumentParams, swing, chainMode, activePattern, instrumentVisibility, beatsPerMeasure, isBeatRepeatActive, isBeatRepeatHeld, beatRepeatDivision, stutterSource, stutterDivision, isStutterSwingLocked, sixSevenSpeed]);

    // When the user manually changes the pattern or chain mode, reset the counter.
    useEffect(() => {
        chainCounterRef.current = 0;
    }, [activePattern, chainMode]);
    

    // Load saved patterns from localStorage and initialize working state on first mount
    useEffect(() => {
        // Load tooltip setting (v2 defaults to false)
        const savedTooltipsSetting = safeGetItem('cl607-tooltipsEnabled-v2');
        if (savedTooltipsSetting !== null) {
            try {
                setTooltipsEnabled(Boolean(JSON.parse(savedTooltipsSetting)));
            } catch {}
        }

        const savedPadMode = safeGetItem('cl607-padLabelMode');
        if (savedPadMode === 'subdivisions' || savedPadMode === 'syllables' || savedPadMode === 'off') {
            setPadLabelMode(savedPadMode as PadLabelMode);
        } else {
            const savedBeatNumbers = safeGetItem('cl607-showBeatNumbers');
            if (savedBeatNumbers !== null) {
                try {
                    setPadLabelMode(JSON.parse(savedBeatNumbers) ? 'subdivisions' : 'off');
                } catch {}
            }
        }

        const savedInvert = safeGetItem('cl607-invertColors');
        if (savedInvert !== null) {
            setIsInvertColors(JSON.parse(savedInvert));
        }

        const savedKeyboardDrumming = safeGetItem('cl607-keyboardDrummingEnabled');
        if (savedKeyboardDrumming !== null) {
            setKeyboardDrummingEnabled(JSON.parse(savedKeyboardDrumming));
        }

        const savedStyle = safeGetItem('cl607-visualizerStyle');
        const validStyles: VisualizerStyle[] = ['default', 'classic607', 'cyberpunk', 'braun', 'bauhaus', 'nagra', 'koto', 'minimal'];
        if (savedStyle && validStyles.includes(savedStyle as VisualizerStyle)) {
            setVisualizerStyle(savedStyle as VisualizerStyle);
            if (savedStyle === 'minimal') {
                setIsSlowComputerMode(true);
                setIsPerformanceMode(true);
            }
        }

        const savedSlowMode = safeGetItem('cl607-slowComputerMode');
        if (savedSlowMode !== null) {
            const parsedSlow = JSON.parse(savedSlowMode);
            setIsSlowComputerMode(parsedSlow);
            if (parsedSlow) {
                setVisualizerStyle('minimal');
                setIsPerformanceMode(true);
            }
        }

        const savedTitle = safeGetItem('cl607-customTitle');
        if (savedTitle && savedTitle.trim()) {
            setCustomTitle(savedTitle);
        }

        // Load comprehensive session state (all effects, DJ settings, instrument settings, and UI preferences)
        let savedSlotIndex = 0;
        const savedSessionRaw = safeGetItem('cl607-sessionState');
        if (savedSessionRaw) {
            try {
                const s = JSON.parse(savedSessionRaw);
                if (typeof s.currentPatternIndex === 'number' && s.currentPatternIndex >= 0 && s.currentPatternIndex < 4) {
                    savedSlotIndex = s.currentPatternIndex;
                    setCurrentPatternIndex(s.currentPatternIndex);
                }
                if (s.activePattern === 'a' || s.activePattern === 'b') {
                    setActivePattern(s.activePattern);
                    activePatternRef.current = s.activePattern;
                }
                if (typeof s.masterVolume === 'number') setMasterVolume(s.masterVolume);
                if (s.drumKit === '808' || s.drumKit === '909' || s.drumKit === '727') {
                    setDrumKit(s.drumKit);
                }
                if (s.kickDesignerParams && typeof s.kickDesignerParams === 'object') {
                    setKickDesignerParams({ ...DEFAULT_KICK_DESIGNER_PARAMS, ...s.kickDesignerParams });
                }
                if (Array.isArray(s.instrumentVisibility) && s.instrumentVisibility.length === INSTRUMENTS.length) {
                    setInstrumentVisibility(s.instrumentVisibility);
                    instrumentVisibilityRef.current = s.instrumentVisibility;
                }
                if (typeof s.exportMeasures === 'number') setExportMeasures(s.exportMeasures);
                if (typeof s.exportIncludeTail === 'boolean') setExportIncludeTail(s.exportIncludeTail);

                // Restore all Effects settings
                if (typeof s.lowPassFreq === 'number') setLowPassFreq(s.lowPassFreq);
                if (typeof s.highPassFreq === 'number') setHighPassFreq(s.highPassFreq);
                if (typeof s.reverbMix === 'number') setReverbMix(s.reverbMix);
                if (typeof s.reverbDecay === 'number') setReverbDecay(s.reverbDecay);
                if (s.reverbType === 'room' || s.reverbType === 'plate' || s.reverbType === 'hall') {
                    setReverbType(s.reverbType);
                }
                if (typeof s.reverbTone === 'number') setReverbTone(s.reverbTone);
                if (s.reverbSource) setReverbSource(s.reverbSource);
                if (typeof s.delayMix === 'number') setDelayMix(s.delayMix);
                if (typeof s.delayTime === 'number') setDelayTime(s.delayTime);
                if (typeof s.delayFeedback === 'number') setDelayFeedback(s.delayFeedback);
                if (s.delaySource) setDelaySource(s.delaySource);
                if (s.delaySyncDivision !== undefined) setDelaySyncDivision(s.delaySyncDivision);
                if (typeof s.kickSidechainAmount === 'number') setKickSidechainAmount(s.kickSidechainAmount);
                if (typeof s.kickSidechainThreshold === 'number') setKickSidechainThreshold(s.kickSidechainThreshold);
                if (typeof s.kickSidechainRatio === 'number') setKickSidechainRatio(s.kickSidechainRatio);
                if (typeof s.crushAmount === 'number') setCrushAmount(s.crushAmount);
                if (typeof s.tapeSaturationMix === 'number') setTapeSaturationMix(s.tapeSaturationMix);
                if (typeof s.tapeSaturationAmount === 'number') setTapeSaturationAmount(s.tapeSaturationAmount);
                if (typeof s.tapeSaturationTone === 'number') setTapeSaturationTone(s.tapeSaturationTone);
                if (typeof s.envelopeFilterMix === 'number') setEnvelopeFilterMix(s.envelopeFilterMix);
                if (typeof s.envelopeFilterAmount === 'number') setEnvelopeFilterAmount(s.envelopeFilterAmount);
                if (typeof s.envelopeFilterBaseFreq === 'number') setEnvelopeFilterBaseFreq(s.envelopeFilterBaseFreq);
                if (typeof s.envelopeFilterQ === 'number') setEnvelopeFilterQ(s.envelopeFilterQ);
                if (s.effectsEnabled && typeof s.effectsEnabled === 'object') {
                    setEffectsEnabled(prev => ({ ...prev, ...s.effectsEnabled }));
                }

                // Restore all Live DJ settings
                if (typeof s.randomizeIntensity === 'number') {
                    setRandomizeIntensity(s.randomizeIntensity);
                    randomizeIntensityRef.current = s.randomizeIntensity;
                }
                if (s.chainMode) {
                    setChainMode(s.chainMode);
                    chainModeRef.current = s.chainMode;
                }
                if (s.isolatorGains && typeof s.isolatorGains === 'object') {
                    setIsolatorGains(prev => ({ ...prev, ...s.isolatorGains }));
                }
                if (typeof s.lofiMix === 'number') setLofiMix(s.lofiMix);
                if (s.stutterDivision) {
                    setStutterDivision(s.stutterDivision);
                    stutterDivisionRef.current = s.stutterDivision;
                }
                if (s.stutterSource) {
                    setStutterSource(s.stutterSource);
                    stutterSourceRef.current = s.stutterSource;
                }
                if (typeof s.isStutterSwingLocked === 'boolean') {
                    setIsStutterSwingLocked(s.isStutterSwingLocked);
                    isStutterSwingLockedRef.current = s.isStutterSwingLocked;
                }
                if (s.beatRepeatDivision) {
                    setBeatRepeatDivision(s.beatRepeatDivision);
                    beatRepeatDivisionRef.current = s.beatRepeatDivision;
                }
                if (typeof s.tapeStopDuration === 'number') setTapeStopDuration(s.tapeStopDuration);
                if (Array.isArray(s.djShortcutEffects) && s.djShortcutEffects.length === 2) {
                    setDjShortcutEffects(s.djShortcutEffects as [EffectName, EffectName]);
                }

                // Restore Settings & UI preferences
                if (s.visualizerType === 'waveform' || s.visualizerType === 'lissajous' || s.visualizerType === 'spectrum') {
                    setVisualizerType(s.visualizerType);
                }
                if (typeof s.isPerformanceMode === 'boolean' && !Boolean(s.isSlowComputerMode)) {
                    setIsPerformanceMode(s.isPerformanceMode);
                }
                if (s.keyboardMap && typeof s.keyboardMap === 'object') {
                    setKeyboardMap(s.keyboardMap);
                }
                if (Array.isArray(s.sectionOrder) && s.sectionOrder.length === 6) {
                    setSectionOrder(s.sectionOrder);
                }
                if (typeof s.hueRotate === 'number') setHueRotate(s.hueRotate);
                if (typeof s.isCappuccinoMode === 'boolean') setIsCappuccinoMode(s.isCappuccinoMode);
                if (s.notationTextMode === 'subdivisions' || s.notationTextMode === 'syllables' || s.notationTextMode === 'off') {
                    setNotationTextMode(s.notationTextMode);
                }
            } catch (e) {
                console.error('Failed to load session state', e);
            }
        }

        // Load patterns
        const loadedPatterns: (SavedPattern | null)[] = [];
        for (let i = 0; i < 4; i++) {
            try {
                const savedData = safeGetItem(`cl607-pattern-${i}`);
                if (savedData) {
                    const parsedData = JSON.parse(savedData) as any;
                    const finalPattern: SavedPattern = {
                        ...parsedData,
                        grids: parsedData.grids || { a: parsedData.grid, b: createInitialGrid( (parsedData.beatsPerMeasure || 4) * 4) }, // Migration
                        beatsPerMeasure: parsedData.beatsPerMeasure || 4, // Default to 4
                        swing: parsedData.swing ?? 0,
                    };
                    loadedPatterns.push(finalPattern);
                } else {
                    loadedPatterns.push(null);
                }
            } catch (e) {
                console.error(`Failed to load pattern from slot ${i}`, e);
                loadedPatterns.push(null);
            }
        }

        const initialPattern = loadedPatterns[savedSlotIndex] || loadedPatterns[0];
        if (initialPattern) {
            setGrids(initialPattern.grids);
            setVolumes(initialPattern.volumes);
            setTempo(initialPattern.tempo);
            tempoRef.current = initialPattern.tempo;
            setInstrumentParams(initialPattern.instrumentParams);
            instrumentParamsRef.current = initialPattern.instrumentParams;
            setSwing(initialPattern.swing ?? 0);
            swingRef.current = initialPattern.swing ?? 0;
            setBeatsPerMeasure(initialPattern.beatsPerMeasure || 4);
            beatsPerMeasureRef.current = initialPattern.beatsPerMeasure || 4;
        } else {
             const defaultPattern: SavedPattern = {
                grids: { a: createInitialGrid(16), b: createInitialGrid(16) },
                volumes: DEFAULT_VOLUMES,
                tempo: DEFAULT_TEMPO,
                instrumentParams: JSON.parse(JSON.stringify(DEFAULT_INSTRUMENT_PARAMS)),
                swing: 0,
                beatsPerMeasure: 4,
            };
            
            loadedPatterns[0] = defaultPattern;
        }

        setSavedPatterns(loadedPatterns);
        setIsAppLoaded(true);
    }, []);
    
    // Autosave effect: when working pattern state changes, update savedPatterns array and localStorage
    useEffect(() => {
        if (!isAppLoaded) return;

        const patternData: SavedPattern = {
            grids,
            volumes,
            tempo,
            instrumentParams,
            swing,
            beatsPerMeasure,
        };

        try {
            safeSetItem(`cl607-pattern-${currentPatternIndex}`, JSON.stringify(patternData));
        } catch (e) {
            console.error(`Failed to save pattern to slot ${currentPatternIndex}`, e);
        }

        const debounceSave = setTimeout(() => {
            setSavedPatterns(prev => {
                const newPatterns = [...prev];
                if (JSON.stringify(newPatterns[currentPatternIndex]) !== JSON.stringify(patternData)) {
                    newPatterns[currentPatternIndex] = patternData;
                    return newPatterns;
                }
                return prev;
            });
        }, 150);

        return () => clearTimeout(debounceSave);

    }, [isAppLoaded, grids, volumes, tempo, instrumentParams, swing, beatsPerMeasure, currentPatternIndex]);

    // Comprehensive autosave effect for all Effects, Live DJ controls, Instrument Designer, and UI Settings
    useEffect(() => {
        if (!isAppLoaded) return;

        const sessionState = {
            currentPatternIndex,
            activePattern,
            masterVolume,
            drumKit,
            kickDesignerParams,
            instrumentVisibility,
            exportMeasures,
            exportIncludeTail,
            // Effects
            lowPassFreq,
            highPassFreq,
            reverbMix,
            reverbDecay,
            reverbType,
            reverbTone,
            reverbSource,
            delayMix,
            delayTime,
            delayFeedback,
            delaySource,
            delaySyncDivision,
            kickSidechainAmount,
            kickSidechainThreshold,
            kickSidechainRatio,
            crushAmount,
            tapeSaturationMix,
            tapeSaturationAmount,
            tapeSaturationTone,
            envelopeFilterMix,
            envelopeFilterAmount,
            envelopeFilterBaseFreq,
            envelopeFilterQ,
            effectsEnabled,
            // Live DJ
            randomizeIntensity,
            chainMode,
            isolatorGains,
            lofiMix,
            stutterDivision,
            stutterSource,
            isStutterSwingLocked,
            beatRepeatDivision,
            tapeStopDuration,
            djShortcutEffects,
            // Settings & UI
            visualizerType,
            visualizerStyle,
            isPerformanceMode,
            isSlowComputerMode,
            tooltipsEnabled,
            padLabelMode,
            notationTextMode,
            isInvertColors,
            isCappuccinoMode,
            hueRotate,
            sixSevenSpeed,
            keyboardDrummingEnabled,
            keyboardMap,
            sectionOrder,
            customTitle,
        };

        safeSetItem('cl607-sessionState', JSON.stringify(sessionState));
    }, [
        isAppLoaded,
        currentPatternIndex,
        activePattern,
        masterVolume,
        drumKit,
        kickDesignerParams,
        instrumentVisibility,
        exportMeasures,
        exportIncludeTail,
        lowPassFreq,
        highPassFreq,
        reverbMix,
        reverbDecay,
        reverbType,
        reverbTone,
        reverbSource,
        delayMix,
        delayTime,
        delayFeedback,
        delaySource,
        delaySyncDivision,
        kickSidechainAmount,
        kickSidechainThreshold,
        kickSidechainRatio,
        crushAmount,
        tapeSaturationMix,
        tapeSaturationAmount,
        tapeSaturationTone,
        envelopeFilterMix,
        envelopeFilterAmount,
        envelopeFilterBaseFreq,
        envelopeFilterQ,
        effectsEnabled,
        randomizeIntensity,
        chainMode,
        isolatorGains,
        lofiMix,
        stutterDivision,
        stutterSource,
        isStutterSwingLocked,
        beatRepeatDivision,
        tapeStopDuration,
        djShortcutEffects,
        visualizerType,
        visualizerStyle,
        isPerformanceMode,
        isSlowComputerMode,
        tooltipsEnabled,
        padLabelMode,
        notationTextMode,
        isInvertColors,
        isCappuccinoMode,
        hueRotate,
        sixSevenSpeed,
        keyboardDrummingEnabled,
        keyboardMap,
        sectionOrder,
        customTitle,
    ]);


    const { 
        setup, playKick, playSnare, playHiHat, playSnap, playClave, playCowbell, playSample, startRecording, stopRecording, startLiveRecording, stopLiveRecording, getRecordedAudioData, setSampleAudioData, renderBeatToBuffer, updateInstrumentParameter, rerenderKick, rerenderAllInstruments,
        setLowPassFrequency, setHighPassFrequency,
        setReverbMix: setAudioEngineReverbMix, 
        setReverbDecay: setAudioEngineReverbDecay,
        setReverbType: setAudioEngineReverbType,
        setReverbTone: setAudioEngineReverbTone,
        setReverbSource: setAudioEngineReverbSource,
        setDelayMix: setAudioEngineDelayMix, 
        setDelayTime: setAudioEngineDelayTime, 
        setDelayFeedback: setAudioEngineDelayFeedback, 
        setDelaySource: setAudioEngineDelaySource,
        setKickSidechainAmount: setAudioEngineKickSidechainAmount,
        setKickSidechainThreshold: setAudioEngineKickSidechainThreshold,
        setKickSidechainRatio: setAudioEngineKickSidechainRatio,
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
        setTapeStop,
        updateTapeStopDuration,
        setStutterState,
        updateStutterParams,
        syncStutterTransport,
    } = useAudioEngine();

    const handleStart = useCallback(async () => {
        setIsLoading(true);
        const result = await setup(kickDesignerParams, drumKit, instrumentParams);
        if (result) {
            setIsAudioEngineReady(true);
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
    }, [setup, kickDesignerParams, drumKit, instrumentParams]);
    
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
            if (schedulerTimerRef.current) {
                clearInterval(schedulerTimerRef.current);
                schedulerTimerRef.current = null;
            }
            if (schedulerWorkerRef.current) {
                schedulerWorkerRef.current.postMessage('stop');
                schedulerWorkerRef.current.terminate();
                schedulerWorkerRef.current = null;
            }
            notesInQueueRef.current = [];
            const src = stutterSourceRef.current;
            const srcVol = src === 'all' ? 0.7 : (volumesRef.current[INSTRUMENTS.indexOf(src)] ?? 0.7);
            syncStutterTransport(false, 0, tempoRef.current, false, src, srcVol);
            return;
        }
        
        // 180ms Web Audio hardware lookahead polled every 15ms from a dedicated background Worker thread
        // guarantees rock-solid, sample-accurate beats even during heavy UI interaction or tab switches.
        const schedulerAheadTime = 0.18;
        const schedulerInterval = 15.0;
        let isFirstBeatAfterTransportStart = true;

        const scheduler = () => {
            const now = audioContext.currentTime;
            // Guard against large clock jumps (e.g. system sleep or suspended tab wakeup)
            if (nextNoteTime.current < now - 0.06) {
                nextNoteTime.current = now;
            }

            const currentVolumes = volumesRef.current;
            const randomizeActive = isRandomizeActiveRef.current;
            const intensity = randomizeIntensityRef.current;
            const allParams = instrumentParamsRef.current;
            const currentSwing = swingRef.current;
            const visibility = instrumentVisibilityRef.current;
            const currentBPM = beatsPerMeasureRef.current;
            const currentTempo = tempoRef.current;
            const numSteps = currentBPM * 4;
            
            while (nextNoteTime.current < audioContext.currentTime + schedulerAheadTime) {
                let patternToUse = activePatternRef.current;
                const beatRepeatOn = isBeatRepeatActiveRef.current;

                if (currentStepRef.current === 0 && !beatRepeatOn) {
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
                            activePatternRef.current = nextPattern;
                            setActivePattern(nextPattern); 
                        }
                    }
                }
                
                const grid = gridsRef.current[patternToUse];
                const secondsPerStep = 60.0 / currentTempo / 4.0;
                const scheduledStep = currentStepRef.current;
                const scheduledTime = nextNoteTime.current;

                // Lock Stutter's master beat clock to the exact AudioContext timestamp of every quarter-note beat
                if (scheduledStep % 4 === 0) {
                    const src = stutterSourceRef.current;
                    const srcVol = src === 'all' ? 0.7 : (currentVolumes[INSTRUMENTS.indexOf(src)] ?? 0.7);
                    const div = stutterDivisionRef.current;
                    const effSwing = (!isStutterSwingLockedRef.current || div === '1/8T' || div === '1/16T') ? 0 : currentSwing;
                    syncStutterTransport(true, scheduledTime, currentTempo, isFirstBeatAfterTransportStart, src, srcVol, effSwing);
                    isFirstBeatAfterTransportStart = false;
                }

                const repeatSteps = getBeatRepeatSteps(beatRepeatDivisionRef.current, numSteps);
                const anchorStep = ((beatRepeatAnchorStepRef.current % numSteps) + numSteps) % numSteps;
                const effectiveStep = beatRepeatOn
                    ? (anchorStep + (scheduledStep % repeatSteps)) % numSteps
                    : scheduledStep;

                notesInQueueRef.current.push({ step: effectiveStep, time: scheduledTime });
                if (notesInQueueRef.current.length > 64) {
                    notesInQueueRef.current.shift();
                }
                
                const stepToPlay = randomizeActive
                    ? calculateRandomizeStep(effectiveStep, intensity, numSteps)
                    : effectiveStep;
    
                if (stepToPlay > -1) {
                    for (let instrumentIndex = 0; instrumentIndex < INSTRUMENTS.length; instrumentIndex++) {
                        if (visibility[instrumentIndex] && grid[instrumentIndex]?.[stepToPlay] && currentVolumes[instrumentIndex] > 0) {
                            const instrument = INSTRUMENTS[instrumentIndex];
                            playSoundAtTime(instrument, currentVolumes[instrumentIndex], scheduledTime, allParams[instrument]);
                        }
                    }
                }
                
                const swingFactor = 0.5 + (currentSwing * 0.25);
                const isOddStep = scheduledStep % 2 !== 0;
                const stepDuration = isOddStep 
                    ? (1 - swingFactor) * 2 * secondsPerStep 
                    : swingFactor * 2 * secondsPerStep;
    
                nextNoteTime.current += stepDuration;
                currentStepRef.current = (scheduledStep + 1) % numSteps;
            }
        };

        scheduler();

        let workerUrl: string | null = null;
        try {
            const workerBlob = new Blob(
                [
                    `let timerId = null;
                    self.onmessage = function(e) {
                        if (e.data === 'start') {
                            if (timerId) clearInterval(timerId);
                            timerId = setInterval(function() { self.postMessage('tick'); }, ${schedulerInterval});
                        } else if (e.data === 'stop') {
                            if (timerId) clearInterval(timerId);
                            timerId = null;
                        }
                    };`
                ],
                { type: 'application/javascript' }
            );
            workerUrl = URL.createObjectURL(workerBlob);
            const worker = new Worker(workerUrl);
            worker.onmessage = scheduler;
            worker.postMessage('start');
            schedulerWorkerRef.current = worker;
        } catch {
            schedulerTimerRef.current = window.setInterval(scheduler, schedulerInterval);
        }

        return () => {
            if (schedulerTimerRef.current) {
                clearInterval(schedulerTimerRef.current);
                schedulerTimerRef.current = null;
            }
            if (schedulerWorkerRef.current) {
                schedulerWorkerRef.current.postMessage('stop');
                schedulerWorkerRef.current.terminate();
                schedulerWorkerRef.current = null;
            }
            if (workerUrl) {
                URL.revokeObjectURL(workerUrl);
            }
        };
    }, [isPlaying, audioContext, playSoundAtTime, syncStutterTransport]);
    
    const instrumentColors = useMemo(() => {
        switch (visualizerStyle) {
            case 'default':
                return ['#9df5d2', '#93eef7', '#9ad1ff', '#a9b2ff', '#c6a8ff', '#e5a9ff', '#ffaad9'];
            case 'braun':
                return ['#ea5b0c', '#d9381e', '#2563eb', '#0d9488', '#2d6a4f', '#d97706', '#6d28d9'];
            case 'bauhaus':
                return ['#d62828', '#184e9c', '#e5a000', '#0f766e', '#15803d', '#c2410c', '#6b21a8'];
            case 'nagra':
                return ['#ff4d5e', '#ff7b3d', '#f59e0b', '#e84393', '#a855f7', '#fb7185', '#f97316'];
            case 'koto':
                return ['#d9462f', '#d4af37', '#e08238', '#5c9e73', '#4f75b8', '#c99b3b', '#b85d79'];
            case 'cyberpunk':
                return ['#ff003c', '#fcee0a', '#00f0ff', '#00ff9f', '#ff00a0', '#ff6600', '#9d00ff'];
            case 'classic607':
            default:
                return BASE_INSTRUMENT_COLORS_HSL.map(baseColor => {
                    return `hsl(${baseColor.h}, ${baseColor.s}%, ${baseColor.l}%)`;
                });
        }
    }, [visualizerStyle]);

    useEffect(() => {
        if (!audioContext || !isPlaying) {
            if (visualizerTimerRef.current) cancelAnimationFrame(visualizerTimerRef.current);
            setCurrentStep(null);
            return;
        }

        const visualizerLoop = () => {
            const currentTime = audioContext.currentTime;
            const queue = notesInQueueRef.current;
            let stepToShow: number | null = null;

            while (queue.length > 0 && queue[0].time <= currentTime + 0.008) {
                stepToShow = queue[0].step;
                queue.shift();
            }

            if (stepToShow !== null) {
                setCurrentStep(prev => (prev === stepToShow ? prev : stepToShow));
            }
            
            visualizerTimerRef.current = requestAnimationFrame(visualizerLoop);
        };

        visualizerLoop();

        return () => {
            if (visualizerTimerRef.current) cancelAnimationFrame(visualizerTimerRef.current);
        };
    }, [isPlaying, audioContext]);


    const handleToggleStep = useCallback((instrumentIndex: number, stepIndex: number) => {
        setGrids(prevGrids => {
            const currentGrid = prevGrids[activePattern];
            const newGrid = [...currentGrid];
            const targetRow = [...newGrid[instrumentIndex]];
            targetRow[stepIndex] = !targetRow[stepIndex];
            newGrid[instrumentIndex] = targetRow;
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
            updateInstrumentParameter(instrument, param, value, drumKit);
        }
    }, [updateInstrumentParameter, drumKit]);

    const handleKickDesignerParamChange = useCallback((param: keyof KickDesignerParams, value: number) => {
        setKickDesignerParams(prev => ({ ...prev, [param]: value }));
    }, []);
    
    const kickDesignerParamsRef = useRef(kickDesignerParams);
    const drumKitRef = useRef(drumKit);
    const prevKickDesignerParamsRef = useRef(kickDesignerParams);
    const prevDrumKitRef = useRef(drumKit);

    useEffect(() => {
        kickDesignerParamsRef.current = kickDesignerParams;
        drumKitRef.current = drumKit;
        if (!isInitialized) {
            prevKickDesignerParamsRef.current = kickDesignerParams;
            prevDrumKitRef.current = drumKit;
        }
    }, [kickDesignerParams, drumKit, isInitialized]);

    // This effect listens ONLY for changes to the kick designer parameters
    // and triggers a re-render of the kick sound buffer without re-rendering other instruments.
    useEffect(() => {
        if (!isInitialized || !rerenderKick) return;
        if (prevKickDesignerParamsRef.current !== kickDesignerParams) {
            prevKickDesignerParamsRef.current = kickDesignerParams;
            rerenderKick(kickDesignerParams, drumKitRef.current);
        }
    }, [isInitialized, rerenderKick, kickDesignerParams]);

    // This effect listens ONLY for drumKit changes and re-renders all instruments
    useEffect(() => {
        if (!isInitialized || !rerenderAllInstruments) return;
        if (prevDrumKitRef.current !== drumKit) {
            prevDrumKitRef.current = drumKit;
            rerenderAllInstruments(kickDesignerParamsRef.current, drumKit);
        }
    }, [isInitialized, rerenderAllInstruments, drumKit]);

    // Poll live recorded PCM data while recording so the Sample Recorder waveform updates in real time
    useEffect(() => {
        let intervalId: number | undefined;
        if (isRecording) {
            intervalId = window.setInterval(() => {
                const data = getRecordedAudioData();
                if (data.length > 0) {
                    setFullAudioData(data);
                }
            }, 250);
        }
        return () => {
            if (intervalId !== undefined) window.clearInterval(intervalId);
        };
    }, [isRecording, getRecordedAudioData]);

    // Sync trimmed sample audio data to the audio engine whenever fullAudioData or trimRange changes (when not recording)
    useEffect(() => {
        if (!isAudioEngineReady || isRecording) return;
        if (fullAudioData.length === 0) {
            setSampleAudioData(new Float32Array(0));
            return;
        }
        const startIndex = Math.floor(trimRange.start * fullAudioData.length);
        const endIndex = Math.floor(trimRange.end * fullAudioData.length);
        const trimmed = fullAudioData.subarray(startIndex, endIndex);
        setSampleAudioData(trimmed);
    }, [fullAudioData, trimRange, isRecording, isAudioEngineReady, setSampleAudioData]);

    const finalizeRecording = useCallback(() => {
        const data = getRecordedAudioData();
        stopRecording();
        setIsRecording(false);
        setFullAudioData(data);
        setOriginalAudioData(data);
        setTrimRange({ start: 0, end: 1 });
        if (recordingTimeoutRef.current) {
            window.clearTimeout(recordingTimeoutRef.current);
            recordingTimeoutRef.current = null;
        }
    }, [getRecordedAudioData, stopRecording]);

    const handleToggleRecording = useCallback(() => {
        if (!isAudioEngineReady) return;
        if (isRecording) {
            finalizeRecording();
        } else {
            if (recordingTimeoutRef.current) {
                window.clearTimeout(recordingTimeoutRef.current);
                recordingTimeoutRef.current = null;
            }
            setFullAudioData(new Float32Array(0));
            setTrimRange({ start: 0, end: 1 });
            setIsRecording(true);
            startRecording();

            // Auto-stop after 10 seconds safety cap
            recordingTimeoutRef.current = window.setTimeout(() => {
                finalizeRecording();
            }, 10000);
        }
    }, [isAudioEngineReady, isRecording, finalizeRecording, startRecording]);

    const handleToggleLiveRecording = useCallback(() => {
        if (!isAudioEngineReady) return;
        if (isLiveRecording) {
            const result = stopLiveRecording();
            setIsLiveRecording(false);
            if (result && result.blob && result.duration > 0.05) {
                const id = `live-rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const num = liveRecordingCounterRef.current++;
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const url = URL.createObjectURL(result.blob);
                const newRec: LiveRecording = {
                    id,
                    name: `Live Memo #${num}`,
                    url,
                    blob: result.blob,
                    duration: result.duration,
                    createdAt: timeStr,
                };
                setLiveRecordings(prev => [newRec, ...prev]);
            }
        } else {
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
            const started = startLiveRecording();
            if (started) {
                setIsLiveRecording(true);
            }
        }
    }, [isAudioEngineReady, isLiveRecording, stopLiveRecording, startLiveRecording, audioContext]);

    const handleDeleteLiveRecording = useCallback((id: string) => {
        setLiveRecordings(prev => {
            const target = prev.find(r => r.id === id);
            if (target) {
                URL.revokeObjectURL(target.url);
            }
            return prev.filter(r => r.id !== id);
        });
    }, []);

    const handleClearAllLiveRecordings = useCallback(() => {
        setLiveRecordings(prev => {
            prev.forEach(r => URL.revokeObjectURL(r.url));
            return [];
        });
    }, []);

    const handleRenameLiveRecording = useCallback((id: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        setLiveRecordings(prev => prev.map(r => r.id === id ? { ...r, name: trimmed } : r));
    }, []);

    const handleDownload = useCallback(async (customFilename?: string, measuresOverride?: number, includeTailOverride?: boolean, exportStems?: boolean) => {
        setIsRendering(true);
        try {
            const defaultBase = `drums_bpm${tempo}`;
            const rawBase = (customFilename ?? defaultBase).trim().replace(/(\.wav|\.zip)$/i, '');
            const sanitizedBase = rawBase.replace(/[:/\\?%*|"<>]/g, '_').trim() || defaultBase;

            if (exportStems) {
                const folderName = `${sanitizedBase}_stems`;
                const isAPatternActive = grids.a.some(row => row.some(step => step));
                const isBPatternActive = grids.b.some(row => row.some(step => step));
                const stemFiles: { path: string; blob: Blob }[] = [];

                const instrumentsWithHits = INSTRUMENTS.filter((_, idx) => {
                    if (!instrumentVisibility[idx] || volumes[idx] <= 0) return false;
                    if (chainMode !== 'off') {
                        return Boolean(grids.a[idx]?.some(Boolean) || grids.b[idx]?.some(Boolean));
                    }
                    const targetGrid =
                        activePattern === 'a' && !isAPatternActive && isBPatternActive
                            ? grids.b
                            : activePattern === 'b' && !isBPatternActive && isAPatternActive
                            ? grids.a
                            : grids[activePattern];
                    return Boolean(targetGrid[idx]?.some(Boolean));
                });

                const targetInstruments = instrumentsWithHits.length > 0
                    ? instrumentsWithHits
                    : INSTRUMENTS.filter((_, idx) => instrumentVisibility[idx] && volumes[idx] > 0);

                for (let idx = 0; idx < targetInstruments.length; idx++) {
                    const inst = targetInstruments[idx];
                    const instIndex = INSTRUMENTS.indexOf(inst);
                    const stemBlob = await renderBeatToBuffer(
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
                        lofiMix,
                        activePattern,
                        chainMode,
                        kickSidechainThreshold,
                        kickSidechainRatio,
                        isRandomizeActive,
                        randomizeIntensity,
                        isStutterActive || isStutterHeld,
                        stutterDivision,
                        isBeatRepeatActive || isBeatRepeatHeld,
                        beatRepeatDivision,
                        beatRepeatAnchorStep,
                        stutterSource,
                        measuresOverride ?? exportMeasures,
                        includeTailOverride ?? exportIncludeTail,
                        inst,
                        isStutterSwingLocked ? swing : 0,
                        reverbType,
                        reverbTone
                    );
                    if (stemBlob) {
                        const paddedIndex = String(instIndex + 1).padStart(2, '0');
                        stemFiles.push({
                            path: `${folderName}/${paddedIndex}_${inst}.wav`,
                            blob: stemBlob,
                        });
                    }
                }

                if (stemFiles.length > 0) {
                    const zipBlob = await createZipBlob(stemFiles);
                    const url = URL.createObjectURL(zipBlob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `${folderName}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                    }, 200);
                }
            } else {
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
                    lofiMix,
                    activePattern,
                    chainMode,
                    kickSidechainThreshold,
                    kickSidechainRatio,
                    isRandomizeActive,
                    randomizeIntensity,
                    isStutterActive || isStutterHeld,
                    stutterDivision,
                    isBeatRepeatActive || isBeatRepeatHeld,
                    beatRepeatDivision,
                    beatRepeatAnchorStep,
                    stutterSource,
                    measuresOverride ?? exportMeasures,
                    includeTailOverride ?? exportIncludeTail,
                    undefined,
                    isStutterSwingLocked ? swing : 0,
                    reverbType,
                    reverbTone
                );

                if (wavBlob) {
                    const filename = `${sanitizedBase}.wav`;
                    const url = URL.createObjectURL(wavBlob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                    }, 200);
                } else {
                    console.error("Rendering failed, received null blob.");
                }
            }
        } catch (error) {
            console.error("Failed to render beat:", error);
        } finally {
            setIsRendering(false);
        }
    }, [
        renderBeatToBuffer, grids, volumes, tempo, swing, masterVolume, lowPassFreq, highPassFreq,
        reverbMix, reverbDecay, reverbType, reverbTone, reverbSource,
        delayMix, delayTime, delayFeedback, delaySource,
        kickSidechainAmount, kickSidechainThreshold, kickSidechainRatio,
        crushAmount, tapeSaturationMix, tapeSaturationAmount, tapeSaturationTone,
        envelopeFilterMix, envelopeFilterAmount, envelopeFilterBaseFreq, envelopeFilterQ,
        effectsEnabled, instrumentVisibility, isolatorGains, lofiMix, activePattern, chainMode,
        isRandomizeActive, randomizeIntensity, isStutterActive, isStutterHeld, stutterDivision,
        isStutterSwingLocked, isBeatRepeatActive, isBeatRepeatHeld, beatRepeatDivision, beatRepeatAnchorStep, stutterSource,
        exportMeasures, exportIncludeTail
    ]);

    const handlePrepareDrag = useCallback(async (measuresOverride?: number, includeTailOverride?: boolean) => {
        setIsPreparingDrag(true);
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
                lofiMix,
                activePattern,
                chainMode,
                kickSidechainThreshold,
                kickSidechainRatio,
                isRandomizeActive,
                randomizeIntensity,
                isStutterActive || isStutterHeld,
                stutterDivision,
                isBeatRepeatActive || isBeatRepeatHeld,
                beatRepeatDivision,
                beatRepeatAnchorStep,
                stutterSource,
                measuresOverride ?? exportMeasures,
                includeTailOverride ?? exportIncludeTail,
                undefined,
                isStutterSwingLocked ? swing : 0,
                reverbType,
                reverbTone
            );

            if (wavBlob) {
                setDragBlobUrl(prev => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(wavBlob);
                });
            } else {
                console.error("Rendering failed, received null blob.");
            }
        } catch (error) {
            console.error("Failed to render beat for drag:", error);
        } finally {
            setIsPreparingDrag(false);
        }
    }, [
        renderBeatToBuffer, grids, volumes, tempo, swing, masterVolume, lowPassFreq, highPassFreq,
        reverbMix, reverbDecay, reverbType, reverbTone, reverbSource,
        delayMix, delayTime, delayFeedback, delaySource,
        kickSidechainAmount, kickSidechainThreshold, kickSidechainRatio,
        crushAmount, tapeSaturationMix, tapeSaturationAmount, tapeSaturationTone,
        envelopeFilterMix, envelopeFilterAmount, envelopeFilterBaseFreq, envelopeFilterQ,
        effectsEnabled, instrumentVisibility, isolatorGains, lofiMix, activePattern, chainMode,
        isRandomizeActive, randomizeIntensity, isStutterActive, isStutterHeld, stutterDivision,
        isStutterSwingLocked, isBeatRepeatActive, isBeatRepeatHeld, beatRepeatDivision, beatRepeatAnchorStep, stutterSource,
        exportMeasures, exportIncludeTail
    ]);

    // Invalidate prepared dragBlobUrl whenever any beat, effect, instrument, or Live DJ parameter changes
    // so dragging always reflects the latest sound and settings.
    useEffect(() => {
        setDragBlobUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
    }, [
        grids, volumes, tempo, swing, masterVolume, lowPassFreq, highPassFreq,
        reverbMix, reverbDecay, reverbType, reverbTone, reverbSource,
        delayMix, delayTime, delayFeedback, delaySource,
        kickSidechainAmount, kickSidechainThreshold, kickSidechainRatio,
        crushAmount, tapeSaturationMix, tapeSaturationAmount, tapeSaturationTone,
        envelopeFilterMix, envelopeFilterAmount, envelopeFilterBaseFreq, envelopeFilterQ,
        effectsEnabled, instrumentVisibility, isolatorGains, lofiMix, activePattern, chainMode,
        isRandomizeActive, randomizeIntensity, isXyFilterHeld, isStutterActive, isStutterHeld, stutterDivision,
        isBeatRepeatActive, isBeatRepeatHeld, beatRepeatDivision, beatRepeatAnchorStep, stutterSource,
        instrumentParams, kickDesignerParams, drumKit, fullAudioData, trimRange, exportMeasures, exportIncludeTail
    ]);

    const handlePlayToggle = useCallback(() => {
        const newIsPlaying = !isPlaying;
        
        if (newIsPlaying && audioContext) {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            nextNoteTime.current = audioContext.currentTime;
            currentStepRef.current = 0;
            notesInQueueRef.current = [];
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
                grids: { a: createInitialGrid(16), b: createInitialGrid(16) },
                volumes: DEFAULT_VOLUMES,
                tempo: DEFAULT_TEMPO,
                instrumentParams: JSON.parse(JSON.stringify(DEFAULT_INSTRUMENT_PARAMS)),
                swing: 0,
                beatsPerMeasure: 4,
            };
            
            setSavedPatterns(prev => {
                const newPatterns = [...prev];
                newPatterns[newIndex] = defaultPattern;
                return newPatterns;
            });

            patternToLoad = defaultPattern;
        }

        setBeatsPerMeasure(patternToLoad.beatsPerMeasure || 4);
        setGrids(patternToLoad.grids);
        setVolumes(patternToLoad.volumes);
        tempoRef.current = patternToLoad.tempo;
        setTempo(patternToLoad.tempo);
        setInstrumentParams(patternToLoad.instrumentParams);
        setSwing(patternToLoad.swing ?? 0);
        if (isInitialized && rerenderAllInstruments) {
            rerenderAllInstruments(kickDesignerParamsRef.current, drumKitRef.current, patternToLoad.instrumentParams);
            if (updateInstrumentParameter && patternToLoad.instrumentParams.sample) {
                updateInstrumentParameter('sample', 'highPass', patternToLoad.instrumentParams.sample.highPass ?? MIN_FILTER_FREQ, drumKitRef.current);
                updateInstrumentParameter('sample', 'lowPass', patternToLoad.instrumentParams.sample.lowPass ?? MAX_FILTER_FREQ, drumKitRef.current);
            }
        }
        
        setActivePattern('a');
        setCurrentPatternIndex(newIndex);
    }, [currentPatternIndex, savedPatterns, isInitialized, rerenderAllInstruments, updateInstrumentParameter]);

    const handleClearPattern = useCallback(() => {
        const numSteps = beatsPerMeasure * 4;
        setGrids({ a: createInitialGrid(numSteps), b: createInitialGrid(numSteps) });
    }, [beatsPerMeasure]);

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
    const handleFilterInteractionEnd = useCallback(() => {
        if (!isXyFilterHeld) {
            toggleXyFilter(false);
        }
    }, [toggleXyFilter, isXyFilterHeld]);
    const handleFilterChange = useCallback((freq: number, drive: number) => setXyFilterParams(freq, drive), [setXyFilterParams]);
    const handleToggleXyFilterHold = useCallback((held: boolean, freq: number, drive: number) => {
        setIsXyFilterHeld(held);
        if (held) {
            toggleXyFilter(true);
            setXyFilterParams(freq, drive);
        } else {
            toggleXyFilter(false);
        }
    }, [toggleXyFilter, setXyFilterParams]);

    const getStutterSourceVolume = useCallback((source: Instrument | 'all') => {
        if (source === 'all') return 0.7;
        const idx = INSTRUMENTS.indexOf(source);
        return idx !== -1 ? volumesRef.current[idx] : 0.7;
    }, []);

    const getEffectiveStutterSwing = useCallback((div: StutterDivision, locked: boolean, swingAmount: number): number => {
        if (!locked) return 0;
        // Keep triplets in strict time (straight timing, no swing applied)
        if (div === '1/8T' || div === '1/16T') return 0;
        return swingAmount;
    }, []);

    const handleTempoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const nextTempo = Number(e.target.value);
        tempoRef.current = nextTempo;
        setTempo(nextTempo);
    }, []);
    const handleDirectTempoChange = useCallback((nextTempo: number) => {
        tempoRef.current = nextTempo;
        setTempo(nextTempo);
    }, []);
    const handleSwingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const nextSwing = Number(e.target.value);
        swingRef.current = nextSwing;
        setSwing(nextSwing);
        if (isStutterActive || isStutterHeld) {
            const effSwing = (!isStutterSwingLockedRef.current || stutterDivision === '1/8T' || stutterDivision === '1/16T') ? 0 : nextSwing;
            updateStutterParams(stutterDivision, tempoRef.current, stutterSource, getStutterSourceVolume(stutterSource), effSwing);
        }
    }, [isStutterActive, isStutterHeld, stutterDivision, stutterSource, getStutterSourceVolume, updateStutterParams]);

    const handleDirectSwingChange = useCallback((nextSwing: number) => {
        swingRef.current = nextSwing;
        setSwing(nextSwing);
        if (isStutterActive || isStutterHeld) {
            const effSwing = (!isStutterSwingLockedRef.current || stutterDivision === '1/8T' || stutterDivision === '1/16T') ? 0 : nextSwing;
            updateStutterParams(stutterDivision, tempoRef.current, stutterSource, getStutterSourceVolume(stutterSource), effSwing);
        }
    }, [isStutterActive, isStutterHeld, stutterDivision, stutterSource, getStutterSourceVolume, updateStutterParams]);
    const handleMasterVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setMasterVolume(Number(e.target.value)), []);
    
    const handleRandomizePressStart = useCallback(() => {
        setIsRandomizeActive(true);
        if (scrambleIntervalRef.current) clearInterval(scrambleIntervalRef.current);
        if (visualizerStyle === 'minimal' || isSlowComputerMode) {
            setRandomizeButtonText('ACTIVE');
            return;
        }
        scrambleIntervalRef.current = window.setInterval(() => {
            setRandomizeButtonText(scramble('RANDOMIZE'));
        }, 60);
    }, [visualizerStyle, isSlowComputerMode]);

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
    const handleResetColorKnob = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        setIsColorAnimating(false);
        setHueRotate(0);
    }, []);
    const handleIsolatorGainChange = useCallback((band: 'low' | 'mid' | 'high', value: number) => {
        setIsolatorGains(prev => ({ ...prev, [band]: value }));
    }, []);

    const handleTapeStopStart = useCallback(() => {
        if (tapeStopReleaseTimerRef.current) {
            clearTimeout(tapeStopReleaseTimerRef.current);
            tapeStopReleaseTimerRef.current = null;
        }
        tapeStopStartTimeRef.current = performance.now();
        setIsTapeStopActive(true);
        setTapeStop(true, tapeStopDuration, tempoRef.current);
    }, [setTapeStop, tapeStopDuration]);

    const handleTapeStopEnd = useCallback(() => {
        setTapeStop(false, tapeStopDuration, tempoRef.current);
        const elapsedMs = performance.now() - tapeStopStartTimeRef.current;
        const fullBrakeMs = tapeStopDuration * 1000;
        if (elapsedMs < fullBrakeMs) {
            if (tapeStopReleaseTimerRef.current) {
                clearTimeout(tapeStopReleaseTimerRef.current);
            }
            tapeStopReleaseTimerRef.current = window.setTimeout(() => {
                setIsTapeStopActive(false);
                tapeStopReleaseTimerRef.current = null;
            }, Math.max(0, fullBrakeMs - elapsedMs));
        } else {
            setIsTapeStopActive(false);
        }
    }, [setTapeStop, tapeStopDuration]);

    const handleTapeStopDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const nextDur = Number(e.target.value);
        setTapeStopDuration(nextDur);
        updateTapeStopDuration(nextDur, tempoRef.current);
    }, [updateTapeStopDuration]);

    const handleToggleStutterSwing = useCallback(() => {
        setIsStutterSwingLocked(prev => {
            const next = !prev;
            isStutterSwingLockedRef.current = next;
            safeSetItem('cl607-stutterSwingLocked', JSON.stringify(next));
            const effSwing = getEffectiveStutterSwing(stutterDivision, next, swingRef.current);
            updateStutterParams(stutterDivision, tempoRef.current, stutterSource, getStutterSourceVolume(stutterSource), effSwing);
            return next;
        });
    }, [stutterDivision, stutterSource, getStutterSourceVolume, updateStutterParams, getEffectiveStutterSwing]);

    const handleStutterPressStart = useCallback(() => {
        setIsStutterActive(true);
        const effSwing = getEffectiveStutterSwing(stutterDivision, isStutterSwingLockedRef.current, swingRef.current);
        setStutterState(true, isStutterHeld, stutterDivision, tempoRef.current, stutterSource, getStutterSourceVolume(stutterSource), effSwing);
    }, [isStutterHeld, setStutterState, stutterDivision, stutterSource, getStutterSourceVolume, getEffectiveStutterSwing]);

    const handleStutterPressEnd = useCallback(() => {
        const effSwing = getEffectiveStutterSwing(stutterDivision, isStutterSwingLockedRef.current, swingRef.current);
        if (isStutterHeld) {
            setIsStutterActive(true);
            setStutterState(true, true, stutterDivision, tempoRef.current, stutterSource, getStutterSourceVolume(stutterSource), effSwing);
            return;
        }
        setIsStutterActive(false);
        setStutterState(false, false, stutterDivision, tempoRef.current, stutterSource, getStutterSourceVolume(stutterSource), effSwing);
    }, [isStutterHeld, setStutterState, stutterDivision, stutterSource, getStutterSourceVolume, getEffectiveStutterSwing]);

    useEffect(() => {
        if (!isStutterActive || isStutterHeld) return;
        const onGlobalRelease = () => {
            handleStutterPressEnd();
        };
        window.addEventListener('mouseup', onGlobalRelease);
        window.addEventListener('touchend', onGlobalRelease);
        window.addEventListener('touchcancel', onGlobalRelease);
        return () => {
            window.removeEventListener('mouseup', onGlobalRelease);
            window.removeEventListener('touchend', onGlobalRelease);
            window.removeEventListener('touchcancel', onGlobalRelease);
        };
    }, [isStutterActive, isStutterHeld, handleStutterPressEnd]);

    const handleToggleStutterHold = useCallback(() => {
        const nextHeld = !isStutterHeld;
        setIsStutterHeld(nextHeld);
        setIsStutterActive(nextHeld);
        const effSwing = getEffectiveStutterSwing(stutterDivision, isStutterSwingLockedRef.current, swingRef.current);
        setStutterState(nextHeld, nextHeld, stutterDivision, tempoRef.current, stutterSource, getStutterSourceVolume(stutterSource), effSwing);
    }, [isStutterHeld, setStutterState, stutterDivision, stutterSource, getStutterSourceVolume, getEffectiveStutterSwing]);

    const handleStutterDivisionChange = useCallback((div: StutterDivision) => {
        setStutterDivision(div);
        const effSwing = getEffectiveStutterSwing(div, isStutterSwingLockedRef.current, swingRef.current);
        updateStutterParams(div, tempoRef.current, stutterSource, getStutterSourceVolume(stutterSource), effSwing);
    }, [updateStutterParams, stutterSource, getStutterSourceVolume, getEffectiveStutterSwing]);

    const handleStutterSourceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextSource = e.target.value as Instrument | 'all';
        setStutterSource(nextSource);
        const effSwing = getEffectiveStutterSwing(stutterDivision, isStutterSwingLockedRef.current, swingRef.current);
        updateStutterParams(stutterDivision, tempoRef.current, nextSource, getStutterSourceVolume(nextSource), effSwing);
    }, [stutterDivision, updateStutterParams, getStutterSourceVolume, getEffectiveStutterSwing]);

    const computeBeatRepeatAnchor = useCallback((div: BeatRepeatDivision) => {
        const numSteps = beatsPerMeasureRef.current * 4;
        const repeatSteps = getBeatRepeatSteps(div, numSteps);
        const rawStep = currentStep ?? ((currentStepRef.current - 1 + numSteps) % numSteps);
        let anchor = Math.floor(rawStep / repeatSteps) * repeatSteps;

        // If repeating a short slice (1 or 2 steps) and that slice in the active grid has no notes,
        // snap to the most recent active step so Beat Repeater always loops an audible hit.
        if (repeatSteps <= 2) {
            const grid = gridsRef.current[activePatternRef.current];
            const visibility = instrumentVisibilityRef.current;
            const hasActiveHitInSlice = (startStep: number) => {
                for (let offset = 0; offset < repeatSteps; offset++) {
                    const s = (startStep + offset) % numSteps;
                    for (let i = 0; i < INSTRUMENTS.length; i++) {
                        if (visibility[i] && grid[i]?.[s]) return true;
                    }
                }
                return false;
            };
            if (!hasActiveHitInSlice(anchor)) {
                for (let back = 1; back < numSteps; back++) {
                    const candidate = Math.floor(((rawStep - back + numSteps) % numSteps) / repeatSteps) * repeatSteps;
                    if (hasActiveHitInSlice(candidate)) {
                        anchor = candidate;
                        break;
                    }
                }
            }
        }
        return anchor;
    }, [currentStep]);

    const handleBeatRepeatPressStart = useCallback(() => {
        if (!isBeatRepeatHeld) {
            const anchor = computeBeatRepeatAnchor(beatRepeatDivisionRef.current);
            beatRepeatAnchorStepRef.current = anchor;
            setBeatRepeatAnchorStep(anchor);
        }
        isBeatRepeatActiveRef.current = true;
        setIsBeatRepeatActive(true);
    }, [isBeatRepeatHeld, computeBeatRepeatAnchor]);

    const handleBeatRepeatPressEnd = useCallback(() => {
        if (isBeatRepeatHeld) {
            isBeatRepeatActiveRef.current = true;
            setIsBeatRepeatActive(true);
            return;
        }
        isBeatRepeatActiveRef.current = false;
        setIsBeatRepeatActive(false);
    }, [isBeatRepeatHeld]);

    const handleToggleBeatRepeatHold = useCallback(() => {
        const nextHeld = !isBeatRepeatHeld;
        if (nextHeld && !isBeatRepeatActiveRef.current) {
            const anchor = computeBeatRepeatAnchor(beatRepeatDivisionRef.current);
            beatRepeatAnchorStepRef.current = anchor;
            setBeatRepeatAnchorStep(anchor);
        }
        isBeatRepeatActiveRef.current = nextHeld;
        setIsBeatRepeatHeld(nextHeld);
        setIsBeatRepeatActive(nextHeld);
    }, [isBeatRepeatHeld, computeBeatRepeatAnchor]);

    const handleBeatRepeatDivisionChange = useCallback((div: BeatRepeatDivision) => {
        beatRepeatDivisionRef.current = div;
        setBeatRepeatDivision(div);
        if (isBeatRepeatActiveRef.current) {
            const anchor = computeBeatRepeatAnchor(div);
            beatRepeatAnchorStepRef.current = anchor;
            setBeatRepeatAnchorStep(anchor);
        }
    }, [computeBeatRepeatAnchor]);

    const handleSelectDjShortcutEffect = useCallback((slotIndex: 0 | 1, effect: EffectName) => {
        setDjShortcutEffects(prev => {
            const next: [EffectName, EffectName] = [...prev] as [EffectName, EffectName];
            next[slotIndex] = effect;
            return next;
        });
        setOpenDjShortcutDropdown(null);
    }, []);

    const handleToggleDjShortcutEffect = useCallback((effect: EffectName) => {
        setEffectsEnabled(prev => {
            const nextEnabled = !prev[effect];
            if (nextEnabled) {
                // If turning ON an effect whose mix is currently 0, give it an audible default mix
                switch (effect) {
                    case 'delay':
                        if (delayMix === 0) setDelayMix(0.35);
                        break;
                    case 'reverb':
                        if (reverbMix === 0) setReverbMix(0.35);
                        break;
                    case 'tape':
                        if (tapeSaturationMix === 0) setTapeSaturationMix(0.35);
                        break;
                    case 'envelope':
                        if (envelopeFilterMix === 0) setEnvelopeFilterMix(0.35);
                        break;
                    case 'crush':
                        if (crushAmount === 0) setCrushAmount(0.35);
                        break;
                    case 'sidechain':
                        if (kickSidechainAmount === 0) setKickSidechainAmount(0.4);
                        break;
                }
            }
            return { ...prev, [effect]: nextEnabled };
        });
    }, [delayMix, reverbMix, tapeSaturationMix, envelopeFilterMix, crushAmount, kickSidechainAmount]);

    const handleDjShortcutValueChange = useCallback((effect: EffectName, rawValue: number) => {
        setEffectsEnabled(prev => (prev[effect] ? prev : { ...prev, [effect]: true }));
        switch (effect) {
            case 'delay':
                setDelayMix(rawValue);
                break;
            case 'reverb':
                setReverbMix(rawValue);
                break;
            case 'tape':
                setTapeSaturationMix(rawValue);
                break;
            case 'envelope':
                setEnvelopeFilterMix(rawValue);
                break;
            case 'crush':
                setCrushAmount(rawValue);
                break;
            case 'sidechain':
                setKickSidechainAmount(rawValue);
                break;
            case 'lowPass':
                setLowPassFreq(sliderToFreq(rawValue));
                break;
            case 'highPass':
                setHighPassFreq(sliderToFreq(rawValue));
                break;
        }
    }, []);

    useEffect(() => {
        if (openDjShortcutDropdown === null) return;
        const handleOutsideClick = (e: MouseEvent) => {
            if (djShortcutsRef.current && !djShortcutsRef.current.contains(e.target as Node)) {
                setOpenDjShortcutDropdown(null);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpenDjShortcutDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [openDjShortcutDropdown]);

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

    const handleTogglePerformanceMode = useCallback(() => setIsPerformanceMode(prev => !prev), []);

    const handleVisualizerStyleChange = useCallback((style: VisualizerStyle) => {
        if (style === 'minimal') {
            if (visualizerStyle !== 'minimal') {
                preSlowSettingsRef.current = {
                    visualizerStyle,
                    isPerformanceMode,
                    tooltipsEnabled,
                };
            }
            setIsSlowComputerMode(true);
            setVisualizerStyle('minimal');
            setIsPerformanceMode(true);
            setTooltipsEnabled(false);
            setIsColorAnimating(false);
            setHueRotate(0);
        } else {
            setIsSlowComputerMode(false);
            setVisualizerStyle(style);
        }
    }, [visualizerStyle, isPerformanceMode, tooltipsEnabled]);

    const handleToggleSlowComputerMode = useCallback(() => {
        if (!isSlowComputerMode) {
            preSlowSettingsRef.current = {
                visualizerStyle: visualizerStyle === 'minimal' ? 'default' : visualizerStyle,
                isPerformanceMode,
                tooltipsEnabled,
            };
            setIsSlowComputerMode(true);
            setVisualizerStyle('minimal');
            setIsPerformanceMode(true);
            setTooltipsEnabled(false);
            setIsColorAnimating(false);
            setHueRotate(0);
        } else {
            setIsSlowComputerMode(false);
            const restoredStyle = preSlowSettingsRef.current.visualizerStyle === 'minimal'
                ? 'default'
                : preSlowSettingsRef.current.visualizerStyle;
            setVisualizerStyle(restoredStyle);
            setIsPerformanceMode(preSlowSettingsRef.current.isPerformanceMode);
            setTooltipsEnabled(preSlowSettingsRef.current.tooltipsEnabled);
        }
    }, [isSlowComputerMode, visualizerStyle, isPerformanceMode, tooltipsEnabled]);

    const handleToggleKeyboardDrumming = useCallback(() => setKeyboardDrummingEnabled(prev => !prev), []);
    const handleUpdateKeyboardMap = useCallback((key: string, instrument: Instrument) => {
        setKeyboardMap(prev => ({ ...prev, [key]: instrument }));
    }, []);
    const handleClearDragUrl = useCallback(() => {
        setDragBlobUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
    }, []);
    
    // --- Start: Reset button logic ---
    const handleResetDjSettings = useCallback(() => {
        setRandomizeIntensity(DEFAULT_DJ_SETTINGS.randomizeIntensity);
        setChainMode(DEFAULT_DJ_SETTINGS.chainMode);
        setIsolatorGains({ ...DEFAULT_DJ_SETTINGS.isolatorGains });
        setLofiMix(DEFAULT_DJ_SETTINGS.lofiMix);
        setIsRandomizeActive(false);
        if (scrambleIntervalRef.current) {
            clearInterval(scrambleIntervalRef.current);
            scrambleIntervalRef.current = null;
        }
        setRandomizeButtonText('RANDOMIZE');
        setIsXyFilterHeld(false);
        toggleXyFilter(false);
        if (tapeStopReleaseTimerRef.current) {
            clearTimeout(tapeStopReleaseTimerRef.current);
            tapeStopReleaseTimerRef.current = null;
        }
        setIsTapeStopActive(false);
        setTapeStopDuration(DEFAULT_DJ_SETTINGS.tapeStopDuration);
        setTapeStop(false, DEFAULT_DJ_SETTINGS.tapeStopDuration, tempoRef.current);
        setIsStutterHeld(false);
        setIsStutterActive(false);
        setIsStutterSwingLocked(DEFAULT_DJ_SETTINGS.stutterSwingLocked);
        isStutterSwingLockedRef.current = DEFAULT_DJ_SETTINGS.stutterSwingLocked;
        safeSetItem('cl607-stutterSwingLocked', JSON.stringify(DEFAULT_DJ_SETTINGS.stutterSwingLocked));
        setStutterDivision(DEFAULT_DJ_SETTINGS.stutterDivision);
        setStutterSource(DEFAULT_DJ_SETTINGS.stutterSource);
        setStutterState(false, false, DEFAULT_DJ_SETTINGS.stutterDivision, tempoRef.current, DEFAULT_DJ_SETTINGS.stutterSource, 0.7, DEFAULT_DJ_SETTINGS.stutterSwingLocked ? swingRef.current : 0);
        isBeatRepeatActiveRef.current = false;
        beatRepeatDivisionRef.current = DEFAULT_DJ_SETTINGS.beatRepeatDivision;
        beatRepeatAnchorStepRef.current = 0;
        setIsBeatRepeatHeld(false);
        setIsBeatRepeatActive(false);
        setBeatRepeatDivision(DEFAULT_DJ_SETTINGS.beatRepeatDivision);
        setBeatRepeatAnchorStep(0);
    }, [toggleXyFilter, setTapeStop, setStutterState]);

    const handleResetEffectsSettings = useCallback(() => {
        setLowPassFreq(DEFAULT_EFFECTS_SETTINGS.lowPassFreq);
        setHighPassFreq(DEFAULT_EFFECTS_SETTINGS.highPassFreq);
        setReverbMix(DEFAULT_EFFECTS_SETTINGS.reverbMix);
        setReverbDecay(DEFAULT_EFFECTS_SETTINGS.reverbDecay);
        setReverbType(DEFAULT_EFFECTS_SETTINGS.reverbType);
        setReverbTone(DEFAULT_EFFECTS_SETTINGS.reverbTone);
        setReverbSource(DEFAULT_EFFECTS_SETTINGS.reverbSource);
        setDelayMix(DEFAULT_EFFECTS_SETTINGS.delayMix);
        setDelayTime(
            DEFAULT_EFFECTS_SETTINGS.delaySyncDivision
                ? getDelayDivisionTimeSeconds(DEFAULT_EFFECTS_SETTINGS.delaySyncDivision, tempoRef.current)
                : DEFAULT_EFFECTS_SETTINGS.delayTime
        );
        setDelayFeedback(DEFAULT_EFFECTS_SETTINGS.delayFeedback);
        setDelaySource(DEFAULT_EFFECTS_SETTINGS.delaySource);
        setDelaySyncDivision(DEFAULT_EFFECTS_SETTINGS.delaySyncDivision);
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

    const handleFactoryReset = useCallback(() => {
        // Stop playback if it's running
        if (isPlaying) {
            setIsPlaying(false);
        }
        setCurrentStep(null);

        // 1. Clear storage
        for (let i = 0; i < 4; i++) {
            safeRemoveItem(`cl607-pattern-${i}`);
        }
        safeRemoveItem('cl607-tooltipsEnabled');
        safeRemoveItem('cl607-tooltipsEnabled-v2');
        safeRemoveItem('cl607-showBeatNumbers');
        safeRemoveItem('cl607-padLabelMode');
        safeRemoveItem('cl607-notationTextMode');
        safeRemoveItem('cl607-stutterSwingLocked');
        safeRemoveItem('cl607-invertColors');
        safeRemoveItem('cl607-customTitle');
        safeRemoveItem('cl607-visualizerStyle');
        safeRemoveItem('cl607-slowComputerMode');
        safeRemoveItem('cl607-keyboardDrummingEnabled');
        safeRemoveItem('cl607-sixSevenSpeed');
        safeRemoveItem('cl607-sessionState');
    
        // 2. Reset all state to defaults
        const freshInstParams: AllInstrumentParams = JSON.parse(JSON.stringify(DEFAULT_INSTRUMENT_PARAMS));
        const freshKickParams: KickDesignerParams = JSON.parse(JSON.stringify(DEFAULT_KICK_DESIGNER_PARAMS));
        const freshVolumes = [...DEFAULT_VOLUMES];

        // Core sequencer & kit state
        setBeatsPerMeasure(4);
        setGrids({ a: createInitialGrid(16), b: createInitialGrid(16) });
        setVolumes(freshVolumes);
        tempoRef.current = DEFAULT_TEMPO;
        setTempo(DEFAULT_TEMPO);
        swingRef.current = 0;
        setSwing(0);
        setActivePattern('a');
        setMasterVolume(0.5);
        setDrumKit('808');
        drumKitRef.current = '808';
        prevDrumKitRef.current = '808';
        setInstrumentParams(freshInstParams);
        instrumentParamsRef.current = freshInstParams;
        setKickDesignerParams(freshKickParams);
        kickDesignerParamsRef.current = freshKickParams;
        prevKickDesignerParamsRef.current = freshKickParams;

        // Immediately re-render audio engine instrument buffers to default 808 kit & params
        if (isInitialized && rerenderAllInstruments) {
            rerenderAllInstruments(freshKickParams, '808', freshInstParams);
            if (updateInstrumentParameter) {
                updateInstrumentParameter('sample', 'highPass', MIN_FILTER_FREQ, '808');
                updateInstrumentParameter('sample', 'lowPass', MAX_FILTER_FREQ, '808');
            }
        }
        if (isAudioEngineReady) {
            setSampleAudioData(new Float32Array(0));
        }

        // Effects state
        handleResetEffectsSettings();
        setKickSidechainThreshold(DEFAULT_EFFECTS_SETTINGS.kickSidechainThreshold);
        setKickSidechainRatio(DEFAULT_EFFECTS_SETTINGS.kickSidechainRatio);
        
        // DJ state
        handleResetDjSettings();
        setDjShortcutEffects(['delay', 'reverb']);
        setOpenDjShortcutDropdown(null);
        
        // Settings & UI state
        setVisualizerType('waveform');
        setVisualizerStyle('default');
        setIsSlowComputerMode(false);
        setIsPerformanceMode(true);
        setTooltipsEnabled(false);
        setPadLabelMode('off');
        setNotationTextMode('syllables');
        setIsInvertColors(false);
        setKeyboardDrummingEnabled(true);
        setKeyboardMap({
            'a': 'kick',
            's': 'snare',
            'd': 'hihat',
            'f': 'snap',
            'g': 'clave',
            'h': 'cowbell',
            'j': 'sample'
        });
        setInstrumentVisibility(Array(INSTRUMENTS.length).fill(true));
        setEffectsEnabled({
            lowPass: true, highPass: true, sidechain: true, crush: true, tape: true, envelope: true, reverb: true, delay: true
        });
        setSectionOrder(['dj', 'effects', 'instruments', 'recorder', 'notation', 'settings']);
        setHueRotate(0);
        setIsColorAnimating(false);
        setSixSevenSpeed(1);
        sixSevenSpeedRef.current = 1;
        setIsCappuccinoMode(false);
        setCustomTitle('CL-607 Drum Machine');
        setIsEditingTitle(false);
        setFullAudioData(new Float32Array(0));
        setOriginalAudioData(new Float32Array(0));
        setTrimRange({ start: 0, end: 1 });
        setExportMeasures(1);
        setExportIncludeTail(false);
    
        // Pattern management state
        const defaultPattern: SavedPattern = {
            grids: { a: createInitialGrid(16), b: createInitialGrid(16) },
            volumes: [...DEFAULT_VOLUMES],
            tempo: DEFAULT_TEMPO,
            instrumentParams: JSON.parse(JSON.stringify(DEFAULT_INSTRUMENT_PARAMS)),
            swing: 0,
            beatsPerMeasure: 4,
        };
        const newSavedPatterns = Array(4).fill(null);
        newSavedPatterns[0] = defaultPattern;
        setSavedPatterns(newSavedPatterns);
        setCurrentPatternIndex(0);
        try {
            safeSetItem('cl607-pattern-0', JSON.stringify(defaultPattern));
        } catch {}
    }, [
        isPlaying, isInitialized, isAudioEngineReady, rerenderAllInstruments,
        updateInstrumentParameter, setSampleAudioData, handleResetEffectsSettings, handleResetDjSettings
    ]);

    const handleResetInstrumentSettings = useCallback(() => {
        const freshInstParams = JSON.parse(JSON.stringify(DEFAULT_INSTRUMENT_PARAMS));
        const freshKickParams = JSON.parse(JSON.stringify(DEFAULT_KICK_DESIGNER_PARAMS));
        const freshVolumes = [...DEFAULT_VOLUMES];
        setInstrumentParams(freshInstParams);
        instrumentParamsRef.current = freshInstParams;
        setKickDesignerParams(freshKickParams);
        kickDesignerParamsRef.current = freshKickParams;
        prevKickDesignerParamsRef.current = freshKickParams;
        setVolumes(freshVolumes);
        setInstrumentVisibility(Array(INSTRUMENTS.length).fill(true));
        if (isInitialized && rerenderAllInstruments) {
            rerenderAllInstruments(freshKickParams, drumKitRef.current, freshInstParams);
        }
    }, [isInitialized, rerenderAllInstruments]);

    const handleResetSampleRecorder = useCallback(() => {
        setFullAudioData(new Float32Array(0));
        setOriginalAudioData(new Float32Array(0));
        setTrimRange({ start: 0, end: 1 });
        if (isAudioEngineReady) {
            setSampleAudioData(new Float32Array(0));
        }
        if (updateInstrumentParameter) {
            updateInstrumentParameter('sample', 'highPass', MIN_FILTER_FREQ, drumKitRef.current);
            updateInstrumentParameter('sample', 'lowPass', MAX_FILTER_FREQ, drumKitRef.current);
        }
        setInstrumentParams(prev => ({
            ...prev,
            sample: { ...DEFAULT_INSTRUMENT_PARAMS.sample }
        }));
    }, [isAudioEngineReady, setSampleAudioData, updateInstrumentParameter]);

    const handleSliderInteractionStart = useCallback(() => {
        setIsInteractingWithSlider(true);
        const handleInteractionEnd = () => {
            setIsInteractingWithSlider(false);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchend', handleInteractionEnd);
        };
        window.addEventListener('mouseup', handleInteractionEnd);
        window.addEventListener('touchend', handleInteractionEnd);
    }, []);
    
    const handlePointerDown = useCallback((e: React.PointerEvent, index: number) => {
        if (e.button !== 0) return; // Only handle left clicks
        e.currentTarget.setPointerCapture(e.pointerId);

        draggedItemIndexRef.current = index;
        
        const onPointerUp = () => {
            clearTimeout(longPressTimeoutRef.current);
            window.removeEventListener('pointerup', onPointerUp);
        };
        window.addEventListener('pointerup', onPointerUp);

        longPressTimeoutRef.current = window.setTimeout(() => {
            window.removeEventListener('pointerup', onPointerUp);
            setDraggedIndex(index);
        }, 400); // Increased long-press duration to 400ms
    }, []);

    useEffect(() => {
        const handlePointerUp = () => {
            clearTimeout(longPressTimeoutRef.current);
            if (draggedIndex !== null) {
                setDraggedIndex(null);
            }
            draggedItemIndexRef.current = null;
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (draggedIndex === null || sectionsContainerRef.current === null) {
                return;
            }

            const currentDraggedIndex = draggedItemIndexRef.current;
            if (currentDraggedIndex === null) return;
            
            const children = Array.from(sectionsContainerRef.current.children);
            const { clientY } = e;

            let closestIndex = -1;
            let minDistance = Infinity;

            children.forEach((child, index) => {
                // FIX: Add type guard to ensure child is an HTMLElement before accessing getBoundingClientRect.
                if (child instanceof HTMLElement) {
                    const rect = child.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    const distance = Math.abs(clientY - midY);

                    if (distance < minDistance) {
                        minDistance = distance;
                        closestIndex = index;
                    }
                }
            });

            if (closestIndex !== -1 && closestIndex !== currentDraggedIndex) {
                setSectionOrder(currentOrder => {
                    const newOrder = [...currentOrder];
                    const [movedItem] = newOrder.splice(currentDraggedIndex, 1);
                    newOrder.splice(closestIndex, 0, movedItem);
                    draggedItemIndexRef.current = closestIndex;
                    setDraggedIndex(closestIndex); // Update state to reflect new index
                    return newOrder;
                });
            }
        };
        
        if (draggedIndex !== null) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }

        return () => {
            clearTimeout(longPressTimeoutRef.current);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draggedIndex]);


    const sliderInteractionProps = useMemo(() => ({
        onMouseDown: handleSliderInteractionStart,
        onTouchStart: handleSliderInteractionStart,
    }), [handleSliderInteractionStart]);

    useEffect(() => { setLowPassFrequency(effectsEnabled.lowPass ? lowPassFreq : MAX_FILTER_FREQ) }, [lowPassFreq, effectsEnabled.lowPass, setLowPassFrequency, isInitialized]);
    useEffect(() => { setHighPassFrequency(effectsEnabled.highPass ? highPassFreq : MIN_FILTER_FREQ) }, [highPassFreq, effectsEnabled.highPass, setHighPassFrequency, isInitialized]);
    useEffect(() => { setAudioEngineReverbMix(effectsEnabled.reverb ? reverbMix : 0) }, [reverbMix, effectsEnabled.reverb, setAudioEngineReverbMix, isInitialized]);
    useEffect(() => { setAudioEngineReverbDecay(reverbDecay) }, [reverbDecay, setAudioEngineReverbDecay, isInitialized]);
    useEffect(() => { if (setAudioEngineReverbType) setAudioEngineReverbType(reverbType) }, [reverbType, setAudioEngineReverbType, isInitialized]);
    useEffect(() => { if (setAudioEngineReverbTone) setAudioEngineReverbTone(reverbTone) }, [reverbTone, setAudioEngineReverbTone, isInitialized]);
    useEffect(() => { if (setAudioEngineReverbSource) setAudioEngineReverbSource(reverbSource) }, [reverbSource, setAudioEngineReverbSource, isInitialized]);
    useEffect(() => { setAudioEngineDelayMix(effectsEnabled.delay ? delayMix : 0) }, [delayMix, effectsEnabled.delay, setAudioEngineDelayMix, isInitialized]);
    useEffect(() => { setAudioEngineDelayTime(delayTime) }, [delayTime, setAudioEngineDelayTime, isInitialized]);
    useEffect(() => { setAudioEngineDelayFeedback(delayFeedback) }, [delayFeedback, setAudioEngineDelayFeedback, isInitialized]);
    useEffect(() => { if (setAudioEngineDelaySource) setAudioEngineDelaySource(delaySource) }, [delaySource, setAudioEngineDelaySource, isInitialized]);
    useEffect(() => { setAudioEngineKickSidechainAmount(effectsEnabled.sidechain ? kickSidechainAmount : 0) }, [kickSidechainAmount, effectsEnabled.sidechain, setAudioEngineKickSidechainAmount, isInitialized]);
    useEffect(() => { if (setAudioEngineKickSidechainThreshold) setAudioEngineKickSidechainThreshold(kickSidechainThreshold) }, [kickSidechainThreshold, setAudioEngineKickSidechainThreshold, isInitialized]);
    useEffect(() => { if (setAudioEngineKickSidechainRatio) setAudioEngineKickSidechainRatio(kickSidechainRatio) }, [kickSidechainRatio, setAudioEngineKickSidechainRatio, isInitialized]);
    useEffect(() => { setAudioEngineMasterVolume(masterVolume) }, [masterVolume, setAudioEngineMasterVolume, isInitialized]);
    useEffect(() => { setAudioEngineCrushAmount(effectsEnabled.crush ? crushAmount : 0) }, [crushAmount, effectsEnabled.crush, setAudioEngineCrushAmount, isInitialized]);
    useEffect(() => { if (isInitialized) setAudioEngineTapeSaturationMix(effectsEnabled.tape ? tapeSaturationMix : 0) }, [tapeSaturationMix, effectsEnabled.tape, setAudioEngineTapeSaturationMix, isInitialized]);
    useEffect(() => { if (isInitialized) setAudioEngineTapeSaturationAmount(tapeSaturationAmount) }, [tapeSaturationAmount, setAudioEngineTapeSaturationAmount, isInitialized]);
    useEffect(() => { if (isInitialized) setAudioEngineTapeSaturationTone(tapeSaturationTone) }, [tapeSaturationTone, setAudioEngineTapeSaturationTone, isInitialized]);
    useEffect(() => { setAudioEngineEnvelopeFilterMix(effectsEnabled.envelope ? envelopeFilterMix : 0) }, [envelopeFilterMix, effectsEnabled.envelope, setAudioEngineEnvelopeFilterMix, isInitialized]);
    useEffect(() => { setAudioEngineEnvelopeFilterAmount(envelopeFilterAmount) }, [envelopeFilterAmount, setAudioEngineEnvelopeFilterAmount, isInitialized]);
    useEffect(() => { setAudioEngineEnvelopeFilterBaseFreq(envelopeFilterBaseFreq) }, [envelopeFilterBaseFreq, setAudioEngineEnvelopeFilterBaseFreq, isInitialized]);
    useEffect(() => { setAudioEngineEnvelopeFilterQ(envelopeFilterQ) }, [envelopeFilterQ, setAudioEngineEnvelopeFilterQ, isInitialized]);
    // FIX: Use the renamed `setLofiMix` function to avoid conflict with state setter
    useEffect(() => { if (setAudioEngineLofiMix) setAudioEngineLofiMix(lofiMix); }, [lofiMix, setAudioEngineLofiMix, isInitialized]);
    useEffect(() => { if (setIsoGain) setIsoGain('low', isolatorGains.low); }, [isolatorGains.low, setIsoGain, isInitialized]);
    useEffect(() => { if (setIsoGain) setIsoGain('mid', isolatorGains.mid); }, [isolatorGains.mid, setIsoGain, isInitialized]);
    useEffect(() => { if (setIsoGain) setIsoGain('high', isolatorGains.high); }, [isolatorGains.high, setIsoGain, isInitialized]);
    useEffect(() => {
        if (updateTapeStopDuration) {
            updateTapeStopDuration(tapeStopDuration, tempo);
        }
    }, [tapeStopDuration, tempo, updateTapeStopDuration, isInitialized]);
    useEffect(() => {
        if (updateStutterParams) {
            const srcVol = stutterSource === 'all' ? 0.7 : (volumes[INSTRUMENTS.indexOf(stutterSource)] ?? 0.7);
            const effSwing = getEffectiveStutterSwing(stutterDivision, isStutterSwingLocked, swing);
            updateStutterParams(stutterDivision, tempo, stutterSource, srcVol, effSwing);
        }
    }, [stutterDivision, tempo, stutterSource, volumes, isStutterSwingLocked, swing, updateStutterParams, getEffectiveStutterSwing, isInitialized]);
    useEffect(() => {
        if (delaySyncDivision !== null) {
            setDelayTime(getDelayDivisionTimeSeconds(delaySyncDivision, tempo));
        }
    }, [delaySyncDivision, tempo]);

    // Effect for checking if DJ settings are default
    useEffect(() => {
        const isDefault =
            randomizeIntensity === DEFAULT_DJ_SETTINGS.randomizeIntensity &&
            chainMode === DEFAULT_DJ_SETTINGS.chainMode &&
            isolatorGains.low === DEFAULT_DJ_SETTINGS.isolatorGains.low &&
            isolatorGains.mid === DEFAULT_DJ_SETTINGS.isolatorGains.mid &&
            isolatorGains.high === DEFAULT_DJ_SETTINGS.isolatorGains.high &&
            lofiMix === DEFAULT_DJ_SETTINGS.lofiMix &&
            stutterDivision === DEFAULT_DJ_SETTINGS.stutterDivision &&
            stutterSource === DEFAULT_DJ_SETTINGS.stutterSource &&
            isStutterSwingLocked === DEFAULT_DJ_SETTINGS.stutterSwingLocked &&
            beatRepeatDivision === DEFAULT_DJ_SETTINGS.beatRepeatDivision &&
            Math.abs(tapeStopDuration - DEFAULT_DJ_SETTINGS.tapeStopDuration) < 0.005 &&
            !isXyFilterHeld &&
            !isStutterHeld &&
            !isBeatRepeatHeld;
        setIsDjSettingsDefault(isDefault);
    }, [randomizeIntensity, chainMode, isolatorGains, lofiMix, stutterDivision, stutterSource, isStutterSwingLocked, beatRepeatDivision, tapeStopDuration, isXyFilterHeld, isStutterHeld, isBeatRepeatHeld]);

    // Effect for checking if effects settings are default
    useEffect(() => {
        const expectedDefaultDelayTime = DEFAULT_EFFECTS_SETTINGS.delaySyncDivision
            ? getDelayDivisionTimeSeconds(DEFAULT_EFFECTS_SETTINGS.delaySyncDivision, tempo)
            : DEFAULT_EFFECTS_SETTINGS.delayTime;
        const isDefault =
            lowPassFreq === DEFAULT_EFFECTS_SETTINGS.lowPassFreq &&
            highPassFreq === DEFAULT_EFFECTS_SETTINGS.highPassFreq &&
            reverbMix === DEFAULT_EFFECTS_SETTINGS.reverbMix &&
            reverbDecay === DEFAULT_EFFECTS_SETTINGS.reverbDecay &&
            reverbType === DEFAULT_EFFECTS_SETTINGS.reverbType &&
            Math.abs(reverbTone - DEFAULT_EFFECTS_SETTINGS.reverbTone) < 5 &&
            reverbSource === DEFAULT_EFFECTS_SETTINGS.reverbSource &&
            delayMix === DEFAULT_EFFECTS_SETTINGS.delayMix &&
            Math.abs(delayTime - expectedDefaultDelayTime) < 0.005 &&
            delayFeedback === DEFAULT_EFFECTS_SETTINGS.delayFeedback &&
            delaySource === DEFAULT_EFFECTS_SETTINGS.delaySource &&
            delaySyncDivision === DEFAULT_EFFECTS_SETTINGS.delaySyncDivision &&
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
        lowPassFreq, highPassFreq, reverbMix, reverbDecay, reverbType, reverbTone, reverbSource,
        delayMix, delayTime, delayFeedback, delaySource, delaySyncDivision, tempo,
        kickSidechainAmount, crushAmount, tapeSaturationMix, tapeSaturationAmount, tapeSaturationTone,
        envelopeFilterMix, envelopeFilterAmount, envelopeFilterBaseFreq, envelopeFilterQ
    ]);

    const isInstrumentSettingsChanged = useMemo(() => {
        if (JSON.stringify(instrumentParams) !== JSON.stringify(DEFAULT_INSTRUMENT_PARAMS)) return true;
        if (JSON.stringify(kickDesignerParams) !== JSON.stringify(DEFAULT_KICK_DESIGNER_PARAMS)) return true;
        if (volumes.length !== DEFAULT_VOLUMES.length || volumes.some((v, i) => Math.abs(v - DEFAULT_VOLUMES[i]) > 0.001)) return true;
        if (instrumentVisibility.some(v => !v)) return true;
        return false;
    }, [instrumentParams, kickDesignerParams, volumes, instrumentVisibility]);

    const isSampleRecorderChanged = useMemo(() => {
        if (fullAudioData && fullAudioData.length > 0) return true;
        if (originalAudioData && originalAudioData.length > 0) return true;
        if (trimRange.start !== 0 || trimRange.end !== 1) return true;
        const sampleParam = instrumentParams.sample;
        const defaultSample = DEFAULT_INSTRUMENT_PARAMS.sample;
        if (sampleParam && defaultSample) {
            if (sampleParam.pitch !== defaultSample.pitch) return true;
            if (sampleParam.highPass !== defaultSample.highPass) return true;
            if (sampleParam.lowPass !== defaultSample.lowPass) return true;
        }
        return false;
    }, [fullAudioData, originalAudioData, trimRange, instrumentParams.sample]);

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

    // --- Editable Header Title Logic ---
    const handleTitleClick = useCallback(() => {
        setIsEditingTitle(true);
    }, []);

    const handleTitleCommit = useCallback(() => {
        setIsEditingTitle(false);
        setCustomTitle(prev => {
            const trimmed = prev.trim();
            return trimmed ? prev : 'CL-607 Drum Machine';
        });
    }, []);

    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleTitleCommit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleTitleCommit();
        }
    }, [handleTitleCommit]);

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    useEffect(() => {
        if (isColorAnimating) {
            const animate = () => {
                setHueRotate(prev => (prev + 1.8 * sixSevenSpeedRef.current) % 360);
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

    const handleToggleTooltips = useCallback(() => setTooltipsEnabled(prev => !prev), []);
    const handleToggleBeatNumbers = useCallback(() => {
        setPadLabelMode(prev => (prev === 'subdivisions' ? 'off' : 'subdivisions'));
    }, []);
    const handleSetPadLabelMode = useCallback((mode: PadLabelMode) => {
        setPadLabelMode(mode);
    }, []);
    const handleToggleInvertColors = useCallback(() => setIsInvertColors(prev => !prev), []);
    const handleToggleCappuccinoMode = useCallback(() => setIsCappuccinoMode(prev => !prev), []);
    
    const handleBeatsPerMeasureChange = useCallback((newBPM: number) => {
        const newNumSteps = newBPM * 4;

        const resizeGrid = (grid: Grid): Grid => {
            return grid.map(row => {
                const newRow = Array(newNumSteps).fill(false);
                const limit = Math.min(row.length, newNumSteps);
                for (let i = 0; i < limit; i++) {
                    newRow[i] = row[i];
                }
                return newRow;
            });
        };

        setGrids(prevGrids => ({
            a: resizeGrid(prevGrids.a),
            b: resizeGrid(prevGrids.b),
        }));
        setBeatsPerMeasure(newBPM);
    }, []);

    useEffect(() => {
        if (tooltipsEnabled) {
            document.body.classList.remove('tooltips-disabled');
        } else {
            document.body.classList.add('tooltips-disabled');
        }
        // Only save if app is fully loaded to prevent overwriting on initial render
        if (isAppLoaded) {
            safeSetItem('cl607-tooltipsEnabled-v2', JSON.stringify(tooltipsEnabled));
        }
    }, [tooltipsEnabled, isAppLoaded]);
    
    useEffect(() => {
        if (isAppLoaded) {
            safeSetItem('cl607-padLabelMode', padLabelMode);
            safeSetItem('cl607-showBeatNumbers', JSON.stringify(showBeatNumbers));
        }
    }, [padLabelMode, showBeatNumbers, isAppLoaded]);

    useEffect(() => {
        if (isAppLoaded) {
            safeSetItem('cl607-invertColors', JSON.stringify(isInvertColors));
        }
    }, [isInvertColors, isAppLoaded]);

    useEffect(() => {
        if (isAppLoaded) {
            safeSetItem('cl607-visualizerStyle', visualizerStyle);
        }
    }, [visualizerStyle, isAppLoaded]);

    useEffect(() => {
        if (isAppLoaded) {
            safeSetItem('cl607-slowComputerMode', JSON.stringify(isSlowComputerMode));
        }
    }, [isSlowComputerMode, isAppLoaded]);

    useEffect(() => {
        if (isAppLoaded) {
            safeSetItem('cl607-customTitle', customTitle);
        }
    }, [customTitle, isAppLoaded]);

    useEffect(() => {
        if (isAppLoaded) {
            safeSetItem('cl607-keyboardDrummingEnabled', JSON.stringify(keyboardDrummingEnabled));
        }
    }, [keyboardDrummingEnabled, isAppLoaded]);

    useEffect(() => {
        if (isAppLoaded) {
            safeSetItem('cl607-sixSevenSpeed', String(sixSevenSpeed));
        }
    }, [sixSevenSpeed, isAppLoaded]);

    // Keyboard drumming effect
    useEffect(() => {
        if (!keyboardDrummingEnabled || !isAudioEngineReady) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            
            const key = e.key.toLowerCase();
            const instrument = keyboardMap[key];
            
            if (instrument) {
                // Play the instrument with current channel volume via ref to avoid re-binding listener on fader moves
                const instrumentIndex = INSTRUMENTS.indexOf(instrument);
                const currentVolumes = volumesRef.current;
                const volume = instrumentIndex !== -1 ? currentVolumes[instrumentIndex] : 0.8;
                
                switch (instrument) {
                    case 'kick': playKick(volume); break;
                    case 'snare': playSnare(volume); break;
                    case 'hihat': playHiHat(volume); break;
                    case 'snap': playSnap(volume); break;
                    case 'clave': playClave(volume); break;
                    case 'cowbell': playCowbell(volume); break;
                    case 'sample': playSample(volume); break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keyboardDrummingEnabled, keyboardMap, isAudioEngineReady, playKick, playSnare, playHiHat, playSnap, playClave, playCowbell, playSample]);

    const displayedTitle = isCappuccinoMode ? 'Cappuccino Drum Machino' : customTitle;
    const isMinimal = visualizerStyle === 'minimal';
    const surface = getThemeSurface(visualizerStyle);

    const getAppStyle = (): React.CSSProperties => {
        const filterParts: string[] = [];
        if (isInvertColors) {
            filterParts.push('invert(1)');
        }
        if (isCappuccinoMode) {
            filterParts.push('sepia(0.85) saturate(1.5) contrast(1.1) brightness(1.1)');
        }
        if (hueRotate !== 0) {
            filterParts.push(`hue-rotate(${hueRotate}deg)`);
        }
        const activeFilter = filterParts.length > 0 ? filterParts.join(' ') : undefined;

        switch (visualizerStyle) {
            case 'minimal':
                return {
                    filter: activeFilter,
                    backgroundColor: '#09090b',
                    color: '#f4f4f5',
                };
            case 'cyberpunk':
                return {
                    filter: activeFilter,
                    backgroundColor: '#050508',
                    backgroundImage:
                        'radial-gradient(circle at 50% 0%, rgba(0, 255, 159, 0.08) 0%, transparent 60%), linear-gradient(rgba(0, 255, 159, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 159, 0.03) 1px, transparent 1px)',
                    backgroundSize: '100% 100%, 24px 24px, 24px 24px',
                };
            case 'braun':
                return {
                    filter: activeFilter,
                    backgroundColor: '#e4e1d8',
                    backgroundImage: 'radial-gradient(circle at 50% 20%, #eceae2 0%, #dcd8cd 100%)',
                    color: '#1c1c1a',
                };
            case 'bauhaus':
                return {
                    filter: activeFilter,
                    backgroundColor: '#f2ece1',
                    backgroundImage:
                        'linear-gradient(90deg, rgba(20,20,19,0.03) 1px, transparent 1px), linear-gradient(rgba(20,20,19,0.03) 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                    color: '#141413',
                };
            case 'nagra':
                return {
                    filter: activeFilter,
                    backgroundColor: '#240d38',
                    backgroundImage:
                        'linear-gradient(180deg, #1b0c2e 0%, #3d1547 26%, #7c2652 52%, #c9464f 76%, #f78852 93%, #ffc878 100%)',
                    color: '#3b1547',
                };
            case 'koto':
                return {
                    filter: activeFilter,
                    backgroundColor: '#120d15',
                    backgroundImage:
                        'linear-gradient(180deg, #1c1420 0%, #0d0a0f 100%)',
                    color: '#f2ece1',
                };
            case 'default':
                return {
                    filter: activeFilter,
                    backgroundColor: '#09172e',
                    backgroundImage:
                        'linear-gradient(180deg, #10264a 0%, #09172e 100%)',
                    color: '#e6f3ff',
                };
            case 'classic607':
            default:
                return {
                    filter: activeFilter,
                };
        }
    };

    const appContainerClass = `theme-${visualizerStyle} min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 ${
        visualizerStyle === 'braun' || visualizerStyle === 'bauhaus'
            ? 'text-[#1c1c1a]'
            : visualizerStyle === 'nagra'
            ? 'text-[#3b1547]'
            : isMinimal
            ? 'bg-[#09090b] text-[#f4f4f5]'
            : visualizerStyle === 'default'
            ? 'bg-[#09172e] text-[#e6f3ff]'
            : 'bg-gray-900 text-gray-100'
    }`;

    const startTitleClass =
        visualizerStyle === 'minimal'
            ? "text-2xl sm:text-3xl font-bold font-mono uppercase tracking-[0.14em] text-[#f4f4f5]"
            : visualizerStyle === 'default'
            ? "text-2xl sm:text-3xl font-bold font-['IBM_Plex_Mono'] uppercase tracking-[0.14em] text-[#e6f3ff]"
            : visualizerStyle === 'braun'
            ? "text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1c1a] font-['Plus_Jakarta_Sans']"
            : visualizerStyle === 'bauhaus'
            ? "text-3xl sm:text-4xl font-extrabold tracking-wider uppercase text-[#141413] font-['Outfit']"
            : visualizerStyle === 'nagra'
            ? "text-3xl sm:text-4xl font-extrabold tracking-tight text-[#3b1547] font-['Plus_Jakarta_Sans']"
            : visualizerStyle === 'koto'
            ? "text-4xl sm:text-5xl font-bold tracking-wide text-[#f2ece1] font-['Cormorant_Garamond']"
            : visualizerStyle === 'cyberpunk'
            ? "text-3xl sm:text-4xl font-extrabold uppercase tracking-widest text-[#fcee0a] font-['JetBrains_Mono']"
            : "text-3xl sm:text-4xl font-bold tracking-tight text-gray-100";

    const startSubtitleClass =
        visualizerStyle === 'minimal'
            ? "text-xs text-[#71717a] font-mono uppercase tracking-[0.16em] mt-2 mb-8"
            : visualizerStyle === 'default'
            ? "text-xs text-[#ffc4d6] font-['IBM_Plex_Mono'] uppercase tracking-[0.16em] mt-2 mb-8"
            : visualizerStyle === 'braun'
            ? "text-sm text-[#737067] font-['Plus_Jakarta_Sans'] font-medium mt-1.5 mb-8"
            : visualizerStyle === 'bauhaus'
            ? "text-xs sm:text-sm text-[#5c5952] font-['Outfit'] font-bold uppercase tracking-widest mt-1.5 mb-8"
            : visualizerStyle === 'nagra'
            ? "text-xs sm:text-sm text-[#d9325e] font-['Plus_Jakarta_Sans'] font-bold tracking-widest uppercase mt-1.5 mb-8"
            : visualizerStyle === 'koto'
            ? "text-sm text-[#d4af37] font-['Plus_Jakarta_Sans'] tracking-widest mt-1.5 mb-8"
            : visualizerStyle === 'cyberpunk'
            ? "text-xs sm:text-sm text-[#00ff9f] font-['JetBrains_Mono'] tracking-widest mt-1.5 mb-8"
            : "text-sm text-gray-400 mt-1 mb-8";

    const startCardClass =
        visualizerStyle === 'classic607'
            ? 'flex flex-col items-center justify-center p-4 text-center'
            : `relative flex flex-col items-center justify-center px-8 py-10 sm:px-14 sm:py-12 text-center ${surface.mainDeck}`;
    
    const chainOptions: { mode: ChainMode; label: string, tooltip: string }[] = useMemo(() => [
        { mode: 'off', label: 'OFF', tooltip: 'Playback a single pattern' },
        { mode: 'ab', label: 'A-B', tooltip: 'Alternate between Pattern A and B' },
        { mode: 'aaab', label: 'A-A-A-B', tooltip: 'Play Pattern A three times, then B once' },
        { mode: 'aabb', label: 'A-A-B-B', tooltip: 'Play Pattern A twice, then B twice' },
    ], []);
    
    const djCardClass = isMinimal
        ? 'flex flex-col items-center gap-3 p-3.5 bg-[#0e0e11] border border-[#27272a]'
        : visualizerStyle === 'default'
        ? 'flex flex-col items-center gap-3 p-3.5 rounded-none bg-gradient-to-b from-[#132d54] to-[#0b1d38] border border-[#244a7d]'
        : 'flex flex-col items-center gap-3 p-3 rounded-lg bg-gray-900/50';

    const djDropdownPanelClass = useMemo(() => {
        switch (visualizerStyle) {
            case 'default':
                return 'bg-[#0b1d38] border border-[#a8dcff] text-[#e6f3ff] shadow-[4px_4px_0px_#050f20]';
            case 'minimal':
                return 'bg-[#09090b] border border-[#3f3f46] text-[#f4f4f5] shadow-2xl';
            case 'braun':
                return 'bg-[#e6e3dc] border-2 border-[#c2beb4] text-[#1c1c1a] shadow-[0_12px_28px_rgba(0,0,0,0.28)]';
            case 'bauhaus':
                return 'bg-[#f4efe1] border-[2.5px] border-[#141413] text-[#141413] shadow-[5px_5px_0px_#141413]';
            case 'nagra':
                return 'bg-[#fff2e6] border-2 border-[#f4a28c] text-[#3b1547] shadow-[0_12px_28px_rgba(92,28,75,0.28)]';
            case 'koto':
                return 'bg-[#171512] border-2 border-[#b89728] text-[#f2ece1] shadow-[0_12px_32px_rgba(0,0,0,0.85)]';
            case 'cyberpunk':
                return 'bg-[#0a0b10] border-2 border-[#00f0ff] text-[#fcee0a] shadow-[0_10px_28px_rgba(0,0,0,0.9)]';
            case 'classic607':
            default:
                return 'bg-gray-900 border border-gray-600 text-gray-100 shadow-2xl';
        }
    }, [visualizerStyle]);

    const getDjShortcutState = useCallback((effect: EffectName) => {
        const enabled = effectsEnabled[effect];
        switch (effect) {
            case 'delay': {
                return { enabled, min: 0, max: 1, step: 0.01, value: delayMix, display: enabled ? `${Math.round(delayMix * 100)}%` : 'OFF' };
            }
            case 'reverb': {
                return { enabled, min: 0, max: 1, step: 0.01, value: reverbMix, display: enabled ? `${Math.round(reverbMix * 100)}%` : 'OFF' };
            }
            case 'tape': {
                return { enabled, min: 0, max: 1, step: 0.01, value: tapeSaturationMix, display: enabled ? `${Math.round(tapeSaturationMix * 100)}%` : 'OFF' };
            }
            case 'envelope': {
                return { enabled, min: 0, max: 1, step: 0.01, value: envelopeFilterMix, display: enabled ? `${Math.round(envelopeFilterMix * 100)}%` : 'OFF' };
            }
            case 'crush': {
                return { enabled, min: 0, max: 1, step: 0.01, value: crushAmount, display: enabled ? `${Math.round(crushAmount * 100)}%` : 'OFF' };
            }
            case 'sidechain': {
                return { enabled, min: 0, max: 1, step: 0.01, value: kickSidechainAmount, display: enabled ? `${Math.round(kickSidechainAmount * 100)}%` : 'OFF' };
            }
            case 'lowPass': {
                return { enabled, min: 0, max: 100, step: 1, value: freqToSlider(lowPassFreq), display: enabled ? `${Math.round(lowPassFreq)}Hz` : 'OFF' };
            }
            case 'highPass': {
                return { enabled, min: 0, max: 100, step: 1, value: freqToSlider(highPassFreq), display: enabled ? `${Math.round(highPassFreq)}Hz` : 'OFF' };
            }
        }
    }, [
        effectsEnabled, delayMix, reverbMix, tapeSaturationMix, envelopeFilterMix,
        crushAmount, kickSidechainAmount, lowPassFreq, highPassFreq
    ]);

    const renderDjContent = useCallback((isOpen: boolean) => (
        <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-8 p-2">
            <div className={djCardClass}>
                <h4 className="font-mono text-xs text-gray-400 uppercase tracking-wider">RANDOMIZER</h4>
                 <Tooltip text="Hold to temporarily jumble the beat">
                    <button
                        onMouseDown={handleRandomizePressStart}
                        onMouseUp={handleRandomizePressEnd}
                        onMouseLeave={handleRandomizePressEnd}
                        onTouchStart={(e) => { e.preventDefault(); handleRandomizePressStart(); }}
                        onTouchEnd={handleRandomizePressEnd}
                        className={getButtonStyle(
                            visualizerStyle,
                            'primary',
                            isRandomizeActive,
                            false,
                            isMinimal
                                ? 'w-32 h-14 text-sm font-mono tracking-widest'
                                : 'w-32 h-16 text-lg bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                        )}
                    >
                        {randomizeButtonText}
                    </button>
                </Tooltip>
                <Tooltip text="Controls how much the beat is jumbled when RANDOMIZE is held" isInteracting={isInteractingWithSlider}>
                    <div className="flex items-center gap-2 w-full max-w-xs pt-2">
                        <label htmlFor="random-intensity" className="font-mono text-xs text-gray-500">CHAOS</label>
                        <input
                            type="range"
                            id="random-intensity"
                            min={0}
                            max={10}
                            step={1}
                            value={randomizeIntensity}
                            onChange={handleRandomizeIntensityChange}
                            {...sliderInteractionProps}
                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>
                </Tooltip>
            </div>

            {/* Tape Stop */}
            <div className={djCardClass}>
                <h4 className="font-mono text-xs text-gray-400 uppercase tracking-wider">TAPE STOP</h4>
                <Tooltip text="Tap or hold to brake the master reel to a stop; release to spin back up into the beat">
                    <button
                        type="button"
                        onMouseDown={handleTapeStopStart}
                        onMouseUp={handleTapeStopEnd}
                        onMouseLeave={() => { if (isTapeStopActive) handleTapeStopEnd(); }}
                        onTouchStart={(e) => { e.preventDefault(); handleTapeStopStart(); }}
                        onTouchEnd={handleTapeStopEnd}
                        className={getButtonStyle(
                            visualizerStyle,
                            'danger',
                            isTapeStopActive,
                            false,
                            isMinimal
                                ? 'w-32 h-14 text-sm font-mono tracking-widest'
                                : 'w-32 h-16 text-sm font-bold tracking-wider'
                        )}
                    >
                        {isTapeStopActive ? 'BRAKING' : 'TAPE STOP'}
                    </button>
                </Tooltip>
                <Tooltip text={`Brake time (${Math.round(tapeStopDuration * 1000)}ms): controls how fast or slow the tape reel brakes to a stop`} isInteracting={isInteractingWithSlider}>
                    <div className="flex items-center gap-2 w-full max-w-xs pt-2">
                        <label htmlFor="tapestop-duration" className="font-mono text-xs text-gray-500">BRAKE</label>
                        <input
                            type="range"
                            id="tapestop-duration"
                            min={0.25}
                            max={1.25}
                            step={0.05}
                            value={tapeStopDuration}
                            onChange={handleTapeStopDurationChange}
                            {...sliderInteractionProps}
                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500"
                        />
                    </div>
                </Tooltip>
            </div>

            {/* Stutter */}
            <div className={djCardClass}>
                <div className="w-full flex items-center justify-between gap-2">
                    <h4 className="font-mono text-xs text-gray-400 uppercase tracking-wider">STUTTER</h4>
                    <Tooltip text={isStutterHeld ? "Release Stutter Hold" : "Lock Stutter active hands-free"}>
                        <button
                            type="button"
                            onClick={handleToggleStutterHold}
                            className={
                                isMinimal
                                    ? `px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                                        isStutterHeld
                                            ? 'bg-[#ff3b1d] text-[#09090b] border-[#ff3b1d]'
                                            : 'bg-[#141417] text-[#a1a1aa] border-[#27272a] hover:text-[#f4f4f5]'
                                    }`
                                    : getButtonStyle(
                                        visualizerStyle,
                                        isStutterHeld ? 'danger' : 'secondary',
                                        isStutterHeld,
                                        false,
                                        '!px-2 !py-0.5 !text-[10px] font-mono uppercase tracking-wider'
                                    )
                            }
                            aria-pressed={isStutterHeld}
                        >
                            HOLD
                        </button>
                    </Tooltip>
                </div>
                <Tooltip text="Choose whether Stutter affects the Whole Mix or a single instrument">
                    <div className="flex items-center gap-1.5 w-full text-xs">
                        <label htmlFor="stutter-source" className="font-mono text-[10px] text-gray-500 flex-shrink-0">SRC</label>
                        <select
                            id="stutter-source"
                            value={stutterSource}
                            onChange={handleStutterSourceChange}
                            className="bg-gray-700 border-gray-600 text-white text-xs rounded-md focus:ring-cyan-500 focus:border-cyan-500 block w-full py-1 px-1.5"
                        >
                            <option value="all">Whole Mix</option>
                            {INSTRUMENTS.map(instrument => (
                                <option key={instrument} value={instrument}>{INSTRUMENT_LABELS[instrument]}</option>
                            ))}
                        </select>
                    </div>
                </Tooltip>
                <Tooltip text="Hold to repeat the current audio slice at the selected note rate (or click HOLD to lock)" isInteracting={isStutterActive}>
                    <button
                        type="button"
                        onMouseDown={handleStutterPressStart}
                        onMouseUp={handleStutterPressEnd}
                        onTouchStart={(e) => { e.preventDefault(); handleStutterPressStart(); }}
                        onTouchEnd={handleStutterPressEnd}
                        className={getButtonStyle(
                            visualizerStyle,
                            'primary',
                            isStutterActive || isStutterHeld,
                            false,
                            isMinimal
                                ? 'w-36 h-11 text-xs font-mono tracking-widest whitespace-nowrap'
                                : visualizerStyle === 'default'
                                ? 'w-36 h-11 text-xs font-bold tracking-wider whitespace-nowrap'
                                : 'w-36 h-11 text-xs sm:text-sm font-bold tracking-wider whitespace-nowrap bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500'
                        )}
                    >
                        {isStutterActive || isStutterHeld ? `STUTTER ${stutterDivision}` : 'STUTTER'}
                    </button>
                </Tooltip>
                <div className="grid grid-cols-3 gap-1 w-full">
                    {STUTTER_DIVISIONS.map((div) => (
                        <Tooltip key={div} text={`Stutter note length: ${div} note`}>
                            <button
                                type="button"
                                onClick={() => handleStutterDivisionChange(div)}
                                className={getButtonStyle(
                                    visualizerStyle,
                                    stutterDivision === div ? 'success' : 'secondary',
                                    stutterDivision === div,
                                    false,
                                    '!px-2 !py-1 !text-[11px] font-mono'
                                )}
                            >
                                {div}
                            </button>
                        </Tooltip>
                    ))}
                </div>
                <Tooltip text={isStutterSwingLocked
                    ? "Swing is ON for Stutter (follows track swing; triplets stay in strict time). Click to turn OFF."
                    : "Swing is OFF for Stutter (plays straight). Click to turn ON."}>
                    <div className="flex items-center justify-between w-full pt-1 border-t border-gray-700/40">
                        <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">SWING</span>
                        <button
                            type="button"
                            onClick={handleToggleStutterSwing}
                            className={
                                isMinimal
                                    ? `px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                                        isStutterSwingLocked
                                            ? 'bg-[#00f2fe]/20 text-[#00f2fe] border-[#00f2fe]'
                                            : 'bg-[#141417] text-[#71717a] border-[#27272a] hover:text-[#f4f4f5]'
                                    }`
                                    : getButtonStyle(
                                        visualizerStyle,
                                        isStutterSwingLocked ? 'success' : 'secondary',
                                        isStutterSwingLocked,
                                        false,
                                        '!px-2.5 !py-0.5 !text-[10px] font-mono uppercase tracking-wider'
                                    )
                            }
                            aria-pressed={isStutterSwingLocked}
                        >
                            {isStutterSwingLocked ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </Tooltip>
            </div>

            {/* Beat Repeater */}
            <div className={djCardClass}>
                <div className="w-full flex items-center justify-between gap-2">
                    <h4 className="font-mono text-xs text-gray-400 uppercase tracking-wider">BEAT REPEATER</h4>
                    <Tooltip text={isBeatRepeatHeld ? "Release Beat Repeater Hold" : "Lock Beat Repeater active hands-free"}>
                        <button
                            type="button"
                            onClick={handleToggleBeatRepeatHold}
                            className={
                                isMinimal
                                    ? `px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                                        isBeatRepeatHeld
                                            ? 'bg-[#ff3b1d] text-[#09090b] border-[#ff3b1d]'
                                            : 'bg-[#141417] text-[#a1a1aa] border-[#27272a] hover:text-[#f4f4f5]'
                                    }`
                                    : getButtonStyle(
                                        visualizerStyle,
                                        isBeatRepeatHeld ? 'danger' : 'secondary',
                                        isBeatRepeatHeld,
                                        false,
                                        '!px-2 !py-0.5 !text-[10px] font-mono uppercase tracking-wider'
                                    )
                            }
                            aria-pressed={isBeatRepeatHeld}
                        >
                            HOLD
                        </button>
                    </Tooltip>
                </div>
                <Tooltip text="Hold to loop the current pattern beat/phrase on the sequencer grid (or click HOLD to lock)">
                    <button
                        type="button"
                        onMouseDown={handleBeatRepeatPressStart}
                        onMouseUp={handleBeatRepeatPressEnd}
                        onMouseLeave={handleBeatRepeatPressEnd}
                        onTouchStart={(e) => { e.preventDefault(); handleBeatRepeatPressStart(); }}
                        onTouchEnd={handleBeatRepeatPressEnd}
                        className={getButtonStyle(
                            visualizerStyle,
                            'primary',
                            isBeatRepeatActive || isBeatRepeatHeld,
                            false,
                            isMinimal
                                ? 'w-40 h-11 text-xs font-mono tracking-widest'
                                : 'w-40 h-11 text-sm font-bold tracking-wider bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                        )}
                    >
                        {isBeatRepeatActive || isBeatRepeatHeld
                            ? `REPEAT ${BEAT_REPEAT_DIVISIONS.find(d => d.id === beatRepeatDivision)?.label ?? ''}`
                            : 'BEAT REPEAT'}
                    </button>
                </Tooltip>
                <div className="grid grid-cols-2 gap-1 w-full">
                    {BEAT_REPEAT_DIVISIONS.map((div) => (
                        <Tooltip key={div.id} text={div.tooltip}>
                            <button
                                type="button"
                                onClick={() => handleBeatRepeatDivisionChange(div.id)}
                                className={getButtonStyle(
                                    visualizerStyle,
                                    beatRepeatDivision === div.id ? 'success' : 'secondary',
                                    beatRepeatDivision === div.id,
                                    false,
                                    '!px-2 !py-1 !text-[10px] font-mono'
                                )}
                            >
                                {div.label}
                            </button>
                        </Tooltip>
                    ))}
                </div>
            </div>
            
            <div className={`relative flex flex-col items-center gap-3 ${openDjShortcutDropdown !== null ? 'z-50' : 'z-20'}`} ref={djShortcutsRef}>
                <div className={djCardClass}>
                    <h4 className="font-mono text-xs text-gray-400 uppercase tracking-wider">PATTERN CHAIN</h4>
                    <div className="flex items-center gap-2">
                        {chainOptions.map(opt => (
                            <Tooltip key={opt.mode} text={opt.tooltip}>
                                <button 
                                    onClick={() => setChainMode(opt.mode)}
                                    className={getButtonStyle(visualizerStyle, chainMode === opt.mode ? 'success' : 'secondary', chainMode === opt.mode, false, 'px-3 py-1.5 text-xs')}
                                >
                                    {opt.label}
                                </button>
                            </Tooltip>
                        ))}
                    </div>
                </div>

                {/* Configurable Effect Mix Shortcuts (Default: DELAY & REVERB) */}
                <div className={`${djCardClass} relative w-full min-w-[14.5rem] ${openDjShortcutDropdown !== null ? 'z-50' : 'z-20'}`}>
                    {([0, 1] as const).map((slotIndex) => {
                        const effectId = djShortcutEffects[slotIndex];
                        const meta = DJ_EFFECT_SHORTCUT_OPTIONS.find(o => o.id === effectId) || DJ_EFFECT_SHORTCUT_OPTIONS[0];
                        const state = getDjShortcutState(effectId);
                        const isDropdownOpen = openDjShortcutDropdown === slotIndex;

                        return (
                            <div key={slotIndex} className={`relative w-full flex flex-col gap-1.5 ${isDropdownOpen ? 'z-50' : 'z-10'}`}>
                                <div className="w-full flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Tooltip text={state.enabled ? `Turn ${meta.menuName} OFF` : `Turn ${meta.menuName} ON`}>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleDjShortcutEffect(effectId)}
                                                aria-pressed={state.enabled}
                                                className={
                                                    isMinimal
                                                        ? `px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border cursor-pointer ${
                                                            state.enabled
                                                                ? 'bg-[#22c55e] text-[#09090b] border-[#22c55e]'
                                                                : 'bg-[#141417] text-[#71717a] border-[#27272a] hover:text-[#f4f4f5]'
                                                        }`
                                                        : getButtonStyle(
                                                            visualizerStyle,
                                                            state.enabled ? 'success' : 'secondary',
                                                            state.enabled,
                                                            false,
                                                            '!px-1.5 !py-0.5 !text-[10px] font-mono uppercase tracking-wider'
                                                        )
                                                }
                                            >
                                                {state.enabled ? 'ON' : 'OFF'}
                                            </button>
                                        </Tooltip>
                                        <Tooltip text="Click to switch this shortcut to another effect">
                                            <button
                                                type="button"
                                                onClick={() => setOpenDjShortcutDropdown(prev => prev === slotIndex ? null : slotIndex)}
                                                className="inline-flex items-center gap-1 font-mono text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider cursor-pointer focus:outline-none"
                                                aria-haspopup="listbox"
                                                aria-expanded={isDropdownOpen}
                                            >
                                                <span>{meta.shortName}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <span className={`font-mono text-xs tabular-nums ${state.enabled ? 'text-gray-300' : 'text-gray-500'}`}>
                                        {state.display}
                                    </span>
                                </div>

                                {isDropdownOpen && (
                                    <div
                                        role="listbox"
                                        className={`absolute left-0 top-7 z-[100] w-52 py-1 rounded-md ${djDropdownPanelClass}`}
                                    >
                                        {DJ_EFFECT_SHORTCUT_OPTIONS.map((option) => {
                                            const isSelected = option.id === effectId;
                                            return (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    onClick={() => handleSelectDjShortcutEffect(slotIndex, option.id)}
                                                    className={`w-full text-left px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider flex items-center justify-between cursor-pointer transition-colors ${
                                                        isSelected
                                                            ? 'bg-blue-600 text-white font-bold'
                                                            : 'hover:bg-white/10'
                                                    }`}
                                                >
                                                    <span>{option.menuName}</span>
                                                    {isSelected && <span>✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                <Tooltip text={meta.tooltip} isInteracting={isInteractingWithSlider}>
                                    <div className={`flex items-center gap-2 w-full transition-opacity ${state.enabled ? 'opacity-100' : 'opacity-45'}`}>
                                        <label
                                            htmlFor={`dj-fx-shortcut-${slotIndex}`}
                                            className="font-mono text-[10px] text-gray-500 w-9 flex-shrink-0"
                                        >
                                            {meta.paramLabel}
                                        </label>
                                        <input
                                            type="range"
                                            id={`dj-fx-shortcut-${slotIndex}`}
                                            min={state.min}
                                            max={state.max}
                                            step={state.step}
                                            value={state.value}
                                            onChange={(e) => handleDjShortcutValueChange(effectId, Number(e.target.value))}
                                            {...sliderInteractionProps}
                                            className={`w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer ${meta.accentClass}`}
                                        />
                                    </div>
                                </Tooltip>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Isolator */}
            <div className={djCardClass}>
                <h4 className="font-mono text-xs text-gray-400 uppercase tracking-wider">ISOLATOR</h4>
                <div className="flex items-end gap-8 pt-4">
                    {(['low', 'mid', 'high'] as const).map((band) => {
                        const gainValue = isolatorGains[band];
                        const tooltipText = band === 'low'
                            ? "Adjust the volume of the low (bass) frequencies"
                            : band === 'mid'
                            ? "Adjust the volume of the mid-range frequencies"
                            : "Adjust the volume of the high (treble) frequencies";
                        return (
                            <Tooltip key={band} text={tooltipText} isInteracting={isInteractingWithSlider}>
                                <div className="flex flex-col items-center gap-2">
                                    <span className="font-mono text-xs text-gray-500 font-bold -mb-2 tabular-nums">{Math.round(gainValue * 100)}</span>
                                    <div className="h-24 w-8 flex items-center justify-center">
                                        <input
                                            type="range"
                                            min={0}
                                            max={1.5}
                                            step="0.01"
                                            value={gainValue}
                                            onChange={(e) => handleIsolatorGainChange(band, Number(e.target.value))}
                                            {...sliderInteractionProps}
                                            className="w-24 h-2 appearance-none cursor-pointer accent-teal-400 origin-center -rotate-90"
                                        />
                                    </div>
                                    <span className="font-mono text-xs font-bold uppercase tracking-wider">{band}</span>
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            </div>
            
            <Tooltip text="Drag to control filter (X: Frequency, Y: Drive). Click HOLD to lock position." placement="bottom">
                <XYFilterPad 
                    onFilterChange={handleFilterChange}
                    onInteractionStart={handleFilterInteractionStart}
                    onInteractionEnd={handleFilterInteractionEnd}
                    visualizerStyle={visualizerStyle}
                    isHeld={isXyFilterHeld}
                    onToggleHold={handleToggleXyFilterHold}
                />
            </Tooltip>

            <LoFiRadio 
                isActive={isOpen}
                lofiMix={lofiMix}
                onLofiMixChange={setLofiMix}
                dryAnalyser={effectAnalysers.lofiDryAnalyser}
                wetAnalyser={effectAnalysers.lofiWetAnalyser}
                isPerformanceMode={isPerformanceMode}
                visualizerStyle={visualizerStyle}
            />
        </div>
    ), [
        djCardClass, handleRandomizePressStart, handleRandomizePressEnd,
        visualizerStyle, isRandomizeActive, isMinimal, randomizeButtonText, isInteractingWithSlider,
        randomizeIntensity, handleRandomizeIntensityChange, sliderInteractionProps,
        handleTapeStopStart, handleTapeStopEnd, isTapeStopActive, tapeStopDuration, handleTapeStopDurationChange,
        isStutterHeld, handleToggleStutterHold, handleStutterPressStart, handleStutterPressEnd,
        isStutterActive, stutterDivision, handleStutterDivisionChange, stutterSource, handleStutterSourceChange,
        isStutterSwingLocked, handleToggleStutterSwing,
        isBeatRepeatHeld, handleToggleBeatRepeatHold, handleBeatRepeatPressStart, handleBeatRepeatPressEnd,
        isBeatRepeatActive, beatRepeatDivision, handleBeatRepeatDivisionChange,
        chainOptions, chainMode, djShortcutEffects, getDjShortcutState, openDjShortcutDropdown,
        djDropdownPanelClass, handleSelectDjShortcutEffect, handleToggleDjShortcutEffect, handleDjShortcutValueChange,
        isolatorGains, handleIsolatorGainChange, handleFilterChange, handleFilterInteractionStart,
        handleFilterInteractionEnd, isXyFilterHeld, handleToggleXyFilterHold, lofiMix,
        effectAnalysers.lofiDryAnalyser, effectAnalysers.lofiWetAnalyser, isPerformanceMode,
        isDjSettingsDefault, handleDjResetStart, handleDjResetEnd, isDjResetPoofing, djResetProgress
    ]);

    const renderEffectsContent = useCallback((isOpen: boolean) => (
        <Effects 
            isActive={isOpen}
            lowPassFreq={lowPassFreq}
            highPassFreq={highPassFreq}
            onLowPassChange={setLowPassFreq}
            onHighPassChange={setHighPassFreq}
            reverbMix={reverbMix}
            reverbDecay={reverbDecay}
            reverbType={reverbType}
            reverbTone={reverbTone}
            reverbSource={reverbSource}
            onReverbMixChange={setReverbMix}
            onReverbDecayChange={setReverbDecay}
            onReverbTypeChange={setReverbType}
            onReverbToneChange={setReverbTone}
            onReverbSourceChange={setReverbSource}
            delayMix={delayMix}
            delayTime={delayTime}
            delayFeedback={delayFeedback}
            delaySource={delaySource}
            delaySyncDivision={delaySyncDivision}
            tempo={tempo}
            onDelayMixChange={setDelayMix}
            onDelayTimeChange={setDelayTime}
            onDelayFeedbackChange={setDelayFeedback}
            onDelaySourceChange={setDelaySource}
            onDelaySyncDivisionChange={setDelaySyncDivision}
            kickSidechainAmount={kickSidechainAmount}
            kickSidechainThreshold={kickSidechainThreshold}
            kickSidechainRatio={kickSidechainRatio}
            onKickSidechainAmountChange={setKickSidechainAmount}
            onKickSidechainThresholdChange={setKickSidechainThreshold}
            onKickSidechainRatioChange={setKickSidechainRatio}
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
            isPerformanceMode={isPerformanceMode}
            visualizerStyle={visualizerStyle}
        />
    ), [
        lowPassFreq, highPassFreq, reverbMix, reverbDecay, reverbType, reverbTone, reverbSource,
        delayMix, delayTime, delayFeedback, delaySource,
        delaySyncDivision, tempo,
        kickSidechainAmount, kickSidechainThreshold, kickSidechainRatio, crushAmount, tapeSaturationMix,
        tapeSaturationAmount, tapeSaturationTone, envelopeFilterMix, envelopeFilterAmount, envelopeFilterBaseFreq,
        envelopeFilterQ, effectAnalysers, effectsEnabled, handleToggleEffect, handleResetEffectsSettings,
        isEffectsSettingsDefault, isPerformanceMode, visualizerStyle
    ]);

    const renderInstrumentsContent = useCallback((isOpen: boolean) => (
        <InstrumentSettings
            isActive={isOpen}
            params={instrumentParams}
            instrumentColors={instrumentColors}
            onParamChange={handleInstrumentParamChange}
            instrumentVisibility={instrumentVisibility}
            onVisibilityChange={handleInstrumentVisibilityChange}
            kickDesignerParams={kickDesignerParams}
            onKickDesignerParamChange={handleKickDesignerParamChange}
            volumes={volumes}
            onVolumeChange={handleVolumeChange}
            visualizerStyle={visualizerStyle}
        />
    ), [
        instrumentParams, instrumentColors, handleInstrumentParamChange, instrumentVisibility,
        handleInstrumentVisibilityChange, kickDesignerParams, handleKickDesignerParamChange,
        volumes, handleVolumeChange, visualizerStyle
    ]);

    const renderRecorderContent = useCallback(() => (
        <SampleRecorderMenu 
            isAudioEngineReady={isAudioEngineReady} 
            audioContext={audioContext}
            isRecording={isRecording}
            onToggleRecording={handleToggleRecording}
            fullAudioData={fullAudioData}
            setFullAudioData={setFullAudioData}
            originalAudioData={originalAudioData}
            setOriginalAudioData={setOriginalAudioData}
            trimRange={trimRange}
            setTrimRange={setTrimRange}
            sampleParams={instrumentParams.sample}
            onParamChange={handleInstrumentParamChange}
            playSample={playSample}
            visualizerStyle={visualizerStyle}
        />
    ), [
        isAudioEngineReady, audioContext, isRecording, handleToggleRecording, fullAudioData,
        originalAudioData, trimRange, instrumentParams.sample, handleInstrumentParamChange,
        playSample, visualizerStyle
    ]);

    const activeGrid = grids[activePattern];
    const renderNotationContent = useCallback((isOpen: boolean) => (
        <NotationVisualizer
            isActive={isOpen}
            grid={activeGrid}
            instrumentColors={instrumentColors}
            beatsPerMeasure={beatsPerMeasure}
        />
    ), [activeGrid, instrumentColors, beatsPerMeasure]);

    if (!isInitialized) {
        return (
            <div className={appContainerClass} style={getAppStyle()}>
                <div className={startCardClass}>
                    {visualizerStyle === 'cyberpunk' && (
                        <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-1 w-full bg-gradient-to-r from-[#fcee0a] via-[#00ff9f] to-[#ff003c]" />
                    )}
                    {visualizerStyle === 'nagra' && (
                        <div aria-hidden="true" className="pointer-events-none select-none">
                            <span className="absolute -top-4 left-10 w-24 h-10 rounded-full bg-gradient-to-b from-white via-[#fff7f2] to-transparent border-t-2 border-white shadow-[0_-4px_12px_rgba(255,255,255,0.75)]" />
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 w-32 h-12 rounded-full bg-gradient-to-b from-white via-[#fff8f3] to-transparent border-t-2 border-white shadow-[0_-6px_16px_rgba(255,255,255,0.85)]" />
                            <span className="absolute -top-4 right-10 w-24 h-10 rounded-full bg-gradient-to-b from-white via-[#fff7f2] to-transparent border-t-2 border-white shadow-[0_-4px_12px_rgba(255,255,255,0.75)]" />
                        </div>
                    )}
                    <h1 className={startTitleClass}>CL-607 Drum Machine</h1>
                    <p className={startSubtitleClass}>by Clark Lambert</p>
                    <Tooltip text="Initialize the audio engine">
                        <button
                            onClick={handleStart}
                            className={getButtonStyle(visualizerStyle, 'primary', false, false, 'w-48 h-16 text-lg')}
                        >
                            Start
                        </button>
                    </Tooltip>
                </div>
            </div>
        );
    }
    
    if (isLoading) {
        return (
            <div className={appContainerClass} style={getAppStyle()}>
                <div className={startCardClass}>
                    <svg className="animate-spin -ml-1 mr-3 h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h2 className={`mt-4 text-xl font-bold ${visualizerStyle === 'braun' || visualizerStyle === 'bauhaus' || visualizerStyle === 'nagra' ? 'text-[#3b1547]' : 'text-white'}`}>Initializing Audio Engine...</h2>
                    <p className={startSubtitleClass.replace('mb-8', 'mb-0')}>Warming up the synthesizers!</p>
                </div>
            </div>
        );
    }

    const renderSectionByKey = (key: string, index: number) => {
        const isBeingDragged = index === draggedIndex;
        switch (key) {
            case 'dj':
                return (
                    <CollapsibleSection
                        key="dj"
                        title="LIVE DJ"
                        closedTitle="LIVE DJ"
                        visualizerStyle={visualizerStyle}
                        sectionIndex={index}
                        onSectionPointerDown={handlePointerDown}
                        isDragging={isBeingDragged}
                        elevated={openDjShortcutDropdown !== null}
                        onReset={handleResetDjSettings}
                        resetLabel="RESET"
                        hasChanges={!isDjSettingsDefault}
                    >
                        {renderDjContent}
                    </CollapsibleSection>
                );
            case 'effects':
                return (
                    <CollapsibleSection
                        key="effects"
                        title="EFFECTS"
                        closedTitle="EFFECTS"
                        visualizerStyle={visualizerStyle}
                        sectionIndex={index}
                        onSectionPointerDown={handlePointerDown}
                        isDragging={isBeingDragged}
                        onReset={handleResetEffectsSettings}
                        resetLabel="RESET"
                        hasChanges={!isEffectsSettingsDefault}
                    >
                        {renderEffectsContent}
                    </CollapsibleSection>
                );
            case 'instruments':
                return (
                    <CollapsibleSection
                        key="instruments"
                        title="INSTRUMENT SETTINGS"
                        closedTitle="INSTRUMENT SETTINGS"
                        defaultOpen={false}
                        visualizerStyle={visualizerStyle}
                        sectionIndex={index}
                        onSectionPointerDown={handlePointerDown}
                        isDragging={isBeingDragged}
                        onReset={handleResetInstrumentSettings}
                        resetLabel="RESET"
                        hasChanges={isInstrumentSettingsChanged}
                    >
                        {renderInstrumentsContent}
                    </CollapsibleSection>
                );
            case 'recorder':
                return (
                    <CollapsibleSection
                        key="recorder"
                        title="SAMPLE RECORDER"
                        closedTitle="SAMPLE RECORDER"
                        defaultOpen={false}
                        visualizerStyle={visualizerStyle}
                        sectionIndex={index}
                        onSectionPointerDown={handlePointerDown}
                        isDragging={isBeingDragged}
                        onReset={handleResetSampleRecorder}
                        resetLabel="RESET"
                        hasChanges={isSampleRecorderChanged}
                    >
                        {renderRecorderContent}
                    </CollapsibleSection>
                );
            case 'notation':
                return (
                    <CollapsibleSection
                        key="notation"
                        title="RHYTHMIC NOTATION"
                        closedTitle="RHYTHMIC NOTATION"
                        defaultOpen={false}
                        visualizerStyle={visualizerStyle}
                        sectionIndex={index}
                        onSectionPointerDown={handlePointerDown}
                        isDragging={isBeingDragged}
                    >
                        {renderNotationContent}
                    </CollapsibleSection>
                );
            case 'settings':
                return (
                    <Settings
                        key="settings"
                        visualizer={visualizerType}
                        onVisualizerChange={setVisualizerType}
                        visualizerStyle={visualizerStyle}
                        onVisualizerStyleChange={handleVisualizerStyleChange}
                        drumKit={drumKit}
                        onDrumKitChange={setDrumKit}
                        onShiftPattern={handleShiftPattern}
                        isPerformanceMode={isPerformanceMode}
                        onTogglePerformanceMode={handleTogglePerformanceMode}
                        isSlowComputerMode={isSlowComputerMode}
                        onToggleSlowComputerMode={handleToggleSlowComputerMode}
                        onFactoryReset={handleFactoryReset}
                        tooltipsEnabled={tooltipsEnabled}
                        onToggleTooltips={handleToggleTooltips}
                        showBeatNumbers={showBeatNumbers}
                        onToggleBeatNumbers={handleToggleBeatNumbers}
                        padLabelMode={padLabelMode}
                        onSetPadLabelMode={handleSetPadLabelMode}
                        beatsPerMeasure={beatsPerMeasure}
                        onBeatsPerMeasureChange={handleBeatsPerMeasureChange}
                        keyboardDrummingEnabled={keyboardDrummingEnabled}
                        onToggleKeyboardDrumming={handleToggleKeyboardDrumming}
                        keyboardMap={keyboardMap}
                        onUpdateKeyboardMap={handleUpdateKeyboardMap}
                        isInvertColors={isInvertColors}
                        onToggleInvertColors={handleToggleInvertColors}
                        onToggleCappuccinoMode={handleToggleCappuccinoMode}
                        sixSevenSpeed={sixSevenSpeed}
                        onSixSevenSpeedChange={setSixSevenSpeed}
                        isColorAnimating={isColorAnimating}
                        onToggleColorAnimation={handleToggleColorAnimation}
                        sectionIndex={index}
                        onSectionPointerDown={handlePointerDown}
                        isDragging={isBeingDragged}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div 
            className={appContainerClass}
            style={getAppStyle()}
        >
            <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6">
                <header className="w-full">
                    {visualizerStyle === 'minimal' ? (
                        <div className="relative flex items-center justify-center px-4 py-2.5 bg-[#0e0e11] border border-[#27272a]">
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    onBlur={handleTitleCommit}
                                    onKeyDown={handleTitleKeyDown}
                                    aria-label="Edit header title"
                                    className={`w-full max-w-md text-center bg-transparent border-b border-[#ff3b1d] focus:outline-none font-bold text-[#f4f4f5] ${isCappuccinoMode ? "font-['Dancing_Script'] text-3xl sm:text-4xl normal-case tracking-normal" : "text-lg sm:text-xl font-mono uppercase tracking-[0.14em]"}`}
                                />
                            ) : (
                                <h1
                                    className={`font-bold text-[#f4f4f5] select-none cursor-pointer ${isCappuccinoMode ? "font-['Dancing_Script'] text-3xl sm:text-4xl normal-case tracking-normal" : "text-lg sm:text-xl font-mono uppercase tracking-[0.14em]"}`}
                                    onClick={handleTitleClick}
                                    title="Click to edit title"
                                >
                                    {displayedTitle}
                                </h1>
                            )}
                            <div className="absolute right-3 sm:right-4 font-mono text-[10px] tracking-[0.16em] text-[#71717a] uppercase tabular-nums select-none pointer-events-none hidden min-[400px]:block">
                                {tempo} BPM // {beatsPerMeasure}/4
                            </div>
                        </div>
                    ) : visualizerStyle === 'braun' ? (
                        <div className="relative flex items-center justify-center px-4 py-3 bg-[#f4f2ec] rounded-[10px] border border-[#c4c0b4] shadow-[0_2px_0_#b8b4a8,inset_0_1px_0_#ffffff]">
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    onBlur={handleTitleCommit}
                                    onKeyDown={handleTitleKeyDown}
                                    aria-label="Edit header title"
                                    className={`w-full max-w-xl text-center bg-transparent border-b-2 border-[#d94e1f] focus:outline-none text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1c1a] ${isCappuccinoMode ? "font-['Dancing_Script'] text-4xl" : "font-['Plus_Jakarta_Sans']"}`}
                                />
                            ) : (
                                <h1
                                    className={`text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1c1a] select-none cursor-pointer hover:opacity-80 transition-opacity ${isCappuccinoMode ? "font-['Dancing_Script'] text-4xl" : "font-['Plus_Jakarta_Sans']"}`}
                                    onClick={handleTitleClick}
                                    title="Click to edit title"
                                >
                                    {displayedTitle}
                                </h1>
                            )}
                            <div className="absolute right-3 sm:right-4 font-['Plus_Jakarta_Sans'] font-semibold text-[10px] sm:text-[11px] tracking-wider text-[#737067] uppercase tabular-nums select-none pointer-events-none hidden min-[400px]:block">
                                {tempo} BPM // {beatsPerMeasure}/4
                            </div>
                        </div>
                    ) : visualizerStyle === 'bauhaus' ? (
                        <div className="relative flex items-center justify-center px-5 py-3.5 bg-[#f7f2e7] border-[3px] border-[#141413] shadow-[6px_6px_0px_#141413]">
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    onBlur={handleTitleCommit}
                                    onKeyDown={handleTitleKeyDown}
                                    aria-label="Edit header title"
                                    className={`w-full max-w-xl text-center bg-transparent border-b-2 border-[#d92b2b] focus:outline-none text-2xl sm:text-4xl font-extrabold tracking-wider text-[#141413] ${isCappuccinoMode ? "font-['Dancing_Script'] text-4xl normal-case" : "font-['Outfit'] uppercase"}`}
                                />
                            ) : (
                                <h1
                                    className={`text-2xl sm:text-4xl font-extrabold tracking-wider text-[#141413] select-none cursor-pointer hover:opacity-80 transition-opacity ${isCappuccinoMode ? "font-['Dancing_Script'] text-4xl normal-case" : "font-['Outfit'] uppercase"}`}
                                    onClick={handleTitleClick}
                                    title="Click to edit title"
                                >
                                    {displayedTitle}
                                </h1>
                            )}
                            <div className="absolute right-3 sm:right-5 font-['Outfit'] font-extrabold text-[10px] sm:text-[11px] tracking-wider text-[#141413] uppercase tabular-nums select-none pointer-events-none bg-[#f7f2e7] border-2 border-[#141413] px-2 py-0.5 shadow-[2px_2px_0px_#141413] hidden min-[400px]:block">
                                {tempo} BPM // {beatsPerMeasure}/4
                            </div>
                        </div>
                    ) : visualizerStyle === 'nagra' ? (
                        <div className="relative mt-4 flex items-center justify-center px-8 py-4 bg-gradient-to-b from-[#fffefb] via-[#fff1e8] to-[#fbd7c9] rounded-full border-2 border-white shadow-[0_12px_26px_rgba(32,8,48,0.38),inset_0_3px_6px_#ffffff,inset_0_-6px_14px_rgba(255,118,92,0.24)]">
                            {/* Sculpted Billowing Cloud Domes on the Header Banner */}
                            <span aria-hidden="true" className="absolute -top-3.5 left-12 w-24 h-9 rounded-full bg-gradient-to-b from-white via-[#fff8f3] to-transparent border-t-2 border-white/95 pointer-events-none hidden sm:block" />
                            <span aria-hidden="true" className="absolute -top-5 left-1/2 -translate-x-1/2 w-40 h-11 rounded-full bg-gradient-to-b from-white via-[#fff7f1] to-transparent border-t-2 border-white pointer-events-none" />
                            <span aria-hidden="true" className="absolute -top-3.5 right-12 w-24 h-9 rounded-full bg-gradient-to-b from-white via-[#fff8f3] to-transparent border-t-2 border-white/95 pointer-events-none hidden sm:block" />
                            {/* Left Golden Sun & Cloud Emblem */}
                            <div aria-hidden="true" className="absolute left-5 sm:left-7 hidden sm:flex items-center">
                                <span className="w-6 h-6 rounded-full bg-gradient-to-b from-[#fff29c] via-[#ff9a44] to-[#ff4d5e]" />
                                <span className="-ml-3 mt-2 w-8 h-4 rounded-full bg-gradient-to-b from-white to-[#ffd9c7] border border-white" />
                            </div>
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    onBlur={handleTitleCommit}
                                    onKeyDown={handleTitleKeyDown}
                                    aria-label="Edit header title"
                                    className={`relative z-10 w-full max-w-xl text-center bg-transparent border-b-2 border-[#ff5e4d] focus:outline-none text-2xl sm:text-3xl font-extrabold tracking-tight text-[#3b1547] ${isCappuccinoMode ? "font-['Dancing_Script'] text-4xl" : "font-['Plus_Jakarta_Sans']"}`}
                                />
                            ) : (
                                <h1
                                    className={`relative z-10 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#3b1547] select-none cursor-pointer hover:opacity-80 ${isCappuccinoMode ? "font-['Dancing_Script'] text-4xl" : "font-['Plus_Jakarta_Sans']"}`}
                                    onClick={handleTitleClick}
                                    title="Click to edit title"
                                >
                                    {displayedTitle}
                                </h1>
                            )}
                            <div className="absolute right-4 sm:right-6 z-10 font-['Plus_Jakarta_Sans'] font-extrabold text-[10px] sm:text-[11px] tracking-[0.14em] text-[#d9325e] bg-white border border-white px-3 py-1 rounded-full uppercase tabular-nums select-none pointer-events-none hidden min-[400px]:block">
                                {tempo} BPM // {beatsPerMeasure}/4
                            </div>
                        </div>
                    ) : visualizerStyle === 'koto' ? (
                        <div className="relative flex items-center justify-center px-6 py-3.5 bg-gradient-to-b from-[#1d161f] to-[#120e14] rounded-2xl border border-[#d4af37]/40 shadow-[0_10px_24px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(212,175,55,0.25)]">
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    onBlur={handleTitleCommit}
                                    onKeyDown={handleTitleKeyDown}
                                    aria-label="Edit header title"
                                    className={`w-full max-w-xl text-center bg-transparent border-b-2 border-[#d4af37] focus:outline-none text-3xl sm:text-4xl font-bold tracking-wide text-[#f2ece1] ${isCappuccinoMode ? "font-['Dancing_Script'] text-5xl" : "font-['Cormorant_Garamond']"}`}
                                />
                            ) : (
                                <h1
                                    className={`text-3xl sm:text-4xl font-bold tracking-wide text-[#f2ece1] select-none cursor-pointer hover:opacity-80 transition-opacity ${isCappuccinoMode ? "font-['Dancing_Script'] text-5xl" : "font-['Cormorant_Garamond']"}`}
                                    onClick={handleTitleClick}
                                    title="Click to edit title"
                                >
                                    {displayedTitle}
                                </h1>
                            )}
                            <div className="absolute right-4 sm:right-6 font-['Cormorant_Garamond'] font-bold text-xs sm:text-sm tracking-[0.18em] text-[#d4af37] uppercase tabular-nums select-none pointer-events-none hidden min-[400px]:block">
                                {tempo} BPM // {beatsPerMeasure}/4
                            </div>
                        </div>
                    ) : visualizerStyle === 'cyberpunk' ? (
                        <div className="relative flex items-center justify-center px-5 py-3 bg-[#08080c] border-2 border-[#00ff9f] shadow-[5px_5px_0px_#ff003c]">
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    onBlur={handleTitleCommit}
                                    onKeyDown={handleTitleKeyDown}
                                    aria-label="Edit header title"
                                    className={`w-full max-w-xl text-center bg-transparent border-b-2 border-[#00ff9f] focus:outline-none text-2xl sm:text-3xl font-extrabold text-[#fcee0a] ${isCappuccinoMode ? "font-['Dancing_Script'] text-4xl normal-case tracking-normal" : "font-['JetBrains_Mono'] uppercase tracking-widest"}`}
                                />
                            ) : (
                                <h1
                                    className={`text-2xl sm:text-3xl font-extrabold text-[#fcee0a] select-none cursor-pointer hover:opacity-80 transition-opacity ${isCappuccinoMode ? "font-['Dancing_Script'] text-4xl normal-case tracking-normal" : "font-['JetBrains_Mono'] uppercase tracking-widest"}`}
                                    onClick={handleTitleClick}
                                    title="Click to edit title"
                                >
                                    {displayedTitle}
                                </h1>
                            )}
                            <div className="absolute right-3 sm:right-5 font-['JetBrains_Mono'] font-bold text-[10px] sm:text-[11px] tracking-widest text-[#00ff9f] uppercase tabular-nums select-none pointer-events-none hidden min-[400px]:block">
                                {tempo} BPM // {beatsPerMeasure}/4
                            </div>
                        </div>
                    ) : visualizerStyle === 'default' ? (
                        <div className="relative flex items-center justify-center px-5 py-3 bg-gradient-to-b from-[#132d54] to-[#0b1d38] border border-[#244a7d] shadow-[4px_4px_0px_#050f20]">
                            {/* Left Minimal Color-Block Accent Bar (Powder Pink & Powder Blue) */}
                            <div aria-hidden="true" className="absolute left-0 top-0 bottom-0 flex">
                                <span className="w-1.5 h-full bg-[#f4a8c4]" />
                                <span className="w-1.5 h-full bg-[#8ecaff]" />
                            </div>
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    onBlur={handleTitleCommit}
                                    onKeyDown={handleTitleKeyDown}
                                    aria-label="Edit header title"
                                    className={`w-full max-w-md text-center bg-transparent border-b border-[#f4a8c4] focus:outline-none font-bold text-[#e6f3ff] ${isCappuccinoMode ? "font-['Dancing_Script'] text-3xl sm:text-4xl normal-case tracking-normal" : "text-lg sm:text-xl font-mono uppercase tracking-[0.14em]"}`}
                                />
                            ) : (
                                <h1
                                    className={`font-bold text-[#e6f3ff] select-none cursor-pointer hover:text-[#8ecaff] transition-colors ${isCappuccinoMode ? "font-['Dancing_Script'] text-3xl sm:text-4xl normal-case tracking-normal" : "text-lg sm:text-xl font-mono uppercase tracking-[0.14em]"}`}
                                    onClick={handleTitleClick}
                                    title="Click to edit title"
                                >
                                    {displayedTitle}
                                </h1>
                            )}
                            <div className="absolute right-3 sm:right-4 font-mono text-[10px] tracking-[0.16em] text-[#f4a8c4] bg-[#09172e] border border-[#244a7d] px-2.5 py-0.5 uppercase tabular-nums select-none pointer-events-none hidden min-[400px]:block">
                                {tempo} BPM // {beatsPerMeasure}/4
                            </div>
                        </div>
                    ) : (
                        <div className="relative text-center flex items-center justify-center px-4 py-2">
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    onBlur={handleTitleCommit}
                                    onKeyDown={handleTitleKeyDown}
                                    aria-label="Edit header title"
                                    className={`w-full max-w-xl text-center bg-transparent border-b-2 border-amber-500 focus:outline-none text-3xl sm:text-4xl font-bold tracking-tight ${isCappuccinoMode ? "font-['Dancing_Script'] text-5xl" : ""}`}
                                />
                            ) : (
                                <h1 
                                    className={`text-3xl sm:text-4xl font-bold tracking-tight select-none cursor-pointer hover:opacity-80 transition-opacity ${isCappuccinoMode ? "font-['Dancing_Script'] text-5xl" : ""}`}
                                    onClick={handleTitleClick}
                                    title="Click to edit title"
                                >
                                    {displayedTitle}
                                </h1>
                            )}
                            <div className="absolute right-2 sm:right-4 font-mono text-[10px] sm:text-xs tracking-wider text-amber-500/90 font-semibold uppercase tabular-nums select-none pointer-events-none hidden min-[400px]:block">
                                {tempo} BPM // {beatsPerMeasure}/4
                            </div>
                        </div>
                    )}
                </header>
                <main className="flex flex-col gap-6">
                    <div className={`relative ${visualizerStyle === 'nagra' ? 'p-4 sm:p-6 mt-2' : 'p-2 sm:p-4'} flex flex-col gap-4 ${surface.mainDeck}`}>
                        {visualizerStyle === 'cyberpunk' && (
                            <div aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-[#fcee0a] via-[#00ff9f] to-[#ff003c] -mt-2 sm:-mt-4 mb-1" />
                        )}
                        {visualizerStyle === 'nagra' && (
                            <div aria-hidden="true" className="pointer-events-none select-none">
                                <span className="absolute -top-3.5 left-12 w-28 h-9 rounded-full bg-gradient-to-b from-white via-[#fff8f3] to-transparent border-t-2 border-white" />
                                <span className="absolute -top-4 left-36 w-36 h-11 rounded-full bg-gradient-to-b from-white via-[#fff7f1] to-transparent border-t-2 border-white hidden sm:block" />
                                <span className="absolute -top-3.5 right-36 w-32 h-10 rounded-full bg-gradient-to-b from-white via-[#fff7f1] to-transparent border-t-2 border-white hidden md:block" />
                                <span className="absolute -top-3 right-12 w-24 h-8 rounded-full bg-gradient-to-b from-white via-[#fff8f3] to-transparent border-t-2 border-white" />
                            </div>
                        )}
                        <Controls 
                            isPlaying={isPlaying}
                            onPlayToggle={handlePlayToggle}
                            tempo={tempo}
                            onTempoChange={handleTempoChange}
                            onDirectTempoChange={handleDirectTempoChange}
                            swing={swing}
                            onSwingChange={handleSwingChange}
                            onDirectSwingChange={handleDirectSwingChange}
                            masterVolume={masterVolume}
                            onMasterVolumeChange={handleMasterVolumeChange}
                            onDirectMasterVolumeChange={setMasterVolume}
                            activePattern={activePattern}
                            onPatternToggle={setActivePattern}
                            hueRotate={hueRotate}
                            onHueRotateChange={setHueRotate}
                            isColorAnimating={isColorAnimating}
                            onToggleColorAnimation={handleToggleColorAnimation}
                            onResetColorKnob={handleResetColorKnob}
                            onDownload={handleDownload}
                            onPrepareDrag={handlePrepareDrag}
                            isRendering={isRendering}
                            isPreparingDrag={isPreparingDrag}
                            dragBlobUrl={dragBlobUrl}
                            onClearDragUrl={handleClearDragUrl}
                            savedPatterns={savedPatterns}
                            currentPatternIndex={currentPatternIndex}
                            onSelectPattern={handleSelectPattern}
                            onCatClick={playAirhorn}
                            onClearPattern={handleClearPattern}
                            isCurrentPatternEmpty={isCurrentPatternEmpty}
                            isCappuccinoMode={isCappuccinoMode}
                            visualizerStyle={visualizerStyle}
                            isLiveRecording={isLiveRecording}
                            onToggleLiveRecording={handleToggleLiveRecording}
                            liveRecordings={liveRecordings}
                            onDeleteLiveRecording={handleDeleteLiveRecording}
                            onClearAllLiveRecordings={handleClearAllLiveRecordings}
                            onRenameLiveRecording={handleRenameLiveRecording}
                            beatsPerMeasure={beatsPerMeasure}
                            exportMeasures={exportMeasures}
                            onExportMeasuresChange={setExportMeasures}
                            exportIncludeTail={exportIncludeTail}
                            onExportIncludeTailChange={setExportIncludeTail}
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
                            onToggleRecording={handleToggleRecording}
                            instrumentVisibility={instrumentVisibility}
                            visualizerType={visualizerType}
                            visualizerStyle={visualizerStyle}
                            masterAnalyser={effectAnalysers.masterAnalyser}
                            hueRotate={hueRotate}
                            isPerformanceMode={isPerformanceMode}
                            showBeatNumbers={showBeatNumbers}
                            padLabelMode={padLabelMode}
                            beatsPerMeasure={beatsPerMeasure}
                        />
                    </div>
                    <div ref={sectionsContainerRef} className="flex flex-col gap-6">
                        {sectionOrder.map((key, index) => renderSectionByKey(key, index))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;