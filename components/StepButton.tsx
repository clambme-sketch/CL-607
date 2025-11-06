import React from 'react';

interface StepButtonProps {
    isActive: boolean;
    isPlayingStep: boolean;
    color: string;
    instrumentIndex: number;
    stepIndex: number;
    beatLabel?: string;
}

const StepButton: React.FC<StepButtonProps> = ({
    isActive,
    isPlayingStep,
    color,
    instrumentIndex,
    stepIndex,
    beatLabel,
}) => {
    const isDownbeat = stepIndex % 4 === 0;

    const stepButtonClasses = `
        w-full h-12 sm:h-14 rounded-md cursor-pointer transition-all duration-150 border transform active:scale-[0.97]
        flex items-center justify-center
        ${!isActive ? 'bg-black/25 hover:bg-black/50 border-white/10' : 'border-transparent'}
        ${isPlayingStep ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-cyan-300' : ''}
        ${isDownbeat ? 'shadow-[0_0_5px_rgba(200,220,255,0.3)]' : ''}
    `;
    
    const activeStyle = isActive ? { backgroundColor: color, boxShadow: `${isDownbeat ? '0 0 5px rgba(200,220,255,0.3), ' : ''}0 0 9px ${color}` } : {};

    const labelClasses = `
        text-sm sm:text-base font-bold pointer-events-none transition-colors
        ${isActive ? 'text-gray-900' : 'text-gray-400'}
        ${beatLabel === '1' || beatLabel === '2' || beatLabel === '3' || beatLabel === '4' ? 'font-extrabold' : ''}
    `;

    return (
        <button
            data-instrument-index={instrumentIndex}
            data-step-index={stepIndex}
            className={stepButtonClasses}
            style={activeStyle}
            aria-label={`Step ${stepIndex + 1}`}
            aria-pressed={isActive}
        >
            {beatLabel && (
                <span className={labelClasses}>
                    {beatLabel}
                </span>
            )}
        </button>
    );
};

// Memoize the component to prevent re-renders unless its specific props change.
// This is critical for performance when the playhead is moving.
export default React.memo(StepButton);