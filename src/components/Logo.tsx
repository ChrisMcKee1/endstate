"use client";

import { motion } from "framer-motion";

// Brand logo SVG — hex colors are intentional for precise SVG rendering.
// These correspond to design tokens: accent (#E8B94A), accent-violet (#B026FF),
// accent-emerald (#00FFA3), surface (#151721), text-primary (#F0F4F8), text-secondary (#8E9BB5).

// Draw animation: each path segment draws itself in sequence
const DRAW_TRANSITION = { duration: 1.2, ease: "easeInOut" as const };
const DRAW_DELAY_STEP = 0.15;

interface LogoProps {
  isProcessing?: boolean;
  className?: string;
  /** Show tagline text beneath the mark */
  showTagline?: boolean;
}

export function Logo({ isProcessing = false, className = "", showTagline = true }: LogoProps) {
  return (
    <div className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 160 120"
        width="100%"
        height="100%"
        className="endstate-logo"
        role="img"
        aria-label="Endstate logo"
      >
        <defs>
          <radialGradient id="ambientAura" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="rgba(232, 185, 74, 0.08)" />
            <stop offset="50%" stopColor="rgba(176, 38, 255, 0.03)" />
            <stop offset="100%" stopColor="rgba(10, 11, 16, 0)" />
          </radialGradient>

          <linearGradient id="journeyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E8B94A" />
            <stop offset="50%" stopColor="#B026FF" />
            <stop offset="100%" stopColor="#00FFA3" />
          </linearGradient>

          <filter id="emeraldGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="160" height="120" fill="transparent" />
        <circle cx="80" cy="43" r="60" fill="url(#ambientAura)" />

        {/* Vertical spine — the "E" backbone */}
        <motion.line x1="45" y1="23" x2="45" y2="63" stroke="#E8B94A" strokeWidth="3.5" strokeLinecap="round" filter="url(#neonGlow)"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ ...DRAW_TRANSITION, delay: DRAW_DELAY_STEP * 0 }} />
        <motion.circle cx="45" cy="23" r="3" fill="#151721" stroke="#E8B94A" strokeWidth="2"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ ...DRAW_TRANSITION, delay: DRAW_DELAY_STEP * 1 }} />
        <motion.circle cx="45" cy="43" r="3" fill="#151721" stroke="#E8B94A" strokeWidth="2"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ ...DRAW_TRANSITION, delay: DRAW_DELAY_STEP * 2 }} />
        <motion.circle cx="45" cy="63" r="3" fill="#151721" stroke="#E8B94A" strokeWidth="2"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ ...DRAW_TRANSITION, delay: DRAW_DELAY_STEP * 3 }} />

        {/* Top & bottom journey paths */}
        <motion.path d="M 48 23 L 60 23 C 85 23, 95 43, 115 43" fill="none" stroke="url(#journeyGrad)" strokeWidth="2" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ ...DRAW_TRANSITION, delay: DRAW_DELAY_STEP * 4 }} />
        <motion.path d="M 48 63 L 60 63 C 85 63, 95 43, 115 43" fill="none" stroke="url(#journeyGrad)" strokeWidth="2" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ ...DRAW_TRANSITION, delay: DRAW_DELAY_STEP * 5 }} />

        {/* Middle prong → infinity loop */}
        <motion.line x1="48" y1="43" x2="55" y2="43" stroke="#E8B94A" strokeWidth="2" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ ...DRAW_TRANSITION, delay: DRAW_DELAY_STEP * 6 }} />
        <path
          d="M 80 43 C 88 27, 105 27, 105 43 C 105 59, 88 59, 80 43 C 72 27, 55 27, 55 43 C 55 59, 72 59, 80 43 Z"
          fill="none"
          stroke="rgba(176, 38, 255, 0.2)"
          strokeWidth="2.5"
        />
        <motion.path
          className={isProcessing ? "agent-loop-animated" : undefined}
          d="M 80 43 C 88 27, 105 27, 105 43 C 105 59, 88 59, 80 43 C 72 27, 55 27, 55 43 C 55 59, 72 59, 80 43 Z"
          fill="none"
          stroke="#B026FF"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          filter="url(#neonGlow)"
          initial={{ pathLength: 0, pathOffset: 0 }}
          animate={{ pathLength: 1, pathOffset: isProcessing ? [0, 1] : 0 }}
          transition={{
            pathLength: { ...DRAW_TRANSITION, delay: DRAW_DELAY_STEP * 7 },
            pathOffset: isProcessing ? { duration: 2, repeat: Infinity, ease: "linear" } : { duration: 0.3 },
          }}
        />
        <motion.line x1="105" y1="43" x2="112" y2="43" stroke="#00FFA3" strokeWidth="2" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ ...DRAW_TRANSITION, delay: DRAW_DELAY_STEP * 8 }} />

        {/* Diamond outcome */}
        <motion.polygon points="115,36 122,43 115,50 108,43" fill="#00FFA3" filter="url(#emeraldGlow)"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: DRAW_DELAY_STEP * 9 }} />
        <motion.polygon points="115,39 119,43 115,47 111,43" fill="#F0F4F8"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: DRAW_DELAY_STEP * 9 + 0.1 }} />

        {showTagline && (
          <>
            <motion.text
              x="80" y="86"
              fontFamily="'Inter', -apple-system, sans-serif"
              fontSize="6.5"
              fontWeight="600"
              fill="#8E9BB5"
              textAnchor="middle"
              letterSpacing="3.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: DRAW_DELAY_STEP * 10 }}
            >
              FROM VISION TO
            </motion.text>
            <motion.text
              x="80" y="104"
              fontFamily="'Inter', -apple-system, sans-serif"
              fontSize="16"
              fontWeight="800"
              textAnchor="middle"
              letterSpacing="4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: DRAW_DELAY_STEP * 11 }}
            >
              <tspan fill="#F0F4F8">END</tspan>
              <tspan fill="#E8B94A">STATE</tspan>
            </motion.text>
          </>
        )}
      </svg>
    </div>
  );
}
