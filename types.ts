export type Instrument = 'kick' | 'snare' | 'hihat' | 'snap' | 'clave' | 'cowbell' | 'sample';

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
};