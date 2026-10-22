import React from 'react';
import { VisualizerStyle } from '../types';

interface StepButtonProps {
    isActive: boolean;
    isPlayingStep: boolean;
    color: string;
    instrumentIndex: number;
    stepIndex: number;
    beatLabel?: string;
    visualizerStyle?: VisualizerStyle;
}

const COBALT_INSTRUMENT_GRADIENTS = [
    {
        // 0: KICK (Brightest top tier)
        off: 'linear-gradient(180deg, #387fd6 0%, #194582 100%)',
        downbeat: 'linear-gradient(180deg, #4894ef 0%, #215499 100%)',
    },
    {
        // 1: SNARE
        off: 'linear-gradient(180deg, #306fc4 0%, #163c73 100%)',
        downbeat: 'linear-gradient(180deg, #3f82d9 0%, #1d4a8a 100%)',
    },
    {
        // 2: SNAP
        off: 'linear-gradient(180deg, #2860b0 0%, #133365 100%)',
        downbeat: 'linear-gradient(180deg, #3571c4 0%, #19407a 100%)',
    },
    {
        // 3: HI-HAT
        off: 'linear-gradient(180deg, #21519c 0%, #102b57 100%)',
        downbeat: 'linear-gradient(180deg, #2c61b0 0%, #15376b 100%)',
    },
    {
        // 4: CLAVE
        off: 'linear-gradient(180deg, #1b4387 0%, #0d234a 100%)',
        downbeat: 'linear-gradient(180deg, #24529c 0%, #122e5d 100%)',
    },
    {
        // 5: COWBELL
        off: 'linear-gradient(180deg, #153673 0%, #0a1c3d 100%)',
        downbeat: 'linear-gradient(180deg, #1d4487 0%, #0f264f 100%)',
    },
    {
        // 6: SAMPLE (Deepest bottom tier — lifted slightly so hue-rotate stays clean and never muddy)
        off: 'linear-gradient(180deg, #102a5e 0%, #081632 100%)',
        downbeat: 'linear-gradient(180deg, #173673 0%, #0c2044 100%)',
    },
];

// Soft pastel cool-color rainbow palette for active pads in Default style (1 consistent color per instrument)
const PASTEL_COOL_RAINBOW_ACTIVE = [
    {
        // 0: KICK — Soft Pastel Ice Mint / Seafoam
        active: 'linear-gradient(180deg, #dcfff2 0%, #9df5d2 100%)',
        accent: '#42dca2',
    },
    {
        // 1: SNARE — Soft Pastel Aqua / Robin's Egg Cyan
        active: 'linear-gradient(180deg, #d8fcff 0%, #93eef7 100%)',
        accent: '#3ad4e6',
    },
    {
        // 2: SNAP — Soft Pastel Sky / Baby Blue
        active: 'linear-gradient(180deg, #dcefff 0%, #9ad1ff 100%)',
        accent: '#4db0ff',
    },
    {
        // 3: HI-HAT — Soft Pastel Cornflower / Periwinkle
        active: 'linear-gradient(180deg, #e2e4ff 0%, #a9b2ff 100%)',
        accent: '#7382ff',
    },
    {
        // 4: CLAVE — Soft Pastel Lavender / Cool Violet
        active: 'linear-gradient(180deg, #eee0ff 0%, #c6a8ff 100%)',
        accent: '#9c6eff',
    },
    {
        // 5: COWBELL — Soft Pastel Orchid / Cool Lilac-Pink
        active: 'linear-gradient(180deg, #f9dfff 0%, #e5a9ff 100%)',
        accent: '#cc6eff',
    },
    {
        // 6: SAMPLE — Soft Pastel Cotton-Candy Rose / Cool Pink
        active: 'linear-gradient(180deg, #ffe0f2 0%, #ffaad9 100%)',
        accent: '#ff70bf',
    },
];

const StepButton: React.FC<StepButtonProps> = ({
    isActive,
    isPlayingStep,
    color,
    instrumentIndex,
    stepIndex,
    beatLabel,
    visualizerStyle = 'default',
}) => {
    const isDownbeat = stepIndex % 4 === 0;
    const cobaltRow = COBALT_INSTRUMENT_GRADIENTS[instrumentIndex % COBALT_INSTRUMENT_GRADIENTS.length];
    const pastelCoolSlot = PASTEL_COOL_RAINBOW_ACTIVE[instrumentIndex % PASTEL_COOL_RAINBOW_ACTIVE.length];

    // Fast-path for Slow Computer / Dark Minimalist Masterpiece Mode:
    // Zero box-shadows, zero CSS transitions, zero decorative child spans.
    if (visualizerStyle === 'minimal') {
        const bgClass = isActive
            ? 'bg-[#f4f4f5]'
            : isDownbeat
            ? 'bg-[#141418] hover:bg-[#1c1c22]'
            : 'bg-[#0e0e11] hover:bg-[#18181d]';
        const borderClass = isPlayingStep
            ? 'border-[#ff3b1d]'
            : isActive
            ? 'border-[#f4f4f5]'
            : isDownbeat
            ? 'border-[#2e2e36]'
            : 'border-[#202026]';

        return (
            <button
                data-instrument-index={instrumentIndex}
                data-step-index={stepIndex}
                className={`relative w-full h-11 sm:h-12 rounded-none cursor-pointer border flex items-center justify-center ${bgClass} ${borderClass}`}
                style={
                    isActive
                        ? {
                              borderBottomWidth: '3px',
                              borderBottomColor: isPlayingStep ? '#ff3b1d' : color,
                          }
                        : undefined
                }
                aria-label={`Step ${stepIndex + 1}`}
                aria-pressed={isActive}
            >
                {beatLabel && (
                    <span
                        className={`text-xs font-['IBM_Plex_Mono'] pointer-events-none ${
                            isActive ? 'text-[#09090b] font-semibold' : isDownbeat ? 'text-[#a1a1aa]' : 'text-[#52525b]'
                        }`}
                    >
                        {beatLabel}
                    </span>
                )}
            </button>
        );
    }

    const getBaseClasses = () => {
        switch (visualizerStyle) {
            case 'cyberpunk':
                return `relative overflow-hidden w-full h-12 sm:h-14 rounded-none cursor-pointer border-2 transform flex items-center justify-center ${
                    !isActive
                        ? `bg-[#09090f] ${isDownbeat ? 'border-[#00ff9f]/60' : 'border-[#00ff9f]/25'} hover:bg-[#00ff9f]/10 hover:border-[#fcee0a]`
                        : 'border-[#050508] -translate-x-0.5 -translate-y-0.5'
                }`;
            case 'braun':
                return `relative overflow-hidden w-full h-12 sm:h-14 rounded-[5px] cursor-pointer border transform flex items-center justify-center ${
                    !isActive
                        ? `${isDownbeat ? 'bg-[#ebe8df]' : 'bg-[#f4f2ec]'} border-[#b8b4a8] hover:bg-white shadow-[0_2.5px_0_#a6a296,inset_0_1px_0_#ffffff] active:translate-y-[1.5px]`
                        : 'bg-[#282826] border-[#141413] translate-y-[1.5px] shadow-[0_0.5px_0_#8c887d,inset_0_2px_4px_rgba(0,0,0,0.6)]'
                }`;
            case 'bauhaus':
                return `relative overflow-hidden w-full h-12 sm:h-14 rounded-none cursor-pointer border-2 border-[#141413] transform flex items-center justify-center ${
                    !isActive
                        ? `${isDownbeat ? 'bg-[#efe8d8]' : 'bg-[#faf6ed]'} hover:bg-[#f2e8cf] shadow-[2.5px_2.5px_0px_#141413]`
                        : 'translate-x-[1.5px] translate-y-[1.5px] shadow-[1px_1px_0px_#141413]'
                }`;
            case 'nagra':
                return `relative overflow-hidden w-full h-12 sm:h-14 rounded-2xl cursor-pointer border transform flex items-center justify-center ${
                    !isActive
                        ? `${isDownbeat ? 'bg-gradient-to-b from-[#fffdfa] via-[#ffe6d8] to-[#f9c6b3] border-white' : 'bg-gradient-to-b from-[#ffffff] via-[#fff3eb] to-[#fbd8c9] border-white/95'} hover:border-[#ff9466] shadow-[0_2px_5px_rgba(68,20,76,0.14),inset_0_1.5px_0_#ffffff] active:translate-y-[1px]`
                        : 'border-white translate-y-[1px]'
                }`;
            case 'koto':
                return `relative overflow-hidden w-full h-12 sm:h-14 rounded-xl cursor-pointer border transform flex items-center justify-center ${
                    !isActive
                        ? `${isDownbeat ? 'bg-[#1c151f]' : 'bg-[#151018]'} border-[#d4af37]/30 hover:border-[#d4af37]/75 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(212,175,55,0.18)]`
                        : 'border-[#fae39c] translate-y-[1px]'
                }`;
            case 'default':
                // Modern Minimal Gallery Masterpiece: tactile rounded keycaps with luminous pastel active states
                return `relative overflow-hidden w-full h-12 sm:h-14 rounded-xl cursor-pointer border transition-all duration-150 active:scale-[0.97] flex items-center justify-center ${
                    !isActive
                        ? `${
                            isDownbeat
                                ? 'border-[#5a94d6]/55 hover:border-[#a8dcff] shadow-[0_2px_6px_rgba(3,10,24,0.3),inset_0_1px_0_rgba(214,238,255,0.18)]'
                                : 'border-[#28518a]/60 hover:border-[#78b8f0] shadow-[0_2px_5px_rgba(3,10,24,0.25),inset_0_1px_0_rgba(214,238,255,0.1)]'
                          }`
                        : 'border-white/85 shadow-[0_4px_12px_rgba(4,12,26,0.35),inset_0_1.5px_0_rgba(255,255,255,0.8)]'
                }`;
            case 'classic607':
            default:
                return `relative overflow-hidden w-full h-12 sm:h-14 rounded-md cursor-pointer border transform active:scale-[0.97] flex items-center justify-center ${
                    !isActive ? 'bg-black/25 hover:bg-black/50 border-white/10' : 'border-transparent'
                }`;
        }
    };

    const getRingClasses = () => {
        if (!isPlayingStep) return '';
        switch (visualizerStyle) {
            case 'cyberpunk': return 'outline outline-2 outline-offset-1 outline-[#fcee0a] z-20';
            case 'braun': return 'outline outline-2 outline-offset-1 outline-[#ea5b0c] z-20';
            case 'bauhaus': return 'outline outline-2 outline-offset-1 outline-[#d62828] z-20';
            case 'nagra': return 'outline outline-2 outline-offset-1 outline-[#ff5e4d] z-20';
            case 'koto': return 'outline outline-2 outline-offset-1 outline-[#d4af37] z-20';
            case 'default': return 'outline outline-2 outline-offset-1 outline-white z-20';
            case 'classic607':
            default: return 'outline outline-2 outline-offset-2 outline-cyan-300 z-20';
        }
    };

    const getShadowClasses = () => {
        if (!isDownbeat || isActive) return '';
        switch (visualizerStyle) {
            case 'cyberpunk': return 'shadow-[inset_0_0_0_1px_rgba(0,255,159,0.35)]';
            case 'braun': return '';
            case 'bauhaus': return '';
            case 'nagra': return '';
            case 'koto': return '';
            case 'default': return '';
            case 'classic607':
            default: return 'shadow-[inset_0_0_0_1px_rgba(200,220,255,0.28)]';
        }
    };

    const stepButtonClasses = `${getBaseClasses()} ${getRingClasses()} ${getShadowClasses()}`;
    
    const getButtonBackgroundStyle = (): React.CSSProperties => {
        if (visualizerStyle === 'default') {
            return {
                background: isActive
                    ? pastelCoolSlot.active
                    : isDownbeat
                    ? cobaltRow.downbeat
                    : cobaltRow.off,
            };
        }

        if (!isActive) return {};
        
        switch (visualizerStyle) {
            case 'cyberpunk':
                return {
                    backgroundColor: color,
                    boxShadow: '4px 4px 0px #00ff9f',
                };
            case 'braun':
                // In Dieter Rams style, the keycap body turns matte graphite while the circular dimple & LED lens carry the color
                return {};
            case 'bauhaus':
                return {
                    backgroundColor: color,
                    boxShadow: '1px 1px 0px #141413, inset 0 0 0 2px #141413',
                };
            case 'nagra':
                // In Sunset style, the cloud pad radiates with a golden-hour sunset gradient
                return {
                    background: `linear-gradient(180deg, #fff6cc 0%, ${color} 55%, #4a154b 100%)`,
                    boxShadow: `0 2px 4px ${color}44, inset 0 1.5px 1px rgba(255,255,255,0.85)`,
                };
            case 'koto':
                return {
                    background: `linear-gradient(180deg, ${color}cc 0%, #1d1420 95%)`,
                    boxShadow: `0 2px 4px ${color}44, inset 0 1px 1px rgba(255,245,210,0.55)`,
                };
            case 'classic607':
            default:
                return {
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}`,
                };
        }
    };

    const buttonInlineStyle = getButtonBackgroundStyle();

    const getLabelClasses = () => {
        const isMainBeat = beatLabel === '1' || beatLabel === '2' || beatLabel === '3' || beatLabel === '4';
        const base = `relative z-10 text-xs sm:text-sm pointer-events-none ${isMainBeat ? 'font-extrabold' : 'font-bold'}`;
        
        switch (visualizerStyle) {
            case 'cyberpunk':
                return `${base} font-['JetBrains_Mono'] uppercase ${isActive ? 'text-[#050508]' : 'text-[#00ff9f]/60'}`;
            case 'braun':
                return `${base} font-['Plus_Jakarta_Sans'] ${isActive ? 'text-[#faf8f5]' : 'text-[#52504a]'}`;
            case 'bauhaus':
                return `${base} font-['Outfit'] uppercase ${isActive ? 'text-[#141413] bg-[#faf6ed]/85 px-1 border border-[#141413]' : 'text-[#141413]/70'}`;
            case 'nagra':
                return `${base} font-['Plus_Jakarta_Sans'] ${isActive ? 'text-[#2d1038]' : 'text-[#6e3562]'}`;
            case 'koto':
                return `${base} font-['Cormorant_Garamond'] text-sm sm:text-base ${isActive ? 'text-[#fff9eb]' : 'text-[#b5a692]/75'}`;
            case 'default':
                return `relative z-10 text-xs font-['Plus_Jakarta_Sans'] pointer-events-none ${
                    isActive
                        ? 'text-[#061224] font-bold'
                        : isDownbeat
                        ? 'text-[#d8edff] font-semibold'
                        : 'text-[#7aa5d6] font-medium'
                }`;
            case 'classic607':
            default:
                return `${base} ${isActive ? 'text-gray-900' : 'text-gray-400'}`;
        }
    };

    return (
        <button
            data-instrument-index={instrumentIndex}
            data-step-index={stepIndex}
            className={stepButtonClasses}
            style={buttonInlineStyle}
            aria-label={`Step ${stepIndex + 1}`}
            aria-pressed={isActive}
        >
            {/* Style-Specific Tactile Hardware Details */}
            {visualizerStyle === 'default' && isActive && (
                /* Clean Rounded Pastel Horizon Bar when Active */
                <span
                    className="absolute bottom-1 inset-x-2 h-[2.5px] rounded-full pointer-events-none"
                    style={{ backgroundColor: pastelCoolSlot.accent }}
                />
            )}

            {visualizerStyle === 'braun' && (
                <>
                    {/* Top Recessed Circular LED Pip */}
                    <span
                        className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full pointer-events-none"
                        style={{
                            backgroundColor: isActive ? color : '#b8b4a8',
                            boxShadow: isActive ? `0 0 6px ${color}, inset 0 0.5px 1px #fff` : 'inset 0 1px 1px rgba(0,0,0,0.35)',
                        }}
                    />
                    {/* Molded Circular Finger Dimple */}
                    <span
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full pointer-events-none ${
                            isActive
                                ? 'border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.65)]'
                                : 'border border-black/[0.07] shadow-[inset_0_1.5px_2.5px_rgba(0,0,0,0.1),0_1px_0_rgba(255,255,255,0.85)]'
                        }`}
                    />
                </>
            )}

            {visualizerStyle === 'bauhaus' && (
                <>
                    {/* Geometric Corner Triangle on Downbeats */}
                    {isDownbeat && (
                        <span
                            className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
                            style={{
                                borderTop: `8px solid ${isActive ? '#141413' : '#d62828'}`,
                                borderRight: '8px solid transparent',
                            }}
                        />
                    )}
                    {/* Bottom Structural Bar when Active */}
                    {isActive && (
                        <span className="absolute bottom-1 left-1.5 right-1.5 h-1 bg-[#141413] pointer-events-none" />
                    )}
                </>
            )}

            {visualizerStyle === 'nagra' && (
                <>
                    {/* Setting Sun Orb Pip */}
                    <span
                        className={`absolute top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full pointer-events-none ${
                            isActive
                                ? 'bg-[#ffe885] shadow-[0_0_6px_#fff6cc]'
                                : isDownbeat
                                ? 'bg-[#ff7b54]'
                                : 'bg-[#f4b6a0]'
                        }`}
                    />
                    {/* Bottom Cloud Silhouette Crest */}
                    <span
                        className={`absolute bottom-1 inset-x-2 h-1.5 rounded-full pointer-events-none ${
                            isActive ? 'bg-white/40' : 'bg-white/75'
                        }`}
                    />
                </>
            )}

            {visualizerStyle === 'koto' && (
                <>
                    {/* Top Curved Lacquer Specular Highlight */}
                    <span className="absolute top-0.5 inset-x-2 h-1 rounded-full bg-white/10 pointer-events-none" />
                    {/* Maki-e Gold Horizon Bar / Downbeat Seal Dot */}
                    <span
                        className={`absolute bottom-1.5 pointer-events-none ${
                            isActive ? 'w-5 h-1 rounded-full bg-[#fae39c]' : isDownbeat ? 'w-1.5 h-1.5 rounded-full bg-[#c83e2b]/85' : 'w-3 h-[1px] bg-[#d4af37]/35'
                        }`}
                    />
                </>
            )}

            {visualizerStyle === 'cyberpunk' && (
                <>
                    {/* Top-right Cyber Telemetry Bar */}
                    <span
                        className={`absolute top-1 right-1 w-2.5 h-1 pointer-events-none ${
                            isActive ? 'bg-[#050508]' : isDownbeat ? 'bg-[#fcee0a]' : 'bg-[#00ff9f]/40'
                        }`}
                    />
                    {/* Bottom-left Corner Tick on Downbeats */}
                    {isDownbeat && !isActive && (
                        <span className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-[#fcee0a] pointer-events-none" />
                    )}
                </>
            )}

            {beatLabel && (
                <span className={`${getLabelClasses()} ${visualizerStyle === 'braun' ? 'absolute inset-0 flex items-center justify-center pt-1' : ''}`}>
                    {beatLabel}
                </span>
            )}
        </button>
    );
};

// Memoize the component to prevent re-renders unless its specific props change.
// This is critical for performance when the playhead is moving.
export default React.memo(StepButton);