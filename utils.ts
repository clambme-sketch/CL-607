import { VisualizerStyle } from './types';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';

export const getButtonStyle = (
    visualizerStyle: VisualizerStyle,
    variant: ButtonVariant = 'primary',
    isActive: boolean = false,
    isDisabled: boolean = false,
    extraClasses: string = ''
) => {
    const baseClasses = "flex items-center justify-center font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed uppercase tracking-wider select-none";
    
    let styleClasses = "";
    
    if (visualizerStyle === 'neon') {
        // Neon style: Deep purple/black background, bright cyan/magenta glows
        const ringColor = variant === 'danger' ? 'ring-pink-500' : variant === 'success' ? 'ring-emerald-500' : 'ring-cyan-400';
        const bgColor = 'bg-[#090514]';
        const borderColor = variant === 'danger' ? 'border-pink-500' : variant === 'success' ? 'border-emerald-500' : 'border-cyan-400';
        const textColor = variant === 'danger' ? 'text-pink-400' : variant === 'success' ? 'text-emerald-400' : 'text-cyan-300';
        const hoverBg = 'hover:bg-[#1a0b2e]';
        const activeShadow = variant === 'danger' ? 'shadow-[0_0_15px_rgba(236,72,153,0.8)]' : variant === 'success' ? 'shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'shadow-[0_0_15px_rgba(34,211,238,0.8)]';
        
        styleClasses = `border ${borderColor} ${bgColor} ${textColor} ${hoverBg} focus:ring-offset-[#090514] ${ringColor} rounded-md shadow-[0_0_5px_currentColor]`;
        
        if (isActive) {
            styleClasses += ` bg-[#1a0b2e] text-white ${activeShadow} border-2`;
        }
        if (isDisabled) {
            styleClasses = `border border-gray-800 bg-[#05020a] text-gray-700 rounded-md`;
        }
    } else if (visualizerStyle === 'minimal') {
        // Minimal style: Pure white/black, thin borders, sleek
        const bgColor = variant === 'danger' ? 'bg-red-50' : variant === 'success' ? 'bg-green-50' : isActive ? 'bg-black' : 'bg-white';
        const textColor = variant === 'danger' ? 'text-red-600' : variant === 'success' ? 'text-green-600' : isActive ? 'text-white' : 'text-black';
        const hoverBg = variant === 'danger' ? 'hover:bg-red-100' : variant === 'success' ? 'hover:bg-green-100' : isActive ? 'hover:bg-gray-900' : 'hover:bg-gray-50';
        const borderColor = isActive ? 'border-black' : 'border-gray-200';
        
        styleClasses = `${bgColor} ${textColor} ${hoverBg} border ${borderColor} focus:ring-offset-white focus:ring-black rounded-sm tracking-widest text-xs`;
        
        if (isDisabled) {
            styleClasses = `bg-gray-50 text-gray-300 border-gray-100 rounded-sm`;
        }
    } else if (visualizerStyle === 'retro') {
        // Retro style: TR-808 inspired, cream/orange/red, plastic look
        const isPrimary = variant === 'primary';
        const isDanger = variant === 'danger';
        
        const bgColor = isDanger ? 'bg-[#ff3300]' : isPrimary ? 'bg-[#ff7700]' : isActive ? 'bg-[#ffcc00]' : 'bg-[#f4f4e8]';
        const textColor = (isDanger || isPrimary) && !isActive ? 'text-white' : 'text-[#222]';
        const hoverBg = isDanger ? 'hover:bg-[#ff4411]' : isPrimary ? 'hover:bg-[#ff8811]' : isActive ? 'hover:bg-[#ffdd22]' : 'hover:bg-[#ffffff]';
        const borderStyle = `border-2 border-b-4 border-r-4 border-[#d0d0c0]`;
        
        styleClasses = `${bgColor} ${textColor} ${hoverBg} ${borderStyle} focus:ring-offset-[#2b2b2b] focus:ring-[#ff7700] rounded-sm font-sans font-bold shadow-sm`;
        
        if (isActive) {
            styleClasses += ` border-b-2 border-r-2 translate-y-[2px] translate-x-[2px] border-[#a0a090]`;
        }
        if (isDisabled) {
            styleClasses = `bg-[#d0d0c0] text-[#888] border-2 border-b-4 border-r-4 border-[#b0b0a0] rounded-sm font-sans font-bold`;
        }
    } else if (visualizerStyle === 'mpc') {
        // MPC Inspired style
        const bgColor = variant === 'danger' ? 'bg-[#8B0000]' : variant === 'success' ? 'bg-[#006400]' : isActive ? 'bg-[#FF8C00]' : 'bg-[#D3D3D3]';
        const textColor = variant === 'danger' ? 'text-white' : variant === 'success' ? 'text-white' : isActive ? 'text-black' : 'text-[#333333]';
        const hoverBg = variant === 'danger' ? 'hover:bg-[#A52A2A]' : variant === 'success' ? 'hover:bg-[#228B22]' : isActive ? 'hover:bg-[#FFA500]' : 'hover:bg-[#C0C0C0]';
        const borderStyle = `border-2 border-b-4 border-r-4 border-[#333333]`;
        
        styleClasses = `${bgColor} ${textColor} ${hoverBg} ${borderStyle} focus:ring-offset-[#D3D3D3] focus:ring-[#FF8C00] rounded-none font-sans font-bold`;
        
        if (isActive) {
            styleClasses += ` border-b-2 border-r-2 translate-y-[2px] translate-x-[2px]`;
        }
        if (isDisabled) {
            styleClasses = `bg-[#A9A9A9] text-[#555555] border-2 border-b-4 border-r-4 border-[#333333] rounded-none font-sans font-bold`;
        }
    } else if (visualizerStyle === 'cyberpunk') {
        // Cyberpunk style: High contrast, dark mode, yellow/cyan/magenta accents, angular
        const isDanger = variant === 'danger';
        const isSuccess = variant === 'success';
        
        const ringColor = isDanger ? 'ring-[#ff003c]' : isSuccess ? 'ring-[#00ff9f]' : 'ring-[#fcee0a]';
        const bgColor = isDanger ? 'bg-[#ff003c]/20' : isSuccess ? 'bg-[#00ff9f]/20' : isActive ? 'bg-[#fcee0a]' : 'bg-[#0a0a0c]';
        const borderColor = isDanger ? 'border-[#ff003c]' : isSuccess ? 'border-[#00ff9f]' : 'border-[#00ff9f]';
        const textColor = isDanger ? 'text-[#ff003c]' : isSuccess ? 'text-[#00ff9f]' : isActive ? 'text-black' : 'text-[#fcee0a]';
        const hoverBg = isDanger ? 'hover:bg-[#ff003c]/40' : isSuccess ? 'hover:bg-[#00ff9f]/40' : isActive ? 'hover:bg-[#fcee0a]/90' : 'hover:bg-[#00ff9f]/20';
        
        styleClasses = `border-2 ${borderColor} ${bgColor} ${textColor} ${hoverBg} focus:ring-offset-black ${ringColor} rounded-none font-mono uppercase tracking-widest`;
        
        if (isActive) {
            styleClasses += ` shadow-[4px_4px_0px_#00ff9f] -translate-y-1 -translate-x-1`;
        }
        if (isDisabled) {
            styleClasses = `border-2 border-gray-800 bg-[#0a0a0c] text-gray-700 rounded-none font-mono`;
        }
    } else {
        // Default style
        const bgColor = variant === 'danger' ? 'bg-red-600' : variant === 'success' ? 'bg-green-600' : variant === 'primary' ? 'bg-blue-600' : 'bg-gray-700';
        const hoverBg = variant === 'danger' ? 'hover:bg-red-700' : variant === 'success' ? 'hover:bg-green-700' : variant === 'primary' ? 'hover:bg-blue-700' : 'hover:bg-gray-600';
        const ringColor = variant === 'danger' ? 'focus:ring-red-500' : variant === 'success' ? 'focus:ring-green-500' : variant === 'primary' ? 'focus:ring-blue-500' : 'focus:ring-gray-500';
        
        styleClasses = `${bgColor} text-white ${hoverBg} focus:ring-offset-gray-800 ${ringColor} rounded-lg`;
        
        if (isActive) {
            styleClasses = `bg-yellow-500 text-gray-900 ring-2 ring-offset-2 ring-offset-gray-800 ring-yellow-400 rounded-lg`;
        }
        if (isDisabled) {
            styleClasses = `bg-gray-700 text-gray-400 disabled:bg-gray-500 rounded-lg`;
        }
    }
    
    return `${baseClasses} ${styleClasses} ${extraClasses}`.trim();
};

// Safe localStorage wrappers to prevent SecurityError crashes in iframes with third-party cookies blocked
export const safeGetItem = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn(`Could not read from localStorage (key: ${key}). This is usually due to third-party cookie blocking in iframes.`);
        return null;
    }
};

export const safeSetItem = (key: string, value: string): void => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn(`Could not write to localStorage (key: ${key}). This is usually due to third-party cookie blocking in iframes.`);
    }
};

export const safeRemoveItem = (key: string): void => {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.warn(`Could not remove from localStorage (key: ${key}).`);
    }
};
