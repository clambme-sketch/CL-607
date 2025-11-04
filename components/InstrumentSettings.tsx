import React from 'react';
import { Instrument, AllInstrumentParams, InstrumentParams, KickDesignerParams } from '../types';
import { INSTRUMENTS, INSTRUMENT_LABELS, MIN_FILTER_FREQ, MAX_FILTER_FREQ } from '../constants';
import KickDrumDesigner from './BassDrumDesigner';

interface InstrumentSettingsProps {
    isActive: boolean;
    params: AllInstrumentParams;
    instrumentColors: string[];
    onParamChange: (instrument: Instrument, param: keyof InstrumentParams, value: number) => void;
    instrumentVisibility: boolean[];
    onVisibilityChange: (index: number) => void;
    kickDesignerParams: KickDesignerParams;
    onKickDesignerParamChange: (param: keyof KickDesignerParams, value: number) => void;
}

// Convert a linear slider value (0-100) to a logarithmic frequency scale
const sliderToFreq = (value: number): number => {
    const min = Math.log(MIN_FILTER_FREQ);
    const max = Math.log(MAX_FILTER_FREQ);
    const scale = (max - min) / 100;
    return Math.exp(min + scale * value);
};

// Convert a frequency to a linear slider value (0-100)
const freqToSlider = (freq: number): number => {
    if (freq <= MIN_FILTER_FREQ) return 0;
    if (freq >= MAX_FILTER_FREQ) return 100;
    const min = Math.log(MIN_FILTER_FREQ);
    const max = Math.log(MAX_FILTER_FREQ);
    const scale = (max - min) / 100;
    return (Math.log(freq) - min) / scale;
};


type ParamConfig = {
    name: keyof InstrumentParams;
    label: string;
    min: number;
    max: number;
    step: number;
    isLog?: boolean;
    displayTransform?: (value: number) => string;
}

const INSTRUMENT_PARAM_CONFIG: Record<Instrument, ParamConfig[]> = {
    kick: [], // Kick is now handled entirely by BassDrumDesigner
    snare: [
        { name: 'tone', label: 'Tone', min: 0.5, max: 2, step: 0.01 },
        { name: 'decay', label: 'Decay', min: 0.5, max: 2, step: 0.01 },
        { name: 'attack', label: 'Attack', min: 0, max: 1, step: 0.01 },
    ],
    snap: [
        { name: 'pitch', label: 'Pitch', min: 0.5, max: 2, step: 0.01 },
        { name: 'decay', label: 'Decay', min: 0.5, max: 2, step: 0.01 },
        { name: 'attack', label: 'Attack', min: 0, max: 1, step: 0.01 },
    ],
    hihat: [
        { name: 'pitch', label: 'Pitch', min: 0.5, max: 2, step: 0.01 },
        { name: 'decay', label: 'Decay', min: 0.2, max: 2, step: 0.01 },
    ],
    clave: [
        { name: 'pitch', label: 'Pitch', min: 0.5, max: 2, step: 0.01 },
        { name: 'decay', label: 'Decay', min: 0.5, max: 2, step: 0.01 },
    ],
    cowbell: [
        { name: 'pitch', label: 'Pitch', min: 0.5, max: 2, step: 0.01 },
        { name: 'decay', label: 'Decay', min: 0.5, max: 2, step: 0.01 },
        { name: 'attack', label: 'Attack', min: 0, max: 1, step: 0.01 },
    ],
    sample: [
        { name: 'pitch', label: 'Pitch', min: 0.5, max: 2, step: 0.01 },
        { name: 'highPass', label: 'HPF', min: 0, max: 100, step: 1, isLog: true, displayTransform: (v) => `${Math.round(sliderToFreq(v))}Hz` },
        { name: 'lowPass', label: 'LPF', min: 0, max: 100, step: 1, isLog: true, displayTransform: (v) => `${Math.round(sliderToFreq(v))}Hz` },
    ],
};

const InstrumentSettings: React.FC<InstrumentSettingsProps> = ({ isActive, params, instrumentColors, onParamChange, instrumentVisibility, onVisibilityChange, kickDesignerParams, onKickDesignerParamChange }) => {
    if (!isActive) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instrumentVisibility[0] && (
                <div className="bg-gray-900/50 rounded-lg p-4 flex flex-col gap-3 md:col-span-2 lg:col-span-3">
                    <div className="flex items-center justify-between gap-3">
                        <h4 className="font-bold text-sm uppercase tracking-wider" style={{ color: instrumentColors[0] }}>
                            {INSTRUMENT_LABELS['kick']} DESIGNER
                        </h4>
                        <input
                            type="checkbox"
                            id="visibility-toggle-kick"
                            aria-label={`Toggle ${INSTRUMENT_LABELS['kick']} visibility`}
                            checked={instrumentVisibility[0]}
                            onChange={() => onVisibilityChange(0)}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                    </div>
                    <KickDrumDesigner
                        isActive={isActive}
                        params={kickDesignerParams}
                        onParamChange={onKickDesignerParamChange}
                    />
                </div>
            )}

            {INSTRUMENTS.map((instrument, index) => {
                if (instrument === 'kick' || !instrumentVisibility[index]) return null;

                const config = INSTRUMENT_PARAM_CONFIG[instrument];
                const currentParams = params[instrument];
                const color = instrumentColors[index];

                return (
                    <div key={instrument} className="bg-gray-900/50 rounded-lg p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                            <h4 className="font-bold text-sm uppercase tracking-wider" style={{ color }}>
                                {INSTRUMENT_LABELS[instrument]}
                            </h4>
                            <input
                                type="checkbox"
                                id={`visibility-toggle-${instrument}`}
                                aria-label={`Toggle ${INSTRUMENT_LABELS[instrument]} visibility`}
                                checked={instrumentVisibility[index]}
                                onChange={() => onVisibilityChange(index)}
                                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex flex-col gap-3">
                            {config.map(paramConfig => {
                                let value;
                                if (paramConfig.isLog) {
                                    value = freqToSlider(currentParams?.[paramConfig.name] ?? (paramConfig.name === 'highPass' ? MIN_FILTER_FREQ : MAX_FILTER_FREQ));
                                } else {
                                    value = currentParams?.[paramConfig.name] ?? 1;
                                }

                                return (
                                    <div key={paramConfig.name} className="grid grid-cols-4 items-center gap-2">
                                        <label htmlFor={`${instrument}-${paramConfig.name}`} className="text-xs text-gray-400 col-span-1">
                                            {paramConfig.label}
                                        </label>
                                        <input
                                            type="range"
                                            id={`${instrument}-${paramConfig.name}`}
                                            min={paramConfig.min}
                                            max={paramConfig.max}
                                            step={paramConfig.step}
                                            value={value}
                                            onChange={(e) => {
                                                const numericValue = parseFloat(e.target.value);
                                                const finalValue = paramConfig.isLog ? sliderToFreq(numericValue) : numericValue;
                                                onParamChange(instrument, paramConfig.name, finalValue);
                                            }}
                                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer col-span-2"
                                            style={{ accentColor: color }}
                                        />
                                        <span className="text-xs text-gray-500 text-right tabular-nums col-span-1">
                                            {paramConfig.displayTransform ? paramConfig.displayTransform(value) : (currentParams?.[paramConfig.name] ?? value).toFixed(2) }
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default React.memo(InstrumentSettings);