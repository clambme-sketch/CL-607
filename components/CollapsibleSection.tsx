import React, { useState } from 'react';

interface CollapsibleSectionProps {
    title: string;
    children: (isOpen: boolean) => React.ReactNode;
    defaultOpen?: boolean;
    closedTitle?: string;
}

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 20 20" 
        fill="currentColor" 
        className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
    >
        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
);

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = false, closedTitle }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const displayTitle = !isOpen && closedTitle ? closedTitle : title;

    return (
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl overflow-hidden transition-all duration-300 shadow-lg ring-1 ring-white/10">
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between p-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-transform active:scale-[0.99]"
                aria-expanded={isOpen}
                aria-controls={`collapsible-content-${title.replace(/\s+/g, '-')}`}
            >
                <h3 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
                    {displayTitle}
                </h3>
                <ChevronIcon open={isOpen} />
            </button>
            <div
                id={`collapsible-content-${title.replace(/\s+/g, '-')}`}
                className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                {/* Consistent padding for all collapsible content */}
                <div className="p-6 pt-2">
                    {children(isOpen)}
                </div>
            </div>
        </div>
    );
};

export default CollapsibleSection;