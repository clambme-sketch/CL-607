import React, { useMemo } from 'react';
import { Grid } from '../types';
import { INSTRUMENTS, INSTRUMENT_LABELS } from '../constants';

// --- VISUAL CONSTANTS ---
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 400;
const STAFF_HEIGHT = VIEWBOX_HEIGHT / INSTRUMENTS.length;
const START_X = 40;
const END_X = VIEWBOX_WIDTH - 20;
const STAFF_WIDTH = END_X - START_X;

const NOTE_COLOR = "var(--note-color)";
const STAFF_COLOR = "var(--staff-color)";

// New constants for improved note shapes
const STEM_HEIGHT = 28; // Slightly longer stems
const STEM_WIDTH = 1.5;
const NOTE_HEAD_PATH = "M-5.2,1.5 C -6.2,5.5 1.8,6 4.2,2.5 C 5.2,-1.5 -0.8,-2 -3.2,1.5 Z"; // A more calligraphic note head shape
const STEM_X_OFFSET = 4.2; // The x-position of the stem relative to the note's center, based on the path above.

// --- Rhythmic Parsing Logic ---

type NoteElement = { type: 'note'; step: number; color: string; duration: '16n' | '8n' | 'qn' | '8nd'; };
type RestElement = { type: 'rest'; step: number; duration: '16r' | '8r' | 'qr' | 'hr' | 'wr' | '8rd'; };
type NotationElement = NoteElement | RestElement;
type Beam = { startStep: number; endStep: number; y: number; };

// This is the core logic. It converts a raw boolean grid into musically correct notation.
const parseGridToNotation = (grid: boolean[], color: string, beatsPerMeasure: number): { notation: NotationElement[], beams: Beam[] } => {
    const numSteps = beatsPerMeasure * 4;
    
    // Rule: Whole note rest for an entirely empty track
    if (!grid.some(step => step)) {
        return { notation: [{ type: 'rest', step: 0, duration: 'wr' }], beams: [] };
    }

    const notation: NotationElement[] = [];
    let i = 0;
    while (i < numSteps) {
        const b = (step: number) => grid[step] || false;

        const isFirstStepOfBeat = i % 4 === 0;

        // Apply special beat-level rules only at the start of a beat.
        if (isFirstStepOfBeat) {
             // NEW RULE: Dotted eighth note + sixteenth note (e.g., x . . x)
            if (b(i) && !b(i+1) && !b(i+2) && b(i+3)) {
                notation.push({ type: 'note', step: i, duration: '8nd', color });
                notation.push({ type: 'note', step: i+3, duration: '16n', color });
                i += 4;
                continue;
            }

            // NEW RULE: Dotted eighth rest + sixteenth note (e.g., . . . x)
            if (!b(i) && !b(i+1) && !b(i+2) && b(i+3)) {
                notation.push({ type: 'rest', step: i, duration: '8rd' });
                notation.push({ type: 'note', step: i+3, duration: '16n', color });
                i += 4;
                continue;
            }
            
            // Rule: Full beat rest
            if (!b(i) && !b(i + 1) && !b(i + 2) && !b(i + 3)) {
                notation.push({ type: 'rest', step: i, duration: 'qr' });
                i += 4;
                continue;
            }
            // Rule: Single note on downbeat is a quarter note
            if (b(i) && !b(i + 1) && !b(i + 2) && !b(i + 3)) {
                notation.push({ type: 'note', step: i, duration: 'qn', color });
                i += 4;
                continue;
            }
            // Rule: Eighth rest + eighth note for a note on step 3 of the beat
            if (!b(i) && !b(i + 1) && b(i + 2) && !b(i + 3)) {
                notation.push({ type: 'rest', step: i, duration: '8r' });
                notation.push({ type: 'note', step: i + 2, duration: '8n', color });
                i += 4;
                continue;
            }
        }

        // --- Fallback grouping for more complex rhythms ---
        
        // If we find two consecutive rests on a strong beat division, group them into an eighth rest.
        if (!b(i) && !b(i + 1) && (i % 2 === 0)) {
            notation.push({ type: 'rest', step: i, duration: '8r' });
            i += 2;
            continue;
        }

        // Default to 16th notes or rests for everything else.
        if (b(i)) {
            notation.push({ type: 'note', step: i, duration: '16n', color });
        } else {
            notation.push({ type: 'rest', step: i, duration: '16r' });
        }
        i++;
    }

    // --- Beaming logic: group consecutive 16th notes within each beat ---
    const beams: Beam[] = [];
    for (let beat = 0; beat < beatsPerMeasure; beat++) {
        const beatStart = beat * 4;
        const beatEnd = beatStart + 3;
        
        let currentBeam: NoteElement[] = [];
        const notesInBeat = notation.filter(el => el.type === 'note' && (el.duration === '16n' || el.duration === '8nd') && el.step >= beatStart && el.step <= beatEnd) as NoteElement[];
        
        for (let j = 0; j < notesInBeat.length; j++) {
            const note = notesInBeat[j];
            const nextNote = notesInBeat[j+1];

            // A dotted eighth note connects to a following 16th note.
            if (note.duration === '8nd' && nextNote && nextNote.duration === '16n' && nextNote.step === note.step + 3) {
                beams.push({
                    startStep: note.step,
                    endStep: nextNote.step,
                    y: 0,
                });
                continue; // Skip to next note after creating the beam
            }
            
            // Standard 16th note beaming
            if (note.duration === '16n' && nextNote && nextNote.duration === '16n' && nextNote.step === note.step + 1) {
                if(currentBeam.length === 0) currentBeam.push(note);
                currentBeam.push(nextNote);
            } else {
                if (currentBeam.length > 1) {
                    beams.push({
                        startStep: currentBeam[0].step,
                        endStep: currentBeam[currentBeam.length - 1].step,
                        y: 0,
                    });
                }
                currentBeam = [];
            }
        }
        if (currentBeam.length > 1) {
            beams.push({
                startStep: currentBeam[0].step,
                endStep: currentBeam[currentBeam.length - 1].step,
                y: 0,
            });
        }
    }

    return { notation, beams };
};

// --- SVG Components (High Quality Paths) ---

const PercussionClef: React.FC<{ y: number }> = ({ y }) => (
    <g transform={`translate(5, ${y}) scale(0.8)`}>
        <path d="M0 -15 L0 15" stroke={STAFF_COLOR} strokeWidth="3" />
        <path d="M-5 -10 L10 -10 M-5 10 L10 10" stroke={STAFF_COLOR} strokeWidth="5" />
    </g>
);

const Note: React.FC<{ x: number; y: number; color: string; duration: '16n' | '8n' | 'qn' | '8nd'; flagged: boolean }> = ({ x, y, color, duration, flagged }) => {
    const isDotted = duration === '8nd';
    const baseDuration = isDotted ? '8n' : duration;

    return (
        <g>
            <path d={NOTE_HEAD_PATH} transform={`translate(${x}, ${y})`} fill={color} />
            {isDotted && <circle cx={x + 10} cy={y + 3} r="2" fill={NOTE_COLOR} />}
            <line x1={x + STEM_X_OFFSET} y1={y} x2={x + STEM_X_OFFSET} y2={y - STEM_HEIGHT} stroke={NOTE_COLOR} strokeWidth={STEM_WIDTH} />
            
            {/* Single flag for 8th notes */}
            {flagged && baseDuration === '8n' && (
                <path
                    d="M0,0 C 5,2 9,6 5,16 C 8,13 8,6 0,3"
                    fill={NOTE_COLOR}
                    transform={`translate(${x + STEM_X_OFFSET}, ${y - STEM_HEIGHT})`}
                />
            )}
            
            {/* Double flag for 16th notes */}
            {flagged && baseDuration === '16n' && (
                <path
                    d="M0,0 C 5,2 9,6 5,16 C 8,13 8,6 0,3 M0,7 C 5,9 9,13 5,23 C 8,20 8,13 0,10"
                    fill={NOTE_COLOR}
                    transform={`translate(${x + STEM_X_OFFSET}, ${y - STEM_HEIGHT})`}
                />
            )}
        </g>
    );
};


const Rest: React.FC<{ x: number; y: number; duration: '16r' | '8r' | 'qr' | 'hr' | 'wr' | '8rd' }> = ({ x, y, duration }) => {
    switch (duration) {
        case 'wr': // Whole Rest - hangs from the line above center
            return <rect x={x - 10} y={y - 8} width="20" height="4" fill={NOTE_COLOR} rx="1" />;
        case 'hr': // Half Rest - sits on the center line
            return <rect x={x - 10} y={y - 4} width="20" height="4" fill={NOTE_COLOR} rx="1" />;
        case 'qr': // Quarter Rest - A sharper, modern "Z" shape that resembles a "3"
            return <path d="M-3.5,-12 L5,-6 L-5.5,1 L6,8 L-1,14" transform={`translate(${x}, ${y}) scale(0.9)`} stroke={NOTE_COLOR} strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />;
        case '8r': // Eighth Rest - A "backwards r" shape with a bulb and tail
            return <path d="M-3,-10 C-3,-14 4,-13 4,-8 C4,-3 0,-4 0,0 L6,10" transform={`translate(${x}, ${y})`} stroke={NOTE_COLOR} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
        case '8rd': // Dotted Eighth Rest
            return (
                 <g>
                    <path d="M-3,-10 C-3,-14 4,-13 4,-8 C4,-3 0,-4 0,0 L6,10" transform={`translate(${x}, ${y})`} stroke={NOTE_COLOR} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <circle cx={x + 9} cy={y + 6} r="2" fill={NOTE_COLOR} />
                </g>
            );
        case '16r': // Sixteenth Rest - A "backwards f" shape with two bulbs
            return <path d="M-3,-16 C-3,-20 4,-19 4,-14 C4,-9 0,-10 0,-6 M-3,-10 C-3,-14 4,-13 4,-8 C4,-3 0,-4 0,0 L6,10" transform={`translate(${x}, ${y})`} stroke={NOTE_COLOR} strokeWidth="2.5" fill="none" strokeLinecap="round" />;
        default: return null;
    }
};

const Beam: React.FC<{ x1: number; y1: number; x2: number; y2: number; isDotted?: boolean }> = ({ x1, y1, x2, y2, isDotted = false }) => {
    const beamWidth = 3.5;
    const beamSpacing = 5;

    // A dotted eighth beamed to a sixteenth
    if (isDotted) {
        const secondaryBeamLength = 10; // The length of the "flag" part of the beam
        return (
            <g>
                {/* Main beam connecting both notes */}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={NOTE_COLOR} strokeWidth={beamWidth} strokeLinecap="butt" />
                {/* Secondary beam attached to the 16th note's stem to show it's a 16th */}
                {/* It starts at the 16th note's stem (x2) and goes left. Since y1 and y2 are the same, we can use either. */}
                <line x1={x2} y1={y2 + beamSpacing} x2={x2 - secondaryBeamLength} y2={y2 + beamSpacing} stroke={NOTE_COLOR} strokeWidth={beamWidth} strokeLinecap="butt" />
            </g>
        );
    }

    // Double beam for 16ths
    return (
        <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={NOTE_COLOR} strokeWidth={beamWidth} strokeLinecap="butt" />
            <line x1={x1} y1={y1 + beamSpacing} x2={x2} y2={y2 + beamSpacing} stroke={NOTE_COLOR} strokeWidth={beamWidth} strokeLinecap="butt" />
        </g>
    );
};

// --- MAIN VISUALIZER COMPONENT ---

interface NotationVisualizerProps {
    isActive: boolean;
    grid: Grid;
    instrumentColors: string[];
    beatsPerMeasure: number;
}

const NotationVisualizer: React.FC<NotationVisualizerProps> = ({ isActive, grid, instrumentColors, beatsPerMeasure }) => {
    const numSteps = beatsPerMeasure * 4;
    const STEP_WIDTH = STAFF_WIDTH / numSteps;

    const processedNotation = useMemo(() => {
        return INSTRUMENTS.map((_, instrumentIndex) => {
            const { notation, beams } = parseGridToNotation(grid[instrumentIndex] || [], instrumentColors[instrumentIndex], beatsPerMeasure);
            const beamedSteps = new Set<number>();
            beams.forEach(b => {
                for (let s = b.startStep; s <= b.endStep; s++) {
                    beamedSteps.add(s);
                }
            });
            return { notation, beams, beamedSteps };
        });
    }, [grid, instrumentColors, beatsPerMeasure]);
    
    if (!isActive) {
        return <div className="h-48 bg-gray-900 rounded-md w-full" />;
    }

    return (
        <div className="notation-visualizer bg-gray-900 rounded-md w-full overflow-hidden">
            <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="w-full h-auto">
                {INSTRUMENTS.map((instrument, instrumentIndex) => {
                    const staffY = STAFF_HEIGHT * instrumentIndex + STAFF_HEIGHT / 2;
                    const { notation, beams, beamedSteps } = processedNotation[instrumentIndex];

                    return (
                        <g key={instrument}>
                            {/* Staff Line and Labels */}
                            <line x1={START_X} y1={staffY} x2={END_X} y2={staffY} stroke={STAFF_COLOR} strokeWidth="1.5" />
                            <text x="35" y={staffY + 5} fill="var(--note-color)" opacity="0.6" fontSize="12" fontWeight="bold" textAnchor="end">
                                {INSTRUMENT_LABELS[instrument]}
                            </text>

                            {/* Clef for the first staff */}
                            {instrumentIndex === 0 && (
                                <PercussionClef y={staffY} />
                            )}
                            
                            {/* Bar Lines */}
                            <line x1={START_X} y1={staffY-15} x2={START_X} y2={staffY+15} stroke={STAFF_COLOR} strokeWidth="2" />
                            <line x1={END_X} y1={staffY-15} x2={END_X} y2={staffY+15} stroke={STAFF_COLOR} strokeWidth="4" />

                            {/* Render Notation */}
                            {notation.map((el, idx) => {
                                let x;
                                if (el.type === 'rest') {
                                    switch (el.duration) {
                                        case 'wr':
                                            x = START_X + STAFF_WIDTH / 2;
                                            break;
                                        case 'hr':
                                            x = START_X + (el.step * STEP_WIDTH) + (4 * STEP_WIDTH); // Center of 8 steps
                                            break;
                                        case 'qr':
                                            x = START_X + el.step * STEP_WIDTH + (STEP_WIDTH * 2);
                                            break;
                                        case '8rd':
                                            // Center the rest part over the first two 16th slots
                                            x = START_X + el.step * STEP_WIDTH + STEP_WIDTH;
                                            break;
                                        default:
                                            x = START_X + el.step * STEP_WIDTH + (STEP_WIDTH / 2);
                                    }
                                } else {
                                     x = START_X + el.step * STEP_WIDTH + (STEP_WIDTH / 2);
                                }

                                if (el.type === 'note') {
                                    const isDotted = el.duration === '8nd';
                                    const baseDuration = isDotted ? '8n' : el.duration;
                                    const isFlagged = baseDuration !== 'qn' && !beamedSteps.has(el.step);
                                    return <Note key={`${instrument}-${idx}`} x={x} y={staffY} color={el.color} duration={el.duration} flagged={isFlagged} />;
                                } else {
                                    return <Rest key={`${instrument}-${idx}`} x={x} y={staffY} duration={el.duration} />;
                                }
                            })}

                            {/* Render Beams */}
                            {beams.map((beam, idx) => {
                                const startNote = notation.find(n => n.step === beam.startStep) as NoteElement;
                                const isDottedBeam = startNote && startNote.duration === '8nd';
                                
                                const x1 = START_X + beam.startStep * STEP_WIDTH + STEP_WIDTH / 2 + STEM_X_OFFSET;
                                const y1 = staffY - STEM_HEIGHT;
                                const x2 = START_X + beam.endStep * STEP_WIDTH + STEP_WIDTH / 2 + STEM_X_OFFSET;
                                const y2 = staffY - STEM_HEIGHT;
                                return <Beam key={`${instrument}-beam-${idx}`} x1={x1} y1={y1} x2={x2} y2={y2} isDotted={isDottedBeam}/>;
                            })}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default React.memo(NotationVisualizer);