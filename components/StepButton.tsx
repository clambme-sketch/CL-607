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
            default: return 'shadow-[inset_0_0_0_1px_rgba(200,220,255,0.28)]';
        }
    };

    const stepButtonClasses = `${getBaseClasses()} ${getRingClasses()} ${getShadowClasses()}`;
    
    const getActiveStyle = (): React.CSSProperties => {
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
            default:
                return {
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}`,
                };
        }
    };

    const activeStyle = getActiveStyle();

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
            default:
                return `${base} ${isActive ? 'text-gray-900' : 'text-gray-400'}`;
        }
    };

    return (
        <button
            data-instrument-index={instrumentIndex}
            data-step-index={stepIndex}
            className={stepButtonClasses}
            style={activeStyle}
            aria-label={`Step ${stepIndex + 1}`}
            aria-pressed={isActive}
        >
            {/* Style-Specific Tactile Hardware Details */}
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