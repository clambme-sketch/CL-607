import { useRef, useCallback } from 'react';
import { MAX_FILTER_FREQ, MIN_FILTER_FREQ, INSTRUMENTS } from '../constants';
import { Grid, Instrument, AllInstrumentParams, InstrumentParams, KickDesignerParams, StutterDivision, BeatRepeatDivision, ReverbType } from '../types';

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
    this.phase_ = [0, 0];
    this.lastSampleValue_ = [0, 0];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !output) return true;
    const amountValues = parameters.amount;

    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      if (this.phase_[channel] === undefined) {
        this.phase_[channel] = 0;
        this.lastSampleValue_[channel] = 0;
      }
      for (let i = 0; i < inputChannel.length; i++) {
        const amount = amountValues.length > 1 ? amountValues[i] : amountValues[0];
        
        if (amount <= 0) {
          outputChannel[i] = inputChannel[i];
          this.lastSampleValue_[channel] = inputChannel[i];
          continue;
        }

        const bitDepth = 16 - 14 * amount;
        const frequencyReduction = Math.max(0.02, 1.0 - amount * 0.92);
        const step = Math.pow(0.5, bitDepth);
        
        this.phase_[channel] += frequencyReduction;
        if (this.phase_[channel] >= 1.0) {
          this.phase_[channel] -= 1.0;
          this.lastSampleValue_[channel] = step * Math.floor(inputChannel[i] / step + 0.5);
        }
        outputChannel[i] = this.lastSampleValue_[channel];
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

class LiveRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0 && input[0]) {
      const left = new Float32Array(input[0]);
      const right = input[1] ? new Float32Array(input[1]) : new Float32Array(input[0]);
      this.port.postMessage({ left, right }, [left.buffer, right.buffer]);
    }
    return true;
  }
}
registerProcessor('live-recorder-processor', LiveRecorderProcessor);

class DjFxProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferLength = Math.ceil(sampleRate * 4);
    // Clean pre-stutter input ring buffer (never overwritten by processed output)
    this.inBufferL = new Float32Array(this.bufferLength);
    this.inBufferR = new Float32Array(this.bufferLength);
    // Post-stutter clean ring buffer & modulated delay line buffer used by Tape Stop
    this.postStutterBufL = new Float32Array(this.bufferLength);
    this.postStutterBufR = new Float32Array(this.bufferLength);
    this.tapeBufferL = new Float32Array(this.bufferLength);
    this.tapeBufferR = new Float32Array(this.bufferLength);
    this.writeIndex = 0;

    // Dedicated slice buffer for Stutter (up to 4 seconds so even 1/4 at 40 BPM fits easily)
    this.maxStutterLength = Math.ceil(sampleRate * 4);
    this.stutterSliceL = new Float32Array(this.maxStutterLength);
    this.stutterSliceR = new Float32Array(this.maxStutterLength);
    this.stutterActive = false;
    this.stutterHeld = false;
    this.loopSamples = Math.floor(sampleRate * 0.125);
    this.beatSamples = Math.floor(sampleRate * 0.5);
    this.stutterSliceMaxSamples = Math.max(512, Math.floor(this.beatSamples * 0.25));
    this.stutterPlayOffset = 0;
    this.stutterCaptureCount = 0;
    this.stutterHasAudio = false;
    this.stutterFirstPass = false;
    this.fallbackSlice = null;

    // Master beat-grid & transport synchronization state
    this.transportPlaying = false;
    this.beatAnchorTime = 0.0;
    this.beatDurationSec = 60.0 / 90.0;
    this.divBeats = 0.25;
    this.subdivsPerBeat = 4;
    this.lastSubdivPhase = -1.0;
    this.stutterSwing = 0.0;
    this.lastGridStep = -1;
    this.samplesSinceTransportStart = this.bufferLength;
    this.stutterPrevSampleL = 0.0;
    this.stutterPrevSampleR = 0.0;
    this.stutterRetriggerFade = 0;

    // Delay-based Tape Stop state: 'idle' | 'stopping' | 'stopped' | 'starting'
    this.tapeState = 'idle';
    this.tapeSpeed = 1.0;
    this.tapePhase = 0.0;
    this.tapeStartPhase = 0.0;
    this.tapeStopDuration = 0.64;
    this.tapeStartDuration = 0.16;
    this.tapeReleasePending = false;
    this.tapeHoldPauseSamples = 0;

    // Variable-speed fractional delay line state
    this.tapeDelaySamples = 0.0;
    this.tapeCrossfadeSamples = 0;
    this.tapePrevOutL = 0.0;
    this.tapePrevOutR = 0.0;
    this.tapeLpL = 0.0;
    this.tapeLpR = 0.0;
    this.tapeEchoLpL = 0.0;
    this.tapeEchoLpR = 0.0;
    this.tapeEchoHpL = 0.0;
    this.tapeEchoHpR = 0.0;
    this.tapeLiveEnv = 0.0;

    // Golden-ratio 3-head Space Echo tap spacings for warm delay sustain during braking
    this.echoTap1L = Math.max(128, Math.floor(sampleRate * 0.037));
    this.echoTap2L = Math.max(256, Math.floor(sampleRate * 0.061));
    this.echoTap3L = Math.max(512, Math.floor(sampleRate * 0.099));
    this.echoTap1R = Math.max(128, Math.floor(sampleRate * 0.041));
    this.echoTap2R = Math.max(256, Math.floor(sampleRate * 0.067));
    this.echoTap3R = Math.max(512, Math.floor(sampleRate * 0.107));

    this.port.onmessage = (e) => {
      const data = e.data;
      if (!data) return;
      if (data.type === 'transportSync') {
        const nextPlaying = Boolean(data.playing);
        if (data.beatSamples) {
          this.beatSamples = Math.max(256, Math.floor(data.beatSamples));
          this.stutterSliceMaxSamples = Math.max(512, Math.floor(this.beatSamples * 0.25));
        }
        if (typeof data.beatDurationSec === 'number' && data.beatDurationSec > 0.05) {
          this.beatDurationSec = data.beatDurationSec;
        }
        if (typeof data.beatAnchorTime === 'number') {
          this.beatAnchorTime = data.beatAnchorTime;
        }
        if (typeof data.stutterSwing === 'number') {
          this.stutterSwing = Math.max(0, Math.min(1.0, data.stutterSwing));
        }
        if (data.fallbackSlice !== undefined) {
          this.fallbackSlice = data.fallbackSlice;
        }

        if (!nextPlaying) {
          this.transportPlaying = false;
          this.samplesSinceTransportStart = 0;
          this.inBufferL.fill(0);
          this.inBufferR.fill(0);
          this.stutterHasAudio = false;
          this.stutterFirstPass = false;
          this.stutterPlayOffset = 0;
          this.stutterCaptureCount = 0;
          this.lastSubdivPhase = -1.0;
          this.lastGridStep = -1;
        } else {
          const wasPaused = !this.transportPlaying;
          this.transportPlaying = true;
          if (data.reanchor || wasPaused) {
            const elapsedSinceAnchor = Math.max(0, Math.min(4096, Math.ceil((currentTime - this.beatAnchorTime) * sampleRate) + 64));
            this.samplesSinceTransportStart = elapsedSinceAnchor;
            this.lastSubdivPhase = -1.0;
            this.lastGridStep = -1;
            this.stutterRetriggerFade = 0;
            if (this.stutterActive) {
              this.anchorStutterSlice();
            }
          }
        }
      } else if (data.type === 'stutter') {
        const nextActive = Boolean(data.active);
        const nextHeld = Boolean(data.held);
        if (data.beatSamples) {
          this.beatSamples = Math.max(256, Math.floor(data.beatSamples));
          this.stutterSliceMaxSamples = Math.max(512, Math.floor(this.beatSamples * 0.25));
        }
        if (typeof data.beatDurationSec === 'number' && data.beatDurationSec > 0.05) {
          this.beatDurationSec = data.beatDurationSec;
        }
        if (typeof data.beatAnchorTime === 'number') {
          this.beatAnchorTime = data.beatAnchorTime;
        }
        if (typeof data.transportPlaying === 'boolean') {
          this.transportPlaying = data.transportPlaying;
        }
        if (typeof data.stutterSwing === 'number') {
          this.stutterSwing = Math.max(0, Math.min(1.0, data.stutterSwing));
        }
        if (typeof data.divBeats === 'number' && data.divBeats > 0) {
          this.divBeats = data.divBeats;
          this.subdivsPerBeat = Math.max(1, Math.round(1.0 / data.divBeats));
        }
        if (data.loopSamples) {
          this.loopSamples = Math.max(128, Math.min(this.maxStutterLength - 1, Math.floor(data.loopSamples)));
        }
        if (data.fallbackSlice !== undefined) {
          this.fallbackSlice = data.fallbackSlice;
        }
        if (nextActive && !this.stutterActive) {
          this.lastSubdivPhase = -1.0;
          this.lastGridStep = -1;
          this.anchorStutterSlice();
        } else if (!nextActive) {
          this.lastSubdivPhase = -1.0;
          this.lastGridStep = -1;
          this.stutterFirstPass = false;
        }
        this.stutterActive = nextActive;
        this.stutterHeld = nextHeld;
      } else if (data.type === 'stutterParams') {
        if (data.beatSamples) {
          this.beatSamples = Math.max(256, Math.floor(data.beatSamples));
          this.stutterSliceMaxSamples = Math.max(512, Math.floor(this.beatSamples * 0.25));
        }
        if (typeof data.beatDurationSec === 'number' && data.beatDurationSec > 0.05) {
          this.beatDurationSec = data.beatDurationSec;
        }
        if (typeof data.beatAnchorTime === 'number') {
          this.beatAnchorTime = data.beatAnchorTime;
        }
        if (typeof data.transportPlaying === 'boolean') {
          this.transportPlaying = data.transportPlaying;
        }
        if (typeof data.stutterSwing === 'number') {
          this.stutterSwing = Math.max(0, Math.min(1.0, data.stutterSwing));
        }
        const prevDivBeats = this.divBeats;
        if (typeof data.divBeats === 'number' && data.divBeats > 0) {
          this.divBeats = data.divBeats;
          this.subdivsPerBeat = Math.max(1, Math.round(1.0 / data.divBeats));
        }
        if (data.loopSamples) {
          this.loopSamples = Math.max(128, Math.min(this.maxStutterLength - 1, Math.floor(data.loopSamples)));
        }
        if (data.fallbackSlice !== undefined) {
          this.fallbackSlice = data.fallbackSlice;
        }
        if (Math.abs(this.divBeats - prevDivBeats) > 0.0001) {
          this.lastSubdivPhase = -1.0;
          this.lastGridStep = -1;
        }
      } else if (data.type === 'tapestop') {
        if (typeof data.duration === 'number' && data.duration > 0.1) {
          this.tapeStopDuration = Math.max(0.20, Math.min(1.50, data.duration));
        }

        if (data.beatSamples) {
          this.beatSamples = Math.max(256, Math.floor(data.beatSamples));
        }
        if (data.active) {
          this.tapeReleasePending = false;
          if (this.tapeState !== 'stopping' && this.tapeState !== 'stopped') {
            this.anchorTapeStop();
            this.tapeState = 'stopping';
            this.tapePhase = 0.0;
            this.tapeSpeed = 1.0;
          }
        } else {
          if (this.tapeState === 'stopping') {
            // If released before the brake finishes (e.g. a quick tap/click), complete the full downward stop first!
            this.tapeReleasePending = true;
          } else if (this.tapeState === 'stopped') {
            this.tapeState = 'starting';
            this.tapeStartPhase = 0.0;
            this.tapeSpeed = 0.08;
            this.tapeDelaySamples = Math.floor(sampleRate * 0.065);
          }
        }
      } else if (data.type === 'tapestopParams') {
        if (typeof data.duration === 'number' && data.duration > 0.1) {
          this.tapeStopDuration = Math.max(0.20, Math.min(1.50, data.duration));
        }
        if (data.beatSamples) {
          this.beatSamples = Math.max(256, Math.floor(data.beatSamples));
        }
      }
    };
  }

  getFlamGuardStartOffset() {
    return 0;
  }

  anchorStutterSlice() {
    const stepSamples = Math.max(512, Math.floor(this.beatSamples * 0.38));
    this.stutterSliceMaxSamples = stepSamples;
    const validHistory = Math.min(this.samplesSinceTransportStart, this.bufferLength - 1);

    // 1. If targeting a specific instrument (fallbackSlice provided), always populate stutterSliceL/R
    // from its clean studio one-shot buffer so sample 0 is guaranteed to be the exact transient attack
    if (this.fallbackSlice && this.fallbackSlice.length > 0) {
      const fbLen = Math.min(this.fallbackSlice.length, this.maxStutterLength);
      const tailFade = Math.min(256, fbLen >> 2);
      for (let k = 0; k < this.maxStutterLength; k++) {
        if (k < fbLen) {
          let env = 1.0;
          const rem = fbLen - k;
          if (rem <= tailFade && tailFade > 0) {
            env = 0.5 * (1.0 - Math.cos(Math.PI * rem / tailFade));
          }
          const val = this.fallbackSlice[k] * env;
          this.stutterSliceL[k] = val;
          this.stutterSliceR[k] = val;
        } else {
          this.stutterSliceL[k] = 0.0;
          this.stutterSliceR[k] = 0.0;
        }
      }
      this.stutterCaptureCount = this.stutterSliceMaxSamples;
      this.stutterHasAudio = true;

      // Check if that instrument is currently mid-hit in inBufferL/R so we don't double-attack (flam)
      const recentScan = Math.min(stepSamples, validHistory);
      let recentPeak = 0;
      for (let i = 1; i <= recentScan; i++) {
        const idx = (this.writeIndex - i + this.bufferLength) % this.bufferLength;
        const p = Math.max(Math.abs(this.inBufferL[idx]), Math.abs(this.inBufferR[idx]));
        if (p > recentPeak) recentPeak = p;
      }
      if (recentPeak > 0.025) {
        const threshold = recentPeak * 0.22;
        let onsetBack = recentScan;
        for (let i = recentScan; i >= 1; i--) {
          const idx = (this.writeIndex - i + this.bufferLength) % this.bufferLength;
          const p = Math.max(Math.abs(this.inBufferL[idx]), Math.abs(this.inBufferR[idx]));
          if (p >= threshold) {
            onsetBack = Math.min(recentScan, i + 48);
            break;
          }
        }
        if (onsetBack < this.loopSamples) {
          this.stutterFirstPass = true;
          this.stutterPlayOffset = onsetBack;
          return;
        }
      }

      this.stutterFirstPass = false;
      this.stutterPlayOffset = this.getFlamGuardStartOffset();
      return;
    }

    // 2. Whole Mix: Check the current 16th-note step window for a drum transient that just started
    const primaryScan = Math.min(stepSamples, validHistory);
    let maxPeak = 0;
    for (let i = 1; i <= primaryScan; i++) {
      const idx = (this.writeIndex - i + this.bufferLength) % this.bufferLength;
      const p = Math.max(Math.abs(this.inBufferL[idx]), Math.abs(this.inBufferR[idx]));
      if (p > maxPeak) maxPeak = p;
    }

    if (maxPeak > 0.02) {
      const threshold = maxPeak * 0.20;
      let onsetBack = primaryScan;
      for (let i = primaryScan; i >= 1; i--) {
        const idx = (this.writeIndex - i + this.bufferLength) % this.bufferLength;
        const p = Math.max(Math.abs(this.inBufferL[idx]), Math.abs(this.inBufferR[idx]));
        if (p >= threshold) {
          onsetBack = Math.min(primaryScan, i + 48);
          break;
        }
      }
      const copyCount = Math.min(onsetBack, this.stutterSliceMaxSamples);
      for (let k = 0; k < this.maxStutterLength; k++) {
        if (k < copyCount) {
          const ringIdx = (this.writeIndex - onsetBack + k + this.bufferLength) % this.bufferLength;
          this.stutterSliceL[k] = this.inBufferL[ringIdx];
          this.stutterSliceR[k] = this.inBufferR[ringIdx];
        } else {
          this.stutterSliceL[k] = 0.0;
          this.stutterSliceR[k] = 0.0;
        }
      }
      this.stutterCaptureCount = copyCount;
      this.stutterHasAudio = true;
      if (copyCount < this.loopSamples) {
        this.stutterFirstPass = true;
        this.stutterPlayOffset = copyCount;
      } else {
        this.stutterFirstPass = false;
        this.stutterPlayOffset = this.getFlamGuardStartOffset();
      }
      return;
    }

    // 3. Whole Mix pressed during a brief gap between steps: scan back up to 4 beats in 1-step (16th-note) windows
    // and capture only the single 1-step drum hit so no later off-beat steps bleed into longer subdivisions
    const maxLookback = Math.min(this.beatSamples * 4, validHistory);
    const windowSize = stepSamples;
    for (let winEnd = windowSize * 2; winEnd <= maxLookback; winEnd += windowSize) {
      const winStart = winEnd - windowSize + 1;
      let winPeak = 0;
      for (let i = winStart; i <= winEnd; i++) {
        const idx = (this.writeIndex - i + this.bufferLength) % this.bufferLength;
        const p = Math.max(Math.abs(this.inBufferL[idx]), Math.abs(this.inBufferR[idx]));
        if (p > winPeak) winPeak = p;
      }
      if (winPeak > 0.02) {
        const threshold = winPeak * 0.20;
        let onsetBack = winEnd;
        for (let i = winEnd; i >= winStart; i--) {
          const idx = (this.writeIndex - i + this.bufferLength) % this.bufferLength;
          const p = Math.max(Math.abs(this.inBufferL[idx]), Math.abs(this.inBufferR[idx]));
          if (p >= threshold) {
            onsetBack = Math.min(maxLookback, i + 48);
            break;
          }
        }
        const copyCount = Math.min(onsetBack, this.stutterSliceMaxSamples);
        const tailFade = Math.min(256, copyCount >> 2);
        for (let k = 0; k < this.maxStutterLength; k++) {
          if (k < copyCount) {
            let env = 1.0;
            const rem = copyCount - k;
            if (rem <= tailFade && tailFade > 0) {
              env = 0.5 * (1.0 - Math.cos(Math.PI * rem / tailFade));
            }
            const ringIdx = (this.writeIndex - onsetBack + k + this.bufferLength) % this.bufferLength;
            this.stutterSliceL[k] = this.inBufferL[ringIdx] * env;
            this.stutterSliceR[k] = this.inBufferR[ringIdx] * env;
          } else {
            this.stutterSliceL[k] = 0.0;
            this.stutterSliceR[k] = 0.0;
          }
        }
        this.stutterCaptureCount = this.stutterSliceMaxSamples;
        this.stutterFirstPass = false;
        this.stutterPlayOffset = this.getFlamGuardStartOffset();
        this.stutterHasAudio = true;
        return;
      }
    }

    this.stutterHasAudio = false;
    this.stutterFirstPass = false;
    this.stutterPlayOffset = 0;
    this.stutterCaptureCount = 0;
  }

  anchorTapeStop() {
    const prevIdx = (this.writeIndex - 1 + this.bufferLength) % this.bufferLength;
    this.tapeLpL = this.postStutterBufL[prevIdx];
    this.tapeLpR = this.postStutterBufR[prevIdx];
    this.tapeEchoLpL = 0.0;
    this.tapeEchoLpR = 0.0;
    this.tapeEchoHpL = 0.0;
    this.tapeEchoHpR = 0.0;

    // 1. Check if audio is actively playing in the immediate 35ms window at the write head
    const recentWindow = Math.min(Math.floor(sampleRate * 0.035), this.bufferLength - 1);
    let recentPeak = 0.0;
    for (let i = 1; i <= recentWindow; i++) {
      const idx = (this.writeIndex - i + this.bufferLength) % this.bufferLength;
      const p = Math.max(Math.abs(this.postStutterBufL[idx]), Math.abs(this.postStutterBufR[idx]));
      if (p > recentPeak) recentPeak = p;
    }

    if (recentPeak > 0.025) {
      // Audio is currently active: start the modulated delay line at 0.0ms delay for a 100% seamless, zero-jump transition
      this.tapeDelaySamples = 0.0;
      this.tapeCrossfadeSamples = 0;
      return;
    }

    // 2. If triggered during a quiet gap between drum steps, locate the most recent drum hit in postStutterBuf
    // and seed it into the delay line so the brake never drops into silence
    const maxLookback = Math.min(Math.max(this.beatSamples * 4, Math.floor(sampleRate * 1.5)), this.bufferLength - 1);
    const chunkSize = Math.floor(sampleRate * 0.045);
    let chosenOnsetBack = 0;
    let chosenPeak = 0.0;

    for (let winEnd = chunkSize; winEnd <= maxLookback; winEnd += chunkSize) {
      const winStart = Math.max(1, winEnd - chunkSize);
      let winPeak = 0.0;
      for (let i = winStart; i <= winEnd; i++) {
        const idx = (this.writeIndex - i + this.bufferLength) % this.bufferLength;
        const p = Math.max(Math.abs(this.postStutterBufL[idx]), Math.abs(this.postStutterBufR[idx]));
        if (p > winPeak) winPeak = p;
      }
      if (winPeak > 0.018) {
        const threshold = winPeak * 0.22;
        let onset = winEnd;
        for (let i = winEnd; i >= winStart; i--) {
          const idx = (this.writeIndex - i + this.bufferLength) % this.bufferLength;
          const p = Math.max(Math.abs(this.postStutterBufL[idx]), Math.abs(this.postStutterBufR[idx]));
          if (p >= threshold) {
            onset = Math.min(maxLookback, i + 24);
            break;
          }
        }
        chosenOnsetBack = onset;
        chosenPeak = winPeak;
        break;
      }
    }

    if (chosenOnsetBack > 0 && chosenPeak > 0.015) {
      const copyLen = Math.min(chosenOnsetBack, Math.floor(sampleRate * 0.14));
      const makeupGain = Math.min(1.85, Math.max(1.0, 0.48 / Math.max(0.02, chosenPeak)));
      for (let k = 0; k < copyLen; k++) {
        const srcIdx = (this.writeIndex - chosenOnsetBack + k + this.bufferLength) % this.bufferLength;
        const dstIdx = (this.writeIndex - copyLen + k + this.bufferLength) % this.bufferLength;
        this.tapeBufferL[dstIdx] = Math.tanh(this.postStutterBufL[srcIdx] * makeupGain);
        this.tapeBufferR[dstIdx] = Math.tanh(this.postStutterBufR[srcIdx] * makeupGain);
      }
      this.tapeDelaySamples = copyLen;
      this.tapeCrossfadeSamples = 96;
    } else {
      this.tapeDelaySamples = 0.0;
      this.tapeCrossfadeSamples = 0;
    }
  }

  readBufferCubic(buf, len, pos) {
    let wrapped = pos % len;
    if (wrapped < 0) wrapped += len;
    const i1 = Math.floor(wrapped);
    const frac = wrapped - i1;
    const i0 = (i1 - 1 + len) % len;
    const i2 = (i1 + 1) % len;
    const i3 = (i1 + 2) % len;

    const y0 = buf[i0];
    const y1 = buf[i1];
    const y2 = buf[i2];
    const y3 = buf[i3];

    // 4-point Catmull-Rom cubic spline interpolation for smooth fractional delay reading
    const c0 = y1;
    const c1 = 0.5 * (y2 - y0);
    const c2 = y0 - 2.5 * y1 + 2.0 * y2 - 0.5 * y3;
    const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
    return ((c3 * frac + c2) * frac + c1) * frac + c0;
  }

  processTapeHead(inL, inR, speed) {
    // Non-resonant 1-pole (6dB/oct) analog tape head high-frequency rolloff coupled to tape speed
    const speedClamped = Math.max(0.0, Math.min(1.0, speed));
    const cutoff = 160.0 + 18500.0 * Math.pow(speedClamped, 1.15);
    const g = Math.min(0.96, 1.0 - Math.exp((-2.0 * Math.PI * cutoff) / sampleRate));

    this.tapeLpL += g * (inL - this.tapeLpL);
    this.tapeLpR += g * (inR - this.tapeLpR);

    // Subtle analog magnetic saturation without artificial oscillators or resonant bandpass coloration
    return [
      Math.tanh(this.tapeLpL * 1.15) * 0.92,
      Math.tanh(this.tapeLpR * 1.15) * 0.92
    ];
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const outL = output[0];
    const outR = output[1] || output[0];
    const inL = (input && input[0]) ? input[0] : null;
    const inR = (input && input[1]) ? input[1] : inL;
    const frames = outL.length;

    const stopPhaseStep = 1.0 / (sampleRate * Math.max(0.20, this.tapeStopDuration));
    const startPhaseStep = 1.0 / (sampleRate * Math.max(0.12, this.tapeStartDuration));

    for (let i = 0; i < frames; i++) {
      const rawL = inL ? inL[i] : 0;
      const rawR = inR ? inR[i] : 0;

      // Always write clean incoming audio into inBufferL/R
      this.inBufferL[this.writeIndex] = rawL;
      this.inBufferR[this.writeIndex] = rawR;
      if (this.transportPlaying && this.samplesSinceTransportStart < this.bufferLength) {
        this.samplesSinceTransportStart++;
      }

      let procL = rawL;
      let procR = rawR;

      // Compute sample-accurate master beat-grid subdivision phase and dynamic loop length
      let crossedGridBoundary = false;
      let curLoopLen = this.loopSamples;

      if (this.transportPlaying && this.beatDurationSec > 0) {
        const sampleTime = currentTime + i / sampleRate;
        const beatsFromAnchor = (sampleTime - this.beatAnchorTime) / this.beatDurationSec;
        const beatPos = ((beatsFromAnchor % 1.0) + 1.0) % 1.0;

        // If swing is active and subdivision is 16th or 32nd note (triplets are always kept in strict time)
        if (this.stutterSwing > 0.001 && (this.divBeats === 0.25 || this.divBeats === 0.125)) {
          const sf = 0.5 + this.stutterSwing * 0.25;
          const d0 = 0.5 * sf;
          const d1 = 0.5 * (1.0 - sf);
          const eighthIdx = beatPos < 0.5 ? 0 : 1;
          const posIn8th = beatPos - eighthIdx * 0.5;

          let sixteenthPhase = 0.0;
          let sixteenthDurationBeats = d0;
          if (posIn8th < d0) {
            sixteenthPhase = posIn8th / d0;
            sixteenthDurationBeats = d0;
          } else {
            sixteenthPhase = (posIn8th - d0) / d1;
            sixteenthDurationBeats = d1;
          }

          let subdivPhase = sixteenthPhase;
          if (this.divBeats === 0.25) {
            // 1/16 note stutter with swing feel
            curLoopLen = Math.max(128, Math.min(this.maxStutterLength - 1, Math.floor(this.beatSamples * sixteenthDurationBeats)));
          } else {
            // 1/32 note stutter with swing feel (two 32nd notes inside each swung 16th note)
            subdivPhase = (sixteenthPhase * 2.0) % 1.0;
            curLoopLen = Math.max(128, Math.min(this.maxStutterLength - 1, Math.floor(this.beatSamples * sixteenthDurationBeats * 0.5)));
          }
          crossedGridBoundary = this.lastSubdivPhase >= 0.0 && subdivPhase < this.lastSubdivPhase && (this.lastSubdivPhase - subdivPhase) > 0.35;
          this.lastSubdivPhase = subdivPhase;
        } else {
          // Strict straight time (used for straight stutter mode, 0 swing, and all triplet divisions 1/8T & 1/16T)
          const subdivPos = beatPos * this.subdivsPerBeat;
          const subdivPhase = subdivPos - Math.floor(subdivPos);
          crossedGridBoundary = this.lastSubdivPhase >= 0.0 && subdivPhase < this.lastSubdivPhase && (this.lastSubdivPhase - subdivPhase) > 0.35;
          this.lastSubdivPhase = subdivPhase;
          curLoopLen = this.loopSamples;
        }
      }

      // --- 1. STUTTER STAGE ---
      if (this.stutterActive && (this.transportPlaying || !this.stutterHeld)) {
        if (!this.stutterHasAudio) {
          const peak = Math.max(Math.abs(rawL), Math.abs(rawR));
          if (peak > 0.02) {
            const preRoll = Math.min(48, curLoopLen >> 3, this.samplesSinceTransportStart);
            for (let k = 0; k < this.maxStutterLength; k++) {
              if (k < preRoll) {
                const ringIdx = (this.writeIndex - preRoll + k + this.bufferLength) % this.bufferLength;
                this.stutterSliceL[k] = this.inBufferL[ringIdx];
                this.stutterSliceR[k] = this.inBufferR[ringIdx];
              } else {
                this.stutterSliceL[k] = 0.0;
                this.stutterSliceR[k] = 0.0;
              }
            }
            this.stutterCaptureCount = preRoll;
            this.stutterPlayOffset = preRoll;
            this.stutterFirstPass = true;
            this.stutterHasAudio = true;
          }
        }

        if (this.stutterHasAudio) {

          // Continue capturing only the single 16th-note step drum hit (with smooth tail taper)
          // so subsequent steps never bleed into longer stutter divisions like 1/8 or 1/4
          if (this.stutterCaptureCount < this.stutterSliceMaxSamples) {
            let capEnv = 1.0;
            const tailFade = Math.min(256, this.stutterSliceMaxSamples >> 2);
            const remCap = this.stutterSliceMaxSamples - this.stutterCaptureCount;
            if (remCap <= tailFade && tailFade > 0) {
              capEnv = 0.5 * (1.0 - Math.cos(Math.PI * remCap / tailFade));
            }
            this.stutterSliceL[this.stutterCaptureCount] = rawL * capEnv;
            this.stutterSliceR[this.stutterCaptureCount] = rawR * capEnv;
            this.stutterCaptureCount++;
          }

          // Re-trigger stutterPlayOffset on exact master beat-grid subdivision boundaries
          const minPlayBeforeRetrigger = Math.min(Math.floor(sampleRate * 0.032), curLoopLen >> 1);
          if (crossedGridBoundary) {
            const minInitialCapture = Math.min(384, curLoopLen >> 2);
            if ((!this.stutterFirstPass || this.stutterCaptureCount >= minInitialCapture) && this.stutterPlayOffset >= minPlayBeforeRetrigger) {
              this.stutterFirstPass = false;
              this.stutterRetriggerFade = 64;
              this.stutterPlayOffset = 0;
            }
          }

          if (this.stutterFirstPass) {
            procL = rawL;
            procR = rawR;
          } else if (this.stutterPlayOffset < this.maxStutterLength) {
            const readIdx = Math.min(this.stutterPlayOffset, this.maxStutterLength - 1);
            procL = this.stutterSliceL[readIdx];
            procR = this.stutterSliceR[readIdx];

            // Smooth micro-envelope at loop boundaries for click-free rhythmic repeats
            const fadeInLen = Math.min(64, curLoopLen >> 4);
            const fadeOutLen = Math.min(128, curLoopLen >> 3);
            let env = 1.0;
            if (this.stutterPlayOffset < fadeInLen && fadeInLen > 0) {
              env = 0.5 * (1.0 - Math.cos(Math.PI * this.stutterPlayOffset / fadeInLen));
            } else if (this.stutterPlayOffset >= curLoopLen) {
              env = 0.0;
            } else if (this.stutterPlayOffset > curLoopLen - fadeOutLen && fadeOutLen > 0) {
              const rem = curLoopLen - this.stutterPlayOffset;
              env = 0.5 * (1.0 - Math.cos(Math.PI * rem / fadeOutLen));
            }
            procL *= env;
            procR *= env;
          } else {
            procL = 0.0;
            procR = 0.0;
          }

          if (this.stutterRetriggerFade > 0) {
            const alpha = this.stutterRetriggerFade / 64.0;
            procL = procL * (1.0 - alpha) + this.stutterPrevSampleL * alpha;
            procR = procR * (1.0 - alpha) + this.stutterPrevSampleR * alpha;
            this.stutterRetriggerFade--;
          }

          this.stutterPrevSampleL = procL;
          this.stutterPrevSampleR = procR;

          this.stutterPlayOffset++;
          if ((!this.transportPlaying && this.stutterPlayOffset >= curLoopLen) || this.stutterPlayOffset >= curLoopLen + minPlayBeforeRetrigger + 128) {
            this.stutterFirstPass = false;
            this.stutterRetriggerFade = 64;
            this.stutterPlayOffset = 0;
          }
        }
      }

      // Always store clean post-stutter signal into postStutterBufL/R
      this.postStutterBufL[this.writeIndex] = procL;
      this.postStutterBufR[this.writeIndex] = procR;

      // Track live post-stutter envelope for ducking the analog delay sustainer during Tape Stop
      const liveMag = Math.max(Math.abs(procL), Math.abs(procR));
      if (liveMag > this.tapeLiveEnv) {
        this.tapeLiveEnv += 0.25 * (liveMag - this.tapeLiveEnv);
      } else {
        this.tapeLiveEnv += 0.0025 * (liveMag - this.tapeLiveEnv);
      }

      // --- 2. DELAY-BASED TAPE STOP STAGE ---
      if (this.tapeState === 'stopping') {
        // Golden-ratio 3-head Space Echo feedback path into tapeBufferL/R so short drum hits
        // naturally bloom into a warm analog delay tail if the dry beat has gaps during the brake
        const idx1L = (this.writeIndex - this.echoTap1L + this.bufferLength) % this.bufferLength;
        const idx2L = (this.writeIndex - this.echoTap2L + this.bufferLength) % this.bufferLength;
        const idx3L = (this.writeIndex - this.echoTap3L + this.bufferLength) % this.bufferLength;
        const rawEchoL = 0.44 * this.tapeBufferL[idx1L] + 0.33 * this.tapeBufferL[idx2L] + 0.23 * this.tapeBufferL[idx3L];

        const idx1R = (this.writeIndex - this.echoTap1R + this.bufferLength) % this.bufferLength;
        const idx2R = (this.writeIndex - this.echoTap2R + this.bufferLength) % this.bufferLength;
        const idx3R = (this.writeIndex - this.echoTap3R + this.bufferLength) % this.bufferLength;
        const rawEchoR = 0.44 * this.tapeBufferR[idx1R] + 0.33 * this.tapeBufferR[idx2R] + 0.23 * this.tapeBufferR[idx3R];

        // 65Hz DC/sub blocker + 2.2kHz warm analog tape echo lowpass
        const hpCoeff = 1.0 - Math.exp((-2.0 * Math.PI * 65.0) / sampleRate);
        this.tapeEchoHpL += hpCoeff * (rawEchoL - this.tapeEchoHpL);
        this.tapeEchoHpR += hpCoeff * (rawEchoR - this.tapeEchoHpR);
        const hpEchoL = rawEchoL - this.tapeEchoHpL;
        const hpEchoR = rawEchoR - this.tapeEchoHpR;

        const lpCoeff = 1.0 - Math.exp((-2.0 * Math.PI * 2200.0) / sampleRate);
        this.tapeEchoLpL += lpCoeff * (hpEchoL - this.tapeEchoLpL);
        this.tapeEchoLpR += lpCoeff * (hpEchoR - this.tapeEchoLpR);

        // Duck the echo whenever live drum audio is actively entering the delay line
        const liveDuck = Math.min(1.0, this.tapeLiveEnv * 4.0);
        const echoFeedback = 0.85 * (1.0 - 0.65 * liveDuck);
        this.tapeBufferL[this.writeIndex] = Math.tanh(procL + this.tapeEchoLpL * echoFeedback);
        this.tapeBufferR[this.writeIndex] = Math.tanh(procR + this.tapeEchoLpR * echoFeedback);

        this.tapePhase = Math.min(1.0, this.tapePhase + stopPhaseStep);
        const u = this.tapePhase;
        // Natural physical brake curve: immediate downward pitch bend on press, smooth deceleration to 0.0
        this.tapeSpeed = Math.max(0.0, Math.pow(1.0 - u, 1.75));
        // Modulated delay line: delay time grows by (1 - tapeSpeed) every sample
        this.tapeDelaySamples = Math.min(this.bufferLength - 8, this.tapeDelaySamples + (1.0 - this.tapeSpeed));

        if (this.tapePhase >= 1.0 || this.tapeSpeed <= 0.001) {
          procL = 0.0;
          procR = 0.0;
          this.tapeState = 'stopped';
          this.tapeHoldPauseSamples = this.tapeReleasePending ? Math.floor(sampleRate * 0.035) : 0;
        } else {
          const readPos = this.writeIndex - this.tapeDelaySamples;
          const rawTapL = this.readBufferCubic(this.tapeBufferL, this.bufferLength, readPos);
          const rawTapR = this.readBufferCubic(this.tapeBufferR, this.bufferLength, readPos);

          // Full volume through 78% of the brake, then smooth cosine fade into the stall
          let stallEnv = 1.0;
          if (u > 0.78) {
            const stallProgress = (u - 0.78) / 0.22;
            stallEnv = 0.5 * (1.0 + Math.cos(Math.PI * stallProgress));
          }

          const [filtL, filtR] = this.processTapeHead(rawTapL, rawTapR, this.tapeSpeed);
          procL = filtL * stallEnv;
          procR = filtR * stallEnv;

          if (this.tapeCrossfadeSamples > 0) {
            const alpha = this.tapeCrossfadeSamples / 96.0;
            procL = procL * (1.0 - alpha) + this.tapePrevOutL * alpha;
            procR = procR * (1.0 - alpha) + this.tapePrevOutR * alpha;
            this.tapeCrossfadeSamples--;
          }
        }
      } else if (this.tapeState === 'stopped') {
        this.tapeBufferL[this.writeIndex] = procL;
        this.tapeBufferR[this.writeIndex] = procR;
        procL = 0.0;
        procR = 0.0;
        if (this.tapeReleasePending) {
          if (this.tapeHoldPauseSamples > 0) {
            this.tapeHoldPauseSamples--;
          } else {
            this.tapeReleasePending = false;
            this.tapeState = 'starting';
            this.tapeStartPhase = 0.0;
            this.tapeSpeed = 0.08;
            this.tapeDelaySamples = Math.floor(sampleRate * 0.065);
          }
        }
      } else if (this.tapeState === 'starting') {
        this.tapeBufferL[this.writeIndex] = procL;
        this.tapeBufferR[this.writeIndex] = procR;

        this.tapeStartPhase = Math.min(1.0, this.tapeStartPhase + startPhaseStep);
        const su = this.tapeStartPhase;
        // Snappy smoothstep motor spin-up from 0.08x back to 1.0x
        this.tapeSpeed = 0.08 + 0.92 * (su * su * (3.0 - 2.0 * su));
        this.tapeDelaySamples = Math.min(this.bufferLength - 8, this.tapeDelaySamples + (1.0 - this.tapeSpeed));

        const readPos = this.writeIndex - this.tapeDelaySamples;
        const rawSpinL = this.readBufferCubic(this.tapeBufferL, this.bufferLength, readPos);
        const rawSpinR = this.readBufferCubic(this.tapeBufferR, this.bufferLength, readPos);
        const [fL, fR] = this.processTapeHead(rawSpinL, rawSpinR, this.tapeSpeed);
        const spinFadeIn = Math.min(1.0, su / 0.12);
        const spinL = fL * spinFadeIn;
        const spinR = fR * spinFadeIn;

        // Crossfade from spinning delay tap back into zero-latency live signal
        if (su > 0.45) {
          const blend = (su - 0.45) / 0.55;
          const smoothBlend = blend * blend * (3.0 - 2.0 * blend);
          procL = spinL * (1.0 - smoothBlend) + procL * smoothBlend;
          procR = spinR * (1.0 - smoothBlend) + procR * smoothBlend;
        } else {
          procL = spinL;
          procR = spinR;
        }

        if (this.tapeStartPhase >= 1.0) {
          this.tapeSpeed = 1.0;
          this.tapePhase = 0.0;
          this.tapeDelaySamples = 0.0;
          this.tapeState = 'idle';
        }
      } else {
        this.tapeBufferL[this.writeIndex] = procL;
        this.tapeBufferR[this.writeIndex] = procR;
      }

      this.tapePrevOutL = procL;
      this.tapePrevOutR = procR;

      outL[i] = procL;
      if (output[1]) {
        outR[i] = procR;
      }

      this.writeIndex = (this.writeIndex + 1) % this.bufferLength;
    }

    return true;
  }
}
registerProcessor('dj-fx-processor', DjFxProcessor);
`;

const createImpulseResponse = (
    context: AudioContext | OfflineAudioContext,
    decaySeconds: number,
    reverbType: ReverbType = 'plate',
    noiseData?: Float32Array | null
): AudioBuffer => {
    const impulseSampleRate = context.sampleRate;
    const clampedDecay = Math.max(0.05, decaySeconds);
    const impulseLength = Math.ceil(impulseSampleRate * clampedDecay);
    const impulseBuffer = context.createBuffer(2, impulseLength, impulseSampleRate);
    const left = impulseBuffer.getChannelData(0);
    const right = impulseBuffer.getChannelData(1);
    const invLength = 1 / impulseLength;
    const noiseLen = noiseData ? noiseData.length : 0;
    const rightOffset = noiseLen > 0 ? Math.floor(noiseLen * 0.5) : 0;

    let lpL = 0;
    let lpR = 0;

    for (let i = 0; i < impulseLength; i++) {
        const normPos = i * invLength;
        const oneMinusN = 1 - normPos;

        const rawL = noiseData && noiseLen > 0
            ? noiseData[i % noiseLen]
            : (Math.random() * 2 - 1);
        const rawR = noiseData && noiseLen > 0
            ? noiseData[(i + rightOffset) % noiseLen]
            : (Math.random() * 2 - 1);

        let envelope = 0;
        let dampAlpha = 0.85;
        let stereoCross = 0;
        let gainScale = 1.0;

        switch (reverbType) {
            case 'room': {
                // Punchy studio drum room: tight decay + warm progressive wood absorption
                envelope = oneMinusN * oneMinusN * oneMinusN * Math.sqrt(oneMinusN); // (1 - t)^3.5
                dampAlpha = Math.max(0.18, 0.78 - normPos * 0.55);
                stereoCross = 0.15;
                gainScale = 1.15;
                break;
            }
            case 'hall': {
                // Lush concert hall: smooth blooming attack + wide, spacious tail
                const attackBloom = 1 - Math.exp(-normPos * 18);
                envelope = attackBloom * oneMinusN * Math.sqrt(oneMinusN); // bloom * (1 - t)^1.5
                dampAlpha = Math.max(0.22, 0.82 - normPos * 0.52);
                stereoCross = -0.12;
                gainScale = 0.9;
                break;
            }
            case 'plate':
            default: {
                // Classic studio plate: instant dense diffusion, bright metallic sheen
                envelope = oneMinusN * oneMinusN; // (1 - t)^2.0
                dampAlpha = Math.max(0.45, 0.96 - normPos * 0.35);
                stereoCross = 0.0;
                gainScale = 0.95;
                break;
            }
        }

        // Progressive one-pole lowpass damping across the tail
        lpL = lpL + dampAlpha * (rawL - lpL);
        lpR = lpR + dampAlpha * (rawR - lpR);

        const outL = (lpL * (1 - Math.abs(stereoCross)) + lpR * stereoCross) * envelope * gainScale;
        const outR = (lpR * (1 - Math.abs(stereoCross)) + lpL * stereoCross) * envelope * gainScale;

        left[i] = outL;
        right[i] = outR;
    }

    // Inject discrete early reflections for Room, Hall, and Plate
    const taps = reverbType === 'room'
        ? [
            { time: 0.004, gainL: 0.55, gainR: 0.25 },
            { time: 0.009, gainL: 0.22, gainR: 0.52 },
            { time: 0.014, gainL: 0.44, gainR: 0.18 },
            { time: 0.019, gainL: 0.16, gainR: 0.40 },
            { time: 0.026, gainL: 0.32, gainR: 0.22 },
            { time: 0.033, gainL: 0.20, gainR: 0.28 },
        ]
        : reverbType === 'hall'
        ? [
            { time: 0.011, gainL: 0.38, gainR: 0.14 },
            { time: 0.019, gainL: 0.14, gainR: 0.36 },
            { time: 0.029, gainL: 0.30, gainR: 0.18 },
            { time: 0.041, gainL: 0.18, gainR: 0.28 },
            { time: 0.054, gainL: 0.22, gainR: 0.20 },
        ]
        : [
            { time: 0.002, gainL: 0.45, gainR: 0.35 },
            { time: 0.005, gainL: 0.32, gainR: 0.42 },
            { time: 0.008, gainL: 0.36, gainR: 0.28 },
        ];

    const tapBurstSamples = Math.max(1, Math.floor(impulseSampleRate * 0.0018));
    for (const tap of taps) {
        const tapStart = Math.floor(tap.time * impulseSampleRate);
        if (tapStart >= impulseLength) continue;
        const end = Math.min(impulseLength, tapStart + tapBurstSamples);
        for (let j = tapStart; j < end; j++) {
            const env = 1 - (j - tapStart) / tapBurstSamples;
            const nL = noiseData && noiseLen > 0 ? noiseData[j % noiseLen] : (Math.random() * 2 - 1);
            const nR = noiseData && noiseLen > 0 ? noiseData[(j + rightOffset) % noiseLen] : (Math.random() * 2 - 1);
            left[j] += nL * tap.gainL * env;
            right[j] += nR * tap.gainR * env;
        }
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
    sample: { pitch: 1, decay: 1, highPass: MIN_FILTER_FREQ, lowPass: MAX_FILTER_FREQ },
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
    const reverbPreDelayNodeRef = useRef<DelayNode | null>(null);
    const reverbLowCutFilterRef = useRef<BiquadFilterNode | null>(null);
    const reverbToneFilterRef = useRef<BiquadFilterNode | null>(null);
    const reverbWetGainRef = useRef<GainNode | null>(null);
    const reverbSendBusRef = useRef<GainNode | null>(null);
    const reverbDecayValueRef = useRef<number>(0.4);
    const reverbTypeRef = useRef<ReverbType>('plate');
    const delayNodeRef = useRef<DelayNode | null>(null);
    const delayFeedbackGainRef = useRef<GainNode | null>(null);
    const delayWetGainRef = useRef<GainNode | null>(null);
    const delaySendBusRef = useRef<GainNode | null>(null);
    const sidechainDuckNodeRef = useRef<GainNode | null>(null);
    const kickSidechainAmountRef = useRef<number>(0);
    const kickSidechainThresholdRef = useRef<number>(-20);
    const kickSidechainRatioRef = useRef<number>(4);
    const sampleSourceRef = useRef<AudioBufferSourceNode | null>(null);
    
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
    const envelopeFilterOutputRef = useRef<GainNode | null>(null);
    const envelopeFilterDryGainRef = useRef<GainNode | null>(null);
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

    // --- REFS FOR LIVE MASTER OUTPUT RECORDING ---
    const liveRecorderWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const liveRecordedLeftRef = useRef<Float32Array[]>([]);
    const liveRecordedRightRef = useRef<Float32Array[]>([]);
    
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
    const xyFilterActiveRef = useRef<boolean>(false);
    const xyFilterFreqRef = useRef<number>(MAX_FILTER_FREQ);
    const xyFilterDriveRef = useRef<number>(0);
    
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
    const activeAirhornVoiceRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);

    // Master DJ FX (Tape Stop + Beat Stutter) & Per-Instrument Stutter
    const djFxWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const instrumentStutterWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const instrumentPostStutterGainsRef = useRef<Record<Instrument, GainNode | null>>({
        kick: null,
        snare: null,
        hihat: null,
        snap: null,
        clave: null,
        cowbell: null,
        sample: null,
    });
    const stutterActiveRef = useRef<boolean>(false);
    const stutterHeldRef = useRef<boolean>(false);
    const stutterDivisionRef = useRef<StutterDivision>('1/16');
    const stutterSourceRef = useRef<Instrument | 'all'>('clave');
    const stutterSwingRef = useRef<number>(0);
    const beatAnchorTimeRef = useRef<number>(0);
    const transportPlayingRef = useRef<boolean>(false);

    // Refs for debouncing rapid slider-driven offline renders
    const reverbDecayTimeoutRef = useRef<number | null>(null);
    const kickRenderTimeoutRef = useRef<number | null>(null);
    const instrumentRenderTimeoutsRef = useRef<Partial<Record<Instrument, number>>>({});

    // --- INSTRUMENT RENDERING & HELPERS ---
    const makeTapeSaturationCurve = (amount: number): Float32Array => {
        const k = amount * 10; // scale amount for a nice range
        const n_samples = 1024; // 1024 points with linear interpolation + 2x oversampling is acoustically identical and 43x faster than 44100
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
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
    
    const renderKick = async (context: AudioContext | OfflineAudioContext, params: KickDesignerParams, noiseData: Float32Array, drumKit: '808' | '909' | '727' = '808'): Promise<AudioBuffer> => {
        const baseDuration = drumKit === '727' ? 0.3 * params.decay : 0.8 * params.decay;
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
    
        if (drumKit === '727') {
            // Conga style kick
            const osc = offlineCtx.createOscillator();
            osc.type = 'sine';
            const baseFreq = 120 * params.pitch;
            osc.frequency.setValueAtTime(150 * params.pitch, time);
            osc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.05);

            const bodyGain = offlineCtx.createGain();
            bodyGain.gain.setValueAtTime(0, time);
            bodyGain.gain.linearRampToValueAtTime(0.8, time + 0.01);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            
            osc.connect(bodyGain);
            bodyGain.connect(saturator);
            osc.start(time);
            osc.stop(time + duration);
        } else if (drumKit === '909') {
            // 909 Kick (punchier, faster pitch drop, more click)
            const osc = offlineCtx.createOscillator();
            osc.type = 'sine';
            const baseFreq = 55 * params.pitch;
            osc.frequency.setValueAtTime(300 * params.pitch, time);
            osc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.03);

            const bodyGain = offlineCtx.createGain();
            bodyGain.gain.setValueAtTime(0, time);
            bodyGain.gain.linearRampToValueAtTime(0.9, time + 0.005);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            
            osc.connect(bodyGain);
            bodyGain.connect(saturator);

            // 909 Click
            const clickOsc = offlineCtx.createOscillator();
            clickOsc.type = 'square';
            clickOsc.frequency.setValueAtTime(1000, time);
            clickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.02);

            const clickFilter = offlineCtx.createBiquadFilter();
            clickFilter.type = 'highpass';
            clickFilter.frequency.setValueAtTime(1000, time);

            const clickGain = offlineCtx.createGain();
            clickGain.gain.setValueAtTime(0, time);
            clickGain.gain.linearRampToValueAtTime(0.3, time + 0.001);
            clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

            clickOsc.connect(clickFilter);
            clickFilter.connect(clickGain);
            clickGain.connect(masterGain);

            osc.start(time);
            clickOsc.start(time);
            osc.stop(time + duration);
            clickOsc.stop(time + 0.02);
        } else {
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
        }
    
        return await offlineCtx.startRendering();
    };


    const renderSnare = async (context: AudioContext | OfflineAudioContext, params: { tone: number, decay: number, attack: number }, noiseData: Float32Array, drumKit: '808' | '909' | '727' = '808'): Promise<AudioBuffer> => {
        const duration = drumKit === '727' ? 0.4 * params.decay : 0.2 * params.decay;
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const time = 0;

        if (drumKit === '727') {
            // Timbale style
            const osc1 = offlineCtx.createOscillator();
            const osc2 = offlineCtx.createOscillator();
            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(200 * params.tone, time);
            osc2.frequency.setValueAtTime(350 * params.tone, time);
            osc1.frequency.exponentialRampToValueAtTime(180 * params.tone, time + 0.1);

            const oscGain = offlineCtx.createGain();
            oscGain.gain.setValueAtTime(0, time);
            oscGain.gain.linearRampToValueAtTime(0.8, time + 0.005);
            oscGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            
            osc1.connect(oscGain);
            osc2.connect(oscGain);
            oscGain.connect(offlineCtx.destination);
            
            osc1.start(time);
            osc2.start(time);
            osc1.stop(time + duration);
            osc2.stop(time + duration);
        } else if (drumKit === '909') {
            // 909 Snare (higher pitched body, different noise)
            const osc1 = offlineCtx.createOscillator();
            const osc2 = offlineCtx.createOscillator();
            osc1.type = 'triangle';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(250, time);
            osc2.frequency.setValueAtTime(350, time);
            osc1.frequency.exponentialRampToValueAtTime(150, time + 0.05);

            const oscGain = offlineCtx.createGain();
            oscGain.gain.setValueAtTime(0, time);
            oscGain.gain.linearRampToValueAtTime(0.6, time + 0.001);
            oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1 * params.decay);
            
            osc1.connect(oscGain);
            osc2.connect(oscGain);
            oscGain.connect(offlineCtx.destination);

            const noise = offlineCtx.createBufferSource();
            const bufferSize = Math.min(Math.ceil(offlineCtx.sampleRate * duration), noiseData.length);
            const buffer = offlineCtx.createBuffer(1, bufferSize, offlineCtx.sampleRate);
            buffer.copyToChannel(noiseData.subarray(0, bufferSize), 0);
            noise.buffer = buffer;

            const noiseFilter = offlineCtx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(2000 * params.tone, time);
            noiseFilter.Q.value = 0.5;

            const noiseGain = offlineCtx.createGain();
            noiseGain.gain.setValueAtTime(0, time);
            noiseGain.gain.linearRampToValueAtTime(0.7, time + 0.002);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(offlineCtx.destination);
            
            osc1.start(time);
            osc2.start(time);
            noise.start(time);
            osc1.stop(time + duration);
            osc2.stop(time + duration);
            noise.stop(time + duration);
        } else {
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
        }

        return await offlineCtx.startRendering();
    };

    const renderHiHat = async (context: AudioContext | OfflineAudioContext, params: { pitch: number, decay: number }, noiseData: Float32Array, drumKit: '808' | '909' | '727' = '808'): Promise<AudioBuffer> => {
        const duration = drumKit === '727' ? 0.1 * params.decay : 0.05 * params.decay;
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const time = 0;

        if (drumKit === '727') {
            // Maracas style
            const noise = offlineCtx.createBufferSource();
            const bufferSize = Math.min(Math.ceil(offlineCtx.sampleRate * duration), noiseData.length);
            const buffer = offlineCtx.createBuffer(1, bufferSize, offlineCtx.sampleRate);
            buffer.copyToChannel(noiseData.subarray(0, bufferSize), 0);
            noise.buffer = buffer;

            const bandpass = offlineCtx.createBiquadFilter();
            bandpass.type = "bandpass";
            bandpass.frequency.setValueAtTime(6000 * params.pitch, time);
            bandpass.Q.setValueAtTime(1.5, time);
            
            const highpass = offlineCtx.createBiquadFilter();
            highpass.type = "highpass";
            highpass.frequency.setValueAtTime(4000, time);
            
            const gain = offlineCtx.createGain();
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.6, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

            noise.connect(bandpass);
            bandpass.connect(highpass);
            highpass.connect(gain);
            gain.connect(offlineCtx.destination);
            
            noise.start(time);
            noise.stop(time + duration);
        } else if (drumKit === '909') {
            // 909 HiHat (metallic, multiple oscillators)
            const osc1 = offlineCtx.createOscillator();
            const osc2 = offlineCtx.createOscillator();
            const osc3 = offlineCtx.createOscillator();
            osc1.type = 'square';
            osc2.type = 'square';
            osc3.type = 'square';
            osc1.frequency.setValueAtTime(200 * params.pitch, time);
            osc2.frequency.setValueAtTime(300 * params.pitch, time);
            osc3.frequency.setValueAtTime(400 * params.pitch, time);

            const bandpass = offlineCtx.createBiquadFilter();
            bandpass.type = "bandpass";
            bandpass.frequency.setValueAtTime(8000, time);
            bandpass.Q.setValueAtTime(1.2, time);

            const highpass = offlineCtx.createBiquadFilter();
            highpass.type = "highpass";
            highpass.frequency.setValueAtTime(7000, time);

            const gain = offlineCtx.createGain();
            gain.gain.setValueAtTime(0.8, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

            osc1.connect(bandpass);
            osc2.connect(bandpass);
            osc3.connect(bandpass);
            bandpass.connect(highpass);
            highpass.connect(gain);
            gain.connect(offlineCtx.destination);

            osc1.start(time);
            osc2.start(time);
            osc3.start(time);
            osc1.stop(time + duration);
            osc2.stop(time + duration);
            osc3.stop(time + duration);
        } else {
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
        }
        return await offlineCtx.startRendering();
    };

    const renderSnap = async (context: AudioContext | OfflineAudioContext, params: { pitch: number, decay: number, attack: number }, noiseData: Float32Array, _drumKit: '808' | '909' | '727' = '808'): Promise<AudioBuffer> => {
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

    const renderClave = async (context: AudioContext | OfflineAudioContext, params: { pitch: number, decay: number }, drumKit: '808' | '909' | '727' = '808'): Promise<AudioBuffer> => {
        const duration = drumKit === '727' ? 0.2 * params.decay : 0.1 * params.decay;
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const time = 0;
        
        if (drumKit === '727') {
            // Agogo style
            const osc1 = offlineCtx.createOscillator();
            const osc2 = offlineCtx.createOscillator();
            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(800 * params.pitch, time);
            osc2.frequency.setValueAtTime(1200 * params.pitch, time);

            const gainNode = offlineCtx.createGain();
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.8, time + 0.005);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(offlineCtx.destination);

            osc1.start(time);
            osc2.start(time);
            osc1.stop(time + duration);
            osc2.stop(time + duration);
        } else if (drumKit === '909') {
            // 909 Rimshot
            const osc1 = offlineCtx.createOscillator();
            const osc2 = offlineCtx.createOscillator();
            const osc3 = offlineCtx.createOscillator();
            osc1.type = 'sine';
            osc2.type = 'sine';
            osc3.type = 'sine';
            osc1.frequency.setValueAtTime(1700 * params.pitch, time);
            osc2.frequency.setValueAtTime(1800 * params.pitch, time);
            osc3.frequency.setValueAtTime(1900 * params.pitch, time);

            const gainNode = offlineCtx.createGain();
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.9, time + 0.002);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            osc3.connect(gainNode);
            gainNode.connect(offlineCtx.destination);

            osc1.start(time);
            osc2.start(time);
            osc3.start(time);
            osc1.stop(time + duration);
            osc2.stop(time + duration);
            osc3.stop(time + duration);
        } else {
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
        }
        return await offlineCtx.startRendering();
    };
    
    const renderCowbell = async (context: AudioContext | OfflineAudioContext, params: { pitch: number, decay: number, attack: number }, drumKit: '808' | '909' | '727' = '808'): Promise<AudioBuffer> => {
        const duration = drumKit === '727' ? 0.3 * params.decay : 0.5 * params.decay;
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const time = 0;
        
        if (drumKit === '727') {
            // Whistle style
            const osc = offlineCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000 * params.pitch, time);
            osc.frequency.linearRampToValueAtTime(2200 * params.pitch, time + 0.1);

            const gainNode = offlineCtx.createGain();
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.7, time + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc.connect(gainNode);
            gainNode.connect(offlineCtx.destination);

            osc.start(time);
            osc.stop(time + duration);
        } else if (drumKit === '909') {
            // 909 Crash (simplified)
            const osc1 = offlineCtx.createOscillator();
            const osc2 = offlineCtx.createOscillator();
            osc1.type = 'square';
            osc2.type = 'square';
            osc1.frequency.setValueAtTime(300 * params.pitch, time);
            osc2.frequency.setValueAtTime(450 * params.pitch, time);

            const bandpass = offlineCtx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.setValueAtTime(6000, time);
            bandpass.Q.value = 1.5;

            const gainNode = offlineCtx.createGain();
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.8, time + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc1.connect(bandpass);
            osc2.connect(bandpass);
            bandpass.connect(gainNode);
            gainNode.connect(offlineCtx.destination);

            osc1.start(time);
            osc2.start(time);
            osc1.stop(time + duration);
            osc2.stop(time + duration);
        } else {
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
        }
        return await offlineCtx.startRendering();
    };


    const setup = useCallback(async (kickDesignerParams: KickDesignerParams, drumKit: '808' | '909' | '727' = '808', initialInstrumentParams?: AllInstrumentParams): Promise<{ analysers: AllAnalyserNodes, context: AudioContext } | null> => {
        if (initialInstrumentParams) {
            instrumentParamsRef.current = JSON.parse(JSON.stringify(initialInstrumentParams));
        }
        if (!audioContextRef.current) {
            try {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                const context = new AudioCtx({ latencyHint: 'interactive' });
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

                // --- Envelope Filter (Insert with Dry/Wet Mix) ---
                const envelopeFilterInput = context.createGain();
                const envelopeFilterOutput = context.createGain();
                const envelopeFilterDry = context.createGain();
                const envelopeFilterNode = context.createBiquadFilter();
                const envelopeDetector = context.createWaveShaper();
                const envelopeSmoother = context.createBiquadFilter();
                const envelopeAmount = context.createGain();
                const envelopeFilterWet = context.createGain();
                const envelopeFilterBaseFreq = context.createConstantSource();

                envelopeFilterInputRef.current = envelopeFilterInput;
                envelopeFilterOutputRef.current = envelopeFilterOutput;
                envelopeFilterDryGainRef.current = envelopeFilterDry;
                envelopeFilterNodeRef.current = envelopeFilterNode;
                envelopeDetectorRef.current = envelopeDetector;
                envelopeSmootherRef.current = envelopeSmoother;
                envelopeAmountRef.current = envelopeAmount;
                envelopeFilterWetGainRef.current = envelopeFilterWet;
                envelopeFilterBaseFreqNodeRef.current = envelopeFilterBaseFreq;

                // Config
                envelopeFilterNode.type = 'lowpass';
                envelopeFilterNode.frequency.value = 0; // Set intrinsic to 0 so ConstantSourceNode offset controls exact base frequency
                envelopeFilterNode.Q.value = 5;
                envelopeFilterBaseFreq.offset.value = 100; // Base frequency
                envelopeAmount.gain.value = 4000; // Depth/Sensitivity (how many Hz the envelope adds)
                envelopeFilterDry.gain.value = 1; // Dry mix
                envelopeFilterWet.gain.value = 0; // Wet mix
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

                // Routing for the Envelope Filter insert path
                postFilterAnalyserRef.current.connect(envelopeFilterInput);
                envelopeFilterInput.connect(envelopeFilterDry).connect(envelopeFilterOutput);
                envelopeFilterInput.connect(envelopeFilterNode);
                envelopeFilterNode.connect(envelopeFilterWet);
                envelopeFilterWet.connect(envelopeFilterAnalyserRef.current);
                envelopeFilterAnalyserRef.current.connect(envelopeFilterOutput);

                // Routing for the envelope detector path
                envelopeFilterInput.connect(envelopeDetector);
                envelopeDetector.connect(envelopeSmoother);
                envelopeSmoother.connect(envelopeAmount);

                // Connect modulation sources to the filter's frequency param
                envelopeFilterBaseFreq.connect(envelopeFilterNode.frequency);
                envelopeAmount.connect(envelopeFilterNode.frequency);

                // --- Reverb ---
                const reverbSendBus = context.createGain();
                reverbSendBusRef.current = reverbSendBus;
                const reverbPreDelay = context.createDelay(0.25);
                reverbPreDelay.delayTime.value = 0.012; // 12ms natural studio pre-delay
                reverbPreDelayNodeRef.current = reverbPreDelay;

                const reverbLowCutFilter = context.createBiquadFilter();
                reverbLowCutFilter.type = 'highpass';
                reverbLowCutFilter.frequency.value = 110; // Fixed 110Hz low-cut to keep sub/kick mud out of the reverb tank
                reverbLowCutFilter.Q.value = 0.707;
                reverbLowCutFilterRef.current = reverbLowCutFilter;

                const convolver = context.createConvolver();
                convolverRef.current = convolver;

                const reverbToneFilter = context.createBiquadFilter();
                reverbToneFilter.type = 'lowpass';
                reverbToneFilter.frequency.value = 12000;
                reverbToneFilter.Q.value = 0.707;
                reverbToneFilterRef.current = reverbToneFilter;

                const reverbWetGain = context.createGain();
                reverbWetGain.gain.value = 0;
                reverbWetGainRef.current = reverbWetGain;

                const initialDecaySec = 0.1 + reverbDecayValueRef.current * 5.9;
                convolver.buffer = createImpulseResponse(context, initialDecaySec, reverbTypeRef.current, noiseBufferDataRef.current);

                reverbSendBus.connect(reverbPreDelay);
                reverbPreDelay.connect(reverbLowCutFilter);
                reverbLowCutFilter.connect(convolver);
                
                // --- Delay ---
                const delaySendBus = context.createGain();
                delaySendBusRef.current = delaySendBus;
                const delay = context.createDelay(2.5);
                const delayFeedbackGain = context.createGain();
                const delayWetGain = context.createGain();
                delay.delayTime.value = 0.27;
                delayFeedbackGain.gain.value = 0.3;
                delayWetGain.gain.value = 0;
                delayNodeRef.current = delay;
                delayFeedbackGainRef.current = delayFeedbackGain;
                delayWetGainRef.current = delayWetGain;
                delaySendBus.connect(delay);

                // --- Post-Effects Sum Bus (Dry + Reverb Return + Delay Return -> Bitcrusher -> Isolator -> Lo-Fi -> XY Filter -> Master) ---
                const postEffectsBus = context.createGain();
                envelopeFilterOutput.connect(postEffectsBus);
                envelopeFilterOutput.connect(reverbSendBus);
                envelopeFilterOutput.connect(delaySendBus);

                convolver.connect(reverbToneFilter);
                reverbToneFilter.connect(reverbWetGain);
                reverbWetGain.connect(reverbAnalyserRef.current);
                reverbAnalyserRef.current.connect(postEffectsBus);

                delay.connect(delayFeedbackGain);
                delayFeedbackGain.connect(delay);
                delay.connect(delayWetGain);
                delayWetGain.connect(delayAnalyserRef.current);
                delayAnalyserRef.current.connect(postEffectsBus);

                // --- Bitcrusher ---
                const crusherNode = new AudioWorkletNode(context, 'bitcrusher-processor');
                crusherWorkletNodeRef.current = crusherNode;
                crusherAnalyserRef.current = context.createAnalyser();
                postEffectsBus.connect(crusherNode);
                crusherNode.connect(crusherAnalyserRef.current);

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

                crusherAnalyserRef.current.connect(isoLowF);
                crusherAnalyserRef.current.connect(isoMidF);
                crusherAnalyserRef.current.connect(isoHighF);
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
                const djFxNode = new AudioWorkletNode(context, 'dj-fx-processor', {
                    outputChannelCount: [2],
                });
                djFxWorkletNodeRef.current = djFxNode;

                const instStutterNode = new AudioWorkletNode(context, 'dj-fx-processor', {
                    outputChannelCount: [2],
                });
                instrumentStutterWorkletNodeRef.current = instStutterNode;

                lofiOutput.connect(xyFilterInput);
                xyFilterInput.connect(xyFilterDry).connect(xyFilterOutput); // Dry path
                xyFilterInput.connect(xyFilterNode).connect(xyFilterSaturator).connect(xyFilterWet).connect(xyFilterOutput); // Wet path
                xyFilterOutput.connect(djFxNode);
                djFxNode.connect(masterCompressor);

                // --- Sample Channel Filters ---
                const sampleHP = context.createBiquadFilter();
                sampleHP.type = 'highpass';
                sampleHP.frequency.value = instrumentParamsRef.current.sample?.highPass ?? MIN_FILTER_FREQ;
                sampleHighPassRef.current = sampleHP;

                const sampleLP = context.createBiquadFilter();
                sampleLP.type = 'lowpass';
                sampleLP.frequency.value = instrumentParamsRef.current.sample?.lowPass ?? MAX_FILTER_FREQ;
                sampleLowPassRef.current = sampleLP;
                
                // Create instrument analysers (for small scopes) and post-stutter routing nodes
                Object.keys(instrumentAnalysersRef.current).forEach(key => {
                    const instrument = key as Instrument;
                    const analyser = context.createAnalyser();
                    instrumentAnalysersRef.current[instrument] = analyser;
                    const postStutterGain = context.createGain();
                    instrumentPostStutterGainsRef.current[instrument] = postStutterGain;
                    
                    if (instrument === 'kick') {
                        if (stutterSourceRef.current === 'kick') {
                            analyser.connect(instStutterNode);
                            instStutterNode.connect(postStutterGain);
                        } else {
                            analyser.connect(postStutterGain);
                        }
                        postStutterGain.connect(highPass);
                    } else if (instrument === 'sample') {
                        analyser.connect(sampleHP);
                        sampleHP.connect(sampleLP);
                        if (stutterSourceRef.current === 'sample') {
                            sampleLP.connect(instStutterNode);
                            instStutterNode.connect(postStutterGain);
                        } else {
                            sampleLP.connect(postStutterGain);
                        }
                        postStutterGain.connect(sidechainDuckNode);
                    } else {
                        if (stutterSourceRef.current === instrument) {
                            analyser.connect(instStutterNode);
                            instStutterNode.connect(postStutterGain);
                        } else {
                            analyser.connect(postStutterGain);
                        }
                        postStutterGain.connect(sidechainDuckNode);
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
                    renderKick(context, kickDesignerParams, noiseBufferDataRef.current!, drumKit),
                    renderSnare(context, snare as { tone: number, decay: number, attack: number }, noiseBufferDataRef.current!, drumKit),
                    renderHiHat(context, hihat as { pitch: number, decay: number }, noiseBufferDataRef.current!, drumKit),
                    renderSnap(context, snap as { pitch: number, decay: number, attack: number }, noiseBufferDataRef.current!, drumKit),
                    renderClave(context, clave as { pitch: number, decay: number }, drumKit),
                    renderCowbell(context, cowbell as { pitch: number, decay: number, attack: number }, drumKit),
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
        const playTime = time !== undefined ? Math.max(context.currentTime, time) : context.currentTime;

        const source = context.createBufferSource();
        source.buffer = bufferToPlay;

        // Apply real-time pitch shift for sample playback
        if (instrument === 'sample' && params?.pitch) {
            source.playbackRate.setValueAtTime(params.pitch, playTime);
        }

        if (instrument === 'sample') {
            if (sampleSourceRef.current) {
                try {
                    sampleSourceRef.current.stop(playTime);
                } catch (e) {
                    // Ignore error if already stopped
                }
            }
            sampleSourceRef.current = source;
        }

        const gain = context.createGain();
        if (instrument === 'sample') {
            if (params?.decay && params.decay < 2) {
                gain.gain.setValueAtTime(0, playTime);
                gain.gain.linearRampToValueAtTime(volume, playTime + 0.002);
                gain.gain.exponentialRampToValueAtTime(0.001, playTime + params.decay * 2.5);
            } else {
                gain.gain.setValueAtTime(0, playTime);
                gain.gain.linearRampToValueAtTime(volume, playTime + 0.002);
            }
        } else {
            // Pre-rendered synthesized drum buffers already have sample-accurate attack envelopes starting at 0.
            // Setting volume directly at playTime preserves 100% of the initial transient punch and halves AudioParam events.
            gain.gain.setValueAtTime(volume, playTime);
        }
        
        source.connect(gain);
        gain.connect(destination);
        source.onended = () => {
            source.disconnect();
            gain.disconnect();
            if (instrument === 'sample' && sampleSourceRef.current === source) {
                sampleSourceRef.current = null;
            }
        };
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
            const thresholdFactor = Math.max(0.1, Math.min(1.5, (-kickSidechainThresholdRef.current) / 20));
            const ratioFactor = Math.max(0.1, Math.min(1.5, (kickSidechainRatioRef.current - 1) / 3));
            const combinedFactor = Math.min(1.25, thresholdFactor * 0.6 + ratioFactor * 0.4);
            const effectiveAmount = Math.min(1, amount * (0.5 + 0.5 * combinedFactor));
            const targetGain = Math.max(0.0001, 1 - effectiveAmount);
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
                sidechainVizGain.gain.linearRampToValueAtTime(effectiveAmount, playTime + attackTime);
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
        let context = audioContextRef.current;
        
        // If context is not ready, attempt to setup
        if (!context) {
            console.log("Audio context not ready, attempting setup...");
            // We need kickDesignerParams for setup. 
            // Since we don't have it here, we might need to rely on the fact that setup 
            // might have been called, or we need to handle this differently.
            // Actually, setup is called in App.tsx. 
            // Let's just return if it's not ready, but provide a better error message.
        }

        if (!context || context.audioWorklet === undefined) {
            console.error("Audio context not ready or AudioWorklet not supported. Please start the audio engine first.");
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

    const startLiveRecording = useCallback((): boolean => {
        const context = audioContextRef.current;
        const masterGain = masterGainRef.current;
        if (!context || !masterGain || !context.audioWorklet) {
            console.error("Audio context not ready for live recording.");
            return false;
        }
        if (liveRecorderWorkletNodeRef.current) {
            return true;
        }
        try {
            const liveRecorderNode = new AudioWorkletNode(context, 'live-recorder-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 0,
                channelCount: 2,
                channelCountMode: 'explicit',
            });
            liveRecorderWorkletNodeRef.current = liveRecorderNode;
            liveRecordedLeftRef.current = [];
            liveRecordedRightRef.current = [];

            liveRecorderNode.port.onmessage = (event) => {
                const { left, right } = event.data;
                if (left && right) {
                    liveRecordedLeftRef.current.push(left);
                    liveRecordedRightRef.current.push(right);
                }
            };

            masterGain.connect(liveRecorderNode);
            return true;
        } catch (err) {
            console.error("Failed to start live recording:", err);
            liveRecorderWorkletNodeRef.current = null;
            return false;
        }
    }, []);

    const stopLiveRecording = useCallback((): { blob: Blob; duration: number } | null => {
        const context = audioContextRef.current;
        const masterGain = masterGainRef.current;
        const liveRecorderNode = liveRecorderWorkletNodeRef.current;
        if (!context || !liveRecorderNode) {
            return null;
        }

        try {
            masterGain?.disconnect(liveRecorderNode);
        } catch {
            // Ignore if already disconnected
        }
        liveRecorderNode.port.onmessage = null;
        liveRecorderNode.disconnect();
        liveRecorderWorkletNodeRef.current = null;

        const leftChunks = liveRecordedLeftRef.current;
        const rightChunks = liveRecordedRightRef.current;
        liveRecordedLeftRef.current = [];
        liveRecordedRightRef.current = [];

        if (leftChunks.length === 0) {
            return null;
        }

        const totalLength = leftChunks.reduce((acc, chunk) => acc + chunk.length, 0);
        if (totalLength === 0) {
            return null;
        }

        const audioBuffer = context.createBuffer(2, totalLength, context.sampleRate);
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);

        let offset = 0;
        for (let i = 0; i < leftChunks.length; i++) {
            leftChannel.set(leftChunks[i], offset);
            rightChannel.set(rightChunks[i] || leftChunks[i], offset);
            offset += leftChunks[i].length;
        }

        const wavBlob = bufferToWav(audioBuffer);
        const duration = totalLength / context.sampleRate;
        return { blob: wavBlob, duration };
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
        lofiMix: number,
        activePattern: 'a' | 'b' = 'a',
        chainMode: 'off' | 'ab' | 'aab' | 'aaab' | 'aabb' = 'off',
        kickSidechainThreshold: number = -20,
        kickSidechainRatio: number = 4,
        isRandomizeActive: boolean = false,
        randomizeIntensity: number = 0,
        isStutterActive: boolean = false,
        stutterDivision: StutterDivision = '1/16',
        isBeatRepeatActive: boolean = false,
        beatRepeatDivision: BeatRepeatDivision = '1BEAT',
        beatRepeatStartStep: number = 0,
        stutterSource: Instrument | 'all' = 'clave',
        exportMeasures?: number,
        includeTail: boolean = false,
        soloInstrument?: Instrument,
        stutterSwing: number = 0,
        reverbType: ReverbType = 'plate',
        reverbTone: number = 12000
    ): Promise<Blob | null> => {
        const liveContext = audioContextRef.current;
        if (!liveContext) {
            console.error("Audio engine not initialized.");
            return null;
        }

        const isAPatternActive = grids.a.some(row => row.some(step => step));
        const isBPatternActive = grids.b.some(row => row.some(step => step));
        let baseSequence: Grid[] = [];

        if (chainMode === 'ab') {
            baseSequence = [grids.a, grids.b];
        } else if (chainMode === 'aab') {
            baseSequence = [grids.a, grids.a, grids.b];
        } else if (chainMode === 'aaab') {
            baseSequence = [grids.a, grids.a, grids.a, grids.b];
        } else if (chainMode === 'aabb') {
            baseSequence = [grids.a, grids.a, grids.b, grids.b];
        } else {
            if (activePattern === 'a' && !isAPatternActive && isBPatternActive) {
                baseSequence = [grids.b];
            } else if (activePattern === 'b' && !isBPatternActive && isAPatternActive) {
                baseSequence = [grids.a];
            } else {
                baseSequence = [grids[activePattern]];
            }
        }

        const targetMeasures = exportMeasures !== undefined && exportMeasures >= 1
            ? Math.max(1, Math.min(32, Math.round(exportMeasures)))
            : baseSequence.length;

        const patternsToRender: Grid[] = [];
        for (let m = 0; m < targetMeasures; m++) {
            patternsToRender.push(baseSequence[m % baseSequence.length]);
        }

        const numSteps = grids.a[0]?.length || 16;
        const secondsPerStep = (60 / tempo) / 4;
        const patternsDuration = patternsToRender.length * numSteps * secondsPerStep;

        let tailDuration = 0;
        if (includeTail) {
            const sampleBuf = instrumentBuffersRef.current.sample;
            const samplePitch = Math.max(0.25, instrumentParamsRef.current.sample.pitch || 1);
            const sampleDecayParam = instrumentParamsRef.current.sample.decay ?? 2;
            const sampleTailSec = sampleBuf
                ? Math.min(5.0, sampleBuf.duration / samplePitch, sampleDecayParam < 2 ? sampleDecayParam * 2.5 : 5.0)
                : 0;
            const noteTailSec = Math.max(1.5, sampleTailSec);

            const reverbTailSec = reverbMix > 0.001 ? (0.26 + reverbDecay * 5.9) : 0;

            let delayTailSec = 0;
            if (delayMix > 0.001 && delayTime > 0.001) {
                const clampedFb = Math.max(0.05, Math.min(0.92, delayFeedback));
                const numRepeats = Math.max(2, Math.ceil(Math.log(0.004) / Math.log(clampedFb)));
                delayTailSec = Math.min(6.0, delayTime * numRepeats + 0.25);
            }

            tailDuration = Math.max(noteTailSec, reverbTailSec, delayTailSec);
        }

        const totalDuration = patternsDuration + tailDuration;
        const totalSamples = Math.max(1, Math.ceil(totalDuration * liveContext.sampleRate));

        const offlineCtx = new OfflineAudioContext(2, totalSamples, liveContext.sampleRate);

        // Load bitcrusher worklet into offlineCtx if crushAmount > 0
        let offlineCrusherNode: AudioNode | null = null;
        let applyPostBitcrushFallback = false;
        if (crushAmount > 0) {
            try {
                const crusherBlob = new Blob([BITCRUSHER_PROCESSOR_CODE], { type: 'application/javascript' });
                const crusherUrl = URL.createObjectURL(crusherBlob);
                await offlineCtx.audioWorklet.addModule(crusherUrl);
                URL.revokeObjectURL(crusherUrl);
                const workletNode = new AudioWorkletNode(offlineCtx, 'bitcrusher-processor');
                const crushParam = workletNode.parameters.get('amount');
                if (crushParam) {
                    crushParam.setValueAtTime(crushAmount, 0);
                }
                offlineCrusherNode = workletNode;
            } catch (e) {
                applyPostBitcrushFallback = true;
            }
        }
        
        // --- RECREATE THE ENTIRE AUDIO GRAPH FOR OFFLINE CONTEXT ---
        const masterCompressor = offlineCtx.createDynamicsCompressor();
        masterCompressor.threshold.setValueAtTime(-18, 0);
        masterCompressor.knee.setValueAtTime(20, 0);
        masterCompressor.ratio.setValueAtTime(2.5, 0);
        masterCompressor.attack.setValueAtTime(0.005, 0);
        masterCompressor.release.setValueAtTime(0.15, 0);

        const masterGain = offlineCtx.createGain();
        masterGain.gain.setValueAtTime(masterVolume, 0);

        masterCompressor.connect(masterGain);
        masterGain.connect(offlineCtx.destination);
        
        const highPass = offlineCtx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.setValueAtTime(highPassFreq, 0);

        const lowPass = offlineCtx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.setValueAtTime(lowPassFreq, 0);
        
        // --- TAPE SATURATION ---
        const tapeSaturationInputGain = offlineCtx.createGain();
        const tapeSaturationOutputGain = offlineCtx.createGain();
        const tapeSaturationDryGain = offlineCtx.createGain();
        tapeSaturationDryGain.gain.setValueAtTime(1.0 - tapeSaturationMix, 0);
        
        const tapeSaturationNode = offlineCtx.createWaveShaper();
        tapeSaturationNode.curve = makeTapeSaturationCurve(tapeSaturationAmount);
        tapeSaturationNode.oversample = '2x';

        const tapeSaturationWetGain = offlineCtx.createGain();
        tapeSaturationWetGain.gain.setValueAtTime(tapeSaturationMix, 0);

        const tapeToneFilter = offlineCtx.createBiquadFilter();
        tapeToneFilter.type = 'lowpass';
        tapeToneFilter.frequency.setValueAtTime(tapeSaturationTone, 0);

        tapeSaturationInputGain.connect(tapeSaturationDryGain).connect(tapeSaturationOutputGain);
        tapeSaturationInputGain.connect(tapeSaturationNode);
        tapeSaturationNode.connect(tapeToneFilter);
        tapeToneFilter.connect(tapeSaturationWetGain);
        tapeSaturationWetGain.connect(tapeSaturationOutputGain);

        highPass.connect(lowPass);
        lowPass.connect(tapeSaturationInputGain);
        
        // --- ENVELOPE FILTER (Insert with Dry/Wet Mix) ---
        const envelopeFilterInput = offlineCtx.createGain();
        const envelopeFilterOutput = offlineCtx.createGain();
        const envelopeFilterDry = offlineCtx.createGain();
        const envelopeFilterNode = offlineCtx.createBiquadFilter();
        const envelopeDetector = offlineCtx.createWaveShaper();
        const envelopeSmoother = offlineCtx.createBiquadFilter();
        const envelopeAmount = offlineCtx.createGain();
        const envelopeFilterWet = offlineCtx.createGain();
        const envelopeFilterBaseFreqNode = offlineCtx.createConstantSource();

        envelopeFilterNode.type = 'lowpass';
        envelopeFilterNode.frequency.setValueAtTime(0, 0);
        envelopeFilterNode.Q.setValueAtTime(0.1 + envelopeFilterQ * 19.9, 0);
        envelopeFilterBaseFreqNode.offset.setValueAtTime(envelopeFilterBaseFreq, 0);
        envelopeAmount.gain.setValueAtTime(envelopeFilterAmount * 8000, 0);
        envelopeFilterDry.gain.setValueAtTime(1.0 - envelopeFilterMix, 0);
        envelopeFilterWet.gain.setValueAtTime(envelopeFilterMix, 0);
        envelopeSmoother.type = 'lowpass';
        envelopeSmoother.frequency.setValueAtTime(10, 0);

        const n_samples_env_render = 256;
        const envelopeCurveRender = new Float32Array(n_samples_env_render);
        for (let i = 0; i < n_samples_env_render; i++) {
            const x = (i * 2 / n_samples_env_render) - 1;
            envelopeCurveRender[i] = Math.abs(x);
        }
        envelopeDetector.curve = envelopeCurveRender;
        envelopeFilterBaseFreqNode.start(0);

        tapeSaturationOutputGain.connect(envelopeFilterInput);
        envelopeFilterInput.connect(envelopeFilterDry).connect(envelopeFilterOutput);
        envelopeFilterInput.connect(envelopeFilterNode);
        envelopeFilterNode.connect(envelopeFilterWet);
        envelopeFilterWet.connect(envelopeFilterOutput);

        envelopeFilterInput.connect(envelopeDetector);
        envelopeDetector.connect(envelopeSmoother);
        envelopeSmoother.connect(envelopeAmount);
        envelopeFilterBaseFreqNode.connect(envelopeFilterNode.frequency);
        envelopeAmount.connect(envelopeFilterNode.frequency);

        // --- REVERB & DELAY SENDS + POST-EFFECTS SUM BUS ---
        const postEffectsBus = offlineCtx.createGain();
        envelopeFilterOutput.connect(postEffectsBus);

        const reverbSendBus = offlineCtx.createGain();
        const reverbPreDelayNode = offlineCtx.createDelay(0.25);
        reverbPreDelayNode.delayTime.setValueAtTime(0.012, 0);
        const reverbLowCutNode = offlineCtx.createBiquadFilter();
        reverbLowCutNode.type = 'highpass';
        reverbLowCutNode.frequency.setValueAtTime(110, 0);
        reverbLowCutNode.Q.setValueAtTime(0.707, 0);
        const convolver = offlineCtx.createConvolver();
        const reverbToneNode = offlineCtx.createBiquadFilter();
        reverbToneNode.type = 'lowpass';
        reverbToneNode.frequency.setValueAtTime(Math.max(400, Math.min(20000, reverbTone)), 0);
        reverbToneNode.Q.setValueAtTime(0.707, 0);
        const reverbWetGain = offlineCtx.createGain();
        reverbWetGain.gain.setValueAtTime(reverbMix, 0);
        const decayInSeconds = 0.1 + reverbDecay * 5.9;
        convolver.buffer = createImpulseResponse(offlineCtx, decayInSeconds, reverbType, noiseBufferDataRef.current);
        reverbSendBus.connect(reverbPreDelayNode);
        reverbPreDelayNode.connect(reverbLowCutNode);
        reverbLowCutNode.connect(convolver);
        convolver.connect(reverbToneNode);
        reverbToneNode.connect(reverbWetGain);
        reverbWetGain.connect(postEffectsBus);
        
        const delaySendBus = offlineCtx.createGain();
        const delay = offlineCtx.createDelay(2.5);
        const delayFeedbackGain = offlineCtx.createGain();
        const delayWetGain = offlineCtx.createGain();
        delay.delayTime.setValueAtTime(Math.min(2.5, delayTime), 0);
        delayFeedbackGain.gain.setValueAtTime(delayFeedback, 0);
        delayWetGain.gain.setValueAtTime(delayMix, 0);
        delaySendBus.connect(delay);
        delay.connect(delayFeedbackGain);
        delayFeedbackGain.connect(delay);
        delay.connect(delayWetGain);
        delayWetGain.connect(postEffectsBus);

        if (delaySource === 'all') {
            envelopeFilterOutput.connect(delaySendBus);
        }
        if (reverbSource === 'all') {
            envelopeFilterOutput.connect(reverbSendBus);
        }

        // --- BITCRUSHER ---
        const preIsolatorBus = offlineCtx.createGain();
        if (offlineCrusherNode) {
            postEffectsBus.connect(offlineCrusherNode);
            offlineCrusherNode.connect(preIsolatorBus);
        } else {
            postEffectsBus.connect(preIsolatorBus);
        }

        // --- ISOLATOR (3-BAND EQ) ---
        const isoLowF = offlineCtx.createBiquadFilter();
        isoLowF.type = 'lowpass';
        isoLowF.frequency.setValueAtTime(300, 0);
        const isoMidF = offlineCtx.createBiquadFilter();
        isoMidF.type = 'bandpass';
        isoMidF.frequency.setValueAtTime(1500, 0);
        isoMidF.Q.setValueAtTime(1, 0);
        const isoHighF = offlineCtx.createBiquadFilter();
        isoHighF.type = 'highpass';
        isoHighF.frequency.setValueAtTime(3000, 0);

        const isoLowG = offlineCtx.createGain();
        isoLowG.gain.setValueAtTime(isolatorGains.low, 0);
        const isoMidG = offlineCtx.createGain();
        isoMidG.gain.setValueAtTime(isolatorGains.mid, 0);
        const isoHighG = offlineCtx.createGain();
        isoHighG.gain.setValueAtTime(isolatorGains.high, 0);

        const isoOutput = offlineCtx.createGain();
        preIsolatorBus.connect(isoLowF);
        preIsolatorBus.connect(isoMidF);
        preIsolatorBus.connect(isoHighF);
        isoLowF.connect(isoLowG);
        isoMidF.connect(isoMidG);
        isoHighF.connect(isoHighG);
        isoLowG.connect(isoOutput);
        isoMidG.connect(isoOutput);
        isoHighG.connect(isoOutput);

        // --- LO-FI RADIO ---
        const lofiInput = offlineCtx.createGain();
        isoOutput.connect(lofiInput);
        const lofiOutput = offlineCtx.createGain();

        const lofiDry = offlineCtx.createGain();
        lofiDry.gain.setValueAtTime(1 - lofiMix, 0);
        const lofiWet = offlineCtx.createGain();
        lofiWet.gain.setValueAtTime(lofiMix, 0);
        
        lofiInput.connect(lofiDry).connect(lofiOutput);

        if (lofiMix > 0) {
            const lofiBandpass = offlineCtx.createBiquadFilter();
            lofiBandpass.type = 'bandpass';
            lofiBandpass.frequency.setValueAtTime(3500 - (lofiMix * 2500), 0);
            lofiBandpass.Q.setValueAtTime(2 + (lofiMix * 6), 0);

            const lofiDistortion = offlineCtx.createWaveShaper();
            const distortionAmount = 1 + lofiMix * 8;
            const curve = new Float32Array(256);
            for (let i = 0; i < 256; i++) {
                const x = i * 2 / 256 - 1;
                curve[i] = Math.tanh(x * distortionAmount);
            }
            lofiDistortion.curve = curve;
            lofiDistortion.oversample = '2x';

            const noiseSource = offlineCtx.createBufferSource();
            const noiseBuffer = offlineCtx.createBuffer(1, totalSamples, offlineCtx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            const preGenNoise = noiseBufferDataRef.current;
            if (preGenNoise && preGenNoise.length > 0) {
                for (let i = 0; i < totalSamples; i++) {
                    noiseData[i] = preGenNoise[i % preGenNoise.length];
                }
            } else {
                for (let i = 0; i < totalSamples; i++) {
                    noiseData[i] = Math.random() * 2 - 1;
                }
            }
            noiseSource.buffer = noiseBuffer;
            const noiseGain = offlineCtx.createGain();
            noiseGain.gain.setValueAtTime(lofiMix * 0.004, 0);
            noiseSource.connect(noiseGain);

            lofiInput.connect(lofiBandpass);
            lofiBandpass.connect(lofiDistortion);
            lofiDistortion.connect(lofiWet);
            noiseGain.connect(lofiWet);
            lofiWet.connect(lofiOutput);
            noiseSource.start(0);
        }

        // --- XY FILTER ---
        if (xyFilterActiveRef.current) {
            const xyFilterNode = offlineCtx.createBiquadFilter();
            xyFilterNode.type = 'bandpass';
            xyFilterNode.frequency.setValueAtTime(xyFilterFreqRef.current, 0);
            xyFilterNode.Q.setValueAtTime(5, 0);

            const xyFilterSaturator = offlineCtx.createWaveShaper();
            xyFilterSaturator.curve = makeFilterDriveCurve(xyFilterDriveRef.current);
            xyFilterSaturator.oversample = '2x';

            lofiOutput.connect(xyFilterNode);
            xyFilterNode.connect(xyFilterSaturator);
            xyFilterSaturator.connect(masterCompressor);
        } else {
            lofiOutput.connect(masterCompressor);
        }

        const sidechainDuckNode = offlineCtx.createGain();
        sidechainDuckNode.gain.setValueAtTime(1, 0);
        sidechainDuckNode.connect(highPass);

        // --- Sample filter chain ---
        const { highPass: hpFreq, lowPass: lpFreq } = instrumentParamsRef.current.sample;
        const offlineSampleHP = offlineCtx.createBiquadFilter();
        offlineSampleHP.type = 'highpass';
        offlineSampleHP.frequency.setValueAtTime(hpFreq ?? MIN_FILTER_FREQ, 0);
        const offlineSampleLP = offlineCtx.createBiquadFilter();
        offlineSampleLP.type = 'lowpass';
        offlineSampleLP.frequency.setValueAtTime(lpFreq ?? MAX_FILTER_FREQ, 0);
        offlineSampleHP.connect(offlineSampleLP);
        offlineSampleLP.connect(sidechainDuckNode);

        const swingFactor = 0.5 + (swing * 0.25);
        let currentTime = 0;
        let lastDuckReleaseEnd = 0;
        let lastSampleSource: AudioBufferSourceNode | null = null;

        const thresholdFactor = Math.max(0.1, Math.min(1.5, (-kickSidechainThreshold) / 20));
        const ratioFactor = Math.max(0.1, Math.min(1.5, (kickSidechainRatio - 1) / 3));
        const combinedFactor = Math.min(1.25, thresholdFactor * 0.6 + ratioFactor * 0.4);
        const effectiveSidechainAmount = Math.min(1, kickSidechainAmount * (0.5 + 0.5 * combinedFactor));

        const computeRandomizedStep = (linearStep: number, intensity: number, totalSteps: number): number => {
            if (intensity === 0) return linearStep;
            const intensityRatio = intensity / 10;
            const skipProbability = intensityRatio * 0.5;
            if (Math.random() < skipProbability) return -1;
            const maxOffset = Math.round(intensityRatio * 4);
            if (maxOffset > 0) {
                const randomOffset = Math.floor(Math.random() * (2 * maxOffset + 1)) - maxOffset;
                return (linearStep + randomOffset + totalSteps) % totalSteps;
            }
            return linearStep;
        };

        const getRepeatStepCount = (div: BeatRepeatDivision, totalSteps: number): number => {
            switch (div) {
                case '2BEATS': return Math.min(totalSteps, 8);
                case '1BEAT': return Math.min(totalSteps, 4);
                case '1/2BEAT': return Math.min(totalSteps, 2);
                case '1/4BEAT': return 1;
                default: return 4;
            }
        };

        const effectiveStutterActive = isStutterActive || stutterActiveRef.current;
        const effectiveStutterDiv = isStutterActive ? stutterDivision : stutterDivisionRef.current;
        const effectiveStutterSource = isStutterActive ? stutterSource : stutterSourceRef.current;

        const scheduleInstrumentNoteAtTime = (instrument: Instrument, instIndex: number, time: number, maxNoteDuration?: number) => {
            const buffer = instrumentBuffersRef.current[instrument];
            if (!buffer || !instrumentVisibility[instIndex] || volumes[instIndex] <= 0) return;

            if (soloInstrument && instrument !== soloInstrument) {
                if (instrument === 'kick' && effectiveSidechainAmount > 0.01) {
                    const targetGain = Math.max(0.0001, 1 - effectiveSidechainAmount);
                    const attackTime = 0.008;
                    const releaseTime = 0.15;
                    if (time >= lastDuckReleaseEnd) {
                        sidechainDuckNode.gain.setValueAtTime(1, time);
                    } else {
                        sidechainDuckNode.gain.cancelAndHoldAtTime(time);
                    }
                    sidechainDuckNode.gain.linearRampToValueAtTime(targetGain, time + attackTime);
                    sidechainDuckNode.gain.linearRampToValueAtTime(1, time + attackTime + releaseTime);
                    lastDuckReleaseEnd = time + attackTime + releaseTime;
                }
                return;
            }

            const source = offlineCtx.createBufferSource();
            source.buffer = buffer;

            if (instrument === 'sample') {
                if (instrumentParamsRef.current.sample.pitch) {
                    source.playbackRate.setValueAtTime(instrumentParamsRef.current.sample.pitch, time);
                }
                if (lastSampleSource) {
                    try {
                        lastSampleSource.stop(time);
                    } catch {
                        // Ignore if already stopped
                    }
                }
                lastSampleSource = source;
            }

            const gain = offlineCtx.createGain();
            if (instrument === 'sample') {
                if (instrumentParamsRef.current.sample.decay && instrumentParamsRef.current.sample.decay < 2) {
                    gain.gain.setValueAtTime(0, time);
                    gain.gain.linearRampToValueAtTime(volumes[instIndex], time + 0.002);
                    gain.gain.exponentialRampToValueAtTime(0.001, time + instrumentParamsRef.current.sample.decay * 2.5);
                } else {
                    gain.gain.setValueAtTime(0, time);
                    gain.gain.linearRampToValueAtTime(volumes[instIndex], time + 0.002);
                }
            } else {
                gain.gain.setValueAtTime(volumes[instIndex], time);
            }
            if (maxNoteDuration !== undefined && maxNoteDuration > 0.01) {
                const fadeOutStart = Math.max(time + 0.004, time + maxNoteDuration - 0.004);
                gain.gain.setValueAtTime(volumes[instIndex], fadeOutStart);
                gain.gain.linearRampToValueAtTime(0.0001, time + maxNoteDuration);
            }
            source.connect(gain);

            let finalDestination: AudioNode;
            if (instrument === 'kick') {
                finalDestination = highPass;
            } else if (instrument === 'sample') {
                finalDestination = offlineSampleHP;
            } else {
                finalDestination = sidechainDuckNode;
            }

            gain.connect(finalDestination);
            source.start(time);
            if (maxNoteDuration !== undefined && maxNoteDuration > 0.01) {
                try {
                    source.stop(time + maxNoteDuration);
                } catch {}
            }

            if (delaySource === instrument) {
                gain.connect(delaySendBus);
            }

            if (reverbSource === instrument) {
                gain.connect(reverbSendBus);
            }

            if (instrument === 'kick' && effectiveSidechainAmount > 0.01) {
                const targetGain = Math.max(0.0001, 1 - effectiveSidechainAmount);
                const attackTime = 0.008;
                const releaseTime = 0.15;
                if (time >= lastDuckReleaseEnd) {
                    sidechainDuckNode.gain.setValueAtTime(1, time);
                } else {
                    sidechainDuckNode.gain.cancelAndHoldAtTime(time);
                }
                sidechainDuckNode.gain.linearRampToValueAtTime(targetGain, time + attackTime);
                sidechainDuckNode.gain.linearRampToValueAtTime(1, time + attackTime + releaseTime);
                lastDuckReleaseEnd = time + attackTime + releaseTime;
            }
        };

        patternsToRender.forEach((grid) => {
            const currentNumSteps = grid[0]?.length || 0;
            const repeatSteps = getRepeatStepCount(beatRepeatDivision, currentNumSteps);
            const startStep = currentNumSteps > 0 ? (beatRepeatStartStep % currentNumSteps) : 0;
            for (let step = 0; step < currentNumSteps; step++) {
                const effectiveStep = isBeatRepeatActive && currentNumSteps > 0
                    ? (startStep + (step % repeatSteps)) % currentNumSteps
                    : step;
                const isOddStep = effectiveStep % 2 !== 0;
                const stepDuration = isOddStep 
                    ? (1 - swingFactor) * 2 * secondsPerStep 
                    : swingFactor * 2 * secondsPerStep;
                
                const time = currentTime;
                const stepToPlay = isRandomizeActive
                    ? computeRandomizedStep(effectiveStep, randomizeIntensity, currentNumSteps)
                    : effectiveStep;

                if (stepToPlay > -1) {
                    INSTRUMENTS.forEach((instrument, instIndex) => {
                        if (effectiveStutterActive && effectiveStutterSource === instrument) {
                            return; // Stuttered single instrument is scheduled at its rhythmic division below
                        }
                        if (instrumentVisibility[instIndex] && grid[instIndex]?.[stepToPlay] && volumes[instIndex] > 0) {
                            scheduleInstrumentNoteAtTime(instrument, instIndex, time);
                        }
                    });
                }
                currentTime += stepDuration;
            }
        });

        // If Stutter is active for a specific instrument, schedule that instrument repeating at the exact stutter division
        if (effectiveStutterActive && effectiveStutterSource !== 'all') {
            const targetInstIndex = INSTRUMENTS.indexOf(effectiveStutterSource);
            if (targetInstIndex !== -1 && instrumentVisibility[targetInstIndex] && volumes[targetInstIndex] > 0) {
                const divBeats =
                    effectiveStutterDiv === '1/4' ? 1 :
                    effectiveStutterDiv === '1/8' ? 0.5 :
                    effectiveStutterDiv === '1/8T' ? 1 / 3 :
                    effectiveStutterDiv === '1/16' ? 0.25 :
                    effectiveStutterDiv === '1/16T' ? 1 / 6 : 0.125;

                if (effectiveStutterDiv === '1/16' && stutterSwing > 0.001) {
                    const sf = 0.5 + stutterSwing * 0.25;
                    const d0 = (60 / tempo) * 0.5 * sf;
                    const d1 = (60 / tempo) * 0.5 * (1.0 - sf);
                    let t = 0;
                    let step = 0;
                    while (t < patternsDuration - 0.005) {
                        const dur = (step % 2 === 0) ? d0 : d1;
                        scheduleInstrumentNoteAtTime(effectiveStutterSource, targetInstIndex, t, dur);
                        t += dur;
                        step++;
                    }
                } else {
                    const stutterPeriodSec = Math.max(0.02, (60 / tempo) * divBeats);
                    for (let t = 0; t < patternsDuration - 0.005; t += stutterPeriodSec) {
                        scheduleInstrumentNoteAtTime(effectiveStutterSource, targetInstIndex, t, stutterPeriodSec);
                    }
                }
            }
        }

        const renderedBuffer = await offlineCtx.startRendering();

        if (applyPostBitcrushFallback && crushAmount > 0) {
            const bitDepth = 16 - 14 * crushAmount;
            const frequencyReduction = Math.max(0.02, 1.0 - crushAmount * 0.92);
            const step = Math.pow(0.5, bitDepth);
            for (let ch = 0; ch < renderedBuffer.numberOfChannels; ch++) {
                const data = renderedBuffer.getChannelData(ch);
                let phase = 0;
                let lastVal = 0;
                for (let i = 0; i < data.length; i++) {
                    phase += frequencyReduction;
                    if (phase >= 1.0) {
                        phase -= 1.0;
                        lastVal = step * Math.floor(data[i] / step + 0.5);
                    }
                    data[i] = lastVal;
                }
            }
        }

        if (effectiveStutterActive && effectiveStutterSource === 'all') {
            const divBeats =
                effectiveStutterDiv === '1/4' ? 1 :
                effectiveStutterDiv === '1/8' ? 0.5 :
                effectiveStutterDiv === '1/8T' ? 1 / 3 :
                effectiveStutterDiv === '1/16' ? 0.25 :
                effectiveStutterDiv === '1/16T' ? 1 / 6 : 0.125;
            const beatSamples = Math.max(256, Math.floor((60 / tempo) * renderedBuffer.sampleRate));
            const stepSamples = Math.max(512, Math.floor(beatSamples * 0.25));
            const loopSamples = Math.max(128, Math.floor(beatSamples * divBeats));
            const fadeInLen = Math.min(64, loopSamples >> 4);
            const fadeOutLen = Math.min(128, loopSamples >> 3);
            const patternsSamples = Math.min(renderedBuffer.length, Math.floor(patternsDuration * renderedBuffer.sampleRate));

            // Locate the first active hit onset across channels so the exported stutter slice starts cleanly on a drum hit
            let onsetSample = 0;
            const ch0 = renderedBuffer.getChannelData(0);
            const ch1 = renderedBuffer.numberOfChannels > 1 ? renderedBuffer.getChannelData(1) : ch0;
            for (let s = 0; s < patternsSamples; s++) {
                if (Math.max(Math.abs(ch0[s]), Math.abs(ch1[s])) > 0.02) {
                    onsetSample = Math.max(0, s - 32);
                    break;
                }
            }

            const hitLen = Math.min(stepSamples, loopSamples);
            const tailFade = Math.min(256, hitLen >> 2);

            for (let ch = 0; ch < renderedBuffer.numberOfChannels; ch++) {
                const data = renderedBuffer.getChannelData(ch);
                const slice = new Float32Array(loopSamples);
                for (let k = 0; k < hitLen; k++) {
                    const srcIdx = onsetSample + k;
                    let sampleVal = srcIdx < data.length ? data[srcIdx] : 0;
                    const rem = hitLen - k;
                    if (rem <= tailFade && tailFade > 0) {
                        sampleVal *= 0.5 * (1.0 - Math.cos(Math.PI * rem / tailFade));
                    }
                    slice[k] = sampleVal;
                }
                for (let idx = 0; idx < patternsSamples; idx++) {
                    const offset = idx % loopSamples;
                    let env = 1.0;
                    if (offset < fadeInLen && fadeInLen > 0) {
                        env = 0.5 * (1.0 - Math.cos(Math.PI * offset / fadeInLen));
                    } else if (offset > loopSamples - fadeOutLen && fadeOutLen > 0) {
                        const rem = loopSamples - offset;
                        env = 0.5 * (1.0 - Math.cos(Math.PI * rem / fadeOutLen));
                    }
                    data[idx] = slice[offset] * env;
                }
            }
        }

        // Apply a gentle 40ms cosine fade-out at the very end when includeTail is enabled so any ultra-long tail ends click-free
        if (includeTail && renderedBuffer.length > 2048) {
            const endFadeLen = Math.min(Math.floor(renderedBuffer.sampleRate * 0.04), renderedBuffer.length >> 3);
            const fadeStart = renderedBuffer.length - endFadeLen;
            for (let ch = 0; ch < renderedBuffer.numberOfChannels; ch++) {
                const data = renderedBuffer.getChannelData(ch);
                for (let i = 0; i < endFadeLen; i++) {
                    const env = 0.5 * (1.0 + Math.cos(Math.PI * (i / endFadeLen)));
                    data[fadeStart + i] *= env;
                }
            }
        }

        const wavBlob = bufferToWav(renderedBuffer);
        
        return wavBlob;
    }, [instrumentParamsRef]);

    const updateInstrumentParameter = useCallback(async (instrument: Instrument, param: keyof InstrumentParams, value: number, drumKit: '808' | '909' | '727' = '808') => {
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
                sampleHighPassRef.current.frequency.setTargetAtTime(value, context.currentTime, RAMP_TIME);
            }
            return;
        }
        if (param === 'lowPass') {
            if (sampleLowPassRef.current) {
                sampleLowPassRef.current.frequency.setTargetAtTime(value, context.currentTime, RAMP_TIME);
            }
            return;
        }
    
        if (instrument === 'sample') {
            return;
        }
    
        const existingTimeout = instrumentRenderTimeoutsRef.current[instrument];
        if (existingTimeout) {
            window.clearTimeout(existingTimeout);
        }

        instrumentRenderTimeoutsRef.current[instrument] = window.setTimeout(async () => {
            let newBuffer: AudioBuffer | null = null;
            const currentParams = instrumentParamsRef.current;

            try {
                switch (instrument) {
                    case 'snare':
                        if (noiseBufferDataRef.current) {
                            newBuffer = await renderSnare(context, currentParams.snare as { tone: number; decay: number; attack: number; }, noiseBufferDataRef.current, drumKit);
                        }
                        break;
                    case 'hihat':
                        if (noiseBufferDataRef.current) {
                            newBuffer = await renderHiHat(context, currentParams.hihat as { pitch: number, decay: number }, noiseBufferDataRef.current, drumKit);
                        }
                        break;
                    case 'snap':
                        if (noiseBufferDataRef.current) {
                            newBuffer = await renderSnap(context, currentParams.snap as { pitch: number, decay: number, attack: number }, noiseBufferDataRef.current, drumKit);
                        }
                        break;
                    case 'clave':
                        newBuffer = await renderClave(context, currentParams.clave as { pitch: number, decay: number }, drumKit);
                        break;
                    case 'cowbell':
                        newBuffer = await renderCowbell(context, currentParams.cowbell as { pitch: number, decay: number, attack: number }, drumKit);
                        break;
                }
            } catch (error) {
                console.error(`Error re-rendering ${instrument}:`, error);
            }

            if (newBuffer) {
                instrumentBuffersRef.current[instrument] = newBuffer;
            }
        }, 30);
    }, []);
    
    const rerenderKick = useCallback((kickDesignerParams: KickDesignerParams, drumKit: '808' | '909' | '727' = '808') => {
        const context = audioContextRef.current;
        if (!context || !noiseBufferDataRef.current) return;
        if (kickRenderTimeoutRef.current) {
            window.clearTimeout(kickRenderTimeoutRef.current);
        }
        kickRenderTimeoutRef.current = window.setTimeout(async () => {
            if (!audioContextRef.current || !noiseBufferDataRef.current) return;
            try {
                const newBuffer = await renderKick(audioContextRef.current, kickDesignerParams, noiseBufferDataRef.current, drumKit);
                instrumentBuffersRef.current.kick = newBuffer;
            } catch (error) {
                console.error(`Error re-rendering kick:`, error);
            }
        }, 30);
    }, []);

    const rerenderAllInstruments = useCallback(async (kickDesignerParams: KickDesignerParams, drumKit: '808' | '909' | '727', newInstrumentParams?: AllInstrumentParams) => {
        const context = audioContextRef.current;
        if (!context || !noiseBufferDataRef.current) return;
        
        if (newInstrumentParams) {
            instrumentParamsRef.current = JSON.parse(JSON.stringify(newInstrumentParams));
        }
        const currentParams = instrumentParamsRef.current;
        try {
            const [kickBuffer, snareBuffer, hihatBuffer, snapBuffer, claveBuffer, cowbellBuffer] = await Promise.all([
                renderKick(context, kickDesignerParams, noiseBufferDataRef.current, drumKit),
                renderSnare(context, currentParams.snare as { tone: number; decay: number; attack: number; }, noiseBufferDataRef.current, drumKit),
                renderHiHat(context, currentParams.hihat as { pitch: number, decay: number }, noiseBufferDataRef.current, drumKit),
                renderSnap(context, currentParams.snap as { pitch: number, decay: number, attack: number }, noiseBufferDataRef.current, drumKit),
                renderClave(context, currentParams.clave as { pitch: number, decay: number }, drumKit),
                renderCowbell(context, currentParams.cowbell as { pitch: number, decay: number, attack: number }, drumKit)
            ]);

            instrumentBuffersRef.current.kick = kickBuffer;
            instrumentBuffersRef.current.snare = snareBuffer;
            instrumentBuffersRef.current.hihat = hihatBuffer;
            instrumentBuffersRef.current.snap = snapBuffer;
            instrumentBuffersRef.current.clave = claveBuffer;
            instrumentBuffersRef.current.cowbell = cowbellBuffer;
        } catch (error) {
            console.error("Error re-rendering all instruments:", error);
        }
    }, []);


    const setLowPassFrequency = useCallback((freq: number) => {
        if (lowPassFilterRef.current && audioContextRef.current) {
            lowPassFilterRef.current.frequency.setTargetAtTime(freq, audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);

    const setHighPassFrequency = useCallback((freq: number) => {
        if (highPassFilterRef.current && audioContextRef.current) {
            highPassFilterRef.current.frequency.setTargetAtTime(freq, audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);
    
    const setReverbMix = useCallback((mix: number) => {
        if (reverbWetGainRef.current && audioContextRef.current) {
            reverbWetGainRef.current.gain.setTargetAtTime(mix, audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);

    const scheduleReverbImpulseUpdate = useCallback(() => {
        const context = audioContextRef.current;
        const convolver = convolverRef.current;
        if (!context || !convolver) return;

        if (reverbDecayTimeoutRef.current) {
            window.clearTimeout(reverbDecayTimeoutRef.current);
        }
        reverbDecayTimeoutRef.current = window.setTimeout(() => {
            if (!audioContextRef.current || !convolverRef.current) return;
            const decayInSeconds = 0.1 + reverbDecayValueRef.current * 5.9;
            convolverRef.current.buffer = createImpulseResponse(
                audioContextRef.current,
                decayInSeconds,
                reverbTypeRef.current,
                noiseBufferDataRef.current
            );
        }, 40);
    }, []);

    const setReverbDecay = useCallback((decayValue: number) => { // decayValue from 0 to 1
        reverbDecayValueRef.current = decayValue;
        scheduleReverbImpulseUpdate();
    }, [scheduleReverbImpulseUpdate]);

    const setReverbType = useCallback((type: ReverbType) => {
        reverbTypeRef.current = type;
        scheduleReverbImpulseUpdate();
    }, [scheduleReverbImpulseUpdate]);

    const setReverbTone = useCallback((freqHz: number) => {
        if (reverbToneFilterRef.current && audioContextRef.current) {
            const clamped = Math.max(400, Math.min(20000, freqHz));
            reverbToneFilterRef.current.frequency.setTargetAtTime(clamped, audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);

    const setReverbSource = useCallback((source: Instrument | 'all') => {
        const reverbBus = reverbSendBusRef.current;
        const mainBus = envelopeFilterOutputRef.current;
        if (!reverbBus || !mainBus) return;

        // Disconnect ALL potential sources first to prevent duplicate connections
        try { mainBus.disconnect(reverbBus); } catch (e) {}
        INSTRUMENTS.forEach(inst => {
            const postGain = instrumentPostStutterGainsRef.current[inst];
            const analyser = instrumentAnalysersRef.current[inst];
            if (postGain) {
                try { postGain.disconnect(reverbBus); } catch (e) {}
            }
            if (analyser) {
                try { analyser.disconnect(reverbBus); } catch (e) {}
            }
        });

        // Reconnect the selected source
        if (source === 'all') {
            mainBus.connect(reverbBus);
        } else {
            const sourceNode = instrumentPostStutterGainsRef.current[source] || instrumentAnalysersRef.current[source];
            if (sourceNode) {
                sourceNode.connect(reverbBus);
            }
        }
    }, []);

    const setDelayMix = useCallback((mix: number) => {
        if (delayWetGainRef.current && audioContextRef.current) {
            delayWetGainRef.current.gain.setTargetAtTime(mix, audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);

    const setDelayTime = useCallback((time: number) => {
        if (delayNodeRef.current && audioContextRef.current) {
            delayNodeRef.current.delayTime.setTargetAtTime(Math.min(2.5, Math.max(0.001, time)), audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);

    const setDelayFeedback = useCallback((feedback: number) => {
        if (delayFeedbackGainRef.current && audioContextRef.current) {
            delayFeedbackGainRef.current.gain.setTargetAtTime(feedback, audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);
    
    const setDelaySource = useCallback((source: Instrument | 'all') => {
        const delayBus = delaySendBusRef.current;
        const mainBus = envelopeFilterOutputRef.current;
        if (!delayBus || !mainBus) return;

        // Disconnect ALL potential sources first to prevent duplicate connections
        try { mainBus.disconnect(delayBus); } catch (e) {}
        INSTRUMENTS.forEach(inst => {
            const postGain = instrumentPostStutterGainsRef.current[inst];
            const analyser = instrumentAnalysersRef.current[inst];
            if (postGain) {
                try { postGain.disconnect(delayBus); } catch (e) {}
            }
            if (analyser) {
                try { analyser.disconnect(delayBus); } catch (e) {}
            }
        });

        // Reconnect the selected source
        if (source === 'all') {
            mainBus.connect(delayBus);
        } else {
            const sourceNode = instrumentPostStutterGainsRef.current[source] || instrumentAnalysersRef.current[source];
            if (sourceNode) {
                sourceNode.connect(delayBus);
            }
        }
    }, []);
    
    const setKickSidechainAmount = useCallback((amount: number) => {
        kickSidechainAmountRef.current = amount;
    }, []);

    const setKickSidechainThreshold = useCallback((threshold: number) => {
        kickSidechainThresholdRef.current = threshold;
    }, []);

    const setKickSidechainRatio = useCallback((ratio: number) => {
        kickSidechainRatioRef.current = ratio;
    }, []);

    const setMasterVolume = useCallback((volume: number) => {
        if (masterGainRef.current && audioContextRef.current) {
            masterGainRef.current.gain.setTargetAtTime(volume, audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);

    const setCrushAmount = useCallback((amount: number) => {
        if (crusherWorkletNodeRef.current && audioContextRef.current) {
            const crushParam = crusherWorkletNodeRef.current.parameters.get('amount');
            if (crushParam) {
                crushParam.setTargetAtTime(amount, audioContextRef.current.currentTime, RAMP_TIME);
            }
        }
    }, []);

    const setTapeSaturationMix = useCallback((mix: number) => {
        const context = audioContextRef.current;
        const dryGain = tapeSaturationDryGainRef.current;
        const wetGain = tapeSaturationWetGainRef.current;
        if (context && dryGain && wetGain) {
            dryGain.gain.setTargetAtTime(1.0 - mix, context.currentTime, RAMP_TIME);
            wetGain.gain.setTargetAtTime(mix, context.currentTime, RAMP_TIME);
        }
    }, []);
    
    const setTapeSaturationAmount = useCallback((amount: number) => {
        if (tapeSaturationNodeRef.current) {
            tapeSaturationNodeRef.current.curve = makeTapeSaturationCurve(amount);
        }
    }, []);

    const setTapeSaturationTone = useCallback((freq: number) => {
        if (tapeToneFilterRef.current && audioContextRef.current) {
            tapeToneFilterRef.current.frequency.setTargetAtTime(freq, audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);

    const setEnvelopeFilterMix = useCallback((mix: number) => {
        const context = audioContextRef.current;
        const dryGain = envelopeFilterDryGainRef.current;
        const wetGain = envelopeFilterWetGainRef.current;
        if (context && wetGain) {
            if (dryGain) {
                dryGain.gain.setTargetAtTime(1.0 - mix, context.currentTime, RAMP_TIME);
            }
            wetGain.gain.setTargetAtTime(mix, context.currentTime, RAMP_TIME);
        }
    }, []);
    
    const setEnvelopeFilterAmount = useCallback((amount: number) => {
        if (envelopeAmountRef.current && audioContextRef.current) {
            const targetGain = amount * 8000;
            envelopeAmountRef.current.gain.setTargetAtTime(targetGain, audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);
    
    const setEnvelopeFilterBaseFreq = useCallback((freq: number) => {
        if (envelopeFilterBaseFreqNodeRef.current && audioContextRef.current) {
            envelopeFilterBaseFreqNodeRef.current.offset.setTargetAtTime(freq, audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);
    
    const setEnvelopeFilterQ = useCallback((q: number) => {
        if (envelopeFilterNodeRef.current && audioContextRef.current) {
            const targetQ = 0.1 + q * 19.9;
            envelopeFilterNodeRef.current.Q.setTargetAtTime(targetQ, audioContextRef.current.currentTime, RAMP_TIME);
        }
    }, []);

    const toggleXyFilter = useCallback((isOn: boolean) => {
        xyFilterActiveRef.current = isOn;
        const dry = xyFilterDryGainRef.current;
        const wet = xyFilterWetGainRef.current;
        const context = audioContextRef.current;
        if (!dry || !wet || !context) return;
        
        const dryTarget = isOn ? 0 : 1;
        const wetTarget = isOn ? 1 : 0;
        
        dry.gain.setTargetAtTime(dryTarget, context.currentTime, RAMP_TIME);
        wet.gain.setTargetAtTime(wetTarget, context.currentTime, RAMP_TIME);
    }, []);

    const setXyFilterParams = useCallback((freq: number, drive: number) => {
        const prevDrive = xyFilterDriveRef.current;
        xyFilterFreqRef.current = freq;
        xyFilterDriveRef.current = drive;
        const filter = xyFilterNodeRef.current;
        const saturator = xyFilterSaturatorRef.current;
        const context = audioContextRef.current;
        if (!filter || !saturator || !context) return;

        filter.frequency.setTargetAtTime(freq, context.currentTime, RAMP_TIME);
        if (Math.abs(drive - prevDrive) > 0.005) {
            saturator.curve = makeFilterDriveCurve(drive);
        }
    }, []);
    
    const setLofiMix = useCallback((mix: number) => {
        const dry = lofiDryGainRef.current;
        const wet = lofiWetGainRef.current;
        const noise = lofiNoiseGainRef.current;
        const filter = lofiBandpassFilterRef.current;
        const distortion = lofiDistortionRef.current;
        const context = audioContextRef.current;
        if (!dry || !wet || !noise || !filter || !distortion || !context) return;
        
        dry.gain.setTargetAtTime(1 - mix, context.currentTime, RAMP_TIME);
        wet.gain.setTargetAtTime(mix, context.currentTime, RAMP_TIME);
        
        noise.gain.setTargetAtTime(mix * 0.004, context.currentTime, RAMP_TIME);
        filter.frequency.setTargetAtTime(3500 - (mix * 2500), context.currentTime, RAMP_TIME);
        filter.Q.setTargetAtTime(2 + (mix * 6), context.currentTime, RAMP_TIME);
        
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
            gainNode.gain.setTargetAtTime(gain, context.currentTime, RAMP_TIME);
        }
    }, []);

    const playAirhorn = useCallback(() => {
        const context = audioContextRef.current;
        const buffer = airhornBufferRef.current;
        const destination = airhornDistortionRef.current;

        if (!context || !buffer || !destination) return;

        if (context.state === 'suspended') {
            context.resume().catch(() => {});
        }

        const now = context.currentTime;

        // Rapid-fire DJ sampler choke: cleanly fade out any currently playing airhorn over 8ms
        // so rapid clicks never phase-cancel or saturate the shared waveshaper and every click blasts a fresh attack.
        if (activeAirhornVoiceRef.current) {
            const prev = activeAirhornVoiceRef.current;
            activeAirhornVoiceRef.current = null;
            try {
                prev.gain.gain.cancelScheduledValues(now);
                prev.gain.gain.setValueAtTime(Math.max(0.0001, prev.gain.gain.value), now);
                prev.gain.gain.linearRampToValueAtTime(0.0001, now + 0.008);
                prev.source.stop(now + 0.009);
            } catch {}
        }

        const source = context.createBufferSource();
        source.buffer = buffer;
        const voiceGain = context.createGain();
        voiceGain.gain.setValueAtTime(1, now);

        source.connect(voiceGain);
        voiceGain.connect(destination);

        const voiceRecord = { source, gain: voiceGain };
        activeAirhornVoiceRef.current = voiceRecord;

        source.onended = () => {
            if (activeAirhornVoiceRef.current === voiceRecord) {
                activeAirhornVoiceRef.current = null;
            }
            try {
                source.disconnect();
                voiceGain.disconnect();
            } catch {}
        };
        source.start(now);
    }, []);


    const getRecordedAudioData = useCallback(() => {
        const chunks = recordedPcmDataRef.current;
        if (chunks.length === 0) return new Float32Array(0);

        // Calculate total length
        let totalLength = 0;
        for (const chunk of chunks) {
            totalLength += chunk.length;
        }

        // Combine chunks
        const combined = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
        }
        return combined;
    }, []);

    const setSampleAudioData = useCallback((audioData: Float32Array) => {
        const context = audioContextRef.current;
        if (!context) return;
        if (audioData.length === 0) {
            instrumentBuffersRef.current.sample = null;
            return;
        }
        const audioBuffer = context.createBuffer(1, audioData.length, context.sampleRate);
        audioBuffer.copyToChannel(audioData, 0);
        instrumentBuffersRef.current.sample = audioBuffer;
    }, []);

    const getStutterDivisionBeats = (division: StutterDivision): number => {
        switch (division) {
            case '1/4': return 1;
            case '1/8': return 0.5;
            case '1/8T': return 1 / 3;
            case '1/16': return 0.25;
            case '1/16T': return 1 / 6;
            case '1/32': return 0.125;
            default: return 0.25;
        }
    };

    const buildInstrumentFallbackSlice = useCallback((instrument: Instrument, volume: number = 0.7): Float32Array | null => {
        const buf = instrumentBuffersRef.current[instrument];
        if (!buf || buf.length === 0) return null;
        const chData = buf.getChannelData(0);
        const scaled = new Float32Array(chData.length);
        for (let i = 0; i < chData.length; i++) {
            scaled[i] = chData[i] * volume;
        }
        return scaled;
    }, []);

    const routeStutterSourceGraph = useCallback((source: Instrument | 'all') => {
        const instStutterNode = instrumentStutterWorkletNodeRef.current;
        if (!instStutterNode) return;

        try { instStutterNode.disconnect(); } catch {}

        INSTRUMENTS.forEach(inst => {
            const preNode: AudioNode | null = inst === 'sample'
                ? sampleLowPassRef.current
                : instrumentAnalysersRef.current[inst];
            const postGain = instrumentPostStutterGainsRef.current[inst];
            if (!preNode || !postGain) return;

            try { preNode.disconnect(postGain); } catch {}
            try { preNode.disconnect(instStutterNode); } catch {}

            if (source === inst) {
                preNode.connect(instStutterNode);
                instStutterNode.connect(postGain);
            } else {
                preNode.connect(postGain);
            }
        });
    }, []);

    const setTapeStop = useCallback((active: boolean, duration: number = 0.64, tempo: number = 90) => {
        const node = djFxWorkletNodeRef.current;
        const context = audioContextRef.current;
        if (!node) return;
        const beatSamples = context ? Math.max(256, Math.floor((60 / tempo) * context.sampleRate)) : 24000;
        node.port.postMessage({ type: 'tapestop', active, duration, beatSamples });
    }, []);

    const updateTapeStopDuration = useCallback((duration: number, tempo: number = 90) => {
        const node = djFxWorkletNodeRef.current;
        const context = audioContextRef.current;
        if (!node) return;
        const beatSamples = context ? Math.max(256, Math.floor((60 / tempo) * context.sampleRate)) : 24000;
        node.port.postMessage({ type: 'tapestopParams', duration, beatSamples });
    }, []);

    const setStutterState = useCallback((
        active: boolean,
        held: boolean,
        division: StutterDivision,
        tempo: number,
        source: Instrument | 'all' = stutterSourceRef.current,
        sourceVolume: number = 0.7,
        stutterSwing: number = stutterSwingRef.current
    ) => {
        stutterSwingRef.current = stutterSwing;
        const prevSource = stutterSourceRef.current;
        if (source !== prevSource) {
            stutterSourceRef.current = source;
            routeStutterSourceGraph(source);
        }
        stutterActiveRef.current = active;
        stutterHeldRef.current = held;
        stutterDivisionRef.current = division;

        const context = audioContextRef.current;
        const masterNode = djFxWorkletNodeRef.current;
        const instNode = instrumentStutterWorkletNodeRef.current;
        if (!context) return;

        const divBeats = getStutterDivisionBeats(division);
        const beatDurationSec = 60 / tempo;
        const beatSamples = Math.max(256, Math.floor(beatDurationSec * context.sampleRate));
        const loopSamples = Math.max(128, Math.floor(beatSamples * divBeats));
        const beatAnchorTime = beatAnchorTimeRef.current;
        const transportPlaying = transportPlayingRef.current;

        if (source === 'all') {
            if (instNode) {
                instNode.port.postMessage({
                    type: 'stutter',
                    active: false,
                    held: false,
                    loopSamples,
                    beatSamples,
                    divBeats,
                    beatDurationSec,
                    beatAnchorTime,
                    transportPlaying,
                    stutterSwing,
                    fallbackSlice: null,
                });
            }
            if (masterNode) {
                masterNode.port.postMessage({
                    type: 'stutter',
                    active,
                    held,
                    loopSamples,
                    beatSamples,
                    divBeats,
                    beatDurationSec,
                    beatAnchorTime,
                    transportPlaying,
                    stutterSwing,
                    fallbackSlice: null,
                });
            }
        } else {
            if (masterNode) {
                masterNode.port.postMessage({
                    type: 'stutter',
                    active: false,
                    held: false,
                    loopSamples,
                    beatSamples,
                    divBeats,
                    beatDurationSec,
                    beatAnchorTime,
                    transportPlaying,
                    stutterSwing,
                    fallbackSlice: null,
                });
            }
            if (instNode) {
                const fallbackSlice = buildInstrumentFallbackSlice(source, sourceVolume);
                instNode.port.postMessage({
                    type: 'stutter',
                    active,
                    held,
                    loopSamples,
                    beatSamples,
                    divBeats,
                    beatDurationSec,
                    beatAnchorTime,
                    transportPlaying,
                    stutterSwing,
                    fallbackSlice,
                });
            }
        }
    }, [routeStutterSourceGraph, buildInstrumentFallbackSlice]);

    const updateStutterParams = useCallback((
        division: StutterDivision,
        tempo: number,
        source: Instrument | 'all' = stutterSourceRef.current,
        sourceVolume: number = 0.7,
        stutterSwing: number = stutterSwingRef.current
    ) => {
        stutterSwingRef.current = stutterSwing;
        const prevSource = stutterSourceRef.current;
        stutterDivisionRef.current = division;
        const context = audioContextRef.current;
        const masterNode = djFxWorkletNodeRef.current;
        const instNode = instrumentStutterWorkletNodeRef.current;
        if (!context) return;

        const divBeats = getStutterDivisionBeats(division);
        const beatDurationSec = 60 / tempo;
        const beatSamples = Math.max(256, Math.floor(beatDurationSec * context.sampleRate));
        const loopSamples = Math.max(128, Math.floor(beatSamples * divBeats));
        const beatAnchorTime = beatAnchorTimeRef.current;
        const transportPlaying = transportPlayingRef.current;

        if (source !== prevSource) {
            stutterSourceRef.current = source;
            routeStutterSourceGraph(source);
            if (stutterActiveRef.current) {
                setStutterState(true, stutterHeldRef.current, division, tempo, source, sourceVolume, stutterSwing);
                return;
            }
        }

        if (masterNode) {
            masterNode.port.postMessage({
                type: 'stutterParams',
                loopSamples,
                beatSamples,
                divBeats,
                beatDurationSec,
                beatAnchorTime,
                transportPlaying,
                stutterSwing,
                fallbackSlice: null,
            });
        }
        if (instNode) {
            const fallbackSlice = source !== 'all' ? buildInstrumentFallbackSlice(source, sourceVolume) : null;
            instNode.port.postMessage({
                type: 'stutterParams',
                loopSamples,
                beatSamples,
                divBeats,
                beatDurationSec,
                beatAnchorTime,
                transportPlaying,
                stutterSwing,
                fallbackSlice,
            });
        }
    }, [routeStutterSourceGraph, setStutterState, buildInstrumentFallbackSlice]);

    const syncStutterTransport = useCallback((
        playing: boolean,
        beatAnchorTime: number,
        tempo: number,
        reanchor: boolean = false,
        source: Instrument | 'all' = stutterSourceRef.current,
        sourceVolume: number = 0.7,
        stutterSwing: number = stutterSwingRef.current
    ) => {
        transportPlayingRef.current = playing;
        if (playing) {
            beatAnchorTimeRef.current = beatAnchorTime;
        }
        stutterSwingRef.current = stutterSwing;
        const context = audioContextRef.current;
        const masterNode = djFxWorkletNodeRef.current;
        const instNode = instrumentStutterWorkletNodeRef.current;
        if (!context) return;

        const beatDurationSec = 60 / tempo;
        const beatSamples = Math.max(256, Math.floor(beatDurationSec * context.sampleRate));

        if (masterNode) {
            masterNode.port.postMessage({
                type: 'transportSync',
                playing,
                beatAnchorTime: beatAnchorTimeRef.current,
                beatDurationSec,
                beatSamples,
                reanchor,
                stutterSwing,
                fallbackSlice: null,
            });
        }
        if (instNode) {
            const fallbackSlice = (reanchor && source !== 'all')
                ? buildInstrumentFallbackSlice(source, sourceVolume)
                : undefined;
            instNode.port.postMessage({
                type: 'transportSync',
                playing,
                beatAnchorTime: beatAnchorTimeRef.current,
                beatDurationSec,
                beatSamples,
                reanchor,
                stutterSwing,
                fallbackSlice,
            });
        }
    }, [buildInstrumentFallbackSlice]);

    return {
        setup, playKick, playSnare, playHiHat, playSnap, playClave, playCowbell, playSample, startRecording, stopRecording, startLiveRecording, stopLiveRecording, getRecordedAudioData, setSampleAudioData, renderBeatToBuffer, updateInstrumentParameter, rerenderKick, rerenderAllInstruments,
        setLowPassFrequency, setHighPassFrequency, setReverbMix, setReverbDecay, setReverbType, setReverbTone, setReverbSource, setDelayMix, setDelayTime, setDelayFeedback, setDelaySource, setKickSidechainAmount, setKickSidechainThreshold, setKickSidechainRatio,
        setMasterVolume, setCrushAmount, setTapeSaturationMix, setTapeSaturationAmount, setTapeSaturationTone,
        setEnvelopeFilterMix, setEnvelopeFilterAmount, setEnvelopeFilterBaseFreq, setEnvelopeFilterQ,
        toggleXyFilter, setXyFilterParams, setLofiMix, setIsoGain, playAirhorn,
        setTapeStop, updateTapeStopDuration, setStutterState, updateStutterParams, syncStutterTransport
    };
};