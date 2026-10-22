import React, { useMemo, useState } from 'react';
import { Grid, NotationTextMode } from '../types';
import { INSTRUMENTS, INSTRUMENT_LABELS } from '../constants';
import { safeGetItem, safeSetItem } from '../utils';

// --- VISUAL CONSTANTS ---
const VIEWBOX_WIDTH = 1060;
const TOP_PADDING = 28;
const BOTTOM_PADDING = 16;
const STAFF_HEIGHT = 64;
const VIEWBOX_HEIGHT = TOP_PADDING + STAFF_HEIGHT * INSTRUMENTS.length + BOTTOM_PADDING;

const START_X = 96;
const END_X = VIEWBOX_WIDTH - 24;
const CLEF_AND_TIMESIG_WIDTH = 64;
const NOTES_START_X = START_X + CLEF_AND_TIMESIG_WIDTH;
const NOTES_END_X = END_X - 18;
const NOTES_WIDTH = NOTES_END_X - NOTES_START_X;

const NOTE_COLOR = 'var(--note-color)';
const STAFF_COLOR = 'var(--staff-color)';

// Note & Stem Geometry
const STEM_HEIGHT = 25;
const STEM_WIDTH = 1.65;
const STEM_X_OFFSET = 4.6;
const BEAM_THICKNESS = 3.6;
const BEAM_SPACING = 5.6;

// --- Rhythmic Parsing Types ---
type NoteDuration = '16n' | '8n' | '8nd' | 'qn' | 'qnd';
type RestDuration = '16r' | '8r' | '8rd' | 'qr' | 'wr';

interface NoteElement {
    type: 'note';
    step: number;
    color: string;
    duration: NoteDuration;
    syllable: string;
}

interface RestElement {
    type: 'rest';
    step: number;
    duration: RestDuration;
}

type NotationElement = NoteElement | RestElement;

interface SecondaryBeamSegment {
    startStep: number;
    endStep: number;
    stubDirection?: 'left' | 'right';
}

interface BeamGroup {
    startStep: number;
    endStep: number;
    secondarySegments: SecondaryBeamSegment[];
}

/**
 * Returns the written rhythm syllable (Kodály system) for a given note duration and beat subdivision offset:
 * - Quarter note ('qn') -> 'ta'
 * - Dotted quarter note ('qnd') -> 'ta-i'
 * - Eighth note ('8n') -> 'ti'
 * - Dotted eighth note ('8nd') -> 'ti-i'
 * - Sixteenth note ('16n') -> 'ti' (on beat/upbeat offsets 0, 2) or 'ki' (on 'e'/'a' offsets 1, 3), forming 'ti-ki-ti-ki'
 */
const getRhythmSyllable = (duration: NoteDuration, stepOffsetInBeat: number): string => {
    switch (duration) {
        case 'qn':
            return 'ta';
        case 'qnd':
            return 'ta-i';
        case '8n':
            return 'ti';
        case '8nd':
            return 'ti-i';
        case '16n':
            return stepOffsetInBeat % 2 === 0 ? 'ti' : 'ki';
        default:
            return 'ta';
    }
};

/**
 * Returns the standard 1e&a subdivision counting label for a given step index:
 * - On-beat (offset 0) -> Beat number ('1', '2', '3', '4', ...)
 * - Offset 1 -> 'e'
 * - Offset 2 -> '&'
 * - Offset 3 -> 'a'
 */
const getStepSubdivisionText = (step: number): string => {
    const beatIndex = Math.floor(step / 4) + 1;
    const offset = step % 4;
    switch (offset) {
        case 0: return String(beatIndex);
        case 1: return 'e';
        case 2: return '&';
        case 3: return 'a';
        default: return '';
    }
};

/**
 * Converts a boolean step grid for one instrument into standard engraved percussion notation.
 * Evaluates each 4-step (16th-note) beat cell (and cross-beat dotted quarter patterns) so every
 * rhythm combination produces authentic notation with proper note durations, rests, dots, beams, and syllables.
 */
const parseGridToNotation = (
    grid: boolean[],
    color: string,
    beatsPerMeasure: number
): { notation: NotationElement[]; beams: BeamGroup[]; beamedSteps: Set<number> } => {
    const numSteps = beatsPerMeasure * 4;
    const activeSlice = grid.slice(0, numSteps);

    // Entire measure empty -> single centered Whole Rest
    if (!activeSlice.some(Boolean)) {
        return {
            notation: [{ type: 'rest', step: 0, duration: 'wr' }],
            beams: [],
            beamedSteps: new Set<number>(),
        };
    }

    const notation: NotationElement[] = [];
    const beams: BeamGroup[] = [];
    const beamedSteps = new Set<number>();

    // Precompute active offsets per beat so we can detect cross-beat Dotted Quarter Notes (ta-i ti)
    const beatOffsetsList: number[][] = [];
    for (let beat = 0; beat < beatsPerMeasure; beat++) {
        const beatStart = beat * 4;
        const activeOffsets: number[] = [];
        for (let offset = 0; offset < 4; offset++) {
            if (grid[beatStart + offset]) {
                activeOffsets.push(offset);
            }
        }
        beatOffsetsList.push(activeOffsets);
    }

    let carryDottedQuarterIntoBeat = false;

    for (let beat = 0; beat < beatsPerMeasure; beat++) {
        const beatStart = beat * 4;
        const activeOffsets = beatOffsetsList[beat];
        const nextBeatOffsets = beat + 1 < beatsPerMeasure ? beatOffsetsList[beat + 1] : null;
        const isCarriedFromPrevDottedQuarter = carryDottedQuarterIntoBeat;
        carryDottedQuarterIntoBeat = false;

        // 1. Full beat of silence -> Quarter Rest
        if (activeOffsets.length === 0) {
            notation.push({ type: 'rest', step: beatStart, duration: 'qr' });
            continue;
        }

        // Check if this beat is a single downbeat hit that sustains into the "&" (offset 2) of the next beat -> Dotted Quarter Note ('qnd' = 'ta-i')
        if (
            activeOffsets.length === 1 &&
            activeOffsets[0] === 0 &&
            nextBeatOffsets !== null &&
            nextBeatOffsets.length > 0 &&
            nextBeatOffsets[0] === 2
        ) {
            notation.push({
                type: 'note',
                step: beatStart,
                color,
                duration: 'qnd',
                syllable: getRhythmSyllable('qnd', 0),
            });
            carryDottedQuarterIntoBeat = true;
            continue;
        }

        // Special case: single hit on the "e" of the beat ([false, true, false, false])
        // Engraved as: 16th rest (downbeat), 16th note ("e"), 8th rest ("&")
        if (activeOffsets.length === 1 && activeOffsets[0] === 1) {
            notation.push({ type: 'rest', step: beatStart, duration: '16r' });
            notation.push({
                type: 'note',
                step: beatStart + 1,
                color,
                duration: '16n',
                syllable: getRhythmSyllable('16n', 1),
            });
            notation.push({ type: 'rest', step: beatStart + 2, duration: '8r' });
            continue;
        }

        // 2. Leading silence before the first hit in this beat (suppressed if sustained from a previous Dotted Quarter Note)
        const firstOffset = activeOffsets[0];
        if (!isCarriedFromPrevDottedQuarter) {
            if (firstOffset === 1) {
                notation.push({ type: 'rest', step: beatStart, duration: '16r' });
            } else if (firstOffset === 2) {
                notation.push({ type: 'rest', step: beatStart, duration: '8r' });
            } else if (firstOffset === 3) {
                notation.push({ type: 'rest', step: beatStart, duration: '8rd' });
            }
        }

        // 3. Emit notes within the beat (each sustains until the next hit in the beat or beat end)
        const beatNotes: NoteElement[] = [];
        for (let idx = 0; idx < activeOffsets.length; idx++) {
            const currentOffset = activeOffsets[idx];
            const nextOffset = idx + 1 < activeOffsets.length ? activeOffsets[idx + 1] : 4;
            const spanSteps = nextOffset - currentOffset;

            let duration: NoteDuration;
            if (spanSteps === 4) {
                duration = 'qn';
            } else if (spanSteps === 3) {
                duration = '8nd';
            } else if (spanSteps === 2) {
                duration = '8n';
            } else {
                duration = '16n';
            }

            const noteEl: NoteElement = {
                type: 'note',
                step: beatStart + currentOffset,
                color,
                duration,
                syllable: getRhythmSyllable(duration, currentOffset),
            };
            notation.push(noteEl);
            beatNotes.push(noteEl);
        }

        // 4. Build beam group if there are 2 or more notes in this beat
        if (beatNotes.length >= 2) {
            beatNotes.forEach(n => beamedSteps.add(n.step));

            const secondarySegments: SecondaryBeamSegment[] = [];
            let i = 0;
            while (i < beatNotes.length) {
                if (beatNotes[i].duration === '16n') {
                    let j = i;
                    while (j + 1 < beatNotes.length && beatNotes[j + 1].duration === '16n') {
                        j++;
                    }
                    if (j > i) {
                        // Connected 16th notes share a continuous secondary beam
                        secondarySegments.push({
                            startStep: beatNotes[i].step,
                            endStep: beatNotes[j].step,
                        });
                    } else {
                        // Isolated 16th note within a beamed group gets a fractional stub beam pointing inward
                        const stubDirection = i === 0 ? 'right' : 'left';
                        secondarySegments.push({
                            startStep: beatNotes[i].step,
                            endStep: beatNotes[i].step,
                            stubDirection,
                        });
                    }
                    i = j + 1;
                } else {
                    i++;
                }
            }

            beams.push({
                startStep: beatNotes[0].step,
                endStep: beatNotes[beatNotes.length - 1].step,
                secondarySegments,
            });
        }
    }

    return { notation, beams, beamedSteps };
};

// --- Engraved SVG Subcomponents ---

const PercussionClef: React.FC<{ x: number; y: number }> = ({ x, y }) => (
    <g transform={`translate(${x}, ${y})`}>
        <rect x="-3.5" y="-10" width="2.4" height="20" fill={STAFF_COLOR} rx="0.5" />
        <rect x="1.5" y="-10" width="2.4" height="20" fill={STAFF_COLOR} rx="0.5" />
    </g>
);

const TimeSignature: React.FC<{ x: number; y: number; beats: number }> = ({ x, y, beats }) => (
    <g transform={`translate(${x}, ${y})`} fill={STAFF_COLOR} className="select-none">
        <text
            x="0"
            y="-3"
            fontSize="13"
            fontWeight="800"
            fontFamily="Georgia, serif"
            textAnchor="middle"
        >
            {beats}
        </text>
        <text
            x="0"
            y="11"
            fontSize="13"
            fontWeight="800"
            fontFamily="Georgia, serif"
            textAnchor="middle"
        >
            4
        </text>
    </g>
);

const AugmentationDot: React.FC<{ cx: number; cy: number; fill: string }> = ({ cx, cy, fill }) => (
    <circle
        cx={cx}
        cy={cy}
        r="2.35"
        fill={fill}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth="0.5"
    />
);

const Note: React.FC<{
    x: number;
    y: number;
    color: string;
    duration: NoteDuration;
    flagged: boolean;
    labelText?: string;
    showLabel?: boolean;
    syllable?: string;
    showSyllable?: boolean;
}> = ({ x, y, color, duration, flagged, labelText, showLabel, syllable, showSyllable }) => {
    const isDotted = duration === '8nd' || duration === 'qnd';
    const baseDuration = duration === '8nd' ? '8n' : duration === 'qnd' ? 'qn' : duration;
    const stemX = x + STEM_X_OFFSET;
    const stemTopY = y - STEM_HEIGHT;

    const displayLabel = labelText ?? syllable;
    const isVisible = showLabel !== undefined ? showLabel : Boolean(showSyllable);

    return (
        <g>
            {/* Stem */}
            <line
                x1={stemX}
                y1={y - 1}
                x2={stemX}
                y2={stemTopY}
                stroke={NOTE_COLOR}
                strokeWidth={STEM_WIDTH}
                strokeLinecap="butt"
            />

            {/* Engraved Tilted Oval Notehead */}
            <ellipse
                cx="0"
                cy="0"
                rx="5.7"
                ry="3.9"
                transform={`translate(${x}, ${y}) rotate(-28)`}
                fill={color}
            />

            {/* Augmentation Dot for Dotted Notes (placed in upper space above the staff line) */}
            {isDotted && (
                <AugmentationDot cx={x + 11.5} cy={y - 5.2} fill={color} />
            )}

            {/* Engraved Calligraphic Single Flag (8th Note) */}
            {flagged && baseDuration === '8n' && (
                <path
                    d="M 0,0
                       C 0.5,2.2 4.2,4.2 6.8,7.4
                       C 9.2,10.4 9.6,14.5 7.4,18.8
                       C 6.9,19.6 6.2,19.3 6.5,18.4
                       C 7.8,14.6 7.1,11.0 4.5,8.4
                       C 2.8,6.7 1.2,5.8 0,5.4 Z"
                    fill={NOTE_COLOR}
                    transform={`translate(${stemX - 0.3}, ${stemTopY})`}
                />
            )}

            {/* Engraved Calligraphic Double Flag (16th Note) */}
            {flagged && baseDuration === '16n' && (
                <g transform={`translate(${stemX - 0.3}, ${stemTopY})`} fill={NOTE_COLOR}>
                    <path
                        d="M 0,0
                           C 0.5,2.0 4.2,3.8 6.8,6.8
                           C 9.0,9.4 9.4,13.0 7.5,16.8
                           C 7.0,17.5 6.3,17.2 6.6,16.4
                           C 7.8,13.0 7.1,9.8 4.5,7.5
                           C 2.8,6.0 1.2,5.2 0,4.8 Z"
                    />
                    <path
                        d="M 0,6.8
                           C 0.5,8.8 4.2,10.6 6.8,13.6
                           C 9.0,16.2 9.4,19.8 7.5,23.6
                           C 7.0,24.3 6.3,24.0 6.6,23.2
                           C 7.8,19.8 7.1,16.6 4.5,14.3
                           C 2.8,12.8 1.2,12.0 0,11.6 Z"
                    />
                </g>
            )}

            {/* Written Rhythm Text (1e&a or Syllable) Underneath Note */}
            {isVisible && displayLabel && (
                <text
                    x={x}
                    y={y + 18.5}
                    fill={NOTE_COLOR}
                    opacity="0.96"
                    fontSize="13.5"
                    fontWeight="700"
                    textAnchor="middle"
                    letterSpacing="0.01em"
                >
                    {displayLabel}
                </text>
            )}
        </g>
    );
};

/**
 * Calligraphic Engraved Rests (modeled after SMuFL / Bravura music typography)
 */
const Rest: React.FC<{ x: number; y: number; duration: RestDuration }> = ({ x, y, duration }) => {
    switch (duration) {
        case 'wr':
            // Whole Rest: solid engraved block hanging directly below the staff line with subtle reference ledger
            return (
                <g transform={`translate(${x}, ${y})`}>
                    <line x1="-10" y1="0" x2="10" y2="0" stroke={NOTE_COLOR} strokeWidth="1.6" opacity="0.7" />
                    <rect x="-6.5" y="0" width="13" height="5" fill={NOTE_COLOR} rx="0.6" />
                </g>
            );

        case 'qr':
            // Quarter Rest: authentic calligraphic Bravura-style silhouette (top right-slant, thick middle slash, bottom C-crook)
            return (
                <g transform={`translate(${x}, ${y})`}>
                    <path
                        d="M -1.6,-13.2
                           L 4.3,-5.5
                           C 4.7,-5.0 4.6,-4.3 4.0,-3.7
                           C 1.7,-1.5 -0.6,0.5 -0.6,2.1
                           C -0.6,3.5 1.1,5.0 4.1,7.3
                           C 4.5,7.6 4.4,8.2 3.8,8.2
                           C 1.7,7.1 -0.8,7.3 -1.6,9.0
                           C -2.3,10.5 -1.1,12.2 0.4,13.3
                           C 0.7,13.5 0.3,14.0 -0.2,13.8
                           C -3.4,12.4 -5.3,9.5 -4.2,6.7
                           C -3.3,4.5 -0.8,4.2 1.3,5.3
                           L -4.0,0.4
                           C -4.5,-0.1 -4.4,-0.7 -3.8,-1.3
                           C -1.4,-3.6 0.8,-5.6 0.8,-7.3
                           C 0.8,-8.7 -0.6,-10.4 -2.5,-12.4
                           C -2.9,-12.8 -2.2,-13.6 -1.6,-13.2 Z"
                        fill={NOTE_COLOR}
                    />
                </g>
            );

        case '8r':
        case '8rd':
            // Eighth Rest: round crook-bulb on upper left, swooping hook to upper right, diagonal slash stem down-left
            return (
                <g transform={`translate(${x}, ${y})`}>
                    {/* Diagonal slash stem slanting down-left */}
                    <path
                        d="M 3.4,-8.2 L 5.0,-7.6 L -1.2,9.8 L -2.9,9.2 Z"
                        fill={NOTE_COLOR}
                    />
                    {/* Swooping crook arm connecting bulb to top of stem */}
                    <path
                        d="M -2.2,-3.2
                           C 0.4,-2.6 2.6,-4.4 4.2,-7.6
                           L 3.4,-8.2
                           C 1.8,-5.6 -0.2,-4.5 -2.0,-5.2 Z"
                        fill={NOTE_COLOR}
                    />
                    {/* Engraved round bulb */}
                    <ellipse
                        cx="-2.5"
                        cy="-5.5"
                        rx="2.55"
                        ry="2.25"
                        transform="rotate(-18 -2.5 -5.5)"
                        fill={NOTE_COLOR}
                    />
                    {/* Augmentation Dot for Dotted Eighth Rest (in upper space above staff line) */}
                    {duration === '8rd' && (
                        <AugmentationDot cx={8.8} cy={-5.2} fill={NOTE_COLOR} />
                    )}
                </g>
            );

        case '16r':
            // Sixteenth Rest: two stacked crook-bulbs on the left + longer diagonal slash stem down-left
            return (
                <g transform={`translate(${x}, ${y})`}>
                    {/* Diagonal slash stem slanting down-left */}
                    <path
                        d="M 4.2,-10.6 L 5.8,-10.0 L -1.8,12.2 L -3.5,11.6 Z"
                        fill={NOTE_COLOR}
                    />
                    {/* Upper crook arm & bulb */}
                    <path
                        d="M -1.5,-5.8
                           C 1.0,-5.2 3.2,-7.0 4.9,-10.0
                           L 4.1,-10.6
                           C 2.5,-8.1 0.5,-7.0 -1.3,-7.7 Z"
                        fill={NOTE_COLOR}
                    />
                    <ellipse
                        cx="-1.8"
                        cy="-8.0"
                        rx="2.45"
                        ry="2.15"
                        transform="rotate(-18 -1.8 -8.0)"
                        fill={NOTE_COLOR}
                    />
                    {/* Lower crook arm & bulb */}
                    <path
                        d="M -3.5,0.4
                           C -1.0,1.0 1.2,-0.8 2.8,-3.8
                           L 2.0,-4.4
                           C 0.4,-1.9 -1.6,-0.8 -3.3,-1.5 Z"
                        fill={NOTE_COLOR}
                    />
                    <ellipse
                        cx="-3.8"
                        cy="-1.8"
                        rx="2.45"
                        ry="2.15"
                        transform="rotate(-18 -3.8 -1.8)"
                        fill={NOTE_COLOR}
                    />
                </g>
            );

        default:
            return null;
    }
};

const BeamGroupRenderer: React.FC<{
    group: BeamGroup;
    staffY: number;
    getStepX: (step: number) => number;
}> = ({ group, staffY, getStepX }) => {
    const primaryY = staffY - STEM_HEIGHT;
    const secondaryY = primaryY + BEAM_SPACING;
    const x1 = getStepX(group.startStep) + STEM_X_OFFSET;
    const x2 = getStepX(group.endStep) + STEM_X_OFFSET;
    const stubLength = 11;

    return (
        <g>
            {/* Primary (8th-note level) beam across the entire beat group */}
            <rect
                x={x1 - STEM_WIDTH / 2}
                y={primaryY}
                width={Math.max(1, x2 - x1 + STEM_WIDTH)}
                height={BEAM_THICKNESS}
                fill={NOTE_COLOR}
                rx="0.4"
            />

            {/* Secondary (16th-note level) full or fractional stub beams */}
            {group.secondarySegments.map((seg, idx) => {
                if (seg.stubDirection === 'right') {
                    const sx = getStepX(seg.startStep) + STEM_X_OFFSET - STEM_WIDTH / 2;
                    return (
                        <rect
                            key={idx}
                            x={sx}
                            y={secondaryY}
                            width={stubLength}
                            height={BEAM_THICKNESS}
                            fill={NOTE_COLOR}
                            rx="0.4"
                        />
                    );
                }
                if (seg.stubDirection === 'left') {
                    const ex = getStepX(seg.endStep) + STEM_X_OFFSET + STEM_WIDTH / 2;
                    return (
                        <rect
                            key={idx}
                            x={ex - stubLength}
                            y={secondaryY}
                            width={stubLength}
                            height={BEAM_THICKNESS}
                            fill={NOTE_COLOR}
                            rx="0.4"
                        />
                    );
                }
                const sx = getStepX(seg.startStep) + STEM_X_OFFSET - STEM_WIDTH / 2;
                const ex = getStepX(seg.endStep) + STEM_X_OFFSET + STEM_WIDTH / 2;
                return (
                    <rect
                        key={idx}
                        x={sx}
                        y={secondaryY}
                        width={Math.max(1, ex - sx)}
                        height={BEAM_THICKNESS}
                        fill={NOTE_COLOR}
                        rx="0.4"
                    />
                );
            })}
        </g>
    );
};

// --- MAIN VISUALIZER COMPONENT ---

interface NotationVisualizerProps {
    isActive: boolean;
    grid: Grid;
    instrumentColors: string[];
    beatsPerMeasure: number;
    notationTextMode?: NotationTextMode;
    onNotationTextModeChange?: (mode: NotationTextMode) => void;
    showRhythmSyllables?: boolean;
    onToggleRhythmSyllables?: () => void;
}

const NotationVisualizer: React.FC<NotationVisualizerProps> = ({
    isActive,
    grid,
    instrumentColors,
    beatsPerMeasure,
    notationTextMode: controlledTextMode,
    onNotationTextModeChange,
    showRhythmSyllables: controlledShowSyllables,
    onToggleRhythmSyllables,
}) => {
    const [internalTextMode, setInternalTextMode] = useState<NotationTextMode>(() => {
        const saved = safeGetItem('cl607-notationTextMode');
        if (saved === 'subdivisions' || saved === 'syllables' || saved === 'off') {
            return saved;
        }
        return 'syllables';
    });

    const currentTextMode: NotationTextMode = controlledTextMode !== undefined
        ? controlledTextMode
        : controlledShowSyllables !== undefined
        ? (controlledShowSyllables ? 'syllables' : 'off')
        : internalTextMode;

    const handleSetTextMode = (mode: NotationTextMode) => {
        if (onNotationTextModeChange) {
            onNotationTextModeChange(mode);
        } else {
            setInternalTextMode(mode);
            safeSetItem('cl607-notationTextMode', mode);
        }
        if (onToggleRhythmSyllables && (mode === 'syllables' || mode === 'off')) {
            onToggleRhythmSyllables();
        }
    };

    const numSteps = beatsPerMeasure * 4;
    const stepWidth = NOTES_WIDTH / numSteps;

    const getStepX = (step: number) => NOTES_START_X + (step + 0.42) * stepWidth;

    const processedNotation = useMemo(() => {
        if (!isActive) return [];
        return INSTRUMENTS.map((_, instrumentIndex) =>
            parseGridToNotation(
                grid[instrumentIndex] || [],
                instrumentColors[instrumentIndex],
                beatsPerMeasure
            )
        );
    }, [isActive, grid, instrumentColors, beatsPerMeasure]);

    if (!isActive) {
        return <div className="h-48 bg-gray-900/50 rounded-md w-full" />;
    }

    return (
        <div className="notation-visualizer bg-gray-900/50 rounded-lg w-full overflow-hidden p-2 sm:p-3 flex flex-col gap-2">
            {/* Notation Rhythm Text Selector Bar (1e&a / ta ti ti / off) */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1.5 border-b border-gray-700/40">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        Notation Text:
                    </span>
                    <div className="inline-flex rounded-md bg-gray-800/80 p-0.5 border border-gray-700/60" role="group" aria-label="Notation rhythm text display">
                        <button
                            type="button"
                            onClick={() => handleSetTextMode('subdivisions')}
                            aria-pressed={currentTextMode === 'subdivisions'}
                            className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                                currentTextMode === 'subdivisions'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            1 e &amp; a
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSetTextMode('syllables')}
                            aria-pressed={currentTextMode === 'syllables'}
                            className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                                currentTextMode === 'syllables'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            ta ti ti
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSetTextMode('off')}
                            aria-pressed={currentTextMode === 'off'}
                            className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                                currentTextMode === 'off'
                                    ? 'bg-gray-700 text-gray-200 shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Off
                        </button>
                    </div>
                </div>

                {currentTextMode === 'syllables' && (
                    <span className="hidden sm:inline-block text-xs font-mono text-gray-300">
                        quarter = ta · eighth = ti · dotted quarter = ta-i · sixteenth = ti-ki
                    </span>
                )}
                {currentTextMode === 'subdivisions' && (
                    <span className="hidden sm:inline-block text-xs font-mono text-gray-300">
                        subdivisions = 1 e &amp; a · 2 e &amp; a · 3 e &amp; a · 4 e &amp; a
                    </span>
                )}
            </div>

            <svg
                viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                className="w-full h-auto select-none"
                role="img"
                aria-label="Rhythmic notation score"
            >
                {/* Top Beat Header Markers & Vertical Beat Subdivision Guides */}
                {Array.from({ length: beatsPerMeasure }).map((_, beatIdx) => {
                    const beatStartStep = beatIdx * 4;
                    const beatDividerX = NOTES_START_X + beatStartStep * stepWidth;
                    const beatNumberX = getStepX(beatStartStep);

                    return (
                        <g key={`beat-guide-${beatIdx}`}>
                            {/* Beat Number Header */}
                            <text
                                x={beatNumberX}
                                y={17}
                                fill={NOTE_COLOR}
                                opacity="0.65"
                                fontSize="11.5"
                                fontWeight="700"
                                textAnchor="middle"
                                letterSpacing="0.08em"
                            >
                                BEAT {beatIdx + 1}
                            </text>

                            {/* Internal Beat Divider Line (for Beats 2..N) */}
                            {beatIdx > 0 && (
                                <line
                                    x1={beatDividerX}
                                    y1={TOP_PADDING + 8}
                                    x2={beatDividerX}
                                    y2={VIEWBOX_HEIGHT - BOTTOM_PADDING - 8}
                                    stroke={STAFF_COLOR}
                                    strokeWidth="1"
                                    strokeDasharray="3,4"
                                    opacity="0.45"
                                />
                            )}
                        </g>
                    );
                })}

                {/* System Left Spine Connecting All Staves */}
                <line
                    x1={START_X}
                    y1={TOP_PADDING + STAFF_HEIGHT / 2 - 14}
                    x2={START_X}
                    y2={TOP_PADDING + STAFF_HEIGHT * (INSTRUMENTS.length - 1) + STAFF_HEIGHT / 2 + 14}
                    stroke={STAFF_COLOR}
                    strokeWidth="2.2"
                />

                {INSTRUMENTS.map((instrument, instrumentIndex) => {
                    const staffY = TOP_PADDING + STAFF_HEIGHT * instrumentIndex + STAFF_HEIGHT / 2 + 2;
                    const { notation, beams, beamedSteps } = processedNotation[instrumentIndex];
                    const instColor = instrumentColors[instrumentIndex];

                    return (
                        <g key={instrument}>
                            {/* Instrument Label & Color Swatch Dot */}
                            <circle
                                cx="14"
                                cy={staffY}
                                r="3.5"
                                fill={instColor}
                            />
                            <text
                                x={START_X - 10}
                                y={staffY + 4}
                                fill={NOTE_COLOR}
                                opacity="0.9"
                                fontSize="11.5"
                                fontWeight="700"
                                textAnchor="end"
                                letterSpacing="0.05em"
                            >
                                {INSTRUMENT_LABELS[instrument]}
                            </text>

                            {/* Horizontal Percussion Staff Line */}
                            <line
                                x1={START_X}
                                y1={staffY}
                                x2={END_X}
                                y2={staffY}
                                stroke={STAFF_COLOR}
                                strokeWidth="1.5"
                            />

                            {/* Subtle 16th-Step Tick Marks on Staff */}
                            {Array.from({ length: numSteps }).map((_, stepIdx) => {
                                const tickX = getStepX(stepIdx);
                                const isDownbeat = stepIdx % 4 === 0;
                                return (
                                    <line
                                        key={`tick-${stepIdx}`}
                                        x1={tickX}
                                        y1={staffY - (isDownbeat ? 4 : 2.2)}
                                        x2={tickX}
                                        y2={staffY + (isDownbeat ? 4 : 2.2)}
                                        stroke={STAFF_COLOR}
                                        strokeWidth={isDownbeat ? '1.2' : '0.8'}
                                        opacity={isDownbeat ? '0.45' : '0.22'}
                                    />
                                );
                            })}

                            {/* Percussion Clef & Time Signature on First Staff (Clef on all staves) */}
                            <PercussionClef x={START_X + 16} y={staffY} />
                            {instrumentIndex === 0 && (
                                <TimeSignature x={START_X + 38} y={staffY} beats={beatsPerMeasure} />
                            )}

                            {/* Start & End Repeat Barlines */}
                            <line
                                x1={START_X}
                                y1={staffY - 14}
                                x2={START_X}
                                y2={staffY + 14}
                                stroke={STAFF_COLOR}
                                strokeWidth="2.5"
                            />
                            {/* Double Final Repeat Barline */}
                            <line
                                x1={END_X - 5}
                                y1={staffY - 14}
                                x2={END_X - 5}
                                y2={staffY + 14}
                                stroke={STAFF_COLOR}
                                strokeWidth="1.5"
                            />
                            <line
                                x1={END_X}
                                y1={staffY - 14}
                                x2={END_X}
                                y2={staffY + 14}
                                stroke={STAFF_COLOR}
                                strokeWidth="4"
                            />
                            {/* Repeat Dots at End of Staff */}
                            <circle cx={END_X - 10} cy={staffY - 5} r="1.7" fill={STAFF_COLOR} />
                            <circle cx={END_X - 10} cy={staffY + 5} r="1.7" fill={STAFF_COLOR} />

                            {/* Render Notes and Rests */}
                            {notation.map((el, idx) => {
                                if (el.type === 'rest') {
                                    const x =
                                        el.duration === 'wr'
                                            ? NOTES_START_X + NOTES_WIDTH / 2
                                            : getStepX(el.step);
                                    return (
                                        <Rest
                                            key={`${instrument}-rest-${idx}`}
                                            x={x}
                                            y={staffY}
                                            duration={el.duration}
                                        />
                                    );
                                }

                                const x = getStepX(el.step);
                                const baseDuration = el.duration === '8nd' ? '8n' : el.duration === 'qnd' ? 'qn' : el.duration;
                                const isFlagged = baseDuration !== 'qn' && !beamedSteps.has(el.step);

                                const noteLabel = currentTextMode === 'syllables'
                                    ? el.syllable
                                    : currentTextMode === 'subdivisions'
                                    ? getStepSubdivisionText(el.step)
                                    : undefined;

                                return (
                                    <Note
                                        key={`${instrument}-note-${idx}`}
                                        x={x}
                                        y={staffY}
                                        color={el.color}
                                        duration={el.duration}
                                        flagged={isFlagged}
                                        labelText={noteLabel}
                                        showLabel={currentTextMode !== 'off'}
                                    />
                                );
                            })}

                            {/* Render Primary & Secondary Beams */}
                            {beams.map((beamGroup, idx) => (
                                <BeamGroupRenderer
                                    key={`${instrument}-beam-${idx}`}
                                    group={beamGroup}
                                    staffY={staffY}
                                    getStepX={getStepX}
                                />
                            ))}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default React.memo(NotationVisualizer);