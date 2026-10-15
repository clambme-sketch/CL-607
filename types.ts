export type Instrument = 'kick' | 'snare' | 'hihat' | 'snap' | 'clave' | 'cowbell' | 'sample';

export type VisualizerType = 'waveform' | 'lissajous' | 'spectrum';
export type VisualizerStyle = 'default' | 'cyberpunk' | 'braun' | 'bauhaus' | 'nagra' | 'koto' | 'minimal';
export type StutterDivision = '1/4' | '1/8' | '1/8T' | '1/16' | '1/16T' | '1/32';
export type BeatRepeatDivision = '2BEATS' | '1BEAT' | '1/2BEAT' | '1/4BEAT';
export type DelayDivision = '1/32' | '1/16' | '1/8T' | '1/8' | '1/8D' | '1/4T' | '1/4' | '1/4D' | '1/2';

export type Grid = boolean[][];

export type InstrumentParams = {
    pitch: number;
    decay: number;
    tone: number;
    attack: number;
    compression: number;
    highPass: number;
    lowPass: number;
};

export type KickDesignerParams = {
    pitch: number;
    decay: number;
    attack: number;
    startFreq: number;
    pitchDropTime: number;
    resonance: number;
    bodyGain: number;
    clickMix: number;
    clickTone: number;
    clickDecay: number;
    saturationAmount: number;
};


export type AllInstrumentParams = Record<Instrument, Partial<InstrumentParams>>;

export type SavedPattern = {
    grids: { a: Grid, b: Grid };
    volumes: number[];
    tempo: number;
    instrumentParams: AllInstrumentParams;
    swing: number;
    beatsPerMeasure: number;
};

export type LiveRecording = {
    id: string;
    name: string;
    url: string;
    blob: Blob;
    duration: number;
    createdAt: string;
};