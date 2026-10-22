import React, { useRef, useCallback, useState, useEffect } from 'react';
import { MIN_TEMPO, MAX_TEMPO } from '../constants';
import { SavedPattern, VisualizerStyle, LiveRecording } from '../types';
import Tooltip from './Tooltip';
import { getButtonStyle, getThemeSurface } from '../utils';

// --- Disco Ball Component (Minimal Cat-Matched Illustration in Default Mode, 3D Mirror Ball in Other Modes) ---
const DiscoBall: React.FC<{ isPlaying: boolean; tempo?: number; beatFrame?: number; visualizerStyle?: VisualizerStyle }> = React.memo(({ isPlaying, tempo = 120, beatFrame = 0, visualizerStyle = 'default' }) => {
    const isCobalt = visualizerStyle === 'default';
    const beatSec = 60 / Math.max(30, tempo);
    const barSec = beatSec * 4;

    if (isCobalt) {
        return (
            <div
                className={`
                    w-14 h-20
                    transform-gpu transition-transform duration-500 ease-out
                    ${isPlaying ? 'translate-y-0' : '-translate-y-full'}
                `}
            >
                <svg viewBox="0 0 64 84" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <clipPath id="cobalt-minimal-disco-clip">
                            <circle cx="32" cy="50" r="19" />
                        </clipPath>
                        <style>
                            {`
                                .cobalt-disco-sway {
                                    animation: cobaltDiscoSway ${barSec.toFixed(3)}s ease-in-out infinite;
                                    transform-origin: 32px 0px;
                                }
                                @keyframes cobaltDiscoSway {
                                    0%, 100% { transform: rotate(-5deg); }
                                    50% { transform: rotate(5deg); }
                                }
                                .cobalt-sparkle-1 {
                                    animation: cobaltSparklePulse ${beatSec.toFixed(3)}s ease-in-out infinite;
                                    transform-origin: 10px 33px;
                                }
                                .cobalt-sparkle-2 {
                                    animation: cobaltSparklePulse ${beatSec.toFixed(3)}s ease-in-out infinite ${(beatSec * 0.25).toFixed(3)}s;
                                    transform-origin: 54px 37px;
                                }
                                .cobalt-sparkle-3 {
                                    animation: cobaltSparklePulse ${beatSec.toFixed(3)}s ease-in-out infinite ${(beatSec * 0.5).toFixed(3)}s;
                                    transform-origin: 13px 67px;
                                }
                                @keyframes cobaltSparklePulse {
                                    0%, 100% { opacity: 0.25; transform: scale(0.7); }
                                    50% { opacity: 1; transform: scale(1.1); }
                                }
                            `}
                        </style>
                    </defs>

                    <g className={isPlaying ? 'cobalt-disco-sway' : ''}>
                        {/* Minimal Rounded Suspension String & Ring (matching Cat stroke style) */}
                        <line
                            x1="32"
                            y1="0"
                            x2="32"
                            y2="25"
                            stroke="#d6eeff"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                        />
                        <circle
                            cx="32"
                            cy="27.5"
                            r="2.8"
                            fill="#091930"
                            stroke="#d6eeff"
                            strokeWidth="2"
                        />

                        {/* Sculpted Minimal Baby Blue Sphere Body (matching Cat #a8dcff + #cceaff + #e3f4ff) */}
                        <circle
                            cx="32"
                            cy="50"
                            r="19"
                            fill="#a8dcff"
                            stroke="#e3f4ff"
                            strokeWidth="2"
                        />
                        <ellipse
                            cx="28"
                            cy="45"
                            rx="12"
                            ry="11"
                            fill="#cceaff"
                            opacity="0.7"
                        />

                        {/* Minimal Facet Accents (Baby Pink & Baby Blue, locked to beatFrame) */}
                        <g clipPath="url(#cobalt-minimal-disco-clip)">
                            <g opacity={!isPlaying || beatFrame === 0 ? 0.95 : 0.25}>
                                <rect x="24" y="34" width="7" height="7" rx="1.5" fill="#ffc4d6" />
                                <rect x="33" y="43" width="7" height="7" rx="1.5" fill="#d6eeff" />
                                <rect x="16" y="43" width="7" height="7" rx="1.5" fill="#e8f6ff" />
                                <rect x="24" y="52" width="7" height="7" rx="1.5" fill="#ffc4d6" opacity="0.9" />
                            </g>
                            <g opacity={isPlaying && beatFrame === 1 ? 0.95 : 0.25}>
                                <rect x="33" y="34" width="7" height="7" rx="1.5" fill="#e8f6ff" />
                                <rect x="24" y="43" width="7" height="7" rx="1.5" fill="#ffc4d6" />
                                <rect x="41" y="43" width="7" height="7" rx="1.5" fill="#ffc4d6" opacity="0.9" />
                                <rect x="33" y="52" width="7" height="7" rx="1.5" fill="#d6eeff" />
                            </g>

                            {/* Minimal Midnight-Navy Seam Lines (matching Cat's #051e3e 2.4px rounded whiskers) */}
                            <g stroke="#051e3e" strokeWidth="2.2" strokeLinecap="round">
                                <path d="M14 42 Q 32 45 50 42" />
                                <path d="M13 51 Q 32 54 51 51" />
                                <path d="M15 60 Q 32 62 49 60" />
                                <path d="M24 32 Q 21 50 24 68" />
                                <path d="M32 31 V 69" />
                                <path d="M40 32 Q 43 50 40 68" />
                            </g>
                        </g>

                        {/* Re-stroke Outer Minimal Ring for Clean Silhouette */}
                        <circle
                            cx="32"
                            cy="50"
                            r="19"
                            fill="none"
                            stroke="#e3f4ff"
                            strokeWidth="2"
                        />

                        {/* Minimal Hand-Drawn Plus / Star Sparkles in Baby Pink & Baby Blue */}
                        {isPlaying && (
                            <g strokeLinecap="round" strokeWidth="2.2">
                                <g className="cobalt-sparkle-1" stroke="#ffc4d6">
                                    <line x1="10" y1="29" x2="10" y2="37" />
                                    <line x1="6" y1="33" x2="14" y2="33" />
                                </g>
                                <g className="cobalt-sparkle-2" stroke="#d6eeff">
                                    <line x1="54" y1="33" x2="54" y2="41" />
                                    <line x1="50" y1="37" x2="58" y2="37" />
                                </g>
                                <g className="cobalt-sparkle-3" stroke="#ffc4d6">
                                    <line x1="13" y1="64" x2="13" y2="70" />
                                    <line x1="10" y1="67" x2="16" y2="67" />
                                </g>
                            </g>
                        )}
                    </g>
                </svg>
            </div>
        );
    }

    // Classic chrome/prism themes
    const cordColor = '#94a3b8';
    const capFill = '#334155';
    const capStroke = '#cbd5e1';
    const sphereBaseStart = '#f8fafc';
    const sphereBaseMid = '#64748b';
    const sphereBaseEnd = '#0f172a';
    const gridStroke = '#1e293b';
    const glintPrimary = '#ffffff';
    const glintSecondary = '#f472b6';
    const glintTertiary = '#38bdf8';
    const glintQuaternary = '#fbbf24';

    return (
        <div
            className={`
                w-14 h-20
                transform-gpu transition-transform duration-500 ease-out
                ${isPlaying ? 'translate-y-0' : '-translate-y-full'}
            `}
        >
            <svg viewBox="0 0 64 84" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <clipPath id="disco-sphere-clip">
                        <circle cx="32" cy="50" r="21" />
                    </clipPath>
                    <radialGradient id="disco-sphere-base" cx="35%" cy="30%" r="70%">
                        <stop offset="0%" stopColor={sphereBaseStart} />
                        <stop offset="52%" stopColor={sphereBaseMid} />
                        <stop offset="100%" stopColor={sphereBaseEnd} />
                    </radialGradient>
                    <radialGradient id="disco-rim-shade" cx="50%" cy="50%" r="50%">
                        <stop offset="65%" stopColor="#000000" stopOpacity="0" />
                        <stop offset="100%" stopColor="#020c1b" stopOpacity="0.65" />
                    </radialGradient>
                    <linearGradient id="disco-beam-left" x1="32" y1="50" x2="4" y2="24" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor={glintPrimary} stopOpacity="0.45" />
                        <stop offset="100%" stopColor={glintTertiary} stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="disco-beam-right" x1="32" y1="50" x2="60" y2="28" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor={glintSecondary} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={glintSecondary} stopOpacity="0" />
                    </linearGradient>
                    <style>
                        {`
                            .disco-rig-sway {
                                animation: discoRigSway ${barSec.toFixed(3)}s ease-in-out infinite;
                                transform-origin: 32px 0px;
                            }
                            @keyframes discoRigSway {
                                0%, 100% { transform: rotate(-6deg); }
                                50% { transform: rotate(6deg); }
                            }
                            .disco-star-1 { animation: discoStarPulse ${beatSec.toFixed(3)}s ease-in-out infinite; transform-origin: 10px 30px; }
                            .disco-star-2 { animation: discoStarPulse ${beatSec.toFixed(3)}s ease-in-out infinite ${(beatSec * 0.25).toFixed(3)}s; transform-origin: 55px 36px; }
                            .disco-star-3 { animation: discoStarPulse ${beatSec.toFixed(3)}s ease-in-out infinite ${(beatSec * 0.5).toFixed(3)}s; transform-origin: 14px 68px; }
                            .disco-star-4 { animation: discoStarPulse ${beatSec.toFixed(3)}s ease-in-out infinite ${(beatSec * 0.75).toFixed(3)}s; transform-origin: 52px 66px; }
                            @keyframes discoStarPulse {
                                0%, 100% { opacity: 0.15; transform: scale(0.45) rotate(0deg); }
                                50% { opacity: 1; transform: scale(1.05) rotate(20deg); }
                            }
                        `}
                    </style>
                </defs>

                <g className={isPlaying ? 'disco-rig-sway' : ''}>
                    {/* Projected Light Beams when Playing */}
                    {isPlaying && (
                        <g>
                            <polygon points="32,50 2,20 10,13" fill="url(#disco-beam-left)" />
                            <polygon points="32,50 62,24 55,16" fill="url(#disco-beam-right)" />
                        </g>
                    )}

                    {/* Ceiling Mount Plate & Suspension Rod */}
                    <path d="M26 0 H38 L36 3.5 H28 Z" fill={capFill} stroke={capStroke} strokeWidth="1" />
                    <line x1="32" y1="3.5" x2="32" y2="23" stroke={cordColor} strokeWidth="1.6" />

                    {/* Swivel Hook Ring & Top Dome Cap */}
                    <circle cx="32" cy="25.5" r="2.6" fill="none" stroke={capStroke} strokeWidth="1.5" />
                    <path
                        d="M25 29.5 C25 27.2, 39 27.2, 39 29.5 L40.5 31.5 H23.5 Z"
                        fill={capFill}
                        stroke={capStroke}
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                    />

                    {/* Main Mirror Sphere */}
                    <g clipPath="url(#disco-sphere-clip)">
                        {/* 3D Spherical Base Gradient */}
                        <circle cx="32" cy="50" r="21" fill="url(#disco-sphere-base)" />

                        {/* Shimmering Mirror Facet Tiles Group A (locked to beatFrame) */}
                        <g opacity={!isPlaying || beatFrame === 0 ? 0.92 : 0.25}>
                            <rect x="22" y="34" width="5" height="4.5" fill={glintPrimary} fillOpacity="0.9" />
                            <rect x="32" y="34" width="5" height="4.5" fill={glintTertiary} fillOpacity="0.75" />
                            <rect x="17" y="39" width="5" height="5" fill={glintTertiary} fillOpacity="0.8" />
                            <rect x="27" y="39" width="5" height="5" fill={glintPrimary} fillOpacity="0.95" />
                            <rect x="42" y="39" width="5" height="5" fill={glintSecondary} fillOpacity="0.75" />
                            <rect x="22" y="44.5" width="5" height="5" fill={glintSecondary} fillOpacity="0.85" />
                            <rect x="32" y="44.5" width="5.5" height="5" fill={glintPrimary} fillOpacity="0.85" />
                            <rect x="16" y="50" width="5.5" height="5" fill={glintPrimary} fillOpacity="0.7" />
                            <rect x="27" y="50" width="5" height="5" fill={glintTertiary} fillOpacity="0.85" />
                            <rect x="37.5" y="50" width="5" height="5" fill={glintQuaternary} fillOpacity="0.8" />
                            <rect x="22" y="55.5" width="5" height="5" fill={glintPrimary} fillOpacity="0.85" />
                            <rect x="32" y="55.5" width="5.5" height="5" fill={glintSecondary} fillOpacity="0.7" />
                            <rect x="27" y="61" width="5" height="4.5" fill={glintTertiary} fillOpacity="0.75" />
                        </g>

                        {/* Shimmering Mirror Facet Tiles Group B (Alternating on beatFrame) */}
                        <g opacity={isPlaying && beatFrame === 1 ? 0.92 : 0.25}>
                            <rect x="27" y="34" width="5" height="4.5" fill={glintSecondary} fillOpacity="0.75" />
                            <rect x="22" y="39" width="5" height="5" fill={glintPrimary} fillOpacity="0.9" />
                            <rect x="37.5" y="39" width="4.5" height="5" fill={glintPrimary} fillOpacity="0.8" />
                            <rect x="16.5" y="44.5" width="5.5" height="5" fill={glintTertiary} fillOpacity="0.85" />
                            <rect x="27" y="44.5" width="5" height="5" fill={glintQuaternary} fillOpacity="0.9" />
                            <rect x="43" y="44.5" width="5" height="5" fill={glintPrimary} fillOpacity="0.7" />
                            <rect x="22" y="50" width="5" height="5" fill={glintPrimary} fillOpacity="0.9" />
                            <rect x="32" y="50" width="5.5" height="5" fill={glintSecondary} fillOpacity="0.8" />
                            <rect x="42.5" y="50" width="5" height="5" fill={glintTertiary} fillOpacity="0.75" />
                            <rect x="17" y="55.5" width="5" height="5" fill={glintSecondary} fillOpacity="0.75" />
                            <rect x="27" y="55.5" width="5" height="5" fill={glintPrimary} fillOpacity="0.85" />
                            <rect x="37.5" y="55.5" width="5" height="5" fill={glintTertiary} fillOpacity="0.8" />
                            <rect x="32" y="61" width="5" height="4.5" fill={glintPrimary} fillOpacity="0.8" />
                        </g>

                        {/*Latitude & Meridian Facet Seam Grid */}
                        <g stroke={gridStroke} strokeWidth="0.85" strokeOpacity="0.75">
                            {/* Horizontal Latitude Bands */}
                            <line x1="11" y1="34" x2="53" y2="34" />
                            <line x1="11" y1="39" x2="53" y2="39" />
                            <line x1="11" y1="44.5" x2="53" y2="44.5" />
                            <line x1="11" y1="50" x2="53" y2="50" />
                            <line x1="11" y1="55.5" x2="53" y2="55.5" />
                            <line x1="11" y1="61" x2="53" y2="61" />
                            <line x1="11" y1="66" x2="53" y2="66" />
                            {/* Curved Meridian Seams for 3D Spherical Curvature */}
                            <path d="M32 29 V71" />
                            <path d="M27 29 C25.5 43, 25.5 57, 27 71" />
                            <path d="M37 29 C38.5 43, 38.5 57, 37 71" />
                            <path d="M22 30 C18.5 43, 18.5 57, 22 70" />
                            <path d="M42 30 C45.5 43, 45.5 57, 42 70" />
                            <path d="M17 33 C12.5 44, 12.5 56, 17 67" />
                            <path d="M47 33 C51.5 44, 51.5 56, 47 67" />
                        </g>

                        {/* Spherical Rim Vignette & Top-Left Specular Glint */}
                        <circle cx="32" cy="50" r="21" fill="url(#disco-rim-shade)" />
                        <ellipse cx="24" cy="40" rx="5.5" ry="3.2" transform="rotate(-28 24 40)" fill="#ffffff" fillOpacity="0.65" />
                    </g>

                    {/* Outer Crisp Sphere Bezel */}
                    <circle cx="32" cy="50" r="21" stroke={capStroke} strokeWidth="1.4" />

                    {/* 4-Point Star Flares (Active when Playing) */}
                    {isPlaying && (
                        <g>
                            {/* Top-Left White/Sky Star */}
                            <path
                                d="M10 23 L11.4 28.6 L17 30 L11.4 31.4 L10 37 L8.6 31.4 L3 30 L8.6 28.6 Z"
                                fill={glintPrimary}
                                className="disco-star-1"
                            />
                            {/* Top-Right Pink Star */}
                            <path
                                d="M55 30 L56.2 34.8 L61 36 L56.2 37.2 L55 42 L53.8 37.2 L49 36 L53.8 34.8 Z"
                                fill={glintSecondary}
                                className="disco-star-2"
                            />
                            {/* Bottom-Left Sky Star */}
                            <path
                                d="M14 62 L15.1 66.9 L20 68 L15.1 69.1 L14 74 L12.9 69.1 L8 68 L12.9 66.9 Z"
                                fill={glintTertiary}
                                className="disco-star-3"
                            />
                            {/* Bottom-Right Ice Star */}
                            <path
                                d="M52 61 L53 64.8 L57 66 L53 67.2 L52 71 L51 67.2 L47 66 L51 64.8 Z"
                                fill={glintQuaternary}
                                className="disco-star-4"
                            />
                        </g>
                    )}
                </g>
            </svg>
        </div>
    );
});


// --- Dancing Cat Component ---
interface DancingCatProps {
    isPlaying: boolean;
    tempo: number;
    currentStep?: number | null;
    visualizerStyle?: VisualizerStyle;
}

const BlueCobaltCatFrame1: React.FC = () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Waving Left Arm & Paw with 4 Baby Pink Toe-Beans */}
        <path
            d="M36 74 C 19 72, 16 54, 21 38"
            stroke="#a8dcff"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
        />
        <path
            d="M36 74 C 19 72, 16 54, 21 38"
            stroke="#d6eeff"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
        />
        {/* Paw Pad & 4 Baby Pink Toe Beans */}
        <g transform="translate(21, 35) rotate(-12)">
            <ellipse cx="0" cy="3" rx="4.2" ry="3.4" fill="#ffc4d6" />
            <circle cx="-5.5" cy="-2.5" r="2.1" fill="#ffc4d6" />
            <circle cx="-2" cy="-5" r="2.1" fill="#ffc4d6" />
            <circle cx="2.2" cy="-5" r="2.1" fill="#ffc4d6" />
            <circle cx="5.6" cy="-2.2" r="2.1" fill="#ffc4d6" />
        </g>

        {/* Sculpted Minimal Baby Blue Body */}
        <path
            d="M35 84 C 33 66, 39 56, 52 56 C 65 56, 70 66, 68 84 C 60 87, 43 87, 35 84 Z"
            fill="#a8dcff"
            stroke="#e3f4ff"
            strokeWidth="2"
        />
        <ellipse cx="52" cy="71" rx="10" ry="9" fill="#cceaff" opacity="0.7" />

        {/* Cat Head & Pointed Ears */}
        <g transform="translate(53, 44)">
            {/* Left & Right Pointed Ears */}
            <path d="M-17 -8 L-21 -27 L-4 -17 Z" fill="#a8dcff" stroke="#e3f4ff" strokeWidth="2" strokeLinejoin="round" />
            <path d="M-15 -10 L-18 -22 L-7 -15 Z" fill="#ffc4d6" opacity="0.85" />
            <path d="M17 -8 L21 -27 L4 -17 Z" fill="#a8dcff" stroke="#e3f4ff" strokeWidth="2" strokeLinejoin="round" />
            <path d="M15 -10 L18 -22 L7 -15 Z" fill="#ffc4d6" opacity="0.85" />

            {/* Head Silhouette */}
            <ellipse cx="0" cy="0" rx="19" ry="16" fill="#b4e2ff" stroke="#e3f4ff" strokeWidth="2" />
            <ellipse cx="0" cy="3" rx="13" ry="10" fill="#d6eeff" opacity="0.65" />

            {/* Cool Modern Minimal Sunglasses */}
            <g>
                {/* Temple Arms & Nose Bridge */}
                <path d="M-18.5 -4.5 L-13 -3.8 M13 -3.8 L18.5 -4.5" stroke="#051e3e" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M-2.5 -4.2 H2.5" stroke="#051e3e" strokeWidth="2.4" strokeLinecap="round" />
                {/* Left & Right Lenses */}
                <rect x="-13.5" y="-6.8" width="11.2" height="7" rx="2.2" fill="#051e3e" stroke="#e3f4ff" strokeWidth="1" />
                <rect x="2.3" y="-6.8" width="11.2" height="7" rx="2.2" fill="#051e3e" stroke="#e3f4ff" strokeWidth="1" />
                {/* Baby Pink & Ice Specular Lens Glints */}
                <path d="M-10.8 -4.8 L-8.2 -1.8 M-7.2 -4.8 L-5.8 -3.2" stroke="#ffc4d6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M5 -4.8 L7.6 -1.8 M8.6 -4.8 L10 -3.2" stroke="#ffc4d6" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* Minimalist Midnight-Navy Whiskers */}
            <g stroke="#051e3e" strokeWidth="2.4" strokeLinecap="round">
                <path d="M-13 2 L-24 -1" />
                <path d="M-14 5 L-25 5" />
                <path d="M-13 8 L-23 11.5" />
                <path d="M13 2 L24 -1" />
                <path d="M14 5 L25 5" />
                <path d="M13 8 L23 11.5" />
            </g>
        </g>
    </svg>
);

const BlueCobaltCatFrame2: React.FC = () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Waving Left Arm & Paw with 4 Baby Pink Toe-Beans (bouncing up) */}
        <path
            d="M36 74 C 17 68, 13 48, 17 32"
            stroke="#a8dcff"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
        />
        <path
            d="M36 74 C 17 68, 13 48, 17 32"
            stroke="#d6eeff"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
        />
        {/* Paw Pad & 4 Baby Pink Toe Beans */}
        <g transform="translate(17, 29) rotate(-22)">
            <ellipse cx="0" cy="3" rx="4.2" ry="3.4" fill="#ffd1e0" />
            <circle cx="-5.5" cy="-2.5" r="2.1" fill="#ffd1e0" />
            <circle cx="-2" cy="-5" r="2.1" fill="#ffd1e0" />
            <circle cx="2.2" cy="-5" r="2.1" fill="#ffd1e0" />
            <circle cx="5.6" cy="-2.2" r="2.1" fill="#ffd1e0" />
        </g>

        {/* Sculpted Minimal Baby Blue Body */}
        <path
            d="M35 85 C 33 68, 39 58, 52 58 C 65 58, 70 68, 68 85 C 60 88, 43 88, 35 85 Z"
            fill="#a8dcff"
            stroke="#e3f4ff"
            strokeWidth="2"
        />
        <ellipse cx="52" cy="73" rx="10" ry="9" fill="#cceaff" opacity="0.7" />

        {/* Cat Head & Pointed Ears (tilted to the beat) */}
        <g transform="translate(54, 46) rotate(5)">
            <path d="M-17 -8 L-21 -27 L-4 -17 Z" fill="#a8dcff" stroke="#e3f4ff" strokeWidth="2" strokeLinejoin="round" />
            <path d="M-15 -10 L-18 -22 L-7 -15 Z" fill="#ffc4d6" opacity="0.85" />
            <path d="M17 -8 L21 -27 L4 -17 Z" fill="#a8dcff" stroke="#e3f4ff" strokeWidth="2" strokeLinejoin="round" />
            <path d="M15 -10 L18 -22 L7 -15 Z" fill="#ffc4d6" opacity="0.85" />

            <ellipse cx="0" cy="0" rx="19" ry="16" fill="#b4e2ff" stroke="#e3f4ff" strokeWidth="2" />
            <ellipse cx="0" cy="3" rx="13" ry="10" fill="#d6eeff" opacity="0.65" />

            {/* Cool Modern Minimal Sunglasses */}
            <g>
                {/* Temple Arms & Nose Bridge */}
                <path d="M-18.5 -4.5 L-13 -3.8 M13 -3.8 L18.5 -4.5" stroke="#051e3e" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M-2.5 -4.2 H2.5" stroke="#051e3e" strokeWidth="2.4" strokeLinecap="round" />
                {/* Left & Right Lenses */}
                <rect x="-13.5" y="-6.8" width="11.2" height="7" rx="2.2" fill="#051e3e" stroke="#e3f4ff" strokeWidth="1" />
                <rect x="2.3" y="-6.8" width="11.2" height="7" rx="2.2" fill="#051e3e" stroke="#e3f4ff" strokeWidth="1" />
                {/* Baby Pink & Ice Specular Lens Glints */}
                <path d="M-10.8 -4.8 L-8.2 -1.8 M-7.2 -4.8 L-5.8 -3.2" stroke="#ffc4d6" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M5 -4.8 L7.6 -1.8 M8.6 -4.8 L10 -3.2" stroke="#ffc4d6" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* Minimalist Midnight-Navy Whiskers */}
            <g stroke="#051e3e" strokeWidth="2.4" strokeLinecap="round">
                <path d="M-13 2 L-24 -2" />
                <path d="M-14 5 L-25 4" />
                <path d="M-13 8 L-23 11" />
                <path d="M13 2 L24 0" />
                <path d="M14 5 L25 6" />
                <path d="M13 8 L23 12.5" />
            </g>
        </g>
    </svg>
);

const BrownTabbyCatFrame1: React.FC = () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="eye-iris-tabby" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="#84cc16" />
                <stop offset="60%" stopColor="#4d7c0f" />
                <stop offset="100%" stopColor="#1a2e05" />
            </radialGradient>
            <radialGradient id="fur-base" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#d2b48c" />
                <stop offset="100%" stopColor="#8c6d46" />
            </radialGradient>
        </defs>
        
        {/* Body */}
        <path d="M30 88 L30 60 C 35 55, 61 55, 66 60 L 66 88 Z" fill="url(#fur-base)" />
        <ellipse cx="48" cy="70" rx="10" ry="8" fill="#f5e5d3" />
        {/* Body Stripes */}
        <g stroke="#5d4037" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M38,60 C 36,70 38,85" />
            <path d="M43,58 C 42,70 43,86" />
            <path d="M53,58 C 54,70 53,86" />
            <path d="M58,60 C 60,70 58,85" />
        </g>
        <path d="M35 88 V 65 M61 88 V 65" stroke="#5d4037" strokeWidth="3" strokeLinecap="round"/>
        <path d="M68,88 Q 78 70 83 80 T 88 85" stroke="#8c6d46" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Arms */}
        <path d="M30,62 C 25,70, 25,80, 25,80" stroke="url(#fur-base)" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M66,62 C 71,70, 71,80, 71,80" stroke="url(#fur-base)" strokeWidth="6" fill="none" strokeLinecap="round"/>

        {/* Head */}
        <g transform="translate(48, 40)">
            <path d="M-22,0 a22,22 0 1,1 44,0 a22,22 0 1,1 -44,0" fill="url(#fur-base)" stroke="#5d4037" strokeWidth="2" />
            
            {/* Tabby Markings */}
            <g transform="translate(0, -16)" stroke="#5d4037" strokeWidth="2" fill="none" strokeLinecap="round">
                <path d="M-11,0 L-9,4" />
                <path d="M-7,0 L-5,4" />
                <path d="M7,0 L5,4" />
                <path d="M11,0 L9,4" />
                <path d="M-4,0 Q 0,-3 4,0" />
            </g>
            <path d="M-20,0 C -25,-5, -25,5, -20,0 M20,0 C 25,-5, 25,5, 20,0" stroke="#5d4037" fill="none" strokeWidth="2" strokeLinecap="round"/>

            <path d="M-15,8 C 0,22 0,22 15,8 Q 12,0 0,0 Q -12,0 -15,8 Z" fill="#f5e5d3"/>
            
            {/* Ears */}
            <g transform="rotate(-30, -14, -22)">
                <path d="M-24,-18 L-14,-28 L-4,-18 Z" fill="#d2b48c" stroke="#5d4037" strokeWidth="2" strokeLinejoin="round" />
                <path d="M-20,-19 L -14,-25 L-8,-19" fill="#5d4037" opacity="0.5"/>
            </g>
            <g transform="rotate(30, 14, -22)">
                <path d="M24,-18 L14,-28 L4,-18 Z" fill="#d2b48c" stroke="#5d4037" strokeWidth="2" strokeLinejoin="round" />
                <path d="M20,-19 L 14,-25 L8,-19" fill="#5d4037" opacity="0.5"/>
            </g>

            <circle cx="-10" cy="-2" r="5" fill="url(#eye-iris-tabby)"/> <circle cx="-10" cy="-2" r="2.5" fill="black" /> <circle cx="-11" cy="-3.5" r="1" fill="white" />
            <circle cx="10" cy="-2" r="5" fill="url(#eye-iris-tabby)"/> <circle cx="10" cy="-2" r="2.5" fill="black" /> <circle cx="9" cy="-3.5" r="1" fill="white" />
            
            <path d="M-3,5 L0,8 L3,5 C 2,4 -2,4 -3,5 Z" fill="#c48a8a" />
            <path d="M0,8 L0,12 M-5,14 Q 0,16 5,14" stroke="#44403c" strokeWidth="1" fill="none" strokeLinecap="round" />
            {/* Whiskers */}
            <g stroke="#44403c" strokeWidth="0.75" fill="none" strokeLinecap="round">
                <path d="M-16,8 q-8,1 -12,-2" />
                <path d="M-16,11 q-10,0 -14,0" />
                <path d="M-16,14 q-8,-1 -12,2" />
                <path d="M16,8 q8,1 12,-2" />
                <path d="M16,11 q10,0 14,0" />
                <path d="M16,14 q8,-1 12,2" />
            </g>
        </g>
    </svg>
);

const BrownTabbyCatFrame2: React.FC = () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="eye-iris-tabby-f2" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="#84cc16" />
                <stop offset="60%" stopColor="#4d7c0f" />
                <stop offset="100%" stopColor="#1a2e05" />
            </radialGradient>
            <radialGradient id="fur-base-f2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#d2b48c" />
                <stop offset="100%" stopColor="#8c6d46" />
            </radialGradient>
        </defs>
        
        {/* Body */}
        <path d="M30 88 L30 60 C 35 55, 61 55, 66 60 L 66 88 Z" fill="url(#fur-base-f2)" />
        <ellipse cx="48" cy="70" rx="10" ry="8" fill="#f5e5d3" />
        {/* Body Stripes */}
        <g stroke="#5d4037" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M38,60 C 36,70 38,85" />
            <path d="M43,58 C 42,70 43,86" />
            <path d="M53,58 C 54,70 53,86" />
            <path d="M58,60 C 60,70 58,85" />
        </g>
        <path d="M35 88 V 65 M61 88 V 65" stroke="#5d4037" strokeWidth="3" strokeLinecap="round"/>
        <path d="M68,88 Q 82 72 85 78 T 90 82" stroke="#8c6d46" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Arms up! */}
        <path d="M30,62 C 20,50, 20,40, 25,35" stroke="url(#fur-base-f2)" strokeWidth="6" fill="none" strokeLinecap="round"/>
        <path d="M66,62 C 76,50, 76,40, 71,35" stroke="url(#fur-base-f2)" strokeWidth="6" fill="none" strokeLinecap="round"/>

        {/* Head */}
        <g transform="translate(48, 44)">
             <path d="M-22,0 a22,22 0 1,1 44,0 a22,22 0 1,1 -44,0" fill="url(#fur-base-f2)" stroke="#5d4037" strokeWidth="2" />
            
            {/* Tabby Markings */}
            <g transform="translate(0, -16)" stroke="#5d4037" strokeWidth="2" fill="none" strokeLinecap="round">
                <path d="M-11,0 L-9,4" />
                <path d="M-7,0 L-5,4" />
                <path d="M7,0 L5,4" />
                <path d="M11,0 L9,4" />
                <path d="M-4,0 Q 0,-3 4,0" />
            </g>
            <path d="M-20,0 C -25,-5, -25,5, -20,0 M20,0 C 25,-5, 25,5, 20,0" stroke="#5d4037" fill="none" strokeWidth="2" strokeLinecap="round"/>

            <path d="M-15,8 C 0,22 0,22 15,8 Q 12,0 0,0 Q -12,0 -15,8 Z" fill="#f5e5d3"/>
            
            {/* Ears */}
            <g transform="rotate(-30, -14, -22)">
                <path d="M-24,-18 L-14,-28 L-4,-18 Z" fill="#d2b48c" stroke="#5d4037" strokeWidth="2" strokeLinejoin="round" />
                <path d="M-20,-19 L -14,-25 L-8,-19" fill="#5d4037" opacity="0.5"/>
            </g>
            <g transform="rotate(30, 14, -22)">
                <path d="M24,-18 L14,-28 L4,-18 Z" fill="#d2b48c" stroke="#5d4037" strokeWidth="2" strokeLinejoin="round" />
                <path d="M20,-19 L 14,-25 L8,-19" fill="#5d4037" opacity="0.5"/>
            </g>
            
            {/* Eyes closed */}
            <path d="M-14,-2 C -10,0 -6,-2 -14,-2 M14,-2 C 10,0 6,-2 14,-2" stroke="black" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            
            <path d="M-3,5 L0,8 L3,5 C 2,4 -2,4 -3,5 Z" fill="#c48a8a" />
            <path d="M0,8 L0,12 M-5,14 Q 0,17 5,14" stroke="#44403c" strokeWidth="1" fill="none" strokeLinecap="round" />
             {/* Whiskers */}
            <g stroke="#44403c" strokeWidth="0.75" fill="none" strokeLinecap="round">
                <path d="M-16,8 q-8,1 -12,-2" />
                <path d="M-16,11 q-10,0 -14,0" />
                <path d="M-16,14 q-8,-1 -12,2" />
                <path d="M16,8 q8,1 12,-2" />
                <path d="M16,11 q10,0 14,0" />
                <path d="M16,14 q8,-1 12,2" />
            </g>
        </g>
    </svg>
);


const catFrames = [
    <BrownTabbyCatFrame1 key="1" />,
    <BrownTabbyCatFrame2 key="2" />,
];

const blueCatFrames = [
    <BlueCobaltCatFrame1 key="b1" />,
    <BlueCobaltCatFrame2 key="b2" />,
];

const DancingCat: React.FC<DancingCatProps> = React.memo(({ isPlaying, tempo, currentStep, visualizerStyle = 'default' }) => {
    const isCobaltDefault = visualizerStyle === 'default';
    const activeFrames = isCobaltDefault ? blueCatFrames : catFrames;

    // Phase-locked to the exact Web Audio sequencer step clock:
    // Downbeat 8th notes (steps 0,1 / 4,5 / 8,9 / 12,13) trigger Frame 1 (beat bob / dance pose),
    // Upbeat '&' 8th notes (steps 2,3 / 6,7 / 10,11 / 14,15) rebound to Frame 0.
    const currentFrame = !isPlaying
        ? 0
        : currentStep !== null && currentStep !== undefined
        ? (Math.floor(currentStep / 2) % 2 === 0 ? 1 : 0) % activeFrames.length
        : 1;

    const containerClasses = `
        relative w-32 h-24
        transform-gpu transition-[transform,opacity] duration-500 ease-in-out
        ${isPlaying ? 'opacity-100' : 'opacity-0 -translate-y-4 pointer-events-none'}
    `;

    return (
        <div className={containerClasses} aria-hidden="true">
            <div className="absolute left-0 bottom-0 pointer-events-none">
                {activeFrames[currentFrame]}
            </div>
            <div className="absolute right-0 top-0 pointer-events-none">
                 <DiscoBall isPlaying={isPlaying} tempo={tempo} beatFrame={currentFrame} visualizerStyle={visualizerStyle} />
            </div>
        </div>
    );
});

// --- Dancing Coffee Cup Component (for Cappuccino Mode) ---

const CoffeeCupFrame1: React.FC = () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Steam Left */}
        <path d="M35 25 Q 30 15 35 5" stroke="#E6C9A8" strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round"/>
        <path d="M48 22 Q 43 12 48 2" stroke="#E6C9A8" strokeWidth="3" fill="none" opacity="0.38" strokeLinecap="round"/>
        
        {/* Saucer */}
        <ellipse cx="48" cy="85" rx="30" ry="6" fill="#fdfbf7" stroke="#e5e7eb" strokeWidth="1"/>
        
        <g transform="rotate(-5, 48, 85)">
            {/* Handle */}
            <path d="M70 45 C 82 45, 82 65, 68 70" stroke="#fdfbf7" strokeWidth="5" fill="none" strokeLinecap="round"/>
            {/* Cup Body */}
            <path d="M26 35 L30 80 C 30 86, 66 86, 66 80 L 70 35 Z" fill="#fdfbf7" stroke="#e5e7eb" strokeWidth="1" />
            
            {/* Bandit Mask (TMNT Style) */}
            <path d="M25 56 C 25 45, 45 45, 48 52 C 51 45, 71 45, 71 56 C 71 67, 51 67, 48 60 C 45 67, 25 67, 25 56 Z" fill="#1f2937" />
            {/* Eyes */}
            <ellipse cx="37" cy="56" rx="3.5" ry="3" fill="white" />
            <ellipse cx="59" cy="56" rx="3.5" ry="3" fill="white" />
            {/* Mask Ties (Left) */}
            <path d="M26 56 C 18 52, 10 58, 12 66 L 18 62 C 16 66, 18 68, 22 64 Z" fill="#1f2937" />
            {/* Mask Ties (Right) */}
            <path d="M70 56 C 78 52, 86 58, 84 66 L 78 62 C 80 66, 78 68, 74 64 Z" fill="#1f2937" />

            {/* Liquid Surface */}
            <ellipse cx="48" cy="35" rx="22" ry="7" fill="#6F4E37" />
            {/* Latte Art Heart */}
            <path d="M48 38 C 48 38, 42 34, 42 32 C 42 30, 45 30, 48 33 C 51 30, 54 30, 54 32 C 54 34, 48 38, 48 38 Z" fill="#E6C9A8" opacity="0.9" />
        </g>
    </svg>
);

const CoffeeCupFrame2: React.FC = () => (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Steam Right */}
        <path d="M61 25 Q 66 15 61 5" stroke="#E6C9A8" strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round"/>
        <path d="M48 22 Q 53 12 48 2" stroke="#E6C9A8" strokeWidth="3" fill="none" opacity="0.38" strokeLinecap="round"/>

        {/* Saucer */}
        <ellipse cx="48" cy="85" rx="30" ry="6" fill="#fdfbf7" stroke="#e5e7eb" strokeWidth="1"/>
        
        <g transform="rotate(5, 48, 85)">
            {/* Handle */}
            <path d="M70 45 C 82 45, 82 65, 68 70" stroke="#fdfbf7" strokeWidth="5" fill="none" strokeLinecap="round"/>
            {/* Cup Body */}
            <path d="M26 35 L30 80 C 30 86, 66 86, 66 80 L 70 35 Z" fill="#fdfbf7" stroke="#e5e7eb" strokeWidth="1" />
            
            {/* Bandit Mask (TMNT Style) */}
            <path d="M25 56 C 25 45, 45 45, 48 52 C 51 45, 71 45, 71 56 C 71 67, 51 67, 48 60 C 45 67, 25 67, 25 56 Z" fill="#1f2937" />
            {/* Eyes */}
            <ellipse cx="37" cy="56" rx="3.5" ry="3" fill="white" />
            <ellipse cx="59" cy="56" rx="3.5" ry="3" fill="white" />
            {/* Mask Ties (Left) */}
            <path d="M26 56 C 18 50, 8 54, 10 62 L 16 60 C 14 64, 16 66, 20 62 Z" fill="#1f2937" />
            {/* Mask Ties (Right) */}
            <path d="M70 56 C 78 50, 88 54, 86 62 L 80 60 C 82 64, 80 66, 76 62 Z" fill="#1f2937" />

            {/* Liquid Surface */}
            <ellipse cx="48" cy="35" rx="22" ry="7" fill="#6F4E37" />
            {/* Latte Art Heart */}
            <path d="M48 38 C 48 38, 42 34, 42 32 C 42 30, 45 30, 48 33 C 51 30, 54 30, 54 32 C 54 34, 48 38, 48 38 Z" fill="#E6C9A8" opacity="0.9" />
        </g>
    </svg>
);

const coffeeFrames = [
    <CoffeeCupFrame1 key="1" />,
    <CoffeeCupFrame2 key="2" />,
];

const DancingCoffeeCup: React.FC<DancingCatProps> = React.memo(({ isPlaying, tempo, currentStep, visualizerStyle = 'default' }) => {
    const currentFrame = !isPlaying
        ? 0
        : currentStep !== null && currentStep !== undefined
        ? (Math.floor(currentStep / 2) % 2 === 0 ? 1 : 0) % coffeeFrames.length
        : 1;

    const containerClasses = `
        relative w-32 h-24
        transform-gpu transition-[transform,opacity] duration-500 ease-in-out
        ${isPlaying ? 'opacity-100' : 'opacity-0 -translate-y-4'}
    `;

    return (
        <div className={containerClasses} aria-hidden="true">
            <div className="absolute left-0 bottom-0 pointer-events-none">
                {coffeeFrames[currentFrame]}
            </div>
            <div className="absolute right-0 top-0 pointer-events-none">
                 <DiscoBall isPlaying={isPlaying} tempo={tempo} beatFrame={currentFrame} visualizerStyle={visualizerStyle} />
            </div>
        </div>
    );
});


// --- Main Controls Component ---

interface EditableValueProps {
    valueDisplay: string;
    initialInput: string;
    ariaLabel: string;
    title: string;
    visualizerStyle?: VisualizerStyle;
    onCommit: (rawInput: string) => void;
    isEditing: boolean;
    onStartEdit: () => void;
    onCancelEdit: () => void;
}

const EditableValue: React.FC<EditableValueProps> = React.memo(({
    valueDisplay,
    initialInput,
    ariaLabel,
    title,
    visualizerStyle = 'default',
    onCommit,
    isEditing,
    onStartEdit,
    onCancelEdit,
}) => {
    const [inputValue, setInputValue] = useState(initialInput);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            setInputValue(initialInput);
        }
    }, [isEditing, initialInput]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onCommit(inputValue);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCancelEdit();
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => onCommit(inputValue)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                aria-label={ariaLabel}
                className={`w-14 h-6 text-sm font-bold text-center tabular-nums px-1 outline-none transition-colors ${
                    visualizerStyle === 'minimal'
                        ? 'bg-[#18181b] text-[#f4f4f5] border border-[#ff3b1d]'
                        : visualizerStyle === 'braun'
                        ? 'bg-[#ffffff] text-[#1c1c1a] border border-[#ea5b0c] rounded shadow-inner'
                        : visualizerStyle === 'bauhaus'
                        ? 'bg-[#f7f2e7] text-[#141413] border-2 border-[#d62828]'
                        : visualizerStyle === 'nagra'
                        ? 'bg-white text-[#3b1547] border border-[#ff5e4d] rounded-full shadow-inner'
                        : visualizerStyle === 'koto'
                        ? 'bg-[#120e14] text-[#f2ece1] border border-[#d4af37] rounded'
                        : visualizerStyle === 'cyberpunk'
                        ? 'bg-[#08080c] text-[#00ff9f] border border-[#00ff9f]'
                        : visualizerStyle === 'default'
                        ? 'bg-[#041c3b] text-[#f0f9ff] border-2 border-[#a8dcff] rounded-md'
                        : 'bg-gray-800 text-gray-100 border border-blue-500 rounded'
                }`}
            />
        );
    }

    return (
        <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onStartEdit();
                }
            }}
            title={title}
            aria-label={`${ariaLabel}: ${valueDisplay}. Click to type a new value.`}
            className={`w-14 text-sm font-bold text-center tabular-nums cursor-pointer select-none rounded py-0.5 transition-colors border border-transparent ${
                visualizerStyle === 'minimal'
                    ? 'text-gray-100 hover:text-[#ff3b1d] hover:bg-[#18181b] hover:border-[#27272a]'
                    : visualizerStyle === 'braun'
                    ? 'text-gray-100 hover:text-[#ea5b0c] hover:bg-black/20 hover:border-[#c4c0b4]'
                    : visualizerStyle === 'bauhaus'
                    ? 'text-gray-100 hover:text-[#d62828] hover:bg-black/20 hover:border-[#141413]'
                    : visualizerStyle === 'nagra'
                    ? 'text-gray-100 hover:text-[#d9325e] hover:bg-white/70 hover:border-[#ff9466] rounded-full'
                    : visualizerStyle === 'koto'
                    ? 'text-gray-100 hover:text-[#d4af37] hover:bg-[#1d161f] hover:border-[#d4af37]/40'
                    : visualizerStyle === 'cyberpunk'
                    ? 'text-gray-100 hover:text-[#00ff9f] hover:bg-[#00ff9f]/10 hover:border-[#00ff9f]/50'
                    : visualizerStyle === 'default'
                    ? 'text-[#f0f7ff] font-mono hover:text-[#ffc4d6] hover:bg-[#0b1f3b] hover:border-[#a8dcff]/60 rounded-lg'
                    : 'text-gray-100 hover:text-blue-400 hover:bg-gray-700/60 hover:border-gray-600'
            }`}
        >
            {valueDisplay}
        </span>
    );
});

interface ControlsProps {
    isPlaying: boolean;
    currentStep?: number | null;
    onPlayToggle: () => void;
    tempo: number;
    onTempoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDirectTempoChange?: (tempo: number) => void;
    swing: number;
    onSwingChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDirectSwingChange?: (swing: number) => void;
    masterVolume: number;
    onMasterVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDirectMasterVolumeChange?: (volume: number) => void;
    activePattern: 'a' | 'b';
    onPatternToggle: (pattern: 'a' | 'b') => void;
    hueRotate: number;
    onHueRotateChange: (value: number) => void;
    isColorAnimating: boolean;
    onToggleColorAnimation: () => void;
    onResetColorKnob?: () => void;
    onDownload: (customFilename?: string, measures?: number, includeTail?: boolean, exportStems?: boolean) => void;
    onPrepareDrag?: (measures?: number, includeTail?: boolean) => void;
    onCopy?: () => void;
    isRendering: boolean;
    isPreparingDrag?: boolean;
    isCopying?: boolean;
    dragBlobUrl?: string | null;
    onClearDragUrl?: () => void;
    savedPatterns: (SavedPattern | null)[];
    currentPatternIndex: number;
    onSelectPattern: (slotIndex: number) => void;
    onCatClick: () => void;
    onClearPattern: () => void;
    isCurrentPatternEmpty: boolean;
    isCappuccinoMode?: boolean;
    visualizerStyle?: VisualizerStyle;
    isLiveRecording?: boolean;
    onToggleLiveRecording?: () => void;
    liveRecordings?: LiveRecording[];
    onDeleteLiveRecording?: (id: string) => void;
    onClearAllLiveRecordings?: () => void;
    onRenameLiveRecording?: (id: string, newName: string) => void;
    beatsPerMeasure?: number;
    exportMeasures?: number;
    onExportMeasuresChange?: (measures: number) => void;
    exportIncludeTail?: boolean;
    onExportIncludeTailChange?: (includeTail: boolean) => void;
}

const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
);

const PauseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm9 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const VolumeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.945.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
    </svg>
);

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v11.69l3.22-3.22a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 111.06-1.06l3.22 3.22V3a.75.75 0 01.75-.75zm-9 13.5a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

const DragIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="9" cy="5" r="1" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="9" cy="19" r="1" />
        <circle cx="15" cy="5" r="1" />
        <circle cx="15" cy="12" r="1" />
        <circle cx="15" cy="19" r="1" />
    </svg>
);

const ListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const formatDuration = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const totalSecs = Math.floor(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// --- Pattern Slot Button Component ---
interface PatternSlotButtonProps {
    slotIndex: number;
    hasContent: boolean;
    isActive: boolean;
    onClick: (index: number) => void;
    visualizerStyle: import('../types').VisualizerStyle;
}

const hasContentInPattern = (pattern: SavedPattern | null): boolean => {
    if (!pattern) return false;
    const hasNotesA = pattern.grids.a.some(row => row.some(step => step));
    const hasNotesB = pattern.grids.b.some(row => row.some(step => step));
    return hasNotesA || hasNotesB;
};

const PatternSlotButton: React.FC<PatternSlotButtonProps> = React.memo(({ slotIndex, hasContent, isActive, onClick, visualizerStyle }) => {
    const buttonClasses = getButtonStyle(
        visualizerStyle,
        hasContent ? 'primary' : 'secondary',
        isActive,
        false,
        'w-10 h-10 text-lg'
    );

    return (
        <button
            onClick={() => onClick(slotIndex)}
            className={buttonClasses}
            aria-label={`Pattern ${slotIndex + 1}. ${isActive ? 'Currently active.' : ''}`}
            aria-pressed={isActive}
        >
            {/* Subtle hardware status pip when pattern slot has notes */}
            {hasContent && (
                <span
                    aria-hidden="true"
                    className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 ${
                        visualizerStyle === 'bauhaus' || visualizerStyle === 'cyberpunk' || visualizerStyle === 'minimal' ? 'rounded-none' : 'rounded-full'
                    } ${
                        isActive
                            ? 'bg-current opacity-80'
                            : visualizerStyle === 'minimal'
                            ? 'bg-[#ff3b1d]'
                            : visualizerStyle === 'braun'
                            ? 'bg-[#ea5b0c]'
                            : visualizerStyle === 'bauhaus'
                            ? 'bg-[#f2b705]'
                            : visualizerStyle === 'nagra'
                            ? 'bg-[#ff5e4d] shadow-[0_0_6px_#ff5e4d]'
                            : visualizerStyle === 'koto'
                            ? 'bg-[#d4af37]'
                            : visualizerStyle === 'default'
                            ? 'bg-[#ffc4d6]'
                            : visualizerStyle === 'classic607'
                            ? 'bg-[#38bdf8] shadow-[0_0_6px_#38bdf8]'
                            : 'bg-[#00ff9f]'
                    }`}
                />
            )}
            <span className="relative z-10">{slotIndex + 1}</span>
        </button>
    );
});


const Controls: React.FC<ControlsProps> = ({ 
    isPlaying, 
    currentStep = null,
    onPlayToggle, 
    tempo, 
    onTempoChange,
    onDirectTempoChange,
    swing,
    onSwingChange,
    onDirectSwingChange,
    masterVolume, 
    onMasterVolumeChange,
    onDirectMasterVolumeChange,
    activePattern,
    onPatternToggle,
    hueRotate,
    onHueRotateChange,
    isColorAnimating,
    onToggleColorAnimation,
    onResetColorKnob,
    onDownload,
    onPrepareDrag,
    isRendering,
    isPreparingDrag,
    dragBlobUrl,
    onClearDragUrl,
    savedPatterns,
    currentPatternIndex,
    onSelectPattern,
    onCatClick,
    onClearPattern,
    isCurrentPatternEmpty,
    isCappuccinoMode = false,
    visualizerStyle = 'default' as VisualizerStyle,
    isLiveRecording = false,
    onToggleLiveRecording,
    liveRecordings = [],
    onDeleteLiveRecording,
    onClearAllLiveRecordings,
    onRenameLiveRecording,
    beatsPerMeasure = 4,
    exportMeasures: externalExportMeasures,
    onExportMeasuresChange,
    exportIncludeTail: externalExportIncludeTail,
    onExportIncludeTailChange,
}) => {
    const isDraggingKnob = useRef(false);
    const knobDragStart = useRef({ y: 0, hue: 0, time: 0 });
    const knobTapRef = useRef<{ count: number; lastTime: number }>({ count: 0, lastTime: 0 });

    const [clearProgress, setClearProgress] = useState(0);
    const [isPoofing, setIsPoofing] = useState(false);
    const [isConfirmingClear, setIsConfirmingClear] = useState(false);
    const clearTimerRef = useRef<number | null>(null);
    const clearRequestRef = useRef<number | null>(null);
    const clearConfirmTimeoutRef = useRef<number | null>(null);
    const clearButtonRef = useRef<HTMLButtonElement | null>(null);

    const [isInteractingWithSlider, setIsInteractingWithSlider] = useState(false);
    const [editingField, setEditingField] = useState<'volume' | 'tempo' | 'swing' | null>(null);

    // --- Live Recording & Voice Memo List State ---
    const [isRecordingsListOpen, setIsRecordingsListOpen] = useState(false);
    const [liveRecElapsed, setLiveRecElapsed] = useState(0);
    const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
    const [playbackProgress, setPlaybackProgress] = useState<number>(0);
    const [editingRecordingId, setEditingRecordingId] = useState<string | null>(null);
    const [editingRecordingName, setEditingRecordingName] = useState<string>('');
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const recordingsMenuRef = useRef<HTMLDivElement | null>(null);
    const prevRecordingsCountRef = useRef<number>(liveRecordings.length);

    // --- Beat Export Naming & Length State (Save & Advanced Options) ---
    const defaultExportName = `drums_bpm${tempo}`;
    const [exportPromptMode, setExportPromptMode] = useState<'save' | 'drag' | null>(null);
    const [exportName, setExportName] = useState<string>(defaultExportName);
    const [isCustomExportName, setIsCustomExportName] = useState<boolean>(false);
    const [localExportMeasures, setLocalExportMeasures] = useState<number>(1);
    const [localIncludeTail, setLocalIncludeTail] = useState<boolean>(false);
    const [exportStems, setExportStems] = useState<boolean>(false);
    const [isAdvancedExportOpen, setIsAdvancedExportOpen] = useState<boolean>(false);
    const exportInputRef = useRef<HTMLInputElement | null>(null);

    const activeExportMeasures = externalExportMeasures ?? localExportMeasures;
    const activeIncludeTail = externalExportIncludeTail ?? localIncludeTail;

    const handleChangeExportMeasures = useCallback((nextMeasures: number) => {
        const clamped = Math.max(1, Math.min(16, Math.round(nextMeasures)));
        setLocalExportMeasures(clamped);
        if (onExportMeasuresChange) {
            onExportMeasuresChange(clamped);
        }
        if (exportPromptMode === 'drag' && onPrepareDrag) {
            onPrepareDrag(clamped, activeIncludeTail);
        }
    }, [onExportMeasuresChange, exportPromptMode, onPrepareDrag, activeIncludeTail]);

    const handleToggleIncludeTail = useCallback(() => {
        const nextTail = !activeIncludeTail;
        setLocalIncludeTail(nextTail);
        if (onExportIncludeTailChange) {
            onExportIncludeTailChange(nextTail);
        }
        if (exportPromptMode === 'drag' && onPrepareDrag) {
            onPrepareDrag(activeExportMeasures, nextTail);
        }
    }, [activeIncludeTail, onExportIncludeTailChange, exportPromptMode, onPrepareDrag, activeExportMeasures]);

    const exportBarDurationSec = (60 / Math.max(30, tempo)) * beatsPerMeasure * activeExportMeasures;

    useEffect(() => {
        if (!isCustomExportName) {
            setExportName(`drums_bpm${tempo}`);
        }
    }, [tempo, isCustomExportName]);

    useEffect(() => {
        if (exportPromptMode && exportInputRef.current) {
            exportInputRef.current.focus();
            exportInputRef.current.select();
        }
    }, [exportPromptMode]);

    const getSanitizedExportFilename = useCallback(() => {
        const raw = (exportName.trim() || defaultExportName).replace(/\.wav$/i, '');
        const clean = raw.replace(/[:/\\?%*|"<>]/g, '_').trim() || defaultExportName;
        return `${clean}.wav`;
    }, [exportName, defaultExportName]);

    useEffect(() => {
        if (!isLiveRecording) {
            setLiveRecElapsed(0);
            return;
        }
        const startTime = Date.now();
        const interval = window.setInterval(() => {
            setLiveRecElapsed((Date.now() - startTime) / 1000);
        }, 250);
        return () => clearInterval(interval);
    }, [isLiveRecording]);

    // Auto-open the recordings list when a new live memo is finished
    useEffect(() => {
        if (liveRecordings.length > prevRecordingsCountRef.current) {
            setExportPromptMode(null);
            setIsRecordingsListOpen(true);
        }
        prevRecordingsCountRef.current = liveRecordings.length;
    }, [liveRecordings.length]);

    // Close recordings or export naming popover on outside click or Escape
    useEffect(() => {
        if (!isRecordingsListOpen && !exportPromptMode) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (recordingsMenuRef.current && !recordingsMenuRef.current.contains(e.target as Node)) {
                setIsRecordingsListOpen(false);
                setEditingRecordingId(null);
                setExportPromptMode(null);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsRecordingsListOpen(false);
                setEditingRecordingId(null);
                setExportPromptMode(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isRecordingsListOpen, exportPromptMode]);

    // Stop preview audio if the active recording is deleted
    useEffect(() => {
        if (playingRecordingId && !liveRecordings.some(r => r.id === playingRecordingId)) {
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current = null;
            }
            setPlayingRecordingId(null);
            setPlaybackProgress(0);
        }
    }, [liveRecordings, playingRecordingId]);

    useEffect(() => {
        return () => {
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current = null;
            }
        };
    }, []);

    const handleTogglePreviewRecording = useCallback((rec: LiveRecording) => {
        if (playingRecordingId === rec.id && previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current = null;
            setPlayingRecordingId(null);
            setPlaybackProgress(0);
            return;
        }

        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current = null;
        }

        const audio = new Audio(rec.url);
        previewAudioRef.current = audio;
        setPlayingRecordingId(rec.id);
        setPlaybackProgress(0);

        audio.ontimeupdate = () => {
            if (audio.duration > 0) {
                setPlaybackProgress(audio.currentTime / audio.duration);
            }
        };
        audio.onended = () => {
            setPlayingRecordingId(null);
            setPlaybackProgress(0);
            previewAudioRef.current = null;
        };
        audio.play().catch((err) => {
            console.error("Failed to play live recording:", err);
            setPlayingRecordingId(null);
        });
    }, [playingRecordingId]);

    const handleDownloadRecording = useCallback((rec: LiveRecording) => {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = rec.url;
        const safeName = rec.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `${safeName || 'CL-607-live'}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, []);

    const surface = getThemeSurface(visualizerStyle);

    const handleCommitVolume = useCallback((raw: string) => {
        setEditingField(null);
        const cleaned = raw.replace('%', '').trim();
        if (!cleaned) return;
        const num = parseFloat(cleaned);
        if (isNaN(num)) return;

        let normalized: number;
        if (cleaned.includes('.') && num <= 1 && num >= 0) {
            normalized = num;
        } else {
            normalized = Math.max(0, Math.min(100, num)) / 100;
        }

        if (onDirectMasterVolumeChange) {
            onDirectMasterVolumeChange(normalized);
        } else {
            onMasterVolumeChange({ target: { value: String(normalized) } } as React.ChangeEvent<HTMLInputElement>);
        }
    }, [onDirectMasterVolumeChange, onMasterVolumeChange]);

    const handleCommitTempo = useCallback((raw: string) => {
        setEditingField(null);
        const cleaned = raw.replace(/bpm/i, '').trim();
        if (!cleaned) return;
        const num = parseInt(cleaned, 10);
        if (isNaN(num)) return;

        const clamped = Math.max(MIN_TEMPO, Math.min(MAX_TEMPO, Math.round(num)));
        if (onDirectTempoChange) {
            onDirectTempoChange(clamped);
        } else {
            onTempoChange({ target: { value: String(clamped) } } as React.ChangeEvent<HTMLInputElement>);
        }
    }, [onDirectTempoChange, onTempoChange]);

    const handleCommitSwing = useCallback((raw: string) => {
        setEditingField(null);
        const cleaned = raw.replace('%', '').trim();
        if (!cleaned) return;
        const num = parseFloat(cleaned);
        if (isNaN(num)) return;

        let normalized: number;
        if (cleaned.includes('.') && num <= 1 && num >= 0) {
            normalized = num;
        } else {
            normalized = Math.max(0, Math.min(100, num)) / 100;
        }

        if (onDirectSwingChange) {
            onDirectSwingChange(normalized);
        } else {
            onSwingChange({ target: { value: String(normalized) } } as React.ChangeEvent<HTMLInputElement>);
        }
    }, [onDirectSwingChange, onSwingChange]);

    const handleSliderInteractionStart = useCallback(() => {
        setIsInteractingWithSlider(true);
        const handleInteractionEnd = () => {
            setIsInteractingWithSlider(false);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchend', handleInteractionEnd);
        };
        window.addEventListener('mouseup', handleInteractionEnd);
        window.addEventListener('touchend', handleInteractionEnd);
    }, []);

    const sliderInteractionProps = {
        onMouseDown: handleSliderInteractionStart,
        onTouchStart: handleSliderInteractionStart,
    };

    const HOLD_DURATION = 1000; // 1 second hold

    useEffect(() => {
        if (isPoofing) {
            const timer = setTimeout(() => {
                onClearPattern();
                setIsPoofing(false);
                setIsConfirmingClear(false);
            }, 300); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [isPoofing, onClearPattern]);

    useEffect(() => {
        setIsConfirmingClear(false);
        if (clearConfirmTimeoutRef.current) {
            clearTimeout(clearConfirmTimeoutRef.current);
            clearConfirmTimeoutRef.current = null;
        }
    }, [currentPatternIndex, activePattern, isCurrentPatternEmpty]);

    useEffect(() => {
        if (!isConfirmingClear) return;
        const handleOutsidePointerDown = (e: PointerEvent) => {
            if (clearButtonRef.current && clearButtonRef.current.contains(e.target as Node)) return;
            setIsConfirmingClear(false);
        };
        window.addEventListener('pointerdown', handleOutsidePointerDown);
        return () => window.removeEventListener('pointerdown', handleOutsidePointerDown);
    }, [isConfirmingClear]);

    useEffect(() => {
        return () => {
            if (clearConfirmTimeoutRef.current) clearTimeout(clearConfirmTimeoutRef.current);
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
            if (clearRequestRef.current) cancelAnimationFrame(clearRequestRef.current);
        };
    }, []);

    const handleClearStart = useCallback(() => {
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        if (clearRequestRef.current) cancelAnimationFrame(clearRequestRef.current);

        const startTime = Date.now();

        clearTimerRef.current = window.setTimeout(() => {
            if (clearConfirmTimeoutRef.current) {
                clearTimeout(clearConfirmTimeoutRef.current);
                clearConfirmTimeoutRef.current = null;
            }
            setIsConfirmingClear(false);
            setIsPoofing(true);
            setClearProgress(0);
        }, HOLD_DURATION);

        const updateProgress = () => {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / HOLD_DURATION, 1);
            setClearProgress(progress);
            if (progress < 1) {
                clearRequestRef.current = requestAnimationFrame(updateProgress);
            }
        };
        clearRequestRef.current = requestAnimationFrame(updateProgress);
    }, []);

    const handleClearEnd = useCallback(() => {
        if (clearTimerRef.current) {
            clearTimeout(clearTimerRef.current);
            clearTimerRef.current = null;
        }
        if (clearRequestRef.current) {
            cancelAnimationFrame(clearRequestRef.current);
            clearRequestRef.current = null;
        }
        setClearProgress(0);
    }, []);

    const handleClearClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (isPoofing) return;

        if (!isConfirmingClear) {
            setIsConfirmingClear(true);
            if (clearConfirmTimeoutRef.current) clearTimeout(clearConfirmTimeoutRef.current);
            clearConfirmTimeoutRef.current = window.setTimeout(() => {
                setIsConfirmingClear(false);
            }, 4000);
        } else {
            if (clearConfirmTimeoutRef.current) {
                clearTimeout(clearConfirmTimeoutRef.current);
                clearConfirmTimeoutRef.current = null;
            }
            handleClearEnd();
            setIsConfirmingClear(false);
            setIsPoofing(true);
        }
    }, [isConfirmingClear, isPoofing, handleClearEnd]);

    const handleKnobInteractionStart = useCallback((startY: number) => {
        isDraggingKnob.current = true;
        knobDragStart.current = { y: startY, hue: hueRotate, time: Date.now() };
    }, [hueRotate]);
    
    const handleKnobInteractionMove = useCallback((currentY: number) => {
        if (!isDraggingKnob.current) return;
        
        const deltaY = knobDragStart.current.y - currentY;
        const newHue = (knobDragStart.current.hue + deltaY * 2) % 360;
        const clampedHue = newHue < 0 ? 360 + newHue : newHue;
        onHueRotateChange(clampedHue);
    }, [onHueRotateChange]);

    const handleKnobInteractionEnd = useCallback((endY: number) => {
        const timeElapsed = Date.now() - knobDragStart.current.time;
        const distanceMoved = Math.abs(knobDragStart.current.y - endY);

        if (isDraggingKnob.current && timeElapsed < 300 && distanceMoved < 12) {
            const now = Date.now();
            const isSequentialTap = now - knobTapRef.current.lastTime < 500;
            const nextTapCount = isSequentialTap ? knobTapRef.current.count + 1 : 1;

            if (nextTapCount >= 4) {
                knobTapRef.current = { count: 0, lastTime: 0 };
                if (onResetColorKnob) {
                    onResetColorKnob();
                } else {
                    if (isColorAnimating) {
                        onToggleColorAnimation();
                    }
                    onHueRotateChange(0);
                }
            } else {
                knobTapRef.current = { count: nextTapCount, lastTime: now };
                onToggleColorAnimation();
            }
        } else if (distanceMoved >= 12) {
            knobTapRef.current = { count: 0, lastTime: 0 };
        }

        isDraggingKnob.current = false;
    }, [onToggleColorAnimation, onResetColorKnob, isColorAnimating, onHueRotateChange]);
    
    // Mouse Events
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        handleKnobInteractionStart(e.clientY);

        const onMouseMove = (moveEvent: MouseEvent) => {
            handleKnobInteractionMove(moveEvent.clientY);
        };
        const onMouseUp = (upEvent: MouseEvent) => {
            handleKnobInteractionEnd(upEvent.clientY);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [handleKnobInteractionStart, handleKnobInteractionMove, handleKnobInteractionEnd]);


    // Touch Events
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        handleKnobInteractionStart(e.touches[0].clientY);
    }, [handleKnobInteractionStart]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        handleKnobInteractionMove(e.touches[0].clientY);
    }, [handleKnobInteractionMove]);
    
    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        handleKnobInteractionEnd(e.changedTouches[0].clientY);
    }, [handleKnobInteractionEnd]);


    return (
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 p-2">
            <div className="relative flex flex-col gap-2" ref={recordingsMenuRef}>
                {/* Cohesive Single Live Record Button with Integrated 3-Lines Menu Action */}
                <div
                    className={getButtonStyle(
                        visualizerStyle,
                        isLiveRecording ? 'danger' : 'secondary',
                        isLiveRecording,
                        false,
                        'w-28 h-10 !p-0 flex items-stretch relative select-none'
                    )}
                >
                    <Tooltip text={isLiveRecording ? "Click to stop recording live audio and save to list" : "Record live master audio (including filter & effect tweaks) like a voice memo"}>
                        <button
                            type="button"
                            onClick={onToggleLiveRecording}
                            className="flex-1 h-full flex items-center justify-center pl-2 pr-1 min-w-0 cursor-pointer bg-transparent border-0 text-inherit font-inherit focus:outline-none hover: opacity-95"
                            aria-label={isLiveRecording ? 'Stop live recording' : 'Start live recording'}
                            aria-pressed={isLiveRecording}
                        >
                            {isLiveRecording ? (
                                <>
                                    <span className="w-2 h-2 bg-current rounded-[2px] animate-pulse flex-shrink-0" />
                                    <span className="ml-1.5 text-[11px] leading-none tracking-wider tabular-nums font-bold">
                                        {formatDuration(liveRecElapsed)}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-[#e11d48] shadow-[0_0_5px_rgba(225,29,72,0.75)] flex-shrink-0" />
                                    <span className="ml-1 text-[11px] leading-none tracking-wider truncate font-bold">
                                        LIVE REC
                                    </span>
                                </>
                            )}
                        </button>
                    </Tooltip>

                    {/* Integrated Cohesive Divider */}
                    <span
                        aria-hidden="true"
                        className={`self-stretch ${
                            visualizerStyle === 'bauhaus'
                                ? 'w-[2px] my-0 bg-[#141413]'
                                : visualizerStyle === 'cyberpunk'
                                ? 'w-[1.5px] my-1 bg-current opacity-40'
                                : 'w-[1px] my-1.5 bg-current opacity-25'
                        }`}
                    />

                    {/* Integrated 3-Lines List Trigger on Right Side of the Same Button */}
                    <Tooltip text={`Open Live Recordings list (${liveRecordings.length})`}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setExportPromptMode(null);
                                setIsRecordingsListOpen(prev => !prev);
                            }}
                            className={`w-7 h-full flex items-center justify-center flex-shrink-0 cursor-pointer bg-transparent border-0 text-inherit focus:outline-none relative transition-colors ${
                                isRecordingsListOpen ? 'bg-black/15' : 'hover:bg-black/10'
                            }`}
                            aria-label={`Live recordings list (${liveRecordings.length} saved)`}
                            aria-expanded={isRecordingsListOpen}
                        >
                            <ListIcon className="w-3.5 h-3.5" />
                            {liveRecordings.length > 0 && (
                                <span
                                    className={`absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 text-[9px] font-bold leading-none flex items-center justify-center rounded-full z-20 ${
                                        visualizerStyle === 'cyberpunk'
                                            ? 'bg-[#fcee0a] text-[#050508] border border-[#050508] rounded-none'
                                            : visualizerStyle === 'bauhaus'
                                            ? 'bg-[#d62828] text-[#faf6ed] border border-[#141413] rounded-none'
                                            : visualizerStyle === 'minimal'
                                            ? 'bg-[#ff3b1d] text-[#09090b] rounded-none'
                                            : visualizerStyle === 'braun'
                                            ? 'bg-[#ea5b0c] text-white'
                                            : visualizerStyle === 'nagra'
                                            ? 'bg-[#d9325e] text-white border border-white'
                                            : visualizerStyle === 'koto'
                                            ? 'bg-[#d4af37] text-[#120d14]'
                                            : visualizerStyle === 'default'
                                            ? 'bg-[#ffc4d6] text-[#061224] border border-white/80 rounded-full'
                                            : 'bg-blue-500 text-white'
                                    }`}
                                >
                                    {liveRecordings.length}
                                </span>
                            )}
                        </button>
                    </Tooltip>
                </div>

                {/* Solid, Opaque Live Recordings Popover Menu */}
                {isRecordingsListOpen && (
                    <div
                        className={`absolute left-0 top-11 z-50 w-80 sm:w-96 p-3.5 flex flex-col gap-2.5 ${
                            visualizerStyle === 'cyberpunk'
                                ? 'bg-[#07070c] border-2 border-[#00ff9f] rounded-none text-[#fcee0a] shadow-[6px_6px_0px_#ff003c]'
                                : visualizerStyle === 'braun'
                                ? 'bg-[#f4f2ec] border-2 border-[#a8a498] rounded-lg text-[#1c1c1a] shadow-[0_16px_36px_rgba(0,0,0,0.35),inset_0_1px_0_#ffffff]'
                                : visualizerStyle === 'bauhaus'
                                ? 'bg-[#f7f2e7] border-[3px] border-[#141413] rounded-none text-[#141413] shadow-[6px_6px_0px_#141413]'
                                : visualizerStyle === 'nagra'
                                ? 'bg-gradient-to-b from-[#fffdfa] via-[#fff0e6] to-[#fbd5c5] border-2 border-white rounded-[24px] text-[#3b1547] shadow-[0_18px_40px_rgba(45,16,56,0.45),inset_0_2px_0_#ffffff]'
                                : visualizerStyle === 'koto'
                                ? 'bg-[#140f16] border-2 border-[#d4af37] rounded-xl text-[#f2ece1] shadow-[0_18px_44px_rgba(0,0,0,0.9)]'
                                : visualizerStyle === 'minimal'
                                ? 'bg-[#09090b] border-2 border-[#f4f4f5] rounded-none text-[#f4f4f5] shadow-[0_12px_30px_rgba(0,0,0,0.9)]'
                                : visualizerStyle === 'default'
                                ? 'bg-gradient-to-b from-[#11284a] to-[#09182e] border border-[#8ecaff]/35 rounded-2xl text-[#f0f7ff] shadow-[0_18px_44px_rgba(3,10,24,0.65),inset_0_1px_0_rgba(214,238,255,0.16)]'
                                : 'bg-[#111827] border-2 border-[#374151] rounded-xl text-[#f9fafb] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
                        }`}
                        role="dialog"
                        aria-label="Live Recordings"
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-current/20">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#e11d48]" />
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-100">
                                    Live Recordings ({liveRecordings.length})
                                </h4>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {liveRecordings.length > 1 && onClearAllLiveRecordings && (
                                    <button
                                        type="button"
                                        onClick={onClearAllLiveRecordings}
                                        className={getButtonStyle(visualizerStyle, 'danger', false, false, 'h-6 px-2 text-[10px]')}
                                    >
                                        CLEAR ALL
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsRecordingsListOpen(false)}
                                    className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'w-6 h-6 !px-0 text-xs')}
                                    aria-label="Close live recordings list"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {liveRecordings.length === 0 ? (
                            <div className="py-6 px-3 text-center flex flex-col items-center gap-1.5">
                                <p className="text-xs font-bold text-gray-100">
                                    No live recordings yet
                                </p>
                                <p className="text-[11px] text-gray-300 leading-relaxed">
                                    Click <span className="font-bold">LIVE REC</span> while playing to capture your live beat, filter sweeps, and effect tweaks in real time.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-0.5">
                                {liveRecordings.map((rec) => {
                                    const isPlayingThis = playingRecordingId === rec.id;
                                    const isEditingThis = editingRecordingId === rec.id;
                                    const safeFilename = `${rec.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'CL-607-live'}.wav`;

                                    return (
                                        <div
                                            key={rec.id}
                                            className={`p-2.5 flex flex-col gap-2 ${
                                                visualizerStyle === 'cyberpunk'
                                                    ? 'bg-[#10101a] border border-[#00ff9f]/50 rounded-none'
                                                    : visualizerStyle === 'braun'
                                                    ? 'bg-[#e6e3da] border border-[#c4c0b4] rounded-md'
                                                    : visualizerStyle === 'bauhaus'
                                                    ? 'bg-[#ebe4d5] border-2 border-[#141413] rounded-none'
                                                    : visualizerStyle === 'nagra'
                                                    ? 'bg-[#fff8f3] border border-[#f4b6a0] rounded-2xl shadow-sm'
                                                    : visualizerStyle === 'koto'
                                                    ? 'bg-[#1f1722] border border-[#d4af37]/40 rounded-lg'
                                                    : visualizerStyle === 'minimal'
                                                    ? 'bg-[#141418] border border-[#2e2e36] rounded-none'
                                                    : visualizerStyle === 'default'
                                                    ? 'bg-[#09172e]/90 border border-[#8ecaff]/20 rounded-xl'
                                                    : 'bg-[#1f2937] border border-[#374151] rounded-lg'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                {/* Play / Pause Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleTogglePreviewRecording(rec)}
                                                    className={getButtonStyle(
                                                        visualizerStyle,
                                                        isPlayingThis ? 'primary' : 'secondary',
                                                        isPlayingThis,
                                                        false,
                                                        'w-8 h-8 !px-0 flex-shrink-0'
                                                    )}
                                                    aria-label={isPlayingThis ? `Pause ${rec.name}` : `Play ${rec.name}`}
                                                >
                                                    {isPlayingThis ? (
                                                        <PauseIcon className="w-4 h-4" />
                                                    ) : (
                                                        <PlayIcon className="w-4 h-4" />
                                                    )}
                                                </button>

                                                {/* Title & Metadata */}
                                                <div className="flex-1 min-w-0 flex flex-col">
                                                    {isEditingThis ? (
                                                        <input
                                                            type="text"
                                                            value={editingRecordingName}
                                                            autoFocus
                                                            onChange={(e) => setEditingRecordingName(e.target.value)}
                                                            onBlur={() => {
                                                                if (onRenameLiveRecording) {
                                                                    onRenameLiveRecording(rec.id, editingRecordingName);
                                                                }
                                                                setEditingRecordingId(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    if (onRenameLiveRecording) {
                                                                        onRenameLiveRecording(rec.id, editingRecordingName);
                                                                    }
                                                                    setEditingRecordingId(null);
                                                                } else if (e.key === 'Escape') {
                                                                    setEditingRecordingId(null);
                                                                }
                                                            }}
                                                            className="w-full text-xs font-bold bg-black/20 text-gray-100 px-1.5 py-0.5 rounded border border-current/30 outline-none"
                                                        />
                                                    ) : (
                                                        <span
                                                            onClick={() => {
                                                                setEditingRecordingId(rec.id);
                                                                setEditingRecordingName(rec.name);
                                                            }}
                                                            title="Click to rename take"
                                                            className="text-xs font-bold text-gray-100 truncate cursor-pointer hover:underline"
                                                        >
                                                            {rec.name}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-gray-400 tabular-nums">
                                                        {formatDuration(rec.duration)} • {rec.createdAt}
                                                    </span>
                                                </div>

                                                {/* Action Buttons: Drag to DAW, Download WAV, Delete */}
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        draggable={true}
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('DownloadURL', `audio/wav:${safeFilename}:${rec.url}`);
                                                        }}
                                                        title="Drag this recording into your DAW or desktop folder"
                                                        className={getButtonStyle(
                                                            visualizerStyle,
                                                            'secondary',
                                                            false,
                                                            false,
                                                            'w-7 h-7 !px-0 cursor-grab active:cursor-grabbing'
                                                        )}
                                                        aria-label={`Drag ${rec.name} to export`}
                                                    >
                                                        <DragIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadRecording(rec)}
                                                        title="Save recording as .wav"
                                                        className={getButtonStyle(
                                                            visualizerStyle,
                                                            'secondary',
                                                            false,
                                                            false,
                                                            'w-7 h-7 !px-0'
                                                        )}
                                                        aria-label={`Download ${rec.name}`}
                                                    >
                                                        <DownloadIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    {onDeleteLiveRecording && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onDeleteLiveRecording(rec.id)}
                                                            title="Delete recording"
                                                            className={getButtonStyle(
                                                                visualizerStyle,
                                                                'danger',
                                                                false,
                                                                false,
                                                                'w-7 h-7 !px-0'
                                                            )}
                                                            aria-label={`Delete ${rec.name}`}
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Playback Progress Bar */}
                                            {isPlayingThis && (
                                                <div className="w-full h-1 bg-black/25 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-current transition-all duration-100"
                                                        style={{ width: `${Math.min(100, Math.round(playbackProgress * 100))}%` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Streamlined Save Beat Popover with Naming + Save & Collapsible Advanced Options */}
                {exportPromptMode && (
                    <div
                        className={`absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 p-3.5 flex flex-col gap-3 ${
                            visualizerStyle === 'cyberpunk'
                                ? 'bg-[#07070c] border-2 border-[#00ff9f] rounded-none text-[#fcee0a] shadow-[6px_6px_0px_#ff003c]'
                                : visualizerStyle === 'braun'
                                ? 'bg-[#f4f2ec] border-2 border-[#a8a498] rounded-lg text-[#1c1c1a] shadow-[0_16px_36px_rgba(0,0,0,0.35),inset_0_1px_0_#ffffff]'
                                : visualizerStyle === 'bauhaus'
                                ? 'bg-[#f7f2e7] border-[3px] border-[#141413] rounded-none text-[#141413] shadow-[6px_6px_0px_#141413]'
                                : visualizerStyle === 'nagra'
                                ? 'bg-gradient-to-b from-[#fffdfa] via-[#fff0e6] to-[#fbd5c5] border-2 border-white rounded-[24px] text-[#3b1547] shadow-[0_18px_40px_rgba(45,16,56,0.45),inset_0_2px_0_#ffffff]'
                                : visualizerStyle === 'koto'
                                ? 'bg-[#140f16] border-2 border-[#d4af37] rounded-xl text-[#f2ece1] shadow-[0_18px_44px_rgba(0,0,0,0.9)]'
                                : visualizerStyle === 'minimal'
                                ? 'bg-[#09090b] border-2 border-[#f4f4f5] rounded-none text-[#f4f4f5] shadow-[0_12px_30px_rgba(0,0,0,0.9)]'
                                : visualizerStyle === 'default'
                                ? 'bg-gradient-to-b from-[#11284a] to-[#09182e] border border-[#8ecaff]/35 rounded-2xl text-[#f0f7ff] shadow-[0_18px_44px_rgba(3,10,24,0.65),inset_0_1px_0_rgba(214,238,255,0.16)]'
                                : 'bg-[#111827] border-2 border-[#374151] rounded-xl text-[#f9fafb] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
                        }`}
                        role="dialog"
                        aria-label="Save beat"
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-current/20">
                            <div className="flex items-center gap-2">
                                <DownloadIcon className="w-3.5 h-3.5" />
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-100">
                                    Save Beat
                                </h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setExportPromptMode(null)}
                                className={getButtonStyle(visualizerStyle, 'secondary', false, false, 'w-6 h-6 !px-0 text-xs')}
                                aria-label="Close save dialog"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Naming Option + Immediate Save Action */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="beat-export-filename" className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    File Name
                                </label>
                                {isCustomExportName && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCustomExportName(false);
                                            setExportName(`drums_bpm${tempo}`);
                                        }}
                                        className="text-[10px] font-bold underline opacity-80 hover:opacity-100 cursor-pointer bg-transparent border-0 text-inherit"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                            <div className="flex items-stretch gap-1.5">
                                <div
                                    className={`flex-1 min-w-0 flex items-center px-2.5 py-1.5 ${
                                        visualizerStyle === 'cyberpunk'
                                            ? 'bg-[#10101a] border border-[#00ff9f] rounded-none'
                                            : visualizerStyle === 'braun'
                                            ? 'bg-[#e6e3da] border border-[#a8a498] rounded-md'
                                            : visualizerStyle === 'bauhaus'
                                            ? 'bg-[#ebe4d5] border-2 border-[#141413] rounded-none'
                                            : visualizerStyle === 'nagra'
                                            ? 'bg-[#fff8f3] border border-[#f4b6a0] rounded-xl'
                                            : visualizerStyle === 'koto'
                                            ? 'bg-[#1f1722] border border-[#d4af37]/60 rounded-lg'
                                            : visualizerStyle === 'minimal'
                                            ? 'bg-[#141418] border border-[#52525b] rounded-none'
                                            : visualizerStyle === 'default'
                                            ? 'bg-[#081529] border border-[#8ecaff]/28 rounded-xl'
                                            : 'bg-[#1f2937] border border-[#4b5563] rounded-lg'
                                    }`}
                                >
                                    <input
                                        id="beat-export-filename"
                                        ref={exportInputRef}
                                        type="text"
                                        value={exportName}
                                        placeholder={defaultExportName}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setExportName(val);
                                            setIsCustomExportName(val.trim() !== '' && val.trim() !== defaultExportName);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const finalName = exportName.trim() || defaultExportName;
                                                onDownload(finalName, activeExportMeasures, activeIncludeTail, exportStems);
                                                setExportPromptMode(null);
                                            }
                                        }}
                                        className="flex-1 min-w-0 bg-transparent border-0 text-xs font-mono font-bold text-gray-100 focus:outline-none"
                                    />
                                    <span className="ml-1 text-[10px] font-mono font-bold text-gray-400 select-none">
                                        {exportStems ? '.zip' : '.wav'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    disabled={isRendering || isPreparingDrag}
                                    onClick={() => {
                                        const finalName = exportName.trim() || defaultExportName;
                                        onDownload(finalName, activeExportMeasures, activeIncludeTail, exportStems);
                                        setExportPromptMode(null);
                                    }}
                                    className={getButtonStyle(visualizerStyle, 'primary', false, isRendering || isPreparingDrag, 'h-9 px-3.5 text-xs flex-shrink-0')}
                                >
                                    {isRendering ? 'SAVING...' : (
                                        <>
                                            <DownloadIcon className="w-3.5 h-3.5 mr-1" />
                                            <span>SAVE</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Advanced Options Toggle Button */}
                        <div className="pt-1 border-t border-current/15 flex flex-col gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsAdvancedExportOpen(prev => !prev)}
                                className={getButtonStyle(
                                    visualizerStyle,
                                    'secondary',
                                    isAdvancedExportOpen,
                                    false,
                                    'w-full h-7 px-2.5 text-[10px] flex items-center justify-between'
                                )}
                                aria-expanded={isAdvancedExportOpen}
                            >
                                <span>ADVANCED OPTIONS</span>
                                <span className="text-[10px] leading-none">
                                    {isAdvancedExportOpen ? '▴' : '▾'}
                                </span>
                            </button>

                            {isAdvancedExportOpen && (
                                <div className="flex flex-col gap-2.5 pt-0.5">
                                    {/* Export Measures Selector */}
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                Measures
                                            </span>
                                            <span className="text-[10px] font-mono tabular-nums text-gray-300">
                                                {activeExportMeasures} {activeExportMeasures === 1 ? 'bar' : 'bars'} · {exportBarDurationSec.toFixed(1)}s{activeIncludeTail ? ' + tail' : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 4, 8].map((count) => (
                                                <button
                                                    key={count}
                                                    type="button"
                                                    onClick={() => handleChangeExportMeasures(count)}
                                                    className={getButtonStyle(
                                                        visualizerStyle,
                                                        activeExportMeasures === count ? 'primary' : 'secondary',
                                                        activeExportMeasures === count,
                                                        false,
                                                        'flex-1 h-7 text-xs tabular-nums'
                                                    )}
                                                >
                                                    {count}
                                                </button>
                                            ))}
                                            <div className="flex items-center gap-0.5 ml-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleChangeExportMeasures(activeExportMeasures - 1)}
                                                    disabled={activeExportMeasures <= 1}
                                                    title="Decrease measures"
                                                    aria-label="Decrease measures"
                                                    className={getButtonStyle(
                                                        visualizerStyle,
                                                        'secondary',
                                                        false,
                                                        activeExportMeasures <= 1,
                                                        'w-6 h-7 !px-0 text-xs'
                                                    )}
                                                >
                                                    −
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleChangeExportMeasures(activeExportMeasures + 1)}
                                                    disabled={activeExportMeasures >= 16}
                                                    title="Increase measures"
                                                    aria-label="Increase measures"
                                                    className={getButtonStyle(
                                                        visualizerStyle,
                                                        'secondary',
                                                        false,
                                                        activeExportMeasures >= 16,
                                                        'w-6 h-7 !px-0 text-xs'
                                                    )}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Let Tails Ring Out Checkbox */}
                                    <label
                                        htmlFor="export-include-tail"
                                        className={`flex items-start gap-2.5 p-2 cursor-pointer select-none transition-colors ${
                                            visualizerStyle === 'cyberpunk'
                                                ? 'bg-[#10101a] border border-[#00ff9f]/60 rounded-none'
                                                : visualizerStyle === 'braun'
                                                ? 'bg-[#e6e3da] border border-[#c4c0b4] rounded-md'
                                                : visualizerStyle === 'bauhaus'
                                                ? 'bg-[#ebe4d5] border-2 border-[#141413] rounded-none'
                                                : visualizerStyle === 'nagra'
                                                ? 'bg-[#fff8f3] border border-[#f4b6a0] rounded-xl'
                                                : visualizerStyle === 'koto'
                                                ? 'bg-[#1f1722] border border-[#d4af37]/40 rounded-lg'
                                                : visualizerStyle === 'minimal'
                                                ? 'bg-[#141418] border border-[#3f3f46] rounded-none'
                                                : visualizerStyle === 'default'
                                                ? 'bg-[#09172e]/90 border border-[#8ecaff]/20 rounded-xl'
                                                : 'bg-[#1f2937]/90 border border-[#374151] rounded-lg hover:border-gray-500'
                                        }`}
                                    >
                                        <input
                                            id="export-include-tail"
                                            type="checkbox"
                                            checked={activeIncludeTail}
                                            onChange={handleToggleIncludeTail}
                                            className="mt-0.5 w-3.5 h-3.5 rounded accent-blue-500 cursor-pointer flex-shrink-0"
                                        />
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-[11px] font-bold text-gray-100">
                                                Let Tails Ring Out
                                            </span>
                                            <span className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                                                Extends clip so reverb, delay &amp; final notes decay naturally.
                                            </span>
                                        </div>
                                    </label>

                                    {/* Export Stems Individually in a Folder */}
                                    <label
                                        htmlFor="export-stems-individually"
                                        className={`flex items-start gap-2.5 p-2 cursor-pointer select-none transition-colors ${
                                            visualizerStyle === 'cyberpunk'
                                                ? 'bg-[#10101a] border border-[#00ff9f]/60 rounded-none'
                                                : visualizerStyle === 'braun'
                                                ? 'bg-[#e6e3da] border border-[#c4c0b4] rounded-md'
                                                : visualizerStyle === 'bauhaus'
                                                ? 'bg-[#ebe4d5] border-2 border-[#141413] rounded-none'
                                                : visualizerStyle === 'nagra'
                                                ? 'bg-[#fff8f3] border border-[#f4b6a0] rounded-xl'
                                                : visualizerStyle === 'koto'
                                                ? 'bg-[#1f1722] border border-[#d4af37]/40 rounded-lg'
                                                : visualizerStyle === 'minimal'
                                                ? 'bg-[#141418] border border-[#3f3f46] rounded-none'
                                                : visualizerStyle === 'default'
                                                ? 'bg-[#09172e]/90 border border-[#8ecaff]/20 rounded-xl'
                                                : 'bg-[#1f2937]/90 border border-[#374151] rounded-lg hover:border-gray-500'
                                        }`}
                                    >
                                        <input
                                            id="export-stems-individually"
                                            type="checkbox"
                                            checked={exportStems}
                                            onChange={() => setExportStems(prev => !prev)}
                                            className="mt-0.5 w-3.5 h-3.5 rounded accent-blue-500 cursor-pointer flex-shrink-0"
                                        />
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-[11px] font-bold text-gray-100">
                                                Export Stems Individually
                                            </span>
                                            <span className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                                                Downloads a folder with separate .wav files for each instrument.
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <Tooltip text={`Name and save beat (default: drums_bpm${tempo}.wav)`}>
                    <button
                        onClick={() => {
                            setIsRecordingsListOpen(false);
                            if (!isCustomExportName) {
                                setExportName(`drums_bpm${tempo}`);
                            }
                            setExportPromptMode(prev => prev === 'save' ? null : 'save');
                        }}
                        disabled={isRendering || isPreparingDrag}
                        className={getButtonStyle(visualizerStyle, 'secondary', exportPromptMode === 'save', isRendering || isPreparingDrag, 'w-28 h-10')}
                        aria-label={isRendering ? 'Rendering your beat' : 'Save your beat'}
                    >
                        {isRendering 
                            ? <span className="text-xs tracking-wider animate-pulse">SAVING...</span>
                            : <>
                                <DownloadIcon className="w-4 h-4" />
                                <span className="ml-1.5 text-xs tracking-wider">SAVE</span>
                              </>
                        }
                    </button>
                </Tooltip>
            </div>
            <Tooltip text={isPlaying ? "Pause sequence (Spacebar)" : "Play sequence (Spacebar)"}>
                <button
                    onClick={onPlayToggle}
                    className={getButtonStyle(visualizerStyle, 'primary', false, false, 'w-28 h-12')}
                    aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
                >
                    {isPlaying 
                        ? <PauseIcon className="w-6 h-6" /> 
                        : <PlayIcon className="w-6 h-6" />}
                    <span className="ml-2 text-sm tracking-wider">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>
            </Tooltip>
            <div className="flex flex-col items-center gap-1">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">BEAT SWITCH</span>
                <div className="flex items-center gap-2" role="group" aria-label="Pattern selector">
                    <Tooltip text="Switch to Pattern A">
                        <button
                            onClick={() => onPatternToggle('a')}
                            className={getButtonStyle(visualizerStyle, 'secondary', activePattern === 'a', false, 'w-14 h-12 text-lg')}
                            aria-pressed={activePattern === 'a'}
                        >
                            A
                        </button>
                    </Tooltip>
                    <Tooltip text="Switch to Pattern B">
                        <button
                            onClick={() => onPatternToggle('b')}
                            className={getButtonStyle(visualizerStyle, 'secondary', activePattern === 'b', false, 'w-14 h-12 text-lg')}
                            aria-pressed={activePattern === 'b'}
                        >
                            B
                        </button>
                    </Tooltip>
                </div>
            </div>

            <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">PATTERN SELECT</span>
                <div className="flex items-center gap-2" role="group" aria-label="Pattern selection slots">
                    {savedPatterns.map((pattern, index) => (
                        <Tooltip key={index} text={`Load Pattern ${index + 1}`}>
                            <PatternSlotButton 
                                slotIndex={index}
                                hasContent={hasContentInPattern(pattern)}
                                isActive={currentPatternIndex === index}
                                onClick={onSelectPattern}
                                visualizerStyle={visualizerStyle}
                            />
                        </Tooltip>
                    ))}
                </div>
                {(!isCurrentPatternEmpty || isPoofing) && (
                     <Tooltip text={isConfirmingClear ? "Click again to confirm clearing pattern" : "Click twice to erase all notes in current pattern"}>
                         <button
                            ref={clearButtonRef}
                            type="button"
                            onClick={handleClearClick}
                            onMouseDown={handleClearStart}
                            onMouseUp={handleClearEnd}
                            onMouseLeave={handleClearEnd}
                            onTouchStart={handleClearStart}
                            onTouchEnd={handleClearEnd}
                            className={`${getButtonStyle(
                                visualizerStyle,
                                'danger',
                                isConfirmingClear,
                                false,
                                `mt-2 px-3 h-8 text-xs overflow-hidden ${isConfirmingClear ? 'animate-pulse ring-1 ring-red-400' : ''}`
                            )} ${isPoofing ? 'animate-poof' : ''}`}
                            style={{ transform: `scale(${1 - clearProgress * 0.15})` }}
                            aria-label={isConfirmingClear ? "Click to confirm clear pattern" : "Click to clear pattern"}
                        >
                            <span className="relative z-10 pointer-events-none">
                                {isConfirmingClear ? 'CLICK TO CONFIRM' : 'CLICK TO CLEAR PATTERN'}
                            </span>
                        </button>
                    </Tooltip>
                )}
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex flex-col gap-3">
                    <Tooltip text="Adjust the overall output volume of the drum machine" isInteracting={isInteractingWithSlider || editingField === 'volume'}>
                        <div className="flex items-center gap-2">
                            <label htmlFor="master-volume" className="w-16 text-gray-400 flex items-center" aria-label="Master Volume">
                                <VolumeIcon className="w-6 h-6 text-gray-100" />
                            </label>
                            <input
                                type="range"
                                id="master-volume"
                                min={0}
                                max={1}
                                step="0.01"
                                value={masterVolume}
                                onChange={onMasterVolumeChange}
                                {...sliderInteractionProps}
                                className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <EditableValue
                                valueDisplay={`${Math.round(masterVolume * 100)}%`}
                                initialInput={String(Math.round(masterVolume * 100))}
                                ariaLabel="Master volume percent"
                                title="Click to type master volume (0-100)"
                                visualizerStyle={visualizerStyle}
                                isEditing={editingField === 'volume'}
                                onStartEdit={() => setEditingField('volume')}
                                onCancelEdit={() => setEditingField(null)}
                                onCommit={handleCommitVolume}
                            />
                        </div>
                    </Tooltip>
                    <Tooltip text="Set the playback speed in Beats Per Minute" isInteracting={isInteractingWithSlider || editingField === 'tempo'}>
                        <div className="flex items-center gap-2">
                            <label htmlFor="tempo" className="w-16 text-sm text-gray-400 font-bold uppercase tracking-wider">
                                BPM
                            </label>
                            <input
                                type="range"
                                id="tempo"
                                min={MIN_TEMPO}
                                max={MAX_TEMPO}
                                value={tempo}
                                onChange={onTempoChange}
                                {...sliderInteractionProps}
                                className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <EditableValue
                                valueDisplay={String(tempo)}
                                initialInput={String(tempo)}
                                ariaLabel="Tempo in BPM"
                                title={`Click to type BPM (${MIN_TEMPO}-${MAX_TEMPO})`}
                                visualizerStyle={visualizerStyle}
                                isEditing={editingField === 'tempo'}
                                onStartEdit={() => setEditingField('tempo')}
                                onCancelEdit={() => setEditingField(null)}
                                onCommit={handleCommitTempo}
                            />
                        </div>
                    </Tooltip>
                    <Tooltip text="Add a shuffle feel by delaying every second 16th note" isInteracting={isInteractingWithSlider || editingField === 'swing'}>
                        <div className="flex items-center gap-2">
                            <label htmlFor="swing" className="w-16 text-sm text-gray-400 font-bold uppercase tracking-wider">
                                Swing
                            </label>
                             <input
                                type="range"
                                id="swing"
                                min={0}
                                max={1}
                                step="0.01"
                                value={swing}
                                onChange={onSwingChange}
                                {...sliderInteractionProps}
                                className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <EditableValue
                                valueDisplay={`${Math.round(swing * 100)}%`}
                                initialInput={String(Math.round(swing * 100))}
                                ariaLabel="Swing percent"
                                title="Click to type swing percent (0-100)"
                                visualizerStyle={visualizerStyle}
                                isEditing={editingField === 'swing'}
                                onStartEdit={() => setEditingField('swing')}
                                onCancelEdit={() => setEditingField(null)}
                                onCommit={handleCommitSwing}
                            />
                        </div>
                    </Tooltip>
                </div>

                {visualizerStyle !== 'minimal' && (
                    <div className="flex flex-col items-center gap-2">
                        <label htmlFor="color-knob" className="font-bold text-gray-100 text-sm">
                            6 7
                        </label>
                        <div
                            id="color-knob"
                            role="slider"
                            aria-valuemin={0}
                            aria-valuemax={360}
                            aria-valuenow={Math.round(hueRotate)}
                            aria-label="Color Hue"
                            tabIndex={0}
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            className={`relative w-16 h-16 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center select-none transition-transform active:scale-[0.98] ${
                                visualizerStyle === 'braun'
                                    ? 'bg-gradient-to-b from-[#faf8f5] to-[#dcd9d0] border border-[#a8a498] shadow-[0_3px_6px_rgba(0,0,0,0.18),inset_0_1px_0_#fff]'
                                    : visualizerStyle === 'bauhaus'
                                    ? 'bg-[#f2b705] border-2 border-[#141413] shadow-[3px_3px_0px_#141413]'
                                    : visualizerStyle === 'nagra'
                                    ? 'bg-gradient-to-b from-[#fff8eb] via-[#ffc4a3] to-[#f77b65] border-2 border-white shadow-[0_6px_16px_rgba(217,50,94,0.3),inset_0_2px_4px_#ffffff]'
                                    : visualizerStyle === 'koto'
                                    ? 'bg-gradient-to-b from-[#241b26] to-[#110c13] border border-[#d4af37]/60 shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(212,175,55,0.3)]'
                                    : visualizerStyle === 'cyberpunk'
                                    ? 'bg-[#0a0a0f] border-2 border-[#00ff9f] shadow-[3px_3px_0px_#ff003c]'
                                    : visualizerStyle === 'default'
                                    ? 'bg-gradient-to-b from-[#173663] to-[#0b1d38] border-2 border-[#a8dcff]/70 shadow-[0_6px_18px_rgba(3,10,24,0.45),inset_0_1px_1px_rgba(255,255,255,0.22)]'
                                    : 'bg-gray-700 shadow-inner ring-1 ring-gray-600'
                            } ${isColorAnimating ? 'animate-pulse ring-2 ring-pink-500 ring-offset-2' : ''}`}
                        >
                            {/* Indicator Line */}
                            <div
                                className="absolute w-full h-full"
                                style={{ transform: `rotate(${hueRotate}deg)` }}
                            >
                                <div
                                    className={`absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3.5 ${
                                        visualizerStyle === 'braun'
                                            ? 'bg-[#ea5b0c] rounded-full'
                                            : visualizerStyle === 'bauhaus'
                                            ? 'bg-[#d62828] border border-[#141413]'
                                            : visualizerStyle === 'nagra'
                                            ? 'bg-[#d9325e] rounded-full shadow-[0_0_6px_#ff5e4d]'
                                            : visualizerStyle === 'koto'
                                            ? 'bg-[#d4af37] rounded-full shadow-[0_0_5px_#d4af37]'
                                            : visualizerStyle === 'cyberpunk'
                                            ? 'bg-[#fcee0a]'
                                            : visualizerStyle === 'default'
                                            ? 'bg-[#ffc4d6] rounded-full shadow-[0_0_6px_rgba(255,196,214,0.7)]'
                                            : 'bg-pink-400 rounded-full'
                                    }`}
                                />
                            </div>
                            <span className="text-2xl z-10 pointer-events-none">😎</span>
                        </div>
                    </div>
                )}
            </div>

            {(visualizerStyle !== 'minimal' || isCappuccinoMode) && (
                <div
                    role="button"
                    tabIndex={isPlaying ? 0 : -1}
                    aria-label="Trigger airhorn"
                    onPointerDown={(e) => {
                        if (!isPlaying) return;
                        e.preventDefault();
                        onCatClick();
                    }}
                    onKeyDown={(e) => {
                        if (!isPlaying) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onCatClick();
                        }
                    }}
                    className={`select-none touch-manipulation transition-transform duration-75 ${isPlaying ? 'cursor-pointer active:scale-95' : ''}`}
                >
                    {isCappuccinoMode ? (
                        <DancingCoffeeCup isPlaying={isPlaying} tempo={tempo} currentStep={currentStep} visualizerStyle={visualizerStyle} />
                    ) : (
                        <DancingCat isPlaying={isPlaying} tempo={tempo} currentStep={currentStep} visualizerStyle={visualizerStyle} />
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(Controls);