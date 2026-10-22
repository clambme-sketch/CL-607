import React, { useState, useRef, useEffect } from 'react';
import { VisualizerStyle } from '../types';
import { getThemeSurface, getButtonStyle } from '../utils';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode | ((isOpen: boolean) => React.ReactNode);
    defaultOpen?: boolean;
    closedTitle?: string;
    dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
    sectionIndex?: number;
    onSectionPointerDown?: (e: React.PointerEvent<HTMLButtonElement>, index: number) => void;
    isDragging?: boolean;
    visualizerStyle?: VisualizerStyle;
    elevated?: boolean;
    onReset?: () => void;
    resetLabel?: string;
    hasChanges?: boolean;
}

const ChevronIcon: React.FC<{ open: boolean; visualizerStyle: VisualizerStyle }> = ({ open, visualizerStyle }) => {
    const colorClass =
        visualizerStyle === 'braun' || visualizerStyle === 'bauhaus'
            ? 'text-[#1c1c1a]'
            : visualizerStyle === 'cyberpunk'
            ? 'text-[#fcee0a]'
            : visualizerStyle === 'nagra'
            ? 'text-[#d9325e]'
            : visualizerStyle === 'koto'
            ? 'text-[#d4af37]'
            : visualizerStyle === 'default'
            ? 'text-[#a8dcff]'
            : 'text-gray-400';

    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            className={`w-5 h-5 ${colorClass} transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
    );
};

const SunsetCloudCrest: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <div aria-hidden="true" className="pointer-events-none select-none">
        {/* Billowing Cloud Puff Lobes along the top crown of the menu */}
        <span className="absolute -top-3 left-8 w-20 h-8 rounded-full bg-gradient-to-b from-white via-[#fff9f5] to-transparent border-t-2 border-white/95 z-0" />
        <span className="absolute -top-4 left-20 w-28 h-10 rounded-full bg-gradient-to-b from-white via-[#fff7f2] to-transparent border-t-2 border-white z-0" />
        <span className="absolute -top-2.5 left-44 w-20 h-7 rounded-full bg-gradient-to-b from-white/95 via-[#fff5ee] to-transparent border-t border-white/90 z-0 hidden sm:block" />
        <span className="absolute -top-3.5 right-24 w-26 h-9 rounded-full bg-gradient-to-b from-white via-[#fff7f2] to-transparent border-t-2 border-white/95 z-0 hidden md:block" />
        <span className="absolute -top-2.5 right-10 w-18 h-7 rounded-full bg-gradient-to-b from-white/95 via-[#fff5ee] to-transparent border-t border-white/90 z-0" />
        {/* Warm Sunset Under-Lit Cloud Horizon Glow (zero CSS filter blur) */}
        <span
            className={`absolute inset-x-8 bottom-0.5 h-2 rounded-full pointer-events-none ${
                isOpen ? 'opacity-90' : 'opacity-65'
            }`}
            style={{
                background: 'linear-gradient(90deg, rgba(255,148,102,0) 0%, rgba(255,110,90,0.28) 30%, rgba(255,180,100,0.38) 50%, rgba(232,67,147,0.24) 75%, rgba(255,148,102,0) 100%)',
            }}
        />
    </div>
);

const SunsetCloudEmblem: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <span aria-hidden="true" className="relative flex items-center justify-center w-9 h-7 flex-shrink-0">
        {/* Setting Sun Orb */}
        <span
            className={`absolute -top-0.5 right-1 w-4 h-4 rounded-full ${
                isOpen
                    ? 'bg-gradient-to-b from-[#fff394] via-[#ff9e44] to-[#ff4d5e] scale-110'
                    : 'bg-gradient-to-b from-[#ffe082] to-[#ff6b4a]'
            }`}
        />
        {/* Sculpted Cumulus Cloud Foreground */}
        <svg viewBox="0 0 36 24" className="relative z-10 w-8 h-6">
            <path
                d="M10 21h17.5a5.5 5.5 0 0 0 .8-10.94A7.5 7.5 0 0 0 14.1 8.2 6 6 0 0 0 5.5 14a5.5 5.5 0 0 0 4.5 7Z"
                fill="#fff4ec"
                stroke="#ffffff"
                strokeWidth="1.5"
            />
        </svg>
    </span>
);

const ResetConfirmButton: React.FC<{
    onReset: () => void;
    label?: string;
    visualizerStyle?: VisualizerStyle;
}> = ({ onReset, label = 'RESET', visualizerStyle = 'default' }) => {
    const [isConfirming, setIsConfirming] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Auto-cancel confirmation if user clicks outside
    useEffect(() => {
        if (!isConfirming) return;
        const handleOutsideClick = (e: MouseEvent | PointerEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && target.closest('.reset-confirm-btn')) return;
            setIsConfirming(false);
        };
        window.addEventListener('pointerdown', handleOutsideClick);
        return () => window.removeEventListener('pointerdown', handleOutsideClick);
    }, [isConfirming]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        e.preventDefault();

        if (!isConfirming) {
            setIsConfirming(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = window.setTimeout(() => {
                setIsConfirming(false);
            }, 4000);
        } else {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setIsConfirming(false);
            setIsSuccess(true);
            onReset();
            timeoutRef.current = window.setTimeout(() => {
                setIsSuccess(false);
            }, 1000);
        }
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.stopPropagation();
    };

    const currentLabel = isSuccess ? 'RESET!' : isConfirming ? 'CLICK TO CONFIRM' : label;
    const buttonVariant = isConfirming ? 'danger' : isSuccess ? 'primary' : 'secondary';

    return (
        <button
            type="button"
            onPointerDown={handlePointerDown}
            onClick={handleClick}
            className={`${getButtonStyle(
                visualizerStyle as VisualizerStyle,
                buttonVariant,
                isConfirming || isSuccess,
                false,
                `reset-confirm-btn hold-to-reset-btn relative overflow-hidden h-6 px-2.5 sm:px-3 text-[9px] sm:text-[10px] font-mono tracking-wider uppercase select-none cursor-pointer focus:outline-none flex items-center justify-center font-bold transition-all ${
                    isConfirming ? 'animate-pulse ring-1 ring-red-400' : ''
                }`
            )}`}
            title={isConfirming ? 'Click again to confirm reset' : 'Click to reset this section'}
            aria-label={currentLabel}
        >
            <span className="relative z-10 pointer-events-none font-bold">
                {currentLabel}
            </span>
        </button>
    );
};

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    defaultOpen = false,
    closedTitle,
    dragHandleProps,
    sectionIndex,
    onSectionPointerDown,
    isDragging = false,
    visualizerStyle = 'default' as VisualizerStyle,
    elevated = false,
    onReset,
    resetLabel = 'RESET',
    hasChanges = false,
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const hasDragSupport = Boolean(dragHandleProps || onSectionPointerDown !== undefined);

    const handleToggle = () => {
        if (hasDragSupport) {
            const pressStartTime = Date.now();
            const onPointerUp = () => {
                if (Date.now() - pressStartTime < 400) { 
                     setIsOpen(prev => !prev);
                }
                window.removeEventListener('pointerup', onPointerUp);
            };
            window.addEventListener('pointerup', onPointerUp, { once: true });
        } else {
             setIsOpen(!isOpen);
        }
    };
    
    const combinedPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        handleToggle();
        if (onSectionPointerDown !== undefined && sectionIndex !== undefined) {
            onSectionPointerDown(e, sectionIndex);
        } else {
            dragHandleProps?.onPointerDown?.(e);
        }
    };

    const displayTitle = !isOpen && closedTitle ? closedTitle : title;
    const surface = getThemeSurface(visualizerStyle);
    const isMinimal = visualizerStyle === 'minimal';
    const isSunset = visualizerStyle === 'nagra';
    
    const wrapperClasses = `
        relative draggable-section ${isSunset || isOpen ? 'overflow-visible' : 'overflow-hidden'} ${isSunset ? 'mt-2' : ''}
        ${surface.sectionCard}
        ${isDragging || elevated ? 'z-50' : isOpen ? 'z-20 hover:z-30 focus-within:z-40' : 'z-10'}
        ${isDragging ? 'opacity-75' : ''}
    `;

    return (
        <div className={wrapperClasses}>
            {/* Style-Specific Chassis / Cloud Details */}
            {isSunset && <SunsetCloudCrest isOpen={isOpen} />}

            {visualizerStyle === 'koto' && (
                <>
                    <span aria-hidden="true" className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-[#d4af37]/60 pointer-events-none" />
                    <span aria-hidden="true" className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-[#d4af37]/60 pointer-events-none" />
                    <span aria-hidden="true" className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-[#d4af37]/60 pointer-events-none" />
                    <span aria-hidden="true" className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-[#d4af37]/60 pointer-events-none" />
                </>
            )}

            {visualizerStyle === 'cyberpunk' && (
                <div aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-[#fcee0a] via-[#00ff9f] to-[#ff003c]" />
            )}

            <div
                {...(dragHandleProps as any)}
                onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest('.reset-confirm-btn') || (e.target as HTMLElement).closest('.hold-to-reset-btn')) {
                        return;
                    }
                    combinedPointerDown(e as unknown as React.PointerEvent<HTMLButtonElement>);
                }}
                onKeyDown={(e) => {
                    if ((e.target as HTMLElement).closest('.reset-confirm-btn') || (e.target as HTMLElement).closest('.hold-to-reset-btn')) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggle();
                    }
                }}
                role="button"
                tabIndex={0}
                className={`relative z-10 w-full flex items-center justify-between ${isMinimal ? 'px-4 py-3' : visualizerStyle === 'default' ? 'px-5 py-3.5' : 'p-4'} ${isMinimal ? 'hover:bg-[#141418]' : visualizerStyle === 'default' ? 'hover:bg-[#16345e]/45 rounded-t-2xl transition-colors' : ''} ${isSunset ? 'px-7 py-4 rounded-t-[38px]' : ''} text-left focus:outline-none cursor-pointer select-none ${isMinimal ? '' : 'transition-transform active:scale-[0.99]'} ${
                    visualizerStyle === 'bauhaus' && isOpen ? 'border-b-2 border-[#141413] bg-[#ebe4d5]/60' : ''
                } ${visualizerStyle === 'braun' && isOpen ? 'border-b border-[#d5d1c5]' : ''} ${
                    isSunset && isOpen ? 'border-b border-[#f7bba6]/65 bg-gradient-to-b from-white/60 to-[#ffe6d9]/35' : ''
                } ${
                    isMinimal && isOpen ? 'border-b border-[#222226] bg-[#111114]' : ''
                } ${
                    visualizerStyle === 'default' && isOpen ? 'border-b border-[#8ecaff]/18 bg-[#09182e]/50' : ''
                } ${
                    hasDragSupport ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
                aria-expanded={isOpen}
                aria-controls={`collapsible-content-${title.replace(/\s+/g, '-')}`}
            >
                <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0">
                    {visualizerStyle === 'braun' && (
                        <span
                            aria-hidden="true"
                            className={`w-2 h-2 rounded-full transition-colors ${isOpen ? 'bg-[#ea5b0c]' : 'bg-[#b8b4a8]'}`}
                        />
                    )}
                    {visualizerStyle === 'bauhaus' && (
                        <span
                            aria-hidden="true"
                            className={`w-3.5 h-3.5 border-2 border-[#141413] transition-colors ${isOpen ? 'bg-[#d62828]' : 'bg-[#f2b705]'}`}
                        />
                    )}
                    {isSunset && <SunsetCloudEmblem isOpen={isOpen} />}
                    {visualizerStyle === 'koto' && (
                        <span
                            aria-hidden="true"
                            className={`w-2 h-2 rounded-full border border-[#d4af37] transition-colors ${
                                isOpen ? 'bg-[#c83e2b]' : 'bg-transparent'
                            }`}
                        />
                    )}
                    {visualizerStyle === 'cyberpunk' && (
                        <span aria-hidden="true" className="text-xs font-['JetBrains_Mono'] text-[#00ff9f]">
                            [{isOpen ? '-' : '+'}]
                        </span>
                    )}
                    {isMinimal && (
                        <span
                            aria-hidden="true"
                            className={`w-1.5 h-1.5 ${isOpen ? 'bg-[#f4f4f5]' : 'bg-[#52525b]'}`}
                        />
                    )}
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${surface.sectionHeaderText}`}>
                        {displayTitle}
                    </h3>
                    {isOpen && onReset && hasChanges && (
                        <ResetConfirmButton
                            onReset={onReset}
                            label={resetLabel}
                            visualizerStyle={visualizerStyle}
                        />
                    )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Dieter Rams machined ventilation louvers */}
                    {visualizerStyle === 'braun' && (
                        <div aria-hidden="true" className="hidden sm:flex items-center gap-1 mr-1">
                            <span className="w-[2px] h-3 bg-[#c4c0b4] rounded-full" />
                            <span className="w-[2px] h-3 bg-[#c4c0b4] rounded-full" />
                            <span className="w-[2px] h-3 bg-[#c4c0b4] rounded-full" />
                            <span className="w-[2px] h-3 bg-[#c4c0b4] rounded-full" />
                        </div>
                    )}
                    {/* Sunset drifting cloud wisps */}
                    {isSunset && (
                        <div aria-hidden="true" className="hidden sm:flex items-center gap-1.5 mr-1">
                            <span className="w-6 h-2.5 rounded-full bg-gradient-to-b from-white to-[#ffd6c4] shadow-[0_1px_3px_rgba(217,50,94,0.18)]" />
                            <span className="w-4 h-2 rounded-full bg-gradient-to-b from-white to-[#ffc2ad] shadow-[0_1px_2px_rgba(217,50,94,0.15)]" />
                            <span className="w-2.5 h-2 rounded-full bg-gradient-to-b from-[#ffe28a] to-[#ff7b54] shadow-[0_0_6px_rgba(255,123,84,0.5)]" />
                        </div>
                    )}
                    {isMinimal ? (
                        <span aria-hidden="true" className="font-['IBM_Plex_Mono'] text-xs text-[#a1a1aa]">
                            {isOpen ? '—' : '+'}
                        </span>
                    ) : (
                        <ChevronIcon open={isOpen} visualizerStyle={visualizerStyle} />
                    )}
                </div>
            </div>
            {isOpen && (
                <div
                    id={`collapsible-content-${title.replace(/\s+/g, '-')}`}
                    className={isMinimal ? 'p-5' : 'p-6 pt-3'}
                >
                    {typeof children === 'function' ? children(isOpen) : children}
                </div>
            )}
        </div>
    );
};

export default React.memo(CollapsibleSection);
