import { Instrument } from './types';

export const NUM_STEPS = 16;
export const DEFAULT_TEMPO = 90;
export const MIN_TEMPO = 40;
export const MAX_TEMPO = 240;

export const MIN_FILTER_FREQ = 20;
export const MAX_FILTER_FREQ = 20000;

export const INSTRUMENTS: Instrument[] = ['kick', 'snare', 'snap', 'hihat', 'clave', 'cowbell', 'sample'];

export const INSTRUMENT_LABELS: Record<Instrument, string> = {
    kick: 'KICK',
    snare: 'SNARE',
    snap: 'SNAP',
    hihat: 'HI-HAT',
    clave: 'CLAVE',
    cowbell: 'COWBELL',
    sample: 'SAMPLE',
};

// HSL format: h = hue (0-360), s = saturation (0-100), l = lightness (0-100)
export const BASE_INSTRUMENT_COLORS_HSL = [
    { h: 0,   s: 91, l: 71 }, // Kick (red-400)
    { h: 275, s: 96, l: 76 }, // Snare (purple-400)
    { h: 217, s: 94, l: 67 }, // Snap (blue-400)
    { h: 187, s: 93, l: 69 }, // Hi-Hat (cyan-300)
    { h: 142, s: 71, l: 59 }, // Clave (green-400)
    { h: 53,  s: 98, l: 63 }, // Cowbell (yellow-300)
    { h: 32,  s: 98, l: 65 }, // Sample (orange-400)
];