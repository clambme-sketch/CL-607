# Sample Recorder Aesthetic & Theme-Aligned Waveform Upgrade

This plan delivers a refined, studio-grade visual overhaul for the Sample Recorder component and its interactive waveform oscilloscope, ensuring cohesive spacing, crisp iconography, high-contrast waveform rendering, and native visual alignment across every hardware theme (Sunset, Virtual, Domino, Braun, Koto, Minimal, and Default).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were confirmed during clarification and govern this implementation:

- **Confirmed Decision 1 — Theme-Adapted High-Contrast Waveform Scope with Time Ruler**: The waveform display uses high-contrast, theme-calibrated scope backdrops with dual-layer peak rendering (translucent gradient fill + luminous peak outline), a calibrated top time/subdivision ruler, high-visibility `IN` and `OUT` bracket handles, and theme-matched HUD telemetry badges.
- **Confirmed Decision 2 — Clustered Icon + Label Editing Toolbar**: Waveform editing controls (`Crop`, `Full Range`, `Normalize`, `Reverse`, `Fade In`, `Fade Out`, `Revert`, `Clear`) are organized into three distinct functional clusters (**Trim**, **Process**, and **Reset**) with custom SVG iconography paired with concise single-line labels.
- **Confirmed Decision 3 — Dedicated Parameter Cards for Tone & Envelope Shaping**: `Pitch`, `Decay`, `High Pass`, and `Low Pass` are housed in individual theme-styled parameter cards featuring clear label/value headers, tabular numeric readouts (including semitone offset and frequency units), custom-styled range tracks, and a unified section header with `Reset Params` and `Bake to Waveform` actions.

---

## 1. Overview & Core Concept

- **What It Does**: Elevates the Sample Recorder from a generic dark utility box into a cohesive, tactile studio sampler module that adapts its surface materials, borders, typography, iconography, and oscilloscope trace contrast to the active visual theme.
- **Target Audience / Persona**: Producers and beatmakers using the drum machine across diverse visual themes (such as the warm pastel clouds of **Sunset**, the neon brutalism of **Virtual**, or the bold constructivist geometry of **Domino**) who need immediate visual clarity when trimming waveforms and shaping sample parameters.
- **Key Value**: Eliminates low-contrast text/divider clashes on light and warm themes, provides a higher-DPI oscilloscope with a calibrated time ruler for surgical sample trimming, and groups editing tools into scannable icon-driven clusters.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Capture & Load**: The top transport bar groups **REC MIC** (with live elapsed timer), **PREVIEW** (with animated playhead sweep), and **LOAD FILE** on the left, balanced by unboxed tabular telemetry on the right (`active duration · total duration · sample rate`) and transient status notifications.
  2. **High-Contrast Waveform Trimming**: Users inspect their sample on a high-DPI canvas featuring a top time ruler (with dynamically scaled millisecond/second tick marks), a zero-crossing axis, dimmed out-of-bounds masks, and tactile `IN` / `OUT` bracket handles that support both edge-resizing and region-slip dragging.
  3. **Clustered Waveform Editing**: Directly beneath the scope, three logically separated button groups—**Trim** (`Crop`, `Full`), **Process** (`Normalize`, `Reverse`, `Fade In`, `Fade Out`), and **Reset** (`Revert`, `Clear`)—allow one-click non-destructive or buffer-level edits with crisp vector icons describing each action's envelope or direction.
  4. **Tone & Envelope Parameter Cards**: Four structured parameter cards (`Pitch`, `Decay`, `High Pass`, `Low Pass`) display real-time `tabular-nums` values (`1.00x · +0.0 st`, `1.00s / SUSTAIN`, `20 Hz`, `20.0 kHz`), theme-coordinated visual progress bars, double-click-to-reset affordances, and a header action bar to reset parameters or bake effects into the waveform.

- **Visual Identity & Theme Alignment**:
  - **Sunset (`nagra`)**: Soft warm cloud card surfaces (`#fff8f3` to `#fde2d6`) with deep plum typography (`#3b1547`), warm rose dividers, and a deep twilight plum oscilloscope (`#1b092e`) with glowing coral-gold waveform traces (`#ff9e6d` / `#ffe885`) so neither light nor dark text is ever washed out.
  - **Virtual (`cyberpunk`)**: Obsidian cyber-deck surfaces (`#08080c`) with crisp `#00ff9f` neon borders, `#fcee0a` readouts, and a high-contrast phosphor-green & cyber-yellow oscilloscope with hard-edged geometric trim handles.
  - **Domino / Bauhaus (`bauhaus`)**: Constructivist parchment cards (`#f7f2e7`) with `2px solid #141413` architectural borders, hard offset shadows, bold geometric typography, and a high-contrast studio black oscilloscope (`#141413`) with primary yellow (`#f2b705`) and crimson (`#d62828`) trim markers.
  - **Braun (`braun`)**: Dieter Rams anodized aluminum surfaces (`#ebe8df`) with recessed instrument bays (`#dedad0`), warm charcoal legends (`#1c1c1a`), and a matte anthracite CRT scope (`#181816`) with signature Braun orange (`#ea5b0c`) waveform traces.
  - **Koto (`koto`)**: Urushi lacquer surfaces (`#140f16`) with 24k maki-e gold hairline borders (`rgba(212, 175, 55, 0.3)`), warm ivory text, and a gilded waveform trace (`#e6c665`).
  - **Minimal (`minimal`) & Default (`default`)**: Precision monochrome (`#0c0c0e` / `#f4f4f5` with `#ff3b1d` accents) and modern slate studio dark (`#0f172a` / `#38bdf8` cyan trace) with zero visual clutter.

- **Spatial & Typographic Hierarchy**:
  - Container outer padding (`20px`) exceeds internal section spacing (`16px`), and button clusters maintain consistent `6px` intra-group gaps with `12px` inter-group dividers.
  - All numeric readouts, time ruler ticks, and trim telemetry use `font-mono tabular-nums` to prevent layout jitter while scrubbing sliders or dragging trim handles.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Theme-Aware Surface Tokens Instead of Hardcoded Dark Utility Classes**
  - *Chosen Approach*: Replace hardcoded `border-white/10`, `text-gray-300`, `bg-gray-900/50`, and `bg-gray-700` classes in the Sample Recorder with a dedicated theme token map covering light themes (`nagra`, `bauhaus`, `braun`) and dark themes (`default`, `cyberpunk`, `koto`, `minimal`).
  - *Why*: Global CSS overrides only target specific utility classes; explicit theme tokens guarantee WCAG AA contrast for section headers, subtle dividers, parameter cards, and telemetry across all seven themes.
  - *Alternatives Considered*: Adding more `!important` overrides in global CSS—passed over because component-level semantic theme tokens are cleaner, more predictable, and allow fine-grained styling for parameter cards and dividers.

- **Decision 2: High-DPI Canvas Rendering with Integrated Time Ruler**
  - *Chosen Approach*: Scale the waveform canvas by `window.devicePixelRatio` via `ResizeObserver` and render a dedicated top time ruler strip with dynamic tick intervals alongside dual-pass waveform rendering (vertical min/max energy bars + glowing peak contour).
  - *Why*: Eliminates blurry canvas upscaling on Retina/high-DPI screens and gives users an immediate visual sense of sample length and trim boundaries in milliseconds/seconds.

- **Decision 3: Clustered Icon + Label Action Bar**
  - *Chosen Approach*: Group the 8 waveform actions into 3 visual clusters (**Trim**: `Crop`, `Full Range`; **Process**: `Normalize`, `Reverse`, `Fade In`, `Fade Out`; **Reset**: `Revert`, `Clear`) separated by subtle vertical hairlines, each with a custom 14px vector icon.
  - *Why*: Scanning 8 uniform text buttons in a single row creates cognitive friction; grouping by function with clear visual metaphors (scissors for crop, arrows for expand/reverse, ramp curves for fades) speeds up live beatmaking workflows.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Sample Recorder Studio Module                       │
│  • Theme Token Resolver (Sunset, Virtual, Domino, Braun, Koto, Minimal)    │
├────────────────────────────────────────────────────────────────────────────┤
│  1. Transport & Telemetry Header                                           │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │ [● REC MIC] [▶ PREVIEW] [↑ LOAD]   │  │ Active · Total · kHz / Toast │  │
│  └────────────────────────────────────┘  └──────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│  2. High-DPI Waveform Oscilloscope & Trim Editor                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 0.0s        0.5s        1.0s        1.5s        2.0s   (Time Ruler)  │  │
│  │ ░░░░░▐══════════════════════════════════════════════▌░░░░░░░░░░░░░░░ │  │
│  │ ░░░░░▐───███▄──▅█▛──▄█▙───████───▅██▛───▄█▟─────────▌░░░░░░░░░░░░░░░ │  │
│  │ ░░░░░▐══════════════════════════════════════════════▌░░░░░░░░░░░░░░░ │  │
│  │ [IN 0.18s · OUT 1.64s]                         [LEN 1.46s / 2.40s]   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│  3. Clustered Waveform Edit Toolbar (Icon + Concise Label)                 │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  ┌────────┐ │
│  │ [✂ Crop] [↔ Full]   │  │ [⤒ Norm] [⇄ Rev] [◢ In] [◣ Out] │  │[↺][🗑] │ │
│  └─────────────────────┘  └──────────────────────────────────┘  └────────┘ │
├────────────────────────────────────────────────────────────────────────────┤
│  4. Tone & Envelope Shaping Rack                                           │
│  Header: TONE & ENVELOPE SHAPING          [↺ Reset Params] [⚡ Bake FX]    │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│  │ PITCH   +0.0st │ │ DECAY    1.00s │ │ HIGH PASS 20Hz │ │ LOW PASS 20k │ │
│  │ ══════●═══════ │ │ ══════●═══════ │ │ ●═════════════ │ │ ═══════════● │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └──────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - Preserves 100% compatibility with the shared top-level sample state (`fullAudioData`, `originalAudioData`, `trimRange`, `isRecording`, `sampleParams`) and audio engine hooks.
  - Adds responsive canvas dimension tracking (`ResizeObserver` + `devicePixelRatio`) inside the waveform visualizer so lines, ruler ticks, and trim brackets render with razor-sharp subpixel clarity at any viewport width.

- **Interactive Component & State Mapping**:
  - **Transport Cluster**: `REC MIC` toggles live capture with a real-time `0.1s` timer; `PREVIEW` triggers sample playback and drives a `requestAnimationFrame` playhead sweep across the active trim window; `LOAD FILE` opens the native file picker (complementing drag-and-drop onto the module).
  - **High-Contrast Scope & Trim Handles**: Pointer down/move/up and touch handlers detect hit zones for the left `IN` bracket, right `OUT` bracket, or middle active region (slip-dragging the window while preserving duration), with live hover cursor feedback (`ew-resize` on handles, `grab`/`grabbing` inside the trimmed window).
  - **Clustered Edit Toolbar**: Each button is disabled automatically when no sample is loaded (or when `Crop` / `Full Range` is already at `[0, 1]`), executes its buffer transformation, resets trim markers where appropriate, and dispatches a concise confirmation message in the header telemetry slot.
  - **Tone & Envelope Parameter Cards**: Four self-contained cards display the parameter title, primary unit readout, secondary contextual badge (e.g., semitones for Pitch, `SUSTAIN` indicator at max Decay), and theme-styled range input with double-click reset to default.
