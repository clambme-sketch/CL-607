import { useRef, useCallback } from 'react';
import { MAX_FILTER_FREQ, MIN_FILTER_FREQ, INSTRUMENTS } from '../constants';
import { Grid, Instrument, AllInstrumentParams, InstrumentParams, KickDesignerParams } from '../types';

export interface AllAnalyserNodes {
    instrumentAnalysers: Record<Instrument, AnalyserNode | null>;
    masterAnalyser: AnalyserNode | null;
    postFilterAnalyser: AnalyserNode | null;
    reverbAnalyser: AnalyserNode | null;
    delayAnalyser: AnalyserNode | null;
    sidechainVisualiserAnalyser: AnalyserNode | null;
    crushAnalyser: AnalyserNode | null;
    tapeSaturationAnalyser: AnalyserNode | null;
    envelopeFilterAnalyser: AnalyserNode | null;
    lofiDryAnalyser: AnalyserNode | null;
    lofiWetAnalyser: AnalyserNode | null;
}

// --- AUDIO WORKLET PROCESSORS ---

const BITCRUSHER_PROCESSOR_CODE = `
class BitcrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'amount', defaultValue: 0, minValue: 0, maxValue: 1 }];
  }

  constructor() {
    super();
    this.phase_ = 0;
    this.lastSampleValue_ = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const amountValues = parameters.amount;

    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      for (let i = 0; i < inputChannel.length; i++) {
        const amount = amountValues.length > 1 ? amountValues[i] : amountValues[0];
        
        if (amount === 0) {
          outputChannel[i] = inputChannel[i];
          continue;
        }

        const bitDepth = 16 - 14 * amount;
        const frequencyReduction = amount * 0.9;
        const step = Math.pow(0.5, bitDepth);
        
        this.phase_ += frequencyReduction;
        if (this.phase_ >= 1.0) {
          this.phase_ -= 1.0;
          this.lastSampleValue_ = step * Math.floor(inputChannel[i] / step + 0.5);
        }
        outputChannel[i] = this.lastSampleValue_;
      }
    }
    return true; // Keep processor alive
  }
}
registerProcessor('bitcrusher-processor', BitcrusherProcessor);
`;

const RECORDER_PROCESSOR_CODE = `
class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    // We expect one input, with one channel.
    const inputChannelData = inputs[0][0];
    if (inputChannelData) {
      // Post a copy of the input buffer back to the main thread as a transferable object.
      const pcmData = new Float32Array(inputChannelData);
      this.port.postMessage(pcmData, [pcmData.buffer]);
    }
    return true; // Keep processor alive
  }
}
registerProcessor('recorder-processor', RecorderProcessor);
`;

const createImpulseResponse = (context: AudioContext | OfflineAudioContext, decaySeconds: number): AudioBuffer => {
    const impulseSampleRate = context.sampleRate;
    const impulseLength = Math.ceil(impulseSampleRate * Math.max(0.01, decaySeconds));
    const impulseBuffer = context.createBuffer(2, impulseLength, impulseSampleRate);
    const left = impulseBuffer.getChannelData(0);
    const right = impulseBuffer.getChannelData(1);
    for (let i = 0; i < impulseLength; i++) {
        const n = i / impulseLength;
        // Use a power of 2.5 for a slightly more natural decay curve
        const envelope = Math.pow(1 - n, 2.5);
        left[i] = (Math.random() * 2 - 1) * envelope;
        right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulseBuffer;
};

// --- WAV FILE CONVERSION HELPERS ---
const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferOut = new ArrayBuffer(length);
    const view = new DataView(bufferOut);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++)
      channels.push(buffer.getChannelData(i));

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true); // write 16-bit sample
        pos += 2;
      }
      offset++; // next source sample
    }

    return new Blob([view], { type: 'audio/wav' });

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
};

const DEFAULT_PARAMS: AllInstrumentParams = {
    kick: {}, // Kick params are now fully handled by KickDesignerParams
    snare: { tone: 1, decay: 1, attack: 0 },
    hihat: { pitch: 1, decay: 1 },
    snap: { pitch: 1, decay: 1, attack: 0 },
    clave: { pitch: 1, decay: 1 },
    cowbell: { pitch: 1, decay: 1, attack: 0 },
    sample: { pitch: 1, highPass: MIN_FILTER_FREQ, lowPass: MAX_FILTER_FREQ },
};

const RAMP_TIME = 0.01; // 10ms ramp for all parameter changes to prevent clicks

// --- RENDER AIRHORN FUNCTION ---
const renderAirhorn = async (context: AudioContext | OfflineAudioContext): Promise<AudioBuffer> => {
    const duration = 1.0;
    // Render to a mono buffer. Add a bit of extra time to prevent clipping at the end.
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(context.sampleRate * (duration + 0.1)), context.sampleRate);
    const time = 0;

    // Gain envelope for the sound
    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(0, time);
    masterGain.gain.linearRampToValueAtTime(0.056, time + 0.01); // Sharp attack
    masterGain.gain.exponentialRampToValueAtTime(0.0001, time + duration); // Slow decay
    masterGain.connect(offlineCtx.destination);

    const PITCH_SHIFT_RATIO = Math.pow(2, 5 / 12); // Perfect fourth

    // --- Horn Tone 1 (A3) ---
    const osc1 = offlineCtx.createOscillator();
    osc1.type = 'sawtooth';
    const freq1 = 164.81 * PITCH_SHIFT_RATIO;
    osc1.frequency.setValueAtTime(freq1 * 1.25, time); // Pitch drop
    osc1.frequency.exponentialRampToValueAtTime(freq1, time + 0.1);
    osc1.connect(masterGain);
    
    // --- Horn Tone 2 (C#4) ---
    const osc2 = offlineCtx.createOscillator();
    osc2.type = 'sawtooth';
    const freq2 = 207.65 * PITCH_SHIFT_RATIO;
    osc2.frequency.setValueAtTime(freq2 * 1.25, time); // Pitch drop
    osc2.frequency.exponentialRampToValueAtTime(freq2, time + 0.1);
    osc2.connect(masterGain);
    
    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
    
    return await offlineCtx.startRendering();
};


export const useAudioEngine = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const masterCompressorRef = useRef<DynamicsCompressorNode | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const lowPassFilterRef = useRef<BiquadFilterNode | null>(null);
    const highPassFilterRef = useRef<BiquadFilterNode | null>(null);
    const instrumentAnalysersRef = useRef<Record<Instrument, AnalyserNode | null>>({ kick: null, snare: null, hihat: null, snap: null, clave: null, cowbell: null, sample: null });
    const convolverRef = useRef<ConvolverNode | null>(null);
    const reverbWetGainRef = useRef<GainNode | null>(null);
    const reverbSendBusRef = useRef<GainNode | null>(null);
    const delayNodeRef = useRef<DelayNode | null>(null);
    const delayFeedbackGainRef = useRef<GainNode | null>(null);
    const delayWetGainRef = useRef<GainNode | null>(null);
    const delaySendBusRef = useRef<GainNode | null>(null);
    const sidechainDuckNodeRef = useRef<GainNode | null>(null);
    const kickSidechainAmountRef = useRef<number>(0);
    
    // Refs for effect analysers
    const masterAnalyserRef = useRef<AnalyserNode | null>(null);
    const postFilterAnalyserRef = useRef<AnalyserNode | null>(null);
    const reverbAnalyserRef = useRef<AnalyserNode | null>(null);
    const delayAnalyserRef = useRef<AnalyserNode | null>(null);
    const sidechainVisualiserAnalyserRef = useRef<AnalyserNode | null>(null);
    const sidechainVisualiserGainRef = useRef<GainNode | null>(null);

    // Bitcrusher Refs
    const crusherWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const crusherAnalyserRef = useRef<AnalyserNode | null>(null);

    // Tape Saturation Refs (as Insert)
    const tapeSaturationInputGainRef = useRef<GainNode | null>(null);
    const tapeSaturationOutputGainRef = useRef<GainNode | null>(null);
    const tapeSaturationDryGainRef = useRef<GainNode | null>(null);
    const tapeSaturationNodeRef = useRef<WaveShaperNode | null>(null);
    const tapeSaturationWetGainRef = useRef<GainNode | null>(null);
    const tapeSaturationAnalyserRef = useRef<AnalyserNode | null>(null);
    const tapeToneFilterRef = useRef<BiquadFilterNode | null>(null);

    // Envelope Filter Refs
    const envelopeFilterInputRef = useRef<GainNode | null>(null);
    const envelopeFilterNodeRef = useRef<BiquadFilterNode | null>(null);
    const envelopeDetectorRef = useRef<WaveShaperNode | null>(null);
    const envelopeSmootherRef = useRef<BiquadFilterNode | null>(null);
    const envelopeAmountRef = useRef<GainNode | null>(null);
    const envelopeFilterWetGainRef = useRef<GainNode | null>(null);
    const envelopeFilterAnalyserRef = useRef<AnalyserNode | null>(null);
    const envelopeFilterBaseFreqNodeRef = useRef<ConstantSourceNode | null>(null);

    // --- REFS FOR HIGH-QUALITY RECORDING ---
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const micStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const recorderWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const recordedPcmDataRef = useRef<Float32Array[]>([]);
    
    // Refs for sampler channel
    const sampleHighPassRef = useRef<BiquadFilterNode | null>(null);
    const sampleLowPassRef = useRef<BiquadFilterNode | null>(null);
    
    // Refs for instrument settings
    const instrumentParamsRef = useRef<AllInstrumentParams>(JSON.parse(JSON.stringify(DEFAULT_PARAMS)));

    // Refs for pre-rendered instrument buffers
    const instrumentBuffersRef = useRef<Record<Instrument, AudioBuffer | null>>({
        kick: null,
        snare: null,
        hihat: null,
        snap: null,
        clave: null,
        cowbell: null,
        sample: null,
    });
    const noiseBufferDataRef = useRef<Float32Array | null>(null);
    
    // --- NEW DJ EFFECT REFS ---

    // Isolator (3-band EQ)
    const isolatorLowFilterRef = useRef<BiquadFilterNode | null>(null);
    const isolatorMidFilterRef = useRef<BiquadFilterNode | null>(null);
    const isolatorHighFilterRef = useRef<BiquadFilterNode | null>(null);
    const isolatorLowGainRef = useRef<GainNode | null>(null);
    const isolatorMidGainRef = useRef<GainNode | null>(null);
    const isolatorHighGainRef = useRef<GainNode | null>(null);
    const isolatorOutputRef = useRef<GainNode | null>(null);
    
    // XY Filter
    const xyFilterInputGainRef = useRef<GainNode | null>(null);
    const xyFilterDryGainRef = useRef<GainNode | null>(null);
    const xyFilterWetGainRef = useRef<GainNode | null>(null);
    const xyFilterNodeRef = useRef<BiquadFilterNode | null>(null);
    const xyFilterSaturatorRef = useRef<WaveShaperNode | null>(null);
    const xyFilterOutputGainRef = useRef<GainNode | null>(null);
    
    // Lo-Fi Radio
    const lofiInputRef = useRef<GainNode | null>(null);
    const lofiOutputRef = useRef<GainNode | null>(null);
    const lofiDryGainRef = useRef<GainNode | null>(null);
    const lofiWetGainRef = useRef<GainNode | null>(null);
    const lofiBandpassFilterRef = useRef<BiquadFilterNode | null>(null);
    const lofiDistortionRef = useRef<WaveShaperNode | null>(null);
    const lofiNoiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const lofiNoiseGainRef = useRef<GainNode | null>(null);
    const lofiDryAnalyserRef = useRef<AnalyserNode | null>(null);
    const lofiWetAnalyserRef = useRef<AnalyserNode | null>(null);

    // Airhorn Easter Egg
    const airhornDistortionRef = useRef<WaveShaperNode | null>(null);
    const airhornBufferRef = useRef<AudioBuffer | null>(null);

    // --- INSTRUMENT RENDERING & HELPERS ---
    const makeTapeSaturationCurve = (amount: number): Float32Array => {
        const k = amount * 10; // scale amount for a nice range
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i ) {
            const x = i * 2 / n_samples - 1;
            curve[i] = Math.tanh(x * (1 + k));
        }
        return curve;
    };

    const makeFilterDriveCurve = (amount: number): Float32Array => {
        const k = amount * 20; // more aggressive than tape
        const n_samples = 256; // less samples is fine for this, more performant
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i ) {
            const x = i * 2 / n_samples - 1;
            curve[i] = Math.tanh(x * (1 + k));
        }
        return curve;
    };
    
    const renderKick = async (context: AudioContext | OfflineAudioContext, params: KickDesignerParams, noiseData: Float32Array): Promise<AudioBuffer> => {
        const baseDuration = 0.8 * params.decay;
        const duration = Math.max(0.1, baseDuration);
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(context.sampleRate * (duration + 0.1)), context.sampleRate);
        const time = 0;

        // --- FINAL STAGE: TRANSIENT REMOVER COMPRESSOR ---
        const transientRemover = offlineCtx.createDynamicsCompressor();
        transientRemover.threshold.setValueAtTime(-6, time);
        transientRemover.knee.setValueAtTime(10, time);
        transientRemover.ratio.setValueAtTime(12, time);
        transientRemover.attack.setValueAtTime(0.001, time); // 1ms attack
        transientRemover.release.setValueAtTime(0.02, time); // 20ms release
        transientRemover.connect(offlineCtx.destination);
    
        // --- MASTER GAIN & SATURATOR (stage before transient remover) ---
        const masterGain = offlineCtx.createGain();
        masterGain.connect(transientRemover);
    
        const saturator = offlineCtx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = i * 2 / 256 - 1;
            curve[i] = Math.tanh(x * params.saturationAmount);
        }
        saturator.curve = curve;
        saturator.oversample = '4x'; // CRITICAL FOR PREVENTING ALIASING
        saturator.connect(masterGain);
    
        // --- KICK BODY (Clean Sine Oscillator with Pitch Drop) ---
        const osc = offlineCtx.createOscillator();
        osc.type = 'sine';
    
        const baseFreq = 50 * params.pitch;
        osc.frequency.setValueAtTime(params.startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(baseFreq, time + params.pitchDropTime);
    
        const bodyGain = offlineCtx.createGain();
        const attackTime = 0.002 + (params.attack * 0.01);
        bodyGain.gain.setValueAtTime(0, time);
        bodyGain.gain.linearRampToValueAtTime(params.bodyGain, time + attackTime);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        
        osc.connect(bodyGain);
        bodyGain.connect(saturator);
    
        // --- KICK CLICK (Noise part) ---
        if (params.clickMix > 0.001) {
            const noise = offlineCtx.createBufferSource();
            const bufferSize = Math.min(Math.ceil(offlineCtx.sampleRate * 0.1), noiseData.length);
            const buffer = offlineCtx.createBuffer(1, bufferSize, offlineCtx.sampleRate);
            buffer.copyToChannel(noiseData.subarray(0, bufferSize), 0);
            noise.buffer = buffer;
    
            const noiseFilter = offlineCtx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(params.clickTone, time);
    
            const clickGain = offlineCtx.createGain();
            clickGain.gain.setValueAtTime(0, time);
            clickGain.gain.linearRampToValueAtTime(params.clickMix * 0.8, time + 0.001);
            clickGain.gain.exponentialRampToValueAtTime(0.001, time + params.clickDecay);
    
            noise.connect(noiseFilter);
            noiseFilter.connect(clickGain);
            clickGain.connect(masterGain); // Connect click directly to master gain, bypassing body saturator
    
            noise.start(time);
            noise.stop(time + params.clickDecay + 0.01);
        }
    
        osc.start(time);
        osc.stop(time + duration);
    
        return await offlineCtx.startRendering();
    };


    const renderSnare = async (context: AudioContext | OfflineAudioContext, params: { tone: number, decay: number, attack: number }, noiseData: Float32Array): Promise<AudioBuffer> => {
        const duration = 0.2 * params.decay;
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const time = 0;

        // --- 808 Snare Body (2 detuned triangle waves) ---
        const osc1 = offlineCtx.createOscillator();
        const osc2 = offlineCtx.createOscillator();
        osc1.type = 'triangle';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(180, time);
        osc2.frequency.setValueAtTime(330, time);

        const oscGain = offlineCtx.createGain();
        oscGain.gain.setValueAtTime(0, time);
        oscGain.gain.linearRampToValueAtTime(0.5, time + 0.001); // Sharp attack, reduced gain
        oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1 * params.decay); // Fast decay for the body
        
        osc1.connect(oscGain);
        osc2.connect(oscGain);
        oscGain.connect(offlineCtx.destination);

        // --- 808 Snare Snap (filtered noise from pre-rendered buffer) ---
        const noise = offlineCtx.createBufferSource();
        const bufferSize = Math.min(
            Math.ceil(offlineCtx.sampleRate * duration), 
            noiseData.length
        );
        const buffer = offlineCtx.createBuffer(1, bufferSize, offlineCtx.sampleRate);
        buffer.copyToChannel(noiseData.subarray(0, bufferSize), 0);
        noise.buffer = buffer;

        const noiseFilter = offlineCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(1500 * params.tone, time);

        const noiseGain = offlineCtx.createGain();
        const noiseAttackTime = 0.001 + (params.attack * 0.01);
        noiseGain.gain.setValueAtTime(0, time);
        noiseGain.gain.linearRampToValueAtTime(0.5, time + noiseAttackTime); // Reduced gain
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(offlineCtx.destination);
        
        osc1.start(time);
        osc2.start(time);
        noise.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);
        noise.stop(time + duration);

        return await offlineCtx.startRendering();
    };

    const renderHiHat = async (context: AudioContext | OfflineAudioContext, params: { pitch: number, decay: number }, noiseData: Float32Array): Promise<AudioBuffer> => {
        const duration = 0.05 * params.decay;
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const time = 0;

        const noise = offlineCtx.createBufferSource();
        const bufferSize = Math.min(
            Math.ceil(offlineCtx.sampleRate * duration),
            noiseData.length
        );
        const buffer = offlineCtx.createBuffer(1, bufferSize, offlineCtx.sampleRate);
        buffer.copyToChannel(noiseData.subarray(0, bufferSize), 0);
        noise.buffer = buffer;

        const bandpass = offlineCtx.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.setValueAtTime(10000 * params.pitch, time);
        bandpass.Q.setValueAtTime(0.5, time);
        
        const highpass = offlineCtx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.setValueAtTime(7000, time);
        
        const gain = offlineCtx.createGain();
        gain.gain.setValueAtTime(0.8, time); // Reduced gain from 1
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        noise.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(gain);
        gain.connect(offlineCtx.destination);
        
        noise.start(time);
        noise.stop(time + duration);
        return await offlineCtx.startRendering();
    };

    const renderSnap = async (context: AudioContext | OfflineAudioContext, params: { pitch: number, decay: number, attack: number }, noiseData: Float32Array): Promise<AudioBuffer> => {
        const attackTime = params.attack * 0.01; // Max 10ms attack
        const decayTime = (0.04 * params.decay) - attackTime;
        const duration = attackTime + Math.max(0.01, decayTime);
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const time = 0;

        const noise = offlineCtx.createBufferSource();
        const bufferSize = Math.min(
            Math.ceil(offlineCtx.sampleRate * duration),
            noiseData.length
        );
        const buffer = offlineCtx.createBuffer(1, bufferSize, offlineCtx.sampleRate);
        buffer.copyToChannel(noiseData.subarray(0, bufferSize), 0);
        noise.buffer = buffer;

        const bandpass = offlineCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        
        const gainNode = offlineCtx.createGain();
        
        noise.connect(bandpass);
        bandpass.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        
        bandpass.frequency.setValueAtTime(4000 * params.pitch, time);
        bandpass.frequency.exponentialRampToValueAtTime(1500 * params.pitch, time + (0.03 * params.decay));
        bandpass.Q.value = 3;

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.96, time + attackTime); // Increased gain by 20% (from 0.8)
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

        noise.start(time);
        noise.stop(time + duration);
        return await offlineCtx.startRendering();
    };

    const renderClave = async (context: AudioContext | OfflineAudioContext, params: { pitch: number, decay: number }): Promise<AudioBuffer> => {
        const duration = 0.1 * params.decay;
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const time = 0;
        
        const osc1 = offlineCtx.createOscillator();
        const osc2 = offlineCtx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(2200 * params.pitch, time);
        osc2.frequency.setValueAtTime(2215 * params.pitch, time);
        
        const gain = offlineCtx.createGain();
        // Reduced gain to 0.5 to prevent clipping when oscillators are summed
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(offlineCtx.destination);
        
        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);
        return await offlineCtx.startRendering();
    };
    
    const renderCowbell = async (context: AudioContext | OfflineAudioContext, params: { pitch: number, decay: number, attack: number }): Promise<AudioBuffer> => {
        const duration = 0.5 * params.decay;
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const time = 0;
        
        const osc1 = offlineCtx.createOscillator();
        const osc2 = offlineCtx.createOscillator();
        osc1.type = 'square';
        osc2.type = 'square';
        osc1.frequency.value = 540 * params.pitch;
        osc2.frequency.value = 810 * params.pitch;
        
        const lowpass = offlineCtx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 6000;
        
        const bandpass = offlineCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1200 * params.pitch;
        bandpass.Q.value = 1.2;
        
        const gain = offlineCtx.createGain();
        const attackTime = 0.001 + params.attack * 0.01;
        gain.gain.setValueAtTime(0, time);
        // Reduced peak gain to 0.5 to prevent clipping from summed square waves
        gain.gain.linearRampToValueAtTime(0.5, time + attackTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        
        osc1.connect(lowpass);
        osc2.connect(lowpass);
        lowpass.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(offlineCtx.destination);
        
        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);
        return await offlineCtx.startRendering();
    };


    const setup = useCallback(async (kickDesignerParams: KickDesignerParams): Promise<{ analysers: AllAnalyserNodes, context: AudioContext } | null> => {
        if (!audioContextRef.current) {
            try {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = context;

                if (context.state === 'suspended') {
                    const buffer = context.createBuffer(1, 1, 22050);
                    const source = context.createBufferSource();
                    source.buffer = buffer;
                    source.connect(context.destination);
                    source.start(0);
                    await context.resume();
                }

                // --- Load Audio Worklets ---
                const crusherBlob = new Blob([BITCRUSHER_PROCESSOR_CODE], { type: 'application/javascript' });
                const crusherUrl = URL.createObjectURL(crusherBlob);
                const recorderBlob = new Blob([RECORDER_PROCESSOR_CODE], { type: 'application/javascript' });
                const recorderUrl = URL.createObjectURL(recorderBlob);
                await Promise.all([
                    context.audioWorklet.addModule(crusherUrl),
                    context.audioWorklet.addModule(recorderUrl)
                ]);
                URL.revokeObjectURL(crusherUrl);
                URL.revokeObjectURL(recorderUrl);
                
                // --- Pre-generate noise for snare synthesis ---
                const noiseDuration = 2; // seconds
                const noiseBufferSize = context.sampleRate * noiseDuration;
                const noiseBuffer = context.createBuffer(1, noiseBufferSize, context.sampleRate);
                const noiseOutput = noiseBuffer.getChannelData(0);
                for (let i = 0; i < noiseBufferSize; i++) {
                    noiseOutput[i] = Math.random() * 2 - 1;
                }
                noiseBufferDataRef.current = noiseOutput;

                // --- Master "Glue" Compressor & Gain ---
                const masterCompressor = context.createDynamicsCompressor();
                masterCompressor.threshold.setValueAtTime(-18, context.currentTime);
                masterCompressor.knee.setValueAtTime(20, context.currentTime);
                masterCompressor.ratio.setValueAtTime(2.5, context.currentTime);
                masterCompressor.attack.setValueAtTime(0.005, context.currentTime);
                masterCompressor.release.setValueAtTime(0.15, context.currentTime);
                masterCompressorRef.current = masterCompressor;

                // --- Pre-build Airhorn effect chain for instant playback ---
                const airhornDistortion = context.createWaveShaper();
                const distortionCurve = new Float32Array(256);
                for (let i = 0; i < 256; i++) {
                    const x = (i * 2 / 256) - 1;
                    distortionCurve[i] = Math.tanh(x * 2.5);
                }
                airhornDistortion.curve = distortionCurve;
                airhornDistortion.connect(masterCompressor);
                airhornDistortionRef.current = airhornDistortion;
                
                const masterGain = context.createGain();
                masterGain.gain.value = 0.7;
                masterGainRef.current = masterGain;

                // Master Analyser (for main oscilloscope)
                const masterAnalyser = context.createAnalyser();
                masterAnalyserRef.current = masterAnalyser;

                masterCompressor.connect(masterAnalyser);
                masterAnalyser.connect(masterGain);
                masterGain.connect(context.destination);

                // --- Master Filters ---
                const highPass = context.createBiquadFilter();
                highPass.type = 'highpass';
                highPass.frequency.value = MIN_FILTER_FREQ;
                highPassFilterRef.current = highPass;

                const lowPass = context.createBiquadFilter();
                lowPass.type = 'lowpass';
                lowPass.frequency.value = MAX_FILTER_FREQ;
                lowPassFilterRef.current = lowPass;

                // --- Tape Saturation (Insert Effect) ---
                const tapeSaturationInputGain = context.createGain();
                const tapeSaturationOutputGain = context.createGain();
                const tapeSaturationDryGain = context.createGain();
                tapeSaturationInputGainRef.current = tapeSaturationInputGain;
                tapeSaturationOutputGainRef.current = tapeSaturationOutputGain;
                tapeSaturationDryGainRef.current = tapeSaturationDryGain;
                
                const tapeSaturationNode = context.createWaveShaper();
                tapeSaturationNode.curve = makeTapeSaturationCurve(0);
                tapeSaturationNode.oversample = '2x';
                tapeSaturationNodeRef.current = tapeSaturationNode;

                const tapeSaturationWetGain = context.createGain();
                tapeSaturationWetGain.gain.value = 0;
                tapeSaturationDryGain.gain.value = 1;
                tapeSaturationWetGainRef.current = tapeSaturationWetGain;

                const tapeToneFilter = context.createBiquadFilter();
                tapeToneFilter.type = 'lowpass';
                tapeToneFilter.frequency.value = MAX_FILTER_FREQ;
                tapeToneFilterRef.current = tapeToneFilter;

                tapeSaturationAnalyserRef.current = context.createAnalyser();

                // Internal Routing for Tape Saturation Insert
                tapeSaturationInputGain.connect(tapeSaturationDryGain).connect(tapeSaturationOutputGain);
                tapeSaturationInputGain.connect(tapeSaturationNode);
                tapeSaturationNode.connect(tapeToneFilter);
                tapeToneFilter.connect(tapeSaturationWetGain);
                tapeSaturationWetGain.connect(tapeSaturationAnalyserRef.current);
                tapeSaturationAnalyserRef.current.connect(tapeSaturationOutputGain);


                // --- Effect Analysers ---
                postFilterAnalyserRef.current = context.createAnalyser();
                reverbAnalyserRef.current = context.createAnalyser();
                delayAnalyserRef.current = context.createAnalyser();
                sidechainVisualiserAnalyserRef.current = context.createAnalyser();
                envelopeFilterAnalyserRef.current = context.createAnalyser();
                lofiDryAnalyserRef.current = context.createAnalyser();
                lofiWetAnalyserRef.current = context.createAnalyser();
                
                // Chain: High Pass -> Low Pass -> TAPE SATURATION -> Post-Filter Analyser
                highPass.connect(lowPass);
                lowPass.connect(tapeSaturationInputGain);
                tapeSaturationOutputGain.connect(postFilterAnalyserRef.current);
                
                // --- Sidechain ---
                const sidechainDuckNode = context.createGain();
                sidechainDuckNodeRef.current = sidechainDuckNode;
                sidechainDuckNode.connect(highPass);

                // Sidechain Visualizer Setup
                const sidechainVisualiserGain = context.createGain();
                sidechainVisualiserGainRef.current = sidechainVisualiserGain;
                sidechainVisualiserGain.gain.value = 0.0001;
                const osc = context.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = 60;
                osc.connect(sidechainVisualiserGain);
                sidechainVisualiserGain.connect(sidechainVisualiserAnalyserRef.current);
                osc.start();

                // --- Isolator (3-Band EQ) ---
                const isoLowF = context.createBiquadFilter();
                isoLowF.type = 'lowpass';
                isoLowF.frequency.value = 300;
                isolatorLowFilterRef.current = isoLowF;

                const isoMidF = context.createBiquadFilter();
                isoMidF.type = 'bandpass';
                isoMidF.frequency.value = 1500;
                isoMidF.Q.value = 1;
                isolatorMidFilterRef.current = isoMidF;

                const isoHighF = context.createBiquadFilter();
                isoHighF.type = 'highpass';
                isoHighF.frequency.value = 3000;
                isolatorHighFilterRef.current = isoHighF;

                const isoLowG = context.createGain();
                const isoMidG = context.createGain();
                const isoHighG = context.createGain();
                isolatorLowGainRef.current = isoLowG;
                isolatorMidGainRef.current = isoMidG;
                isolatorHighGainRef.current = isoHighG;

                const isoOutput = context.createGain();
                isolatorOutputRef.current = isoOutput;

                postFilterAnalyserRef.current.connect(isoLowF);
                postFilterAnalyserRef.current.connect(isoMidF);
                postFilterAnalyserRef.current.connect(isoHighF);
                isoLowF.connect(isoLowG);
                isoMidF.connect(isoMidG);
                isoHighF.connect(isoHighG);
                isoLowG.connect(isoOutput);
                isoMidG.connect(isoOutput);
                isoHighG.connect(isoOutput);
                
                // --- LO-FI RADIO (Insert) ---
                const lofiInput = context.createGain();
                lofiInputRef.current = lofiInput;
                const lofiOutput = context.createGain();
                lofiOutputRef.current = lofiOutput;
                isoOutput.connect(lofiInput);

                const lofiDryGain = context.createGain();
                lofiDryGain.gain.value = 1;
                lofiDryGainRef.current = lofiDryGain;

                const lofiWetGain = context.createGain();
                lofiWetGain.gain.value = 0;
                lofiWetGainRef.current = lofiWetGain;

                // Dry path for XY Scope
                lofiInput.connect(lofiDryGain).connect(lofiDryAnalyserRef.current).connect(lofiOutput);

                // Wet path
                const lofiBandpass = context.createBiquadFilter();
                lofiBandpass.type = 'bandpass';
                lofiBandpass.frequency.value = 3500;
                lofiBandpass.Q.value = 2; // Resonant peak
                lofiBandpassFilterRef.current = lofiBandpass;

                const lofiDistortion = context.createWaveShaper();
                const initialLofiCurve = new Float32Array(256);
                 for (let i = 0; i < 256; i++) {
                    const x = i * 2 / 256 - 1;
                    initialLofiCurve[i] = Math.tanh(x * 1); // Start with mild distortion
                }
                lofiDistortion.curve = initialLofiCurve;
                lofiDistortion.oversample = '2x';
                lofiDistortionRef.current = lofiDistortion;
                
                const lofiNoiseSource = context.createBufferSource();
                lofiNoiseSource.buffer = noiseBuffer;
                lofiNoiseSource.loop = true;
                lofiNoiseSourceRef.current = lofiNoiseSource;

                const lofiNoiseGain = context.createGain();
                lofiNoiseGain.gain.value = 0; // Starts silent
                lofiNoiseGainRef.current = lofiNoiseGain;
                lofiNoiseSource.connect(lofiNoiseGain);

                lofiInput.connect(lofiBandpass);
                lofiBandpass.connect(lofiDistortion);
                lofiDistortion.connect(lofiWetGain);
                lofiNoiseGain.connect(lofiWetGain); // Mix noise into the wet signal
                lofiWetGain.connect(lofiWetAnalyserRef.current).connect(lofiOutput);
                lofiNoiseSource.start();

                // --- XY FILTER (Insert) ---
                const xyFilterInput = context.createGain();
                xyFilterInputGainRef.current = xyFilterInput;
                const xyFilterOutput = context.createGain();
                xyFilterOutputGainRef.current = xyFilterOutput;
                const xyFilterDry = context.createGain();
                xyFilterDryGainRef.current = xyFilterDry;
                const xyFilterWet = context.createGain();
                xyFilterWetGainRef.current = xyFilterWet;
                const xyFilterNode = context.createBiquadFilter();
                xyFilterNodeRef.current = xyFilterNode;
                const xyFilterSaturator = context.createWaveShaper();
                xyFilterSaturatorRef.current = xyFilterSaturator;

                // Config
                xyFilterDry.gain.value = 1; // Default to bypassed
                xyFilterWet.gain.value = 0;
                xyFilterNode.type = 'bandpass';
                xyFilterNode.frequency.value = MAX_FILTER_FREQ; // Default to high freq to be inaudible
                xyFilterNode.Q.value = 5; // Fixed Q for a resonant sweep sound
                xyFilterSaturator.curve = makeFilterDriveCurve(0);
                xyFilterSaturator.oversample = '2x';

                // Routing
                lofiOutput.connect(xyFilterInput);
                xyFilterInput.connect(xyFilterDry).connect(xyFilterOutput); // Dry path
                xyFilterInput.connect(xyFilterNode).connect(xyFilterSaturator).connect(xyFilterWet).connect(xyFilterOutput); // Wet path

                // --- Reverb ---
                const reverbSendBus = context.createGain();
                reverbSendBusRef.current = reverbSendBus;
                const convolver = context.createConvolver();
                const reverbWetGain = context.createGain();
                reverbWetGain.gain.value = 0;
                convolverRef.current = convolver;
                reverbWetGainRef.current = reverbWetGain;
                convolver.buffer = createImpulseResponse(context, 2.0); // Default decay
                reverbSendBus.connect(convolver);
                
                // --- Delay ---
                const delaySendBus = context.createGain();
                delaySendBusRef.current = delaySendBus;
                const delay = context.createDelay(1.0);
                const delayFeedbackGain = context.createGain();
                const delayWetGain = context.createGain();
                delay.delayTime.value = 0.27;
                delayFeedbackGain.gain.value = 0.3;
                delayWetGain.gain.value = 0;
                delayNodeRef.current = delay;
                delayFeedbackGainRef.current = delayFeedbackGain;
                delayWetGainRef.current = delayWetGain;
                delaySendBus.connect(delay);

                // --- Bitcrusher ---
                const crusherNode = new AudioWorkletNode(context, 'bitcrusher-processor');
                crusherWorkletNodeRef.current = crusherNode;
                crusherAnalyserRef.current = context.createAnalyser();
                
                // --- Envelope Filter ---
                const envelopeFilterInput = context.createGain();
                const envelopeFilterNode = context.createBiquadFilter();
                const envelopeDetector = context.createWaveShaper();
                const envelopeSmoother = context.createBiquadFilter();
                const envelopeAmount = context.createGain();
                const envelopeFilterWet = context.createGain();
                const envelopeFilterBaseFreq = context.createConstantSource();

                envelopeFilterInputRef.current = envelopeFilterInput;
                envelopeFilterNodeRef.current = envelopeFilterNode;
                envelopeDetectorRef.current = envelopeDetector;
                envelopeSmootherRef.current = envelopeSmoother;
                envelopeAmountRef.current = envelopeAmount;
                envelopeFilterWetGainRef.current = envelopeFilterWet;
                envelopeFilterBaseFreqNodeRef.current = envelopeFilterBaseFreq;

                // Config
                envelopeFilterNode.type = 'lowpass';
                envelopeFilterNode.Q.value = 5;
                envelopeFilterBaseFreq.offset.value = 100; // Base frequency
                envelopeAmount.gain.value = 4000; // Depth/Sensitivity (how many Hz the envelope adds)
                envelopeFilterWet.gain.value = 0; // Mix
                envelopeSmoother.type = 'lowpass';
                envelopeSmoother.frequency.value = 10; // Attack/Release smoothing

                // Full-wave rectifier curve for the detector
                const n_samples_env = 256;
                const envelopeCurve = new Float32Array(n_samples_env);
                for (let i = 0; i < n_samples_env; i++) {
                    const x = (i * 2 / n_samples_env) - 1;
                    envelopeCurve[i] = Math.abs(x);
                }
                envelopeDetector.curve = envelopeCurve;
                envelopeFilterBaseFreq.start();

                // Routing for the filter path
                envelopeFilterInput.connect(envelopeFilterNode);
                envelopeFilterNode.connect(envelopeFilterWet);
                envelopeFilterWet.connect(envelopeFilterAnalyserRef.current);

                // Routing for the envelope detector path
                envelopeFilterInput.connect(envelopeDetector);
                envelopeDetector.connect(envelopeSmoother);
                envelopeSmoother.connect(envelopeAmount);

                // Connect modulation sources to the filter's frequency param
                envelopeFilterBaseFreq.connect(envelopeFilterNode.frequency);
                envelopeAmount.connect(envelopeFilterNode.frequency);
                
                 // --- Sample Channel Filters ---
                 const sampleHP = context.createBiquadFilter();
                 sampleHP.type = 'highpass';
                 sampleHP.frequency.value = MIN_FILTER_FREQ;
                 sampleHighPassRef.current = sampleHP;
 
                 const sampleLP = context.createBiquadFilter();
                 sampleLP.type = 'lowpass';
                 sampleLP.frequency.value = MAX_FILTER_FREQ;
                 sampleLowPassRef.current = sampleLP;


                // --- Audio Routing ---
                isoOutput.connect(reverbSendBus); 
                isoOutput.connect(delaySendBus); 
                isoOutput.connect(envelopeFilterInput);

                // Main Dry Path (XY Filter -> Crusher -> Master Compressor)
                xyFilterOutput.connect(crusherNode);
                crusherNode.connect(crusherAnalyserRef.current);
                crusherAnalyserRef.current.connect(masterCompressor);

                // Reverb return -> Master Compressor
                convolver.connect(reverbWetGain);
                reverbWetGain.connect(reverbAnalyserRef.current);
                reverbAnalyserRef.current.connect(masterCompressor);
                
                // Delay return -> Master Compressor
                delay.connect(delayFeedbackGain);
                delayFeedbackGain.connect(delay);
                delay.connect(delayWetGain);
                delayWetGain.connect(delayAnalyserRef.current);
                delayAnalyserRef.current.connect(masterCompressor);
                
                // Envelope Filter return -> Master Compressor
                envelopeFilterAnalyserRef.current.connect(masterCompressor);
                
                // Create instrument analysers (for small scopes)
                Object.keys(instrumentAnalysersRef.current).forEach(key => {
                    const instrument = key as Instrument;
                    const analyser = context.createAnalyser();
                    instrumentAnalysersRef.current[instrument] = analyser;
                    
                    if (instrument === 'kick') {
                        analyser.connect(highPass);
                    } else if (instrument === 'sample') {
                        analyser.connect(sampleHP);
                        sampleHP.connect(sampleLP);
                        sampleLP.connect(sidechainDuckNode);
                    } else {
                        analyser.connect(sidechainDuckNode);
                    }
                });

                // --- Pre-render all sounds, including the airhorn ---
                const { snare, hihat, snap, clave, cowbell } = instrumentParamsRef.current;
                const [
                    airhornBuffer,
                    kickBuffer, snareBuffer, hihatBuffer,
                    snapBuffer, claveBuffer, cowbellBuffer
                ] = await Promise.all([
                    renderAirhorn(context),
                    renderKick(context, kickDesignerParams, noiseBufferDataRef.current!),
                    renderSnare(context, snare as { tone: number, decay: number, attack: number }, noiseBufferDataRef.current!),
                    renderHiHat(context, hihat as { pitch: number, decay: number }, noiseBufferDataRef.current!),
                    renderSnap(context, snap as { pitch: number, decay: number, attack: number }, noiseBufferDataRef.current!),
                    renderClave(context, clave as { pitch: number, decay: number }),
                    renderCowbell(context, cowbell as { pitch: number, decay: number, attack: number }),
                ]);

                airhornBufferRef.current = airhornBuffer;
                instrumentBuffersRef.current.kick = kickBuffer;
                instrumentBuffersRef.current.snare = snareBuffer;
                instrumentBuffersRef.current.hihat = hihatBuffer;
                instrumentBuffersRef.current.snap = snapBuffer;
                instrumentBuffersRef.current.clave = claveBuffer;
                instrumentBuffersRef.current.cowbell = cowbellBuffer;

            } catch (e) {
                console.error("Web Audio API is not supported in this browser or worklet setup failed", e);
                return null;
            }
        }
        return {
            analysers: {
                instrumentAnalysers: instrumentAnalysersRef.current,
                masterAnalyser: masterAnalyserRef.current,
                postFilterAnalyser: postFilterAnalyserRef.current,
                reverbAnalyser: reverbAnalyserRef.current,
                delayAnalyser: delayAnalyserRef.current,
                sidechainVisualiserAnalyser: sidechainVisualiserAnalyserRef.current,
                crushAnalyser: crusherAnalyserRef.current,
                tapeSaturationAnalyser: tapeSaturationAnalyserRef.current,
                envelopeFilterAnalyser: envelopeFilterAnalyserRef.current,
                lofiDryAnalyser: lofiDryAnalyserRef.current,
                lofiWetAnalyser: lofiWetAnalyserRef.current,
            },
            context: audioContextRef.current!,
        };
    }, []);

    const playSoundFromBuffer = useCallback((instrument: Instrument, volume: number, destination: AudioNode, time?: number, params?: Partial<InstrumentParams>) => {
        const context = audioContextRef.current;
        const bufferToPlay = instrumentBuffersRef.current[instrument];
        if (!context || !destination || !bufferToPlay) return;

        if (context.state === 'suspended') {
            context.resume();
        }
        const playTime = time || context.currentTime;

        const source = context.createBufferSource();
        source.buffer = bufferToPlay;

        // Apply real-time pitch shift for sample playback
        if (instrument === 'sample' && params?.pitch) {
            source.playbackRate.setValueAtTime(params.pitch, playTime);
        }

        const gain = context.createGain();
        // The fix for the click: A micro-fade-in instead of an instantaneous gain change.
        // This is imperceptible but gives the audio hardware time to adjust smoothly.
        gain.gain.setValueAtTime(0, playTime);
        gain.gain.linearRampToValueAtTime(volume, playTime + 0.005);
        
        source.connect(gain);
        gain.connect(destination);
        source.start(playTime);
    }, []);

    const playKick = useCallback((volume: number, time?: number, params?: Partial<InstrumentParams>) => {
        const destination = instrumentAnalysersRef.current.kick;
        const context = audioContextRef.current;
        if (!destination || !context) return;
        
        const playTime = time || context.currentTime;
        playSoundFromBuffer('kick', volume, destination, playTime, params);
        
        // --- CLICK-FREE SIDECHAIN DUCKING LOGIC ---
        const duckNode = sidechainDuckNodeRef.current;
        const sidechainVizGain = sidechainVisualiserGainRef.current;
        const amount = kickSidechainAmountRef.current;
        
        if ((duckNode || sidechainVizGain) && amount > 0.01) {
            const targetGain = Math.max(0.0001, 1 - amount);
            const attackTime = 0.008; // 8ms attack for a smooth but quick duck
            const releaseTime = 0.15; // 150ms release
            
            if (duckNode) {
                // cancelAndHoldAtTime stops any previously scheduled ramps. This is crucial to prevent clicks.
                duckNode.gain.cancelAndHoldAtTime(playTime);
                // Use linear ramps for a predictable and click-free gain change.
                duckNode.gain.linearRampToValueAtTime(targetGain, playTime + attackTime);
                duckNode.gain.linearRampToValueAtTime(1, playTime + attackTime + releaseTime);
            }
            if (sidechainVizGain) {
                sidechainVizGain.gain.cancelAndHoldAtTime(playTime);
                sidechainVizGain.gain.linearRampToValueAtTime(amount, playTime + attackTime);
                sidechainVizGain.gain.linearRampToValueAtTime(0.0001, playTime + attackTime + releaseTime);
            }
        }
    }, [playSoundFromBuffer]);
    
    const playSnare = useCallback((volume: number, time?: number, params?: Partial<InstrumentParams>) => {
        if (instrumentAnalysersRef.current.snare) playSoundFromBuffer('snare', volume, instrumentAnalysersRef.current.snare, time, params);
    }, [playSoundFromBuffer]);
    
    const playHiHat = useCallback((volume: number, time?: number, params?: Partial<InstrumentParams>) => {
        if (instrumentAnalysersRef.current.hihat) playSoundFromBuffer('hihat', volume, instrumentAnalysersRef.current.hihat, time, params);
    }, [playSoundFromBuffer]);

    const playSnap = useCallback((volume: number, time?: number, params?: Partial<InstrumentParams>) => {
        if (instrumentAnalysersRef.current.snap) playSoundFromBuffer('snap', volume, instrumentAnalysersRef.current.snap, time, params);
    }, [playSoundFromBuffer]);

    const playClave = useCallback((volume: number, time?: number, params?: Partial<InstrumentParams>) => {
        if (instrumentAnalysersRef.current.clave) playSoundFromBuffer('clave', volume, instrumentAnalysersRef.current.clave, time, params);
    }, [playSoundFromBuffer]);

    const playCowbell = useCallback((volume: number, time?: number, params?: Partial<InstrumentParams>) => {
        if (instrumentAnalysersRef.current.cowbell) playSoundFromBuffer('cowbell', volume, instrumentAnalysersRef.current.cowbell, time, params);
    }, [playSoundFromBuffer]);
    
    const playSample = useCallback((volume: number, time?: number, params?: Partial<InstrumentParams>) => {
        if (instrumentAnalysersRef.current.sample) playSoundFromBuffer('sample', volume, instrumentAnalysersRef.current.sample, time, params);
    }, [playSoundFromBuffer]);
    
    const startRecording = useCallback(async () => {
        const context = audioContextRef.current;
        if (!context || context.audioWorklet === undefined) {
            console.error("Audio context not ready or AudioWorklet not supported");
            return;
        }
        if (recorderWorkletNodeRef.current) {
            console.warn("Already recording.");
            return;
        }

        try {
            if (!mediaStreamRef.current) {
                mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            }
            
            micStreamSourceRef.current = context.createMediaStreamSource(mediaStreamRef.current);
            const recorderNode = new AudioWorkletNode(context, 'recorder-processor');
            recorderWorkletNodeRef.current = recorderNode;
            
            recordedPcmDataRef.current = []; // Clear previous recording data
            
            recorderNode.port.onmessage = (event) => {
                // The event data is an ArrayBuffer, convert it back to Float32Array
                const pcmData = new Float32Array(event.data);
                recordedPcmDataRef.current.push(pcmData);
            };

            micStreamSourceRef.current.connect(recorderNode);
            // It's not necessary to connect the worklet to the destination if we don't want to monitor.

        } catch (err) {
            console.error("Error accessing microphone:", err);
            recorderWorkletNodeRef.current = null;
        }

    }, []);

    const stopRecording = useCallback(() => {
        const context = audioContextRef.current;
        if (!recorderWorkletNodeRef.current || !context) {
            return;
        }

        // Disconnect nodes to stop processing
        micStreamSourceRef.current?.disconnect();
        recorderWorkletNodeRef.current.port.onmessage = null; // Clean up listener
        recorderWorkletNodeRef.current.disconnect();
        
        // Stop the microphone track to turn off the indicator
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());

        // Process the recorded PCM data chunks into a single AudioBuffer
        if (recordedPcmDataRef.current.length > 0) {
            const totalLength = recordedPcmDataRef.current.reduce((acc, buffer) => acc + buffer.length, 0);
            const concatenatedPcm = new Float32Array(totalLength);
            let offset = 0;
            for (const pcmChunk of recordedPcmDataRef.current) {
                concatenatedPcm.set(pcmChunk, offset);
                offset += pcmChunk.length;
            }

            const audioBuffer = context.createBuffer(1, totalLength, context.sampleRate);
            audioBuffer.copyToChannel(concatenatedPcm, 0);
            
            instrumentBuffersRef.current.sample = audioBuffer;
        }

        // Clean up refs
        micStreamSourceRef.current = null;
        recorderWorkletNodeRef.current = null;
        mediaStreamRef.current = null;
        recordedPcmDataRef.current = [];

    }, []);

    const renderBeatToBuffer = useCallback(async (
        grids: { a: Grid, b: Grid },
        volumes: number[],
        tempo: number,
        swing: number,
        masterVolume: number,
        lowPassFreq: number,
        highPassFreq: number,
        reverbMix: number,
        reverbDecay: number,
        reverbSource: Instrument | 'all',
        delayMix: number,
        delayTime: number,
        delayFeedback: number,
        delaySource: Instrument | 'all',
        kickSidechainAmount: number,
        crushAmount: number,
        tapeSaturationMix: number,
        tapeSaturationAmount: number,
        tapeSaturationTone: number,
        envelopeFilterMix: number,
        envelopeFilterAmount: number,
        envelopeFilterBaseFreq: number,
        envelopeFilterQ: number,
        instrumentVisibility: boolean[],
        isolatorGains: { low: number; mid: number; high: number },
        lofiMix: number
    ): Promise<Blob | null> => {
        const liveContext = audioContextRef.current;
        if (!liveContext) {
            console.error("Audio engine not initialized.");
            return null;
        }

        const isBPatternActive = grids.b.some(row => row.some(step => step));
        const patternsToRender = [grids.a];
        if (isBPatternActive) {
            patternsToRender.push(grids.b);
        }

        const numSteps = grids.a[0]?.length || 16;
        
        const secondsPerStep = (60 / tempo) / 4;
        const totalDuration = patternsToRender.length * numSteps * secondsPerStep;

        const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * liveContext.sampleRate), liveContext.sampleRate);
        
        // --- RECREATE THE ENTIRE AUDIO GRAPH FOR OFFLINE CONTEXT ---
        const masterCompressor = offlineCtx.createDynamicsCompressor();
        masterCompressor.threshold.setValueAtTime(-18, 0);
        masterCompressor.knee.setValueAtTime(20, 0);
        masterCompressor.ratio.setValueAtTime(2.5, 0);
        masterCompressor.attack.setValueAtTime(0.005, 0);
        masterCompressor.release.setValueAtTime(0.15, 0);

        const masterGain = offlineCtx.createGain();
        masterGain.gain.value = masterVolume;

        masterCompressor.connect(masterGain);
        masterGain.connect(offlineCtx.destination);
        
        const highPass = offlineCtx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = highPassFreq;

        const lowPass = offlineCtx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = lowPassFreq;
        
        const tapeSaturationInputGain = offlineCtx.createGain();
        const tapeSaturationOutputGain = offlineCtx.createGain();
        const tapeSaturationDryGain = offlineCtx.createGain();
        tapeSaturationDryGain.gain.value = 1.0 - tapeSaturationMix;
        
        const tapeSaturationNode = offlineCtx.createWaveShaper();
        tapeSaturationNode.curve = makeTapeSaturationCurve(tapeSaturationAmount);
        tapeSaturationNode.oversample = '2x';

        const tapeSaturationWetGain = offlineCtx.createGain();
        tapeSaturationWetGain.gain.value = tapeSaturationMix;

        const tapeToneFilter = offlineCtx.createBiquadFilter();
        tapeToneFilter.type = 'lowpass';
        tapeToneFilter.frequency.value = tapeSaturationTone;

        tapeSaturationInputGain.connect(tapeSaturationDryGain).connect(tapeSaturationOutputGain);
        tapeSaturationInputGain.connect(tapeSaturationNode);
        tapeSaturationNode.connect(tapeToneFilter);
        tapeToneFilter.connect(tapeSaturationWetGain);
        tapeSaturationWetGain.connect(tapeSaturationOutputGain);

        highPass.connect(lowPass);
        lowPass.connect(tapeSaturationInputGain);
        
        const mainBus = tapeSaturationOutputGain;
        
        // --- ISOLATOR ---
        const isoLowF = offlineCtx.createBiquadFilter();
        isoLowF.type = 'lowpass';
        isoLowF.frequency.value = 300;
        const isoMidF = offlineCtx.createBiquadFilter();
        isoMidF.type = 'bandpass';
        isoMidF.frequency.value = 1500;
        isoMidF.Q.value = 1;
        const isoHighF = offlineCtx.createBiquadFilter();
        isoHighF.type = 'highpass';
        isoHighF.frequency.value = 3000;
        const isoLowG = offlineCtx.createGain();
        isoLowG.gain.value = isolatorGains.low;
        const isoMidG = offlineCtx.createGain();
        isoMidG.gain.value = isolatorGains.mid;
        const isoHighG = offlineCtx.createGain();
        isoHighG.gain.value = isolatorGains.high;
        const isoOutput = offlineCtx.createGain();
        mainBus.connect(isoLowF).connect(isoLowG).connect(isoOutput);
        mainBus.connect(isoMidF).connect(isoMidG).connect(isoOutput);
        mainBus.connect(isoHighF).connect(isoHighG).connect(isoOutput);

        // --- LO-FI RADIO ---
        const lofiInput = offlineCtx.createGain();
        isoOutput.connect(lofiInput);
        const lofiOutput = offlineCtx.createGain();

        const lofiDry = offlineCtx.createGain();
        lofiDry.gain.value = 1 - lofiMix;
        const lofiWet = offlineCtx.createGain();
        lofiWet.gain.value = lofiMix;
        
        lofiInput.connect(lofiDry).connect(lofiOutput);

        if (lofiMix > 0) {
            const lofiBandpass = offlineCtx.createBiquadFilter();
            lofiBandpass.type = 'bandpass';
            lofiBandpass.frequency.value = 3500 - (lofiMix * 2500);
            lofiBandpass.Q.value = 2 + (lofiMix * 6); // Make Q dynamic

            const lofiDistortion = offlineCtx.createWaveShaper();
            const distortionAmount = 1 + lofiMix * 8; // Increase distortion
            const curve = new Float32Array(256);
            for (let i = 0; i < 256; i++) {
                const x = i * 2 / 256 - 1;
                curve[i] = Math.tanh(x * distortionAmount);
            }
            lofiDistortion.curve = curve;

            const noiseSource = offlineCtx.createBufferSource();
            const noiseBufferSize = offlineCtx.sampleRate * totalDuration;
            const noiseBuffer = offlineCtx.createBuffer(1, noiseBufferSize, offlineCtx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseBufferSize; i++) {
                noiseData[i] = Math.random() * 2 - 1;
            }
            noiseSource.buffer = noiseBuffer;
            const noiseGain = offlineCtx.createGain();
            noiseGain.gain.value = lofiMix * 0.004;
            noiseSource.connect(noiseGain);

            lofiInput.connect(lofiBandpass).connect(lofiDistortion).connect(lofiWet);
            noiseGain.connect(lofiWet);
            lofiWet.connect(lofiOutput);
            noiseSource.start(0);
        }

        // --- FINAL MAIN PATH (skipping bitcrusher as it's a worklet) ---
        lofiOutput.connect(masterCompressor);

        const sidechainDuckNode = offlineCtx.createGain();
        sidechainDuckNode.connect(highPass);

        const reverbSendBus = offlineCtx.createGain();
        const convolver = offlineCtx.createConvolver();
        const reverbWetGain = offlineCtx.createGain();
        reverbWetGain.gain.value = reverbMix;
        const decayInSeconds = 0.1 + reverbDecay * 4.0; // Optimized decay range
        convolver.buffer = createImpulseResponse(offlineCtx, decayInSeconds);
        reverbSendBus.connect(convolver);
        convolver.connect(reverbWetGain);
        reverbWetGain.connect(masterCompressor);
        
        const delaySendBus = offlineCtx.createGain();
        const delay = offlineCtx.createDelay(1.0);
        const delayFeedbackGain = offlineCtx.createGain();
        const delayWetGain = offlineCtx.createGain();
        delay.delayTime.value = delayTime;
        delayFeedbackGain.gain.value = delayFeedback;
        delayWetGain.gain.value = delayMix;
        delaySendBus.connect(delay);
        delay.connect(delayFeedbackGain);
        delayFeedbackGain.connect(delay);
        delay.connect(delayWetGain);
        delayWetGain.connect(masterCompressor);
        
        const envelopeFilterInput = offlineCtx.createGain();
        const envelopeFilterNode = offlineCtx.createBiquadFilter();
        const envelopeDetector = offlineCtx.createWaveShaper();
        const envelopeSmoother = offlineCtx.createBiquadFilter();
        const envelopeAmount = offlineCtx.createGain();
        const envelopeFilterWet = offlineCtx.createGain();
        const envelopeFilterBaseFreqNode = offlineCtx.createConstantSource();

        envelopeFilterNode.type = 'lowpass';
        envelopeFilterNode.Q.value = 0.1 + envelopeFilterQ * 19.9;
        envelopeFilterBaseFreqNode.offset.value = envelopeFilterBaseFreq;
        envelopeAmount.gain.value = envelopeFilterAmount * 8000;
        envelopeFilterWet.gain.value = envelopeFilterMix;
        envelopeSmoother.type = 'lowpass';
        envelopeSmoother.frequency.value = 10;
        const n_samples_env_render = 256;
        const envelopeCurveRender = new Float32Array(n_samples_env_render);
        for (let i = 0; i < n_samples_env_render; i++) {
            const x = (i * 2 / n_samples_env_render) - 1;
            envelopeCurveRender[i] = Math.abs(x);
        }
        envelopeDetector.curve = envelopeCurveRender;
        envelopeFilterBaseFreqNode.start(0);

        envelopeFilterInput.connect(envelopeFilterNode);
        envelopeFilterNode.connect(envelopeFilterWet);
        envelopeFilterWet.connect(masterCompressor);

        envelopeFilterInput.connect(envelopeDetector);
        envelopeDetector.connect(envelopeSmoother);
        envelopeSmoother.connect(envelopeAmount);
        envelopeFilterBaseFreqNode.connect(envelopeFilterNode.frequency);
        envelopeAmount.connect(envelopeFilterNode.frequency);

        const preSendsBus = isoOutput; // Sends should tap off after the isolator but before gater
        if (delaySource === 'all') {
            preSendsBus.connect(delaySendBus);
        }
        preSendsBus.connect(envelopeFilterInput);
        
        if (reverbSource === 'all') {
            // FIX: Corrected typo from reverbBus to reverbSendBus
            preSendsBus.connect(reverbSendBus);
        }

        // --- Optimization: Create sample filter chain once before the loop ---
        const { highPass: hpFreq, lowPass: lpFreq } = instrumentParamsRef.current.sample;
        const offlineSampleHP = offlineCtx.createBiquadFilter();
        offlineSampleHP.type = 'highpass';
        offlineSampleHP.frequency.value = hpFreq!;
        const offlineSampleLP = offlineCtx.createBiquadFilter();
        offlineSampleLP.type = 'lowpass';
        offlineSampleLP.frequency.value = lpFreq!;
        offlineSampleHP.connect(offlineSampleLP);
        offlineSampleLP.connect(sidechainDuckNode);

        const swingFactor = 0.5 + (swing * 0.25);
        let currentTime = 0;
        patternsToRender.forEach((grid) => {
            const currentNumSteps = grid[0]?.length || 0;
            for (let step = 0; step < currentNumSteps; step++) {
                const isOddStep = step % 2 !== 0;
                const stepDuration = isOddStep 
                    ? (1 - swingFactor) * 2 * secondsPerStep 
                    : swingFactor * 2 * secondsPerStep;
                
                const time = currentTime;
                INSTRUMENTS.forEach((instrument, instIndex) => {
                    if (instrumentVisibility[instIndex] && grid[instIndex]?.[step] && volumes[instIndex] > 0) {
                        const buffer = instrumentBuffersRef.current[instrument];
                        if (!buffer) return;
                        
                        const source = offlineCtx.createBufferSource();
                        source.buffer = buffer;
            
                        const gain = offlineCtx.createGain();
                        gain.gain.setValueAtTime(volumes[instIndex], time);
                        source.connect(gain);
                        
                        let finalDestination: AudioNode;
                        if (instrument === 'kick') {
                            finalDestination = highPass;
                        } else if (instrument === 'sample') {
                            finalDestination = offlineSampleHP; // Route to pre-made filter chain
                        } else {
                            finalDestination = sidechainDuckNode;
                        }
                        
                        gain.connect(finalDestination);
                        source.start(time);
                        
                        if (delaySource === instrument) {
                            gain.connect(delaySendBus);
                        }
                        
                        if (reverbSource === instrument) {
                            gain.connect(reverbSendBus);
                        }
                        
                        if (instrument === 'kick' && kickSidechainAmount > 0.01) {
                            const targetGain = Math.max(0.0001, 1 - kickSidechainAmount);
                            const attackTime = 0.008;
                            const releaseTime = 0.15;
                            // This ensures that ramps from previous steps don't interfere
                            sidechainDuckNode.gain.cancelAndHoldAtTime(time);
                            // Use linear ramps for click-free, predictable gain changes
                            sidechainDuckNode.gain.linearRampToValueAtTime(targetGain, time + attackTime);
                            sidechainDuckNode.gain.linearRampToValueAtTime(1, time + attackTime + releaseTime);
                        }
                    }
                });
                currentTime += stepDuration;
            }
        });

        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = bufferToWav(renderedBuffer);
        
        return wavBlob;
    }, [instrumentParamsRef]);

    const updateInstrumentParameter = useCallback(async (instrument: Instrument, param: keyof InstrumentParams, value: number) => {
        if (instrument === 'kick') return; // Kick is handled separately by rerenderKick

        const context = audioContextRef.current;
        if (!context) return;
    
        const paramsForInstrument = instrumentParamsRef.current[instrument];
        if (paramsForInstrument && param in paramsForInstrument) {
            (paramsForInstrument as any)[param] = value;
        } else if (instrument === 'sample' && (param === 'highPass' || param === 'lowPass')) {
             (paramsForInstrument as any)[param] = value;
        } else {
            return;
        }

        if (param === 'highPass') {
            if (sampleHighPassRef.current) {
                sampleHighPassRef.current.frequency.linearRampToValueAtTime(value, context.currentTime + RAMP_TIME);
            }
            return;
        }
        if (param === 'lowPass') {
            if (sampleLowPassRef.current) {
                sampleLowPassRef.current.frequency.linearRampToValueAtTime(value, context.currentTime + RAMP_TIME);
            }
            return;
        }
    
        if (instrument === 'sample') {
            return;
        }
    
        let newBuffer: AudioBuffer | null = null;
        const currentParams = instrumentParamsRef.current;
    
        try {
            switch (instrument) {
                case 'snare':
                    if (noiseBufferDataRef.current) {
                        newBuffer = await renderSnare(context, currentParams.snare as { tone: number; decay: number; attack: number; }, noiseBufferDataRef.current);
                    }
                    break;
                case 'hihat':
                    if (noiseBufferDataRef.current) {
                        newBuffer = await renderHiHat(context, currentParams.hihat as { pitch: number, decay: number }, noiseBufferDataRef.current);
                    }
                    break;
                case 'snap':
                    if (noiseBufferDataRef.current) {
                        newBuffer = await renderSnap(context, currentParams.snap as { pitch: number, decay: number, attack: number }, noiseBufferDataRef.current);
                    }
                    break;
                case 'clave':
                    newBuffer = await renderClave(context, currentParams.clave as { pitch: number, decay: number });
                    break;
                case 'cowbell':
                    newBuffer = await renderCowbell(context, currentParams.cowbell as { pitch: number, decay: number, attack: number });
                    break;
            }
        } catch (error) {
            console.error(`Error re-rendering ${instrument}:`, error);
        }
    
        if (newBuffer) {
            instrumentBuffersRef.current[instrument] = newBuffer;
        }
    }, []);
    
    const rerenderKick = useCallback(async (kickDesignerParams: KickDesignerParams) => {
        const context = audioContextRef.current;
        if (!context || !noiseBufferDataRef.current) return;
        try {
            const newBuffer = await renderKick(context, kickDesignerParams, noiseBufferDataRef.current);
            instrumentBuffersRef.current.kick = newBuffer;
        } catch (error) {
            console.error(`Error re-rendering kick:`, error);
        }
    }, []);


    const setLowPassFrequency = useCallback((freq: number) => {
        if (lowPassFilterRef.current && audioContextRef.current) {
            lowPassFilterRef.current.frequency.linearRampToValueAtTime(freq, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);

    const setHighPassFrequency = useCallback((freq: number) => {
        if (highPassFilterRef.current && audioContextRef.current) {
            highPassFilterRef.current.frequency.linearRampToValueAtTime(freq, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);
    
    const setReverbMix = useCallback((mix: number) => {
        if (reverbWetGainRef.current && audioContextRef.current) {
            reverbWetGainRef.current.gain.linearRampToValueAtTime(mix, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);

    const setReverbDecay = useCallback((decayValue: number) => { // decayValue from 0 to 1
        const context = audioContextRef.current;
        const convolver = convolverRef.current;
        if (!context || !convolver) return;
        
        const decayInSeconds = 0.1 + decayValue * 4.0; // Map 0-1 to 0.1s - 4.1s for a more optimized range
        convolver.buffer = createImpulseResponse(context, decayInSeconds);
    }, []);

    const setReverbSource = useCallback((source: Instrument | 'all') => {
        const reverbBus = reverbSendBusRef.current;
        const mainBus = isolatorOutputRef.current;
        if (!reverbBus || !mainBus) return;

        // Disconnect ALL potential sources first to prevent duplicate connections
        try { mainBus.disconnect(reverbBus); } catch (e) {}
        INSTRUMENTS.forEach(inst => {
            const analyser = instrumentAnalysersRef.current[inst];
            if (analyser) {
                try { analyser.disconnect(reverbBus); } catch (e) {}
            }
        });

        // Reconnect the selected source
        if (source === 'all') {
            mainBus.connect(reverbBus);
        } else {
            const sourceAnalyser = instrumentAnalysersRef.current[source];
            if (sourceAnalyser) {
                sourceAnalyser.connect(reverbBus);
            }
        }
    }, []);

    const setDelayMix = useCallback((mix: number) => {
        if (delayWetGainRef.current && audioContextRef.current) {
            delayWetGainRef.current.gain.linearRampToValueAtTime(mix, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);

    const setDelayTime = useCallback((time: number) => {
        if (delayNodeRef.current && audioContextRef.current) {
            delayNodeRef.current.delayTime.linearRampToValueAtTime(time, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);

    const setDelayFeedback = useCallback((feedback: number) => {
        if (delayFeedbackGainRef.current && audioContextRef.current) {
            delayFeedbackGainRef.current.gain.linearRampToValueAtTime(feedback, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);
    
    const setDelaySource = useCallback((source: Instrument | 'all') => {
        const delayBus = delaySendBusRef.current;
        const mainBus = isolatorOutputRef.current;
        if (!delayBus || !mainBus) return;

        // Disconnect ALL potential sources first to prevent duplicate connections
        try { mainBus.disconnect(delayBus); } catch (e) {}
        INSTRUMENTS.forEach(inst => {
            const analyser = instrumentAnalysersRef.current[inst];
            if (analyser) {
                try { analyser.disconnect(delayBus); } catch (e) {}
            }
        });

        // Reconnect the selected source
        if (source === 'all') {
            mainBus.connect(delayBus);
        } else {
            const sourceAnalyser = instrumentAnalysersRef.current[source];
            if (sourceAnalyser) {
                sourceAnalyser.connect(delayBus);
            }
        }
    }, []);
    
    const setKickSidechainAmount = useCallback((amount: number) => {
        kickSidechainAmountRef.current = amount;
    }, []);

    const setMasterVolume = useCallback((volume: number) => {
        if (masterGainRef.current && audioContextRef.current) {
            masterGainRef.current.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);

    const setCrushAmount = useCallback((amount: number) => {
        if (crusherWorkletNodeRef.current && audioContextRef.current) {
            const crushParam = crusherWorkletNodeRef.current.parameters.get('amount');
            if (crushParam) {
                crushParam.linearRampToValueAtTime(amount, audioContextRef.current.currentTime + RAMP_TIME);
            }
        }
    }, []);

    const setTapeSaturationMix = useCallback((mix: number) => {
        const context = audioContextRef.current;
        const dryGain = tapeSaturationDryGainRef.current;
        const wetGain = tapeSaturationWetGainRef.current;
        if (context && dryGain && wetGain) {
            dryGain.gain.linearRampToValueAtTime(1.0 - mix, context.currentTime + RAMP_TIME);
            wetGain.gain.linearRampToValueAtTime(mix, context.currentTime + RAMP_TIME);
        }
    }, []);
    
    const setTapeSaturationAmount = useCallback((amount: number) => {
        if (tapeSaturationNodeRef.current) {
            tapeSaturationNodeRef.current.curve = makeTapeSaturationCurve(amount);
        }
    }, []);

    const setTapeSaturationTone = useCallback((freq: number) => {
        if (tapeToneFilterRef.current && audioContextRef.current) {
            tapeToneFilterRef.current.frequency.linearRampToValueAtTime(freq, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);

    const setEnvelopeFilterMix = useCallback((mix: number) => {
        if (envelopeFilterWetGainRef.current && audioContextRef.current) {
            envelopeFilterWetGainRef.current.gain.linearRampToValueAtTime(mix, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);
    
    const setEnvelopeFilterAmount = useCallback((amount: number) => {
        if (envelopeAmountRef.current && audioContextRef.current) {
            // scale the amount (0-1) to a suitable gain range for modulation
            const targetGain = amount * 8000;
            envelopeAmountRef.current.gain.linearRampToValueAtTime(targetGain, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);
    
    const setEnvelopeFilterBaseFreq = useCallback((freq: number) => {
        if (envelopeFilterBaseFreqNodeRef.current && audioContextRef.current) {
            envelopeFilterBaseFreqNodeRef.current.offset.linearRampToValueAtTime(freq, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);
    
    const setEnvelopeFilterQ = useCallback((q: number) => {
        if (envelopeFilterNodeRef.current && audioContextRef.current) {
             // scale q (0-1) to a usable range (e.g., 0.1 to 20)
            const targetQ = 0.1 + q * 19.9;
            envelopeFilterNodeRef.current.Q.linearRampToValueAtTime(targetQ, audioContextRef.current.currentTime + RAMP_TIME);
        }
    }, []);

    const toggleXyFilter = useCallback((isOn: boolean) => {
        const dry = xyFilterDryGainRef.current;
        const wet = xyFilterWetGainRef.current;
        const context = audioContextRef.current;
        if (!dry || !wet || !context) return;
        
        const dryTarget = isOn ? 0 : 1;
        const wetTarget = isOn ? 1 : 0;
        
        dry.gain.linearRampToValueAtTime(dryTarget, context.currentTime + RAMP_TIME);
        wet.gain.linearRampToValueAtTime(wetTarget, context.currentTime + RAMP_TIME);
    }, []);

    const setXyFilterParams = useCallback((freq: number, drive: number) => {
        const filter = xyFilterNodeRef.current;
        const saturator = xyFilterSaturatorRef.current;
        const context = audioContextRef.current;
        if (!filter || !saturator || !context) return;

        filter.frequency.linearRampToValueAtTime(freq, context.currentTime + RAMP_TIME);
        saturator.curve = makeFilterDriveCurve(drive);
    }, []);
    
    const setLofiMix = useCallback((mix: number) => {
        const dry = lofiDryGainRef.current;
        const wet = lofiWetGainRef.current;
        const noise = lofiNoiseGainRef.current;
        const filter = lofiBandpassFilterRef.current;
        const distortion = lofiDistortionRef.current;
        const context = audioContextRef.current;
        if (!dry || !wet || !noise || !filter || !distortion || !context) return;
        
        dry.gain.linearRampToValueAtTime(1 - mix, context.currentTime + RAMP_TIME);
        wet.gain.linearRampToValueAtTime(mix, context.currentTime + RAMP_TIME);
        
        // As the mix increases, make the effects more pronounced
        noise.gain.linearRampToValueAtTime(mix * 0.004, context.currentTime + RAMP_TIME); // Noise vinyl crackle
        filter.frequency.linearRampToValueAtTime(3500 - (mix * 2500), context.currentTime + RAMP_TIME); // Squeeze the bandwidth
        filter.Q.linearRampToValueAtTime(2 + (mix * 6), context.currentTime + RAMP_TIME); // Increase resonance
        
        // Drive the distortion harder
        const distortionAmount = 1 + mix * 8;
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = i * 2 / 256 - 1;
            curve[i] = Math.tanh(x * distortionAmount);
        }
        distortion.curve = curve;
    }, []);

    const setIsoGain = useCallback((band: 'low' | 'mid' | 'high', gain: number) => {
        const context = audioContextRef.current;
        if (!context) return;
        
        let gainNode: GainNode | null = null;
        if (band === 'low') gainNode = isolatorLowGainRef.current;
        if (band === 'mid') gainNode = isolatorMidGainRef.current;
        if (band === 'high') gainNode = isolatorHighGainRef.current;
        
        if (gainNode) {
            gainNode.gain.linearRampToValueAtTime(gain, context.currentTime + RAMP_TIME);
        }
    }, []);

    const playAirhorn = useCallback(() => {
        const context = audioContextRef.current;
        const buffer = airhornBufferRef.current;
        const destination = airhornDistortionRef.current;

        if (!context || !buffer || !destination) return;

        // Create a new buffer source for each playback. This is a very cheap operation.
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(destination);
        source.start(context.currentTime);
    }, []);


    return {
        setup, playKick, playSnare, playHiHat, playSnap, playClave, playCowbell, playSample, startRecording, stopRecording, renderBeatToBuffer, updateInstrumentParameter, rerenderKick,
        setLowPassFrequency, setHighPassFrequency, setReverbMix, setReverbDecay, setReverbSource, setDelayMix, setDelayTime, setDelayFeedback, setDelaySource, setKickSidechainAmount,
        setMasterVolume, setCrushAmount, setTapeSaturationMix, setTapeSaturationAmount, setTapeSaturationTone,
        setEnvelopeFilterMix, setEnvelopeFilterAmount, setEnvelopeFilterBaseFreq, setEnvelopeFilterQ,
        toggleXyFilter, setXyFilterParams, setLofiMix, setIsoGain, playAirhorn
    };
};