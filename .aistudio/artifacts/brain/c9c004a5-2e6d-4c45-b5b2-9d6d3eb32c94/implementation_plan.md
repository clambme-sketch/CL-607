# Unified Sample Recorder & Sequencer Recording Workflow

This plan unifies the Sequencer's `SAMPLE` row record button and the `Sample Recorder` tab into a single, synchronized recording and editing pipeline so that starting or stopping a recording from either location shares the exact same state, waveform buffer, non-destructive trim/edit history, and instrument parameters.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design choices were confirmed during clarification and govern this implementation:

- **Confirmed Decision 1 — Click-to-Toggle Recording (No Countdown)**: Clicking the record button next to the `SAMPLE` row in the sequencer grid immediately starts recording on the first click and stops recording on the second click, matching the `REC / STOP` button inside the Sample Recorder tab. The 3-second countdown is removed.
- **Confirmed Decision 2 — Automatic Waveform & Edit Synchronization**: Recording from either the sequencer grid button or the Sample Recorder tab feeds the same shared sample buffer and waveform state. Any recording captured from the grid button immediately populates the interactive waveform visualizer in the Sample Recorder tab, and any trimming, normalization, reversal, fade-in, or drag-and-drop audio loading updates the active sequencer sample automatically.
- **Confirmed Decision 3 — Synchronized Dual Parameter Sliders**: The `Pitch`, `Decay`, `High Pass`, and `Low Pass` sliders remain available in both the `Sample Recorder` tab and the `Instrument Settings` tab, reading from and updating the same single source of truth so moving a slider in one view immediately reflects in the other.

---

## 1. Overview & Core Concept

- **What It Does**: Eliminates the split-brain behavior between the quick-record button on the sequencer row and the full editor in the Sample Recorder tab. Previously, the grid button used a hold-to-record countdown and wiped out the Sample Recorder tab's waveform whenever the tab wasn't actively polling, while the Sample Recorder tab maintained separate local state for recording and sample parameters.
- **Target Audience / Persona**: Beatmakers and live performers capturing microphone samples on the fly while sequencing patterns, who want instant one-click recording from the main deck alongside full waveform trimming and destructive/non-destructive audio shaping in the Sample Recorder tab.
- **Key Value**: Reliable, predictable sample capture and editing where every control reflects the true state of the audio engine without lost takes or desynchronized sliders.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **One-Click Capture from Either Control**: The user clicks the record button in the `SAMPLE` row of the sequencer (or the `REC` button in the Sample Recorder tab). Both buttons immediately transition to their active recording state (pulsing red indicator / `STOP` icon) and begin streaming live microphone audio into the shared waveform visualizer.
  2. **Stopping & Auto-Cap**: Clicking either button again (or reaching the 10-second maximum recording safety cap) stops the microphone stream, commits the captured Float32 PCM audio to both the waveform editor and the audio engine's `sample` buffer, and resets trim handles to the full take (`0` to `1`).
  3. **Seamless Waveform Editing**: Opening the Sample Recorder tab after recording from the grid shows the captured waveform ready for trimming, normalizing, reversing, fading in, reverting to the original take, or baking effects destructively (`APPLY EFFECTS TO SAMPLE`).
  4. **Synchronized Parameter Tweaking**: Adjusting `Pitch`, `Decay`, `High Pass`, or `Low Pass` in either the Sample Recorder tab or the Instrument Settings panel updates the same live parameter values (`tabular-nums` readouts) in real time.
- **Visual Identity & Theme**:
  - Preserves all active hardware deck aesthetics (`default`, `braun`, `bauhaus`, `nagra`, `koto`, `cyberpunk`), including Cappuccino and Invert Colors modes.
  - Updates the `SAMPLE` row record button tooltip and aria-label from `"Hold to record from your microphone"` to `"Click to start/stop recording sample"`, with a clear red record dot when idle and a pulsing stop square while recording.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Lifting Sample Recording & Waveform State to the Top-Level Controller**
  - *Chosen Approach*: Manage `isRecording`, `fullAudioData`, `originalAudioData`, `trimRange`, and the 10-second auto-stop timer in the central application state (alongside a single unified `toggleRecording` handler) rather than isolating them inside the Sample Recorder tab component.
  - *Why*: Guarantees that recording from the sequencer grid button captures the raw Float32 audio into the waveform editor even when the Sample Recorder accordion is collapsed, and prevents the tab's `useEffect` from overwriting the audio engine buffer with empty data.
  - *Alternatives Considered*: Keeping state inside the Sample Recorder tab and exposing imperative refs—rejected because unmounted/collapsed states or re-renders can still cause race conditions with the audio engine buffer.

- **Decision 2: Single Source of Truth for Sample Parameters**
  - *Chosen Approach*: Pass the live `sample` parameter slice (`pitch`, `decay`, `highPass`, `lowPass`) from the central `instrumentParams` state directly into the Sample Recorder tab instead of duplicating `useState` hooks locally.
  - *Why*: Ensures pattern switching, preset loading, Instrument Settings adjustments, and destructive offline rendering (`APPLY EFFECTS TO SAMPLE`) stay 100% synchronized across the entire UI.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Central App State & Audio Engine                    │
│  • Shared Recording State: isRecording, toggleRecording, 10s safety cap │
│  • Shared Sample Buffers: fullAudioData, originalAudioData, trimRange   │
│  • Shared Sample Params: instrumentParams.sample (pitch, decay, HP, LP) │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│        Sequencer (SAMPLE Row)         │ │      Sample Recorder Tab      │
│  • Click-to-toggle REC/STOP button    │ │  • Synced REC/STOP button     │
│  • Reflects shared isRecording state  │ │  • Live/Recorded Waveform     │
│  • Triggers shared toggleRecording()  │ │  • Trim, Normalize, Reverse,  │
│                                       │ │    Fade In, Revert, Bake FX   │
└───────────────────────────────────────┘ └───────────────┬───────────────┘
                                                          │
                                                          ▼
                                          ┌───────────────────────────────┐
                                          │    Instrument Settings Tab    │
                                          │  • Two-way synced sliders for │
                                          │    Pitch, Decay, HP, LP       │
                                          └───────────────────────────────┘
```

- **Data Model & State**:
  - `isRecording` (`boolean`): Shared recording status reflected by both the Sequencer `SAMPLE` row button and the Sample Recorder tab button.
  - `fullAudioData` (`Float32Array`): Current working PCM audio data displayed in the waveform visualizer and sliced by `trimRange` to feed the audio engine's `sample` buffer.
  - `originalAudioData` (`Float32Array`): Untouched copy of the most recent microphone recording or dropped audio file, enabling one-click `REVERT`.
  - `trimRange` (`{ start: number; end: number }`): Normalized `[0, 1]` start and end markers applied non-destructively to `fullAudioData`.
  - `instrumentParams.sample` (`InstrumentParams`): Shared `{ pitch, decay, highPass, lowPass }` object read and mutated by both the Sample Recorder tab and Instrument Settings tab.

- **Interactive Component & State Mapping**:
  - **Sequencer Record Button**: Replaces `onMouseDown`/`onMouseUp`/`onTouchStart`/`onTouchEnd` hold handlers and countdown state with a single `onClick={onToggleRecording}` handler.
  - **Live Recording Polling & Finalization**: While `isRecording` is true, a 250ms polling interval updates `fullAudioData` from `getRecordedAudioData()` so the waveform visualizer animates in real time. When `toggleRecording` stops recording (or the 10s timer fires), it captures the final `getRecordedAudioData()` array before calling `stopRecording()` on the audio engine, stores it in both `fullAudioData` and `originalAudioData`, resets `trimRange` to `{ start: 0, end: 1 }`, and syncs the audio engine buffer.
  - **Destructive Bake (`APPLY EFFECTS TO SAMPLE`)**: Renders the trimmed buffer through an `OfflineAudioContext` using the shared `instrumentParams.sample` values, updates `fullAudioData` with the rendered buffer, and resets `instrumentParams.sample` (`pitch: 1`, `decay: 1`, `highPass: 20`, `lowPass: 20000`) via `handleInstrumentParamChange` so neither tab double-applies the baked settings.
