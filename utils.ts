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
        // Neon style
        const ringColor = variant === 'danger' ? 'ring-red-500' : variant === 'success' ? 'ring-green-500' : 'ring-fuchsia-500';
        const bgColor = variant === 'danger' ? 'bg-red-900/50' : variant === 'success' ? 'bg-green-900/50' : 'bg-fuchsia-900/50';
        const borderColor = variant === 'danger' ? 'border-red-500' : variant === 'success' ? 'border-green-500' : 'border-fuchsia-500';
        const textColor = variant === 'danger' ? 'text-red-300' : variant === 'success' ? 'text-green-300' : 'text-fuchsia-300';
        const hoverBg = variant === 'danger' ? 'hover:bg-red-800/80' : variant === 'success' ? 'hover:bg-green-800/80' : 'hover:bg-fuchsia-800/80';
        const activeShadow = `shadow-[0_0_15px_rgba(255,0,255,0.5)]`;
        
        styleClasses = `border-2 ${borderColor} ${bgColor} ${textColor} ${hoverBg} focus:ring-offset-[#050510] ${ringColor} rounded-md`;
        
        if (isActive) {
            styleClasses += ` bg-opacity-100 text-white ${activeShadow}`;
        }
        if (isDisabled) {
            styleClasses = `border-2 border-gray-700 bg-gray-900/50 text-gray-500 rounded-md`;
        }
    } else if (visualizerStyle === 'minimal') {
        // Minimal style
        const bgColor = variant === 'danger' ? 'bg-red-100' : variant === 'success' ? 'bg-green-100' : isActive ? 'bg-black' : 'bg-white';
        const textColor = variant === 'danger' ? 'text-red-800' : variant === 'success' ? 'text-green-800' : isActive ? 'text-white' : 'text-black';
        const hoverBg = variant === 'danger' ? 'hover:bg-red-200' : variant === 'success' ? 'hover:bg-green-200' : isActive ? 'hover:bg-gray-800' : 'hover:bg-gray-100';
        const borderColor = 'border border-gray-300';
        
        styleClasses = `${bgColor} ${textColor} ${hoverBg} ${borderColor} focus:ring-offset-[#f5f5f5] focus:ring-black rounded-sm shadow-sm`;
        
        if (isDisabled) {
            styleClasses = `bg-gray-100 text-gray-400 border border-gray-200 rounded-sm`;
        }
    } else if (visualizerStyle === 'retro') {
        // Retro style
        const bgColor = variant === 'danger' ? 'bg-[#8B0000]' : variant === 'success' ? 'bg-[#006400]' : isActive ? 'bg-[#FF8C00]' : 'bg-[#D2B48C]';
        const textColor = variant === 'danger' ? 'text-white' : variant === 'success' ? 'text-white' : isActive ? 'text-black' : 'text-[#3E2723]';
        const hoverBg = variant === 'danger' ? 'hover:bg-[#A52A2A]' : variant === 'success' ? 'hover:bg-[#228B22]' : isActive ? 'hover:bg-[#FFA500]' : 'hover:bg-[#DEB887]';
        const borderStyle = `border-2 border-b-4 border-r-4 border-[#5C4033]`;
        
        styleClasses = `${bgColor} ${textColor} ${hoverBg} ${borderStyle} focus:ring-offset-[#2b2118] focus:ring-[#FF8C00] rounded-none font-mono`;
        
        if (isActive) {
            styleClasses += ` border-b-2 border-r-2 translate-y-[2px] translate-x-[2px]`;
        }
        if (isDisabled) {
            styleClasses = `bg-[#8B7355] text-[#5C4033] border-2 border-b-4 border-r-4 border-[#3E2723] rounded-none font-mono`;
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
        // Cyberpunk style
        const ringColor = variant === 'danger' ? 'ring-red-500' : variant === 'success' ? 'ring-green-500' : 'ring-cyan-500';
        const bgColor = variant === 'danger' ? 'bg-red-900/30' : variant === 'success' ? 'bg-green-900/30' : 'bg-black/50';
        const borderColor = variant === 'danger' ? 'border-red-500' : variant === 'success' ? 'border-green-500' : 'border-cyan-500';
        const textColor = variant === 'danger' ? 'text-red-400' : variant === 'success' ? 'text-green-400' : 'text-cyan-400';
        const hoverBg = variant === 'danger' ? 'hover:bg-red-800/50' : variant === 'success' ? 'hover:bg-green-800/50' : 'hover:bg-cyan-900/30';
        const activeShadow = `shadow-[0_0_10px_rgba(0,255,255,0.5)]`;
        
        styleClasses = `border ${borderColor} ${bgColor} ${textColor} ${hoverBg} focus:ring-offset-black ${ringColor} rounded-none`;
        
        if (isActive) {
            styleClasses += ` bg-opacity-100 text-white ${activeShadow}`;
        }
        if (isDisabled) {
            styleClasses = `border border-gray-700 bg-gray-900/30 text-gray-600 rounded-none`;
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
