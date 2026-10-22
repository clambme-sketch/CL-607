import { VisualizerStyle } from './types';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';

export interface VisualStyleOption {
    id: VisualizerStyle;
    label: string;
    swatches: [string, string, string];
}

export const VISUAL_STYLE_OPTIONS: VisualStyleOption[] = [
    {
        id: 'default',
        label: 'Default',
        swatches: ['#0a1e38', '#a8dcff', '#ffc4d6'],
    },
    {
        id: 'classic607',
        label: 'Classic 607',
        swatches: ['#0f2347', '#2563eb', '#38bdf8'],
    },
    {
        id: 'cyberpunk',
        label: 'Virtual',
        swatches: ['#0a0a0c', '#fcee0a', '#00ff9f'],
    },
    {
        id: 'braun',
        label: 'Domino',
        swatches: ['#e6e3da', '#ea5b0c', '#262624'],
    },
    {
        id: 'bauhaus',
        label: 'Color Block',
        swatches: ['#f2ece1', '#184e9c', '#d62828'],
    },
    {
        id: 'nagra',
        label: 'Sunset',
        swatches: ['#3b1547', '#ff5e4d', '#fff0e5'],
    },
    {
        id: 'koto',
        label: 'Gold Trim',
        swatches: ['#161118', '#c83e2b', '#d4af37'],
    },
];

export const getButtonStyle = (
    visualizerStyle: VisualizerStyle,
    variant: ButtonVariant = 'primary',
    isActive: boolean = false,
    isDisabled: boolean = false,
    extraClasses: string = ''
) => {
    const baseClasses = "relative flex items-center justify-center font-bold transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed uppercase select-none";
    
    let styleClasses = "";
    
    if (visualizerStyle === 'cyberpunk') {
        // Virtual: High contrast cyber-brutalism, acid yellow / phosphor green / crimson, angular hard offset shadow
        const isDanger = variant === 'danger';
        const isSuccess = variant === 'success';
        const isPrimary = variant === 'primary';
        
        const ringColor = isDanger ? 'ring-[#ff003c]' : isSuccess ? 'ring-[#00ff9f]' : 'ring-[#fcee0a]';
        const bgColor = isDanger
            ? 'bg-[#2a0410]'
            : isSuccess
            ? 'bg-[#042418]'
            : isActive
            ? 'bg-[#fcee0a]'
            : isPrimary
            ? 'bg-[#14141d]'
            : 'bg-[#0a0a0f]';
        const borderColor = isDanger ? 'border-[#ff003c]' : isSuccess ? 'border-[#00ff9f]' : isActive ? 'border-[#fcee0a]' : isPrimary ? 'border-[#fcee0a]' : 'border-[#00ff9f]/70';
        const textColor = isDanger ? 'text-[#ff003c]' : isSuccess ? 'text-[#00ff9f]' : isActive ? 'text-[#050508]' : isPrimary ? 'text-[#fcee0a]' : 'text-[#00ff9f]';
        const hoverBg = isDanger ? 'hover:bg-[#ff003c] hover:text-black' : isSuccess ? 'hover:bg-[#00ff9f] hover:text-black' : isActive ? 'hover:bg-[#fff033]' : 'hover:bg-[#00ff9f]/15 hover:border-[#fcee0a]';
        const shadowStyle = isDanger
            ? 'shadow-[3px_3px_0px_#ff003c]'
            : isActive
            ? 'shadow-[4px_4px_0px_#00ff9f] -translate-y-0.5 -translate-x-0.5'
            : isPrimary
            ? 'shadow-[3px_3px_0px_#fcee0a]'
            : 'shadow-[2px_2px_0px_rgba(0,255,159,0.45)]';
        
        styleClasses = `border-2 ${borderColor} ${bgColor} ${textColor} ${hoverBg} ${shadowStyle} active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus:ring-offset-black ${ringColor} rounded-none font-['JetBrains_Mono'] tracking-widest`;
        
        if (isDisabled) {
            styleClasses = `border-2 border-gray-800 bg-[#08080c] text-gray-700 rounded-none font-['JetBrains_Mono']`;
        }
    } else if (visualizerStyle === 'braun') {
        // Domino: Molded matte polycarbonate keys with tactile 3D keycap lip and Rams orange primary
        const isDanger = variant === 'danger';
        const isSuccess = variant === 'success';
        const isPrimary = variant === 'primary';

        const bgColor = isDanger
            ? 'bg-[#d9381e]'
            : isSuccess
            ? 'bg-[#2d6a4f]'
            : isActive
            ? 'bg-[#262624]'
            : isPrimary
            ? 'bg-[#ea5b0c]'
            : 'bg-[#f4f2ec]';
        const textColor = (isDanger || isSuccess || isPrimary || isActive) ? 'text-[#faf8f5]' : 'text-[#1c1c1a]';
        const borderColor = isDanger
            ? 'border-[#a82610]'
            : isSuccess
            ? 'border-[#1b4332]'
            : isActive
            ? 'border-[#111110]'
            : isPrimary
            ? 'border-[#b84304]'
            : 'border-[#b8b4a8]';
        const hoverBg = isDanger
            ? 'hover:bg-[#e0482f]'
            : isSuccess
            ? 'hover:bg-[#377d5e]'
            : isActive
            ? 'hover:bg-[#333330]'
            : isPrimary
            ? 'hover:bg-[#f26618]'
            : 'hover:bg-[#ffffff]';
        const lipShadow = isActive
            ? 'shadow-[0_0.5px_0_#8c887d,inset_0_2px_3px_rgba(0,0,0,0.45)] translate-y-[1.5px]'
            : isPrimary
            ? 'shadow-[0_3px_0_#9e3903,inset_0_1px_0_rgba(255,255,255,0.35)] active:translate-y-[2px] active:shadow-[0_1px_0_#9e3903]'
            : isDanger
            ? 'shadow-[0_3px_0_#8f1f0c,inset_0_1px_0_rgba(255,255,255,0.3)] active:translate-y-[2px] active:shadow-[0_1px_0_#8f1f0c]'
            : 'shadow-[0_2.5px_0_#a8a498,inset_0_1px_0_rgba(255,255,255,0.95)] active:translate-y-[2px] active:shadow-[0_0.5px_0_#a8a498]';

        styleClasses = `border ${borderColor} ${bgColor} ${textColor} ${hoverBg} ${lipShadow} focus:ring-offset-[#e6e3da] focus:ring-[#ea5b0c] rounded-[5px] font-['Plus_Jakarta_Sans'] tracking-wider`;

        if (isDisabled) {
            styleClasses = `border border-[#ccc8bc] bg-[#e2dfd6] text-[#9e9a8e] rounded-[5px] font-['Plus_Jakarta_Sans']`;
        }
    } else if (visualizerStyle === 'bauhaus') {
        // Color Block: Archival cream, primary blue/red/ochre, 2px solid black border, hard constructivist block shadow
        const isDanger = variant === 'danger';
        const isSuccess = variant === 'success';
        const isPrimary = variant === 'primary';

        const bgColor = isDanger
            ? 'bg-[#d62828]'
            : isSuccess
            ? 'bg-[#1d3557]'
            : isActive
            ? 'bg-[#f2b705]'
            : isPrimary
            ? 'bg-[#184e9c]'
            : 'bg-[#faf6ed]';
        const textColor = (isDanger || isSuccess || isPrimary) && !isActive ? 'text-[#faf6ed]' : 'text-[#141413]';
        const hoverBg = isDanger
            ? 'hover:bg-[#e63946]'
            : isSuccess
            ? 'hover:bg-[#274673]'
            : isActive
            ? 'hover:bg-[#ffc300]'
            : isPrimary
            ? 'hover:bg-[#2160ba]'
            : 'hover:bg-[#f2e8cf]';
        const blockShadow = isActive
            ? 'shadow-[1px_1px_0px_#141413] translate-x-[2px] translate-y-[2px]'
            : 'shadow-[3px_3px_0px_#141413] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#141413]';

        styleClasses = `border-2 border-[#141413] ${bgColor} ${textColor} ${hoverBg} ${blockShadow} focus:ring-offset-[#f2ece1] focus:ring-[#d62828] rounded-none font-['Outfit'] font-extrabold tracking-widest`;

        if (isDisabled) {
            styleClasses = `border-2 border-[#8c887f] bg-[#e3ddd1] text-[#8c887f] rounded-none font-['Outfit']`;
        }
    } else if (visualizerStyle === 'nagra') {
        // Sunset: Pillowy sunlit cumulus cloud buttons and radiant golden-hour sunset gradients (GPU-friendly, no CSS filter hover)
        const isDanger = variant === 'danger';
        const isSuccess = variant === 'success';
        const isPrimary = variant === 'primary';

        const bgColor = isDanger
            ? 'bg-gradient-to-b from-[#ff5768] to-[#b81d43]'
            : isSuccess
            ? 'bg-gradient-to-b from-[#34d399] to-[#0d9488]'
            : isActive
            ? 'bg-gradient-to-b from-[#ffe885] via-[#ffae42] to-[#ff6b4a]'
            : isPrimary
            ? 'bg-gradient-to-b from-[#ff9466] via-[#ff5e4d] to-[#d9325e]'
            : 'bg-gradient-to-b from-[#ffffff] via-[#fff5ee] to-[#fddbd0]';
        const textColor = isActive
            ? 'text-[#2d1038]'
            : (isPrimary || isDanger || isSuccess)
            ? 'text-[#fffcf9]'
            : 'text-[#3b1547]';
        const cloudBorder = isActive
            ? 'border border-[#fff8d6] shadow-[0_3px_10px_rgba(255,174,66,0.5),inset_0_1.5px_2px_#ffffff] -translate-y-0.5'
            : isPrimary
            ? 'border border-[#ffbfa3]/85 shadow-[0_4px_10px_rgba(217,50,94,0.28),inset_0_1.5px_2px_rgba(255,255,255,0.65)] hover:border-white active:translate-y-[1px]'
            : isDanger
            ? 'border border-[#ffa6b0]/75 shadow-[0_4px_10px_rgba(184,29,67,0.28),inset_0_1.5px_2px_rgba(255,255,255,0.5)] hover:border-white active:translate-y-[1px]'
            : isSuccess
            ? 'border border-[#a7f3d0]/75 shadow-[0_4px_10px_rgba(13,148,136,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.5)] hover:border-white active:translate-y-[1px]'
            : 'border border-white/95 shadow-[0_4px_10px_rgba(68,20,76,0.12),inset_0_2px_2px_#ffffff] hover:border-[#ffbfa3] active:translate-y-[1px]';

        styleClasses = `${bgColor} ${textColor} ${cloudBorder} focus:ring-offset-[#fff0e6] focus:ring-[#ff5e4d] rounded-full font-['Plus_Jakarta_Sans'] font-bold tracking-wider`;

        if (isDisabled) {
            styleClasses = `bg-[#f5e1d8] text-[#a87b8c] border border-white/60 rounded-full font-['Plus_Jakarta_Sans']`;
        }
    } else if (visualizerStyle === 'koto') {
        // Gold Trim: Pillowed lacquer keycaps, vermilion primary, burnished gold hairlines (GPU-friendly, no CSS filter hover)
        const isDanger = variant === 'danger';
        const isSuccess = variant === 'success';
        const isPrimary = variant === 'primary';

        const bgColor = isDanger
            ? 'bg-gradient-to-b from-[#9e221b] to-[#63110c]'
            : isSuccess
            ? 'bg-gradient-to-b from-[#3b5e43] to-[#233b29]'
            : isActive
            ? 'bg-gradient-to-b from-[#d4af37] to-[#9e7a19]'
            : isPrimary
            ? 'bg-gradient-to-b from-[#c83e2b] to-[#8a2113]'
            : 'bg-gradient-to-b from-[#261e28] to-[#151017]';
        const textColor = isActive ? 'text-[#140f16]' : 'text-[#f2ece1]';
        const borderColor = isActive
            ? 'border-[#fae39c]'
            : isPrimary || isDanger
            ? 'border-[#e6b85c]/65'
            : 'border-[#d4af37]/35';
        const lacquerShadow = isActive
            ? 'shadow-[0_2px_8px_rgba(212,175,55,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)] translate-y-[1px]'
            : 'shadow-[0_3px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(212,175,55,0.25)] active:translate-y-[1.5px]';

        styleClasses = `border ${borderColor} ${bgColor} ${textColor} ${lacquerShadow} hover:border-[#d4af37]/85 focus:ring-offset-[#131014] focus:ring-[#d4af37] rounded-xl font-['Plus_Jakarta_Sans'] tracking-wider`;

        if (isDisabled) {
            styleClasses = `border border-[#2e2430] bg-[#141016] text-[#544657] rounded-xl font-['Plus_Jakarta_Sans']`;
        }
    } else if (visualizerStyle === 'minimal') {
        // Dark Minimalist Masterpiece: Zero shadows, zero gradients, zero transitions, surgical 1px hairlines
        const isDanger = variant === 'danger';
        const isSuccess = variant === 'success';
        const isPrimary = variant === 'primary';

        const bgColor = isActive
            ? 'bg-[#f4f4f5]'
            : isDanger
            ? 'bg-[#1a0a08]'
            : isSuccess
            ? 'bg-[#071a12]'
            : isPrimary
            ? 'bg-[#18181b]'
            : 'bg-[#0e0e11]';
        const textColor = isActive
            ? 'text-[#09090b]'
            : isDanger
            ? 'text-[#ff453a]'
            : isSuccess
            ? 'text-[#30d158]'
            : isPrimary
            ? 'text-[#f4f4f5]'
            : 'text-[#a1a1aa]';
        const borderColor = isActive
            ? 'border-[#f4f4f5]'
            : isDanger
            ? 'border-[#ff453a]/60'
            : isSuccess
            ? 'border-[#30d158]/60'
            : isPrimary
            ? 'border-[#3f3f46]'
            : 'border-[#222226]';
        const hoverStyle = isActive
            ? 'hover:bg-white'
            : isDanger
            ? 'hover:bg-[#ff453a] hover:text-[#09090b]'
            : isSuccess
            ? 'hover:bg-[#30d158] hover:text-[#09090b]'
            : isPrimary
            ? 'hover:bg-[#27272a] hover:border-[#71717a]'
            : 'hover:text-[#f4f4f5] hover:border-[#3f3f46]';

        styleClasses = `border ${borderColor} ${bgColor} ${textColor} ${hoverStyle} !transition-none focus:ring-1 focus:ring-offset-0 focus:ring-[#f4f4f5] rounded-none font-['IBM_Plex_Mono'] font-medium tracking-[0.12em]`;

        if (isDisabled) {
            styleClasses = `border border-[#18181b] bg-[#09090b] text-[#3f3f46] !transition-none rounded-none font-['IBM_Plex_Mono'] tracking-[0.12em]`;
        }
    } else if (visualizerStyle === 'default') {
        // Default (Modern Minimal Gallery Masterpiece — Deep Sapphire & Luminous Pastel Keycaps)
        const isDanger = variant === 'danger';
        const isSuccess = variant === 'success';
        const isPrimary = variant === 'primary';

        const bgStyle = isActive
            ? 'bg-gradient-to-b from-[#ffd2e0] to-[#ffb8ce]'
            : isDanger
            ? 'bg-gradient-to-b from-[#211936] to-[#120e21]'
            : isSuccess
            ? 'bg-gradient-to-b from-[#1a4378] to-[#0f2b52]'
            : isPrimary
            ? 'bg-gradient-to-b from-[#bae4ff] to-[#9cd5ff]'
            : 'bg-gradient-to-b from-[#143059] to-[#0b1c36]';
        const textColor = isActive
            ? 'text-[#061224]'
            : isPrimary
            ? 'text-[#061224]'
            : isDanger
            ? 'text-[#ffc4d6]'
            : isSuccess
            ? 'text-[#d8f0ff]'
            : 'text-[#e8f4ff]';
        const borderColor = isActive
            ? 'border-white/85'
            : isDanger
            ? 'border-[#ffc4d6]/55'
            : isSuccess
            ? 'border-[#a8dcff]/65'
            : isPrimary
            ? 'border-white/85'
            : 'border-[#8ecaff]/25';
        const keycapShadow = isActive || isPrimary
            ? 'shadow-[0_4px_12px_rgba(4,12,26,0.32),inset_0_1px_0_rgba(255,255,255,0.75)]'
            : 'shadow-[0_2px_8px_rgba(3,10,24,0.35),inset_0_1px_0_rgba(214,238,255,0.14)]';
        const hoverStyle = isActive
            ? 'hover:from-[#ffdeea] hover:to-[#ffc4d6]'
            : isDanger
            ? 'hover:from-[#ffc4d6] hover:to-[#ffb0c8] hover:text-[#061224] hover:border-white'
            : isSuccess
            ? 'hover:from-[#215290] hover:to-[#133563] hover:border-[#cceaff]'
            : isPrimary
            ? 'hover:from-[#ccebff] hover:to-[#adddff] hover:border-white'
            : 'hover:from-[#193b6b] hover:to-[#0e2444] hover:border-[#a8dcff]/65 hover:text-white';

        styleClasses = `border ${borderColor} ${bgStyle} ${textColor} ${keycapShadow} ${hoverStyle} active:translate-y-[1px] focus:ring-1 focus:ring-offset-0 focus:ring-[#a8dcff] rounded-xl font-['Plus_Jakarta_Sans'] font-semibold tracking-[0.08em]`;

        if (isDisabled) {
            styleClasses = `border border-[#152c4f] bg-[#081529] text-[#456894] rounded-xl font-['Plus_Jakarta_Sans'] font-medium tracking-[0.08em]`;
        }
    } else {
        // Classic 607 style (Classic Electric Blue Drum Machine)
        const isDanger = variant === 'danger';
        const isSuccess = variant === 'success';
        const isPrimary = variant === 'primary';

        const bgColor = isDanger
            ? 'bg-red-600'
            : isSuccess
            ? 'bg-emerald-600'
            : isPrimary
            ? 'bg-blue-600'
            : 'bg-[#183157] border border-blue-400/30';
        const hoverBg = isDanger
            ? 'hover:bg-red-500'
            : isSuccess
            ? 'hover:bg-emerald-500'
            : isPrimary
            ? 'hover:bg-blue-500'
            : 'hover:bg-[#204070] hover:border-blue-400/60';
        const ringColor = isDanger ? 'focus:ring-red-500' : isSuccess ? 'focus:ring-emerald-400' : 'focus:ring-blue-400';
        
        styleClasses = `${bgColor} text-white ${hoverBg} active:scale-[0.98] shadow-md focus:ring-offset-gray-900 ${ringColor} rounded-lg tracking-wider`;
        
        if (isActive) {
            styleClasses = `bg-blue-600 text-white border-2 border-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.7)] ring-2 ring-offset-2 ring-offset-[#0b172a] ring-cyan-300 rounded-lg tracking-wider font-extrabold`;
        }
        if (isDisabled) {
            styleClasses = `bg-[#0f2038] text-blue-300/40 border border-blue-900/30 rounded-lg tracking-wider`;
        }
    }
    
    return `${baseClasses} ${styleClasses} ${extraClasses}`.trim();
};

export const getThemeSurface = (visualizerStyle: VisualizerStyle) => {
    switch (visualizerStyle) {
        case 'minimal':
            return {
                mainDeck: 'bg-[#0c0c0e] rounded-none border border-[#222226]',
                sectionCard: 'bg-[#0c0c0e] rounded-none border border-[#222226]',
                sectionHeaderText: "font-['IBM_Plex_Mono'] font-medium text-[#e4e4e7] tracking-[0.18em] text-xs",
                instrumentBadge: "rounded-none bg-[#111114] border border-[#222226] text-[#d4d4d8] font-['IBM_Plex_Mono'] font-medium tracking-[0.14em]",
                faderBay: 'rounded-none bg-[#111114] border border-[#222226]',
                scopeBezel: 'rounded-none bg-[#111114] border border-[#222226]',
                stepNumLit: "font-['IBM_Plex_Mono'] font-semibold text-[#f4f4f5]",
                stepNumDim: "font-['IBM_Plex_Mono'] text-[#52525b]",
            };
        case 'cyberpunk':
            return {
                mainDeck: 'bg-[#08080c] rounded-none border-2 border-[#00ff9f] shadow-[6px_6px_0px_#ff003c] relative',
                sectionCard: 'bg-[#08080c] rounded-none border-2 border-[#00ff9f]/80 shadow-[5px_5px_0px_rgba(0,255,159,0.25)]',
                sectionHeaderText: "font-['JetBrains_Mono'] text-[#fcee0a] tracking-widest",
                instrumentBadge: "rounded-none bg-[#0d0d14] border border-[#00ff9f]/50 text-[#fcee0a] font-['JetBrains_Mono'] tracking-widest shadow-[2px_2px_0px_rgba(0,255,159,0.3)]",
                faderBay: 'rounded-none bg-[#0d0d14] border border-[#00ff9f]/40',
                scopeBezel: 'rounded-none bg-[#040406] border border-[#00ff9f]/50 shadow-[inset_0_0_8px_rgba(0,255,159,0.2)]',
                stepNumLit: "font-['JetBrains_Mono'] font-bold text-[#fcee0a]",
                stepNumDim: "font-['JetBrains_Mono'] text-[#00ff9f]/50",
            };
        case 'braun':
            return {
                mainDeck: 'bg-[#f4f2ec] rounded-[10px] border border-[#c4c0b4] shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_0_#b8b4a8,inset_0_1px_0_#ffffff]',
                sectionCard: 'bg-[#f4f2ec] rounded-[10px] border border-[#c4c0b4] shadow-[0_4px_14px_rgba(0,0,0,0.06),0_2px_0_#b8b4a8,inset_0_1px_0_#ffffff]',
                sectionHeaderText: "font-['Plus_Jakarta_Sans'] text-[#1c1c1a] tracking-wider",
                instrumentBadge: "rounded-[5px] bg-[#e6e3da] border border-[#c5c1b5] text-[#1c1c1a] font-['Plus_Jakarta_Sans'] tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
                faderBay: 'rounded-[5px] bg-[#e6e3da] border border-[#c5c1b5] shadow-inner',
                scopeBezel: 'rounded-[5px] bg-[#222220] border border-[#141413] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]',
                stepNumLit: "font-['IBM_Plex_Mono'] font-bold text-[#ea5b0c]",
                stepNumDim: "font-['IBM_Plex_Mono'] text-[#78746a]",
            };
        case 'bauhaus':
            return {
                mainDeck: 'bg-[#f7f2e7] rounded-none border-[3px] border-[#141413] shadow-[8px_8px_0px_#141413]',
                sectionCard: 'bg-[#f7f2e7] rounded-none border-[3px] border-[#141413] shadow-[6px_6px_0px_#141413]',
                sectionHeaderText: "font-['Outfit'] font-extrabold text-[#141413] tracking-widest",
                instrumentBadge: "rounded-none bg-[#ebe4d5] border-2 border-[#141413] text-[#141413] font-['Outfit'] font-extrabold tracking-widest shadow-[2px_2px_0px_#141413]",
                faderBay: 'rounded-none bg-[#ebe4d5] border-2 border-[#141413]',
                scopeBezel: 'rounded-none bg-[#181816] border-2 border-[#141413]',
                stepNumLit: "font-['Outfit'] font-extrabold text-[#d62828]",
                stepNumDim: "font-['Outfit'] font-bold text-[#5c5952]",
            };
        case 'nagra':
            return {
                mainDeck: 'sunset-cloud-deck bg-gradient-to-b from-[#fffdfa] via-[#fff1e8] to-[#fcd9cc] rounded-[42px] border-2 border-white shadow-[0_14px_30px_rgba(32,8,48,0.42),inset_0_3px_6px_#ffffff,inset_0_-6px_14px_rgba(255,122,95,0.24)]',
                sectionCard: 'sunset-cloud-menu bg-gradient-to-b from-[#fffefb] via-[#fff2ea] to-[#fbd8cb] rounded-[38px] border-2 border-white shadow-[0_10px_24px_rgba(32,8,48,0.35),inset_0_3px_6px_#ffffff,inset_0_-6px_12px_rgba(255,118,92,0.22)]',
                sectionHeaderText: "font-['Plus_Jakarta_Sans'] font-extrabold text-[#3b1547] tracking-[0.14em]",
                instrumentBadge: "rounded-full bg-gradient-to-b from-[#ffffff] via-[#fff4ed] to-[#fde0d4] border border-white text-[#3b1547] font-['Plus_Jakarta_Sans'] font-bold tracking-wider shadow-[0_2px_6px_rgba(68,20,76,0.12),inset_0_1.5px_2px_#ffffff]",
                faderBay: 'rounded-full bg-gradient-to-b from-[#fffaf6] to-[#fce0d4] border border-white/90 shadow-inner',
                scopeBezel: 'rounded-2xl bg-gradient-to-b from-[#230d38] via-[#4a194b] to-[#8c2d52] border border-[#ffb088]/60 shadow-inner',
                stepNumLit: "font-['Plus_Jakarta_Sans'] font-extrabold text-[#e03e52]",
                stepNumDim: "font-['Plus_Jakarta_Sans'] font-semibold text-[#8c536e]",
            };
        case 'koto':
            return {
                mainDeck: 'bg-gradient-to-b from-[#1c161e] to-[#120e14] rounded-2xl border border-[#d4af37]/40 shadow-[0_10px_24px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(212,175,55,0.25)]',
                sectionCard: 'bg-gradient-to-b from-[#1b151d] to-[#120e14] rounded-2xl border border-[#d4af37]/35 shadow-[0_8px_20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(212,175,55,0.2)]',
                sectionHeaderText: "font-['Cormorant_Garamond'] text-lg font-bold text-[#f2ece1] tracking-widest",
                instrumentBadge: "rounded-xl bg-[#140f16] border border-[#d4af37]/30 text-[#e8dfc8] font-['Plus_Jakarta_Sans'] tracking-wider shadow-inner",
                faderBay: 'rounded-xl bg-[#140f16] border border-[#d4af37]/25 shadow-inner',
                scopeBezel: 'rounded-xl bg-[#0b080c] border border-[#d4af37]/35 shadow-inner',
                stepNumLit: "font-['Cormorant_Garamond'] font-bold text-sm text-[#d4af37]",
                stepNumDim: "font-['Plus_Jakarta_Sans'] text-[#7d6e65]",
            };
        case 'default':
            return {
                mainDeck: 'bg-gradient-to-b from-[#132d54]/95 via-[#0e2342]/95 to-[#09182e]/95 rounded-2xl border border-[#8ecaff]/25 shadow-[0_18px_44px_rgba(3,10,24,0.48),inset_0_1px_0_rgba(214,238,255,0.18)]',
                sectionCard: 'bg-gradient-to-b from-[#11284a]/95 to-[#0a1a33]/95 rounded-2xl border border-[#8ecaff]/20 shadow-[0_10px_28px_rgba(3,10,24,0.36),inset_0_1px_0_rgba(214,238,255,0.14)]',
                sectionHeaderText: "font-['Plus_Jakarta_Sans'] font-semibold text-[#f0f7ff] tracking-[0.14em] text-xs sm:text-[13px]",
                instrumentBadge: "rounded-xl bg-gradient-to-b from-[#173562] to-[#0e2342] border border-[#8ecaff]/25 text-[#f0f7ff] font-['Plus_Jakarta_Sans'] font-semibold tracking-[0.08em] shadow-[0_2px_6px_rgba(3,10,24,0.28),inset_0_1px_0_rgba(255,255,255,0.14)]",
                faderBay: 'rounded-xl bg-[#081529]/90 border border-[#8ecaff]/18 shadow-inner',
                scopeBezel: 'rounded-xl bg-[#071224] border border-[#8ecaff]/20 shadow-inner',
                stepNumLit: "font-['IBM_Plex_Mono'] font-semibold text-[#ffc4d6]",
                stepNumDim: "font-['IBM_Plex_Mono'] text-[#6e99cc]",
            };
        case 'classic607':
        default:
            return {
                mainDeck: 'bg-gradient-to-b from-[#1a3f78] via-[#133262] to-[#0d2348] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(96,165,250,0.45)] border-2 border-blue-400/40',
                sectionCard: 'bg-gradient-to-b from-[#163a6e] to-[#0f2850] rounded-xl shadow-lg border border-blue-400/35',
                sectionHeaderText: 'text-blue-100 font-bold tracking-wider',
                instrumentBadge: 'rounded-md bg-gradient-to-r from-[#1e4887] to-[#143566] text-blue-50 border border-blue-400/45 shadow-sm',
                faderBay: 'rounded-md bg-[#0b1d3d] border border-blue-500/35 shadow-inner',
                scopeBezel: 'rounded-md bg-[#081730] border border-blue-500/40 shadow-inner',
                stepNumLit: 'text-cyan-300 font-bold',
                stepNumDim: 'text-blue-300/60',
            };
    }
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
