import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
    children: React.ReactElement;
    text: string;
    isInteracting?: boolean;
    wrapperClassName?: string;
    placement?: 'top' | 'bottom';
}

const Tooltip: React.FC<TooltipProps> = ({ children, text, isInteracting = false, wrapperClassName, placement = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const handleMouseEnter = () => {
        if (isInteracting) return;
        // Delay showing the tooltip to avoid it flashing annoyingly
        timeoutRef.current = window.setTimeout(() => {
            setIsVisible(true);
        }, 500);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    // Hide tooltip immediately if interaction starts
    useEffect(() => {
        if (isInteracting) {
            setIsVisible(false);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }
    }, [isInteracting]);


    if (!text) {
        return children;
    }

    const tooltipClasses = `
        absolute w-max max-w-xs px-2.5 py-1.5 bg-black/80 text-white text-xs font-normal rounded-md shadow-lg z-50
        pointer-events-none transition-opacity duration-200
        ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
        ${isVisible && !isInteracting ? 'opacity-100' : 'opacity-0'}
    `;
    
    const arrow = placement === 'top' ? (
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-black/80"></div>
    ) : (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-black/80"></div>
    );

    return (
        <div 
            className={`relative inline-flex items-center justify-center ${wrapperClassName || ''}`}
            onMouseEnter={handleMouseEnter} 
            onMouseLeave={handleMouseLeave}
        >
            {children}
            <div 
                role="tooltip"
                className={tooltipClasses}
            >
                {text}
                {arrow}
            </div>
        </div>
    );
};

export default Tooltip;