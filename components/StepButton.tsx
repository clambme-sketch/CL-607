import React from 'react';

interface StepButtonProps {
    isActive: boolean;
    isPlayingStep: boolean;
    color: string;
    instrumentIndex: number;
    stepIndex: number;
}

const StepButton: React.FC<StepButtonProps> = ({
    isActive,
    isPlayingStep,
    color,
    instrumentIndex,
    stepIndex,
}) => {

    const stepButtonClasses = `
        w-full h-12 sm:h-14 rounded-md cursor-pointer transition-all duration-150 border transform active:scale-[0.97]
        ${!isActive ? 'bg-black/25 hover:bg-black/50 border-white/10' : 'border-transparent'}
        ${isPlayingStep ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-cyan-300' : ''}
    `;
    
    const activeStyle = isActive ? { backgroundColor: color, boxShadow: `0 0 9px ${color}` } : {};

    return (
        <button
            data-instrument-index={instrumentIndex}
            data-step-index={stepIndex}
            className={stepButtonClasses}
            style={activeStyle}
            aria-label={`Step ${stepIndex + 1}`}
            aria-pressed={isActive}
        />
    );
};

// Memoize the component to prevent re-renders unless its specific props change.
// This is critical for performance when the playhead is moving.
export default React.memo(StepButton);