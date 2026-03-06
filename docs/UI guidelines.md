# Agentic Application Development — Design System & Agent Prompt

---

## 1. Dependencies to Install

```bash
# Core
npm install framer-motion
npm install canvas-confetti
npm install @tsparticles/react @tsparticles/engine @tsparticles/slim

# Fonts (add to next.config or load via Google Fonts)
# VT323 — CRT/Pip-Boy bitmap terminal
# Share Tech Mono — Fallout/retro sci-fi
# IBM Plex Mono — Mainframe/corporate
# Fira Code — Holographic/modern
# JetBrains Mono — Fallback monospace

# Optional but useful
npm install party-js              # Simple one-liner celebrations
npm install react-hot-toast       # Styled toast notifications
npm install sonner                # Better toast alternative (works with framer-motion)
npm install zustand               # Lightweight state for celebrations/toasts
```

### Google Fonts Import (layout.tsx or globals.css)

```css
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&family=IBM+Plex+Mono:wght@400;500;600;700&family=Fira+Code:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```

---

## 2. CSS Variables — Global Theme System

```css
:root {
  /* === Base dark palette === */
  --bg-root: #08080e;
  --bg-panel: #0a0a12;
  --bg-card: #111119;
  --bg-elevated: #161625;
  --border-subtle: #161625;
  --border-default: #1e1e2e;
  --border-strong: #2a2a3e;

  /* === Text === */
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --text-dim: #475569;
  --text-ghost: #334155;

  /* === Agent colors === */
  --color-explorer: #06b6d4;
  --color-analyst: #f59e0b;
  --color-fixer: #8b5cf6;
  --color-ux: #ec4899;
  --color-architect: #22c55e;
  --color-human: #6366f1;

  /* === Status colors === */
  --color-pass: #4ade80;
  --color-fail: #f87171;
  --color-warn: #fbbf24;
  --color-info: #94a3b8;
  --color-critical: #ef4444;
  --color-high: #f97316;
  --color-medium: #eab308;
  --color-low: #22c55e;

  /* === Theme accent (changes per theme) === */
  --accent-primary: #6366f1;
  --accent-glow: rgba(99, 102, 241, 0.15);

  /* === Typography === */
  --font-mono: 'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace;
  --font-terminal: 'IBM Plex Mono', monospace;

  /* === Scanline overlay (Pip-Boy / CRT) === */
  --scanline-opacity: 0;
  --vignette-opacity: 0;
  --phosphor-glow: none;
}

/* === THEME: Pip-Boy === */
[data-theme="pip-boy"] {
  --bg-root: #0a1a0a;
  --bg-panel: #0c1f0c;
  --bg-card: #0e260e;
  --border-default: #1a3a1a;
  --text-primary: #20c20e;
  --text-secondary: #18a018;
  --text-muted: #0e8a0e;
  --text-dim: #0a6a0a;
  --accent-primary: #20c20e;
  --accent-glow: rgba(32, 194, 14, 0.12);
  --font-terminal: 'Share Tech Mono', monospace;
  --scanline-opacity: 0.15;
  --vignette-opacity: 0.6;
  --phosphor-glow: 0 0 8px rgba(32, 194, 14, 0.3);
  --color-explorer: #20c20e;
  --color-analyst: #20c20e;
  --color-fixer: #20c20e;
  --color-ux: #20c20e;
}

/* === THEME: CRT Phosphor === */
[data-theme="crt"] {
  --bg-root: #001200;
  --bg-panel: #001800;
  --bg-card: #002000;
  --border-default: #0a2a0a;
  --text-primary: #33ff33;
  --text-secondary: #22cc22;
  --text-muted: #1a8a1a;
  --accent-primary: #33ff33;
  --font-terminal: 'VT323', monospace;
  --scanline-opacity: 0.25;
  --vignette-opacity: 0.7;
  --phosphor-glow: 0 0 12px rgba(51, 255, 51, 0.4);
  --color-explorer: #33ff33;
  --color-analyst: #ffcc00;
  --color-fixer: #33ff33;
  --color-ux: #ff6666;
}

/* === THEME: Mainframe === */
[data-theme="mainframe"] {
  --bg-root: #0d1117;
  --bg-panel: #101820;
  --bg-card: #161b22;
  --border-default: #21262d;
  --text-primary: #e6edf3;
  --text-secondary: #b0bec5;
  --text-muted: #546e7a;
  --accent-primary: #00e5ff;
  --accent-glow: rgba(0, 229, 255, 0.1);
  --font-terminal: 'IBM Plex Mono', monospace;
  --color-explorer: #00e5ff;
  --color-analyst: #ffab00;
  --color-fixer: #d500f9;
  --color-ux: #ff1744;
}

/* === THEME: Holographic (default) === */
[data-theme="holographic"] {
  /* Uses the base :root values */
}
```

### Scanline and CRT Overlay Components

```css
/* Apply to any terminal/stream container */
.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, var(--scanline-opacity)) 2px,
    rgba(0, 0, 0, var(--scanline-opacity)) 4px
  );
}

.vignette::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  border-radius: inherit;
  background: radial-gradient(
    ellipse at center,
    transparent 50%,
    rgba(0, 0, 0, var(--vignette-opacity)) 100%
  );
}

/* Phosphor text glow — apply to text elements in CRT/Pip-Boy themes */
.phosphor-text {
  text-shadow: var(--phosphor-glow);
}
```

---

## 3. Celebration Effects — Full Catalog

### Effect 1: Confetti Burst (canvas-confetti)

```typescript
import confetti from 'canvas-confetti';

// Basic burst from center
confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

// Side cannons (fires from both edges)
const sideCannons = () => {
  const end = Date.now() + 3000;
  const colors = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];
  const frame = () => {
    if (Date.now() > end) return;
    confetti({ particleCount: 2, angle: 60, spread: 55, startVelocity: 60, origin: { x: 0, y: 0.5 }, colors });
    confetti({ particleCount: 2, angle: 120, spread: 55, startVelocity: 60, origin: { x: 1, y: 0.5 }, colors });
    requestAnimationFrame(frame);
  };
  frame();
};

// Fireworks (random positions over 5 seconds)
const fireworks = () => {
  const duration = 5000;
  const end = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
  const interval = setInterval(() => {
    if (Date.now() > end) return clearInterval(interval);
    const count = 50 * ((end - Date.now()) / duration);
    confetti({ ...defaults, particleCount: count, origin: { x: Math.random() * 0.6 + 0.2, y: Math.random() - 0.2 } });
  }, 250);
};

// Gold stars (for UX score milestones)
const goldStars = () => {
  const defaults = { spread: 360, ticks: 50, gravity: 0, decay: 0.94, startVelocity: 30,
    colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'] };
  confetti({ ...defaults, particleCount: 40, scalar: 1.2, shapes: ['star'] });
  confetti({ ...defaults, particleCount: 10, scalar: 0.75, shapes: ['circle'] });
};

// Emoji explosion (custom shapes)
const emojiExplosion = (emoji: string) => {
  const scalar = 2;
  const shape = confetti.shapeFromText({ text: emoji, scalar });
  const defaults = { spread: 360, ticks: 60, gravity: 0, decay: 0.96, startVelocity: 20, shapes: [shape], scalar };
  confetti({ ...defaults, particleCount: 30 });
  confetti({ ...defaults, particleCount: 10, scalar: scalar / 2, shapes: ['circle'] });
};

// Usage: emojiExplosion('🚀') or emojiExplosion('✅') or emojiExplosion('🎯')
```

### Effect 2: Screen Shake (Framer Motion)

```typescript
import { useAnimationControls } from 'framer-motion';

const useScreenShake = () => {
  const controls = useAnimationControls();

  const shake = () => controls.start({
    x: [0, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.5, ease: 'easeInOut' }
  });

  // Heavier shake for critical errors
  const heavyShake = () => controls.start({
    x: [0, -12, 12, -8, 8, -4, 4, 0],
    y: [0, -3, 3, -2, 2, 0],
    transition: { duration: 0.6 }
  });

  return { controls, shake, heavyShake };
};

// Wrap main container: <motion.div animate={controls}>...</motion.div>
```

### Effect 3: Glow Pulse (Framer Motion + CSS)

```typescript
// Pulse glow on a card or panel when something important happens
const glowPulse = {
  boxShadow: [
    '0 0 0 rgba(99, 102, 241, 0)',
    '0 0 30px rgba(99, 102, 241, 0.4)',
    '0 0 60px rgba(99, 102, 241, 0.2)',
    '0 0 0 rgba(99, 102, 241, 0)',
  ],
  transition: { duration: 1.5, ease: 'easeInOut' }
};

// Agent-colored glow when that agent completes a task
const agentGlow = (color: string) => ({
  boxShadow: [`0 0 0 ${color}00`, `0 0 40px ${color}66`, `0 0 0 ${color}00`],
  transition: { duration: 2, ease: 'easeInOut' }
});
```

### Effect 4: Achievement Toast (Framer Motion + AnimatePresence)

```typescript
import { motion, AnimatePresence } from 'framer-motion';

// Toast slides in from the right with spring physics
const achievementToast = {
  initial: { opacity: 0, x: 80, scale: 0.9 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 80, scale: 0.9 },
  transition: { type: 'spring', stiffness: 300, damping: 24 }
};

// Example toast content for milestones:
// 🎯 "TSK-001 Resolved" — first task fixed
// ⚡ "Clean Cycle" — 0 new findings
// 🏆 "All Criticals Clear" — no more critical issues
// ✨ "UX Score 8.0+" — non-technical user threshold
// 🚀 "Pipeline Converged" — analyst says STOP
```

### Effect 5: Number Counter Animation (Framer Motion)

```typescript
import { useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

// Animated counter for stats (tokens consumed, tasks resolved, etc.)
function AnimatedCounter({ from, to, duration = 1 }: { from: number; to: number; duration?: number }) {
  const count = useMotionValue(from);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, to, { duration });
    return controls.stop;
  }, [to]);

  return <motion.span>{rounded}</motion.span>;
}
```

### Effect 6: Particle Background (tsParticles — for idle/ambient state)

```typescript
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

// Subtle floating particles in the background of the terminal area
const particleConfig = {
  particles: {
    number: { value: 30 },
    color: { value: '#6366f1' },
    opacity: { value: 0.08 },
    size: { value: { min: 1, max: 3 } },
    move: { enable: true, speed: 0.3, direction: 'none' as const, outModes: { default: 'bounce' as const } },
    links: { enable: true, color: '#6366f1', opacity: 0.04, distance: 150 },
  },
  background: { color: 'transparent' },
};

// Fireworks preset for victory screen
const fireworksConfig = {
  preset: 'fireworks',
  background: { color: 'transparent' },
};
```

### Effect 7: Progress Ring Animation (SVG + Framer Motion)

```typescript
// Animated ring for cycle progress, UX score, context utilization
const ProgressRing = ({ progress, color, size = 60 }: { progress: number; color: string; size?: number }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none"
        stroke="var(--border-default)" strokeWidth="4" />
      <motion.circle cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1, ease: 'easeOut' }}
        transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
};
```

### Effect 8: party.js (One-liner celebrations)

```typescript
import party from 'party-js';

// Confetti from a specific element
party.confetti(document.getElementById('task-card'));

// Sparkles from an element
party.sparkles(document.getElementById('ux-score'));

// The advantage: it shoots FROM the element, not from screen center
```

### Celebration Trigger Map

| Milestone | Effect Combination |
|-----------|-------------------|
| First task discovered | Achievement toast + agent glow pulse |
| First task resolved | Confetti burst (small) + achievement toast |
| CRITICAL finding resolved | Side cannons confetti + screen shake (gentle) + toast |
| All CRITICALs cleared | Fireworks (5s) + gold stars + full-screen glow pulse |
| UX score crosses 8.0 average | Gold stars + `party.sparkles` on score panel |
| UX verdict changes to "YES" | Fireworks + emoji explosion ('🎉') + toast |
| Clean cycle (0 new findings) | Star confetti + "Clean Cycle" badge with glow |
| Pipeline converges (STOP) | Victory fireworks (5s) + particle background switches to fireworks preset + final summary toast |
| Build succeeds after fix | Small green confetti from fixer panel + `✓` toast |
| Build fails after fix | Screen shake (heavy) + red glow pulse on fixer panel |
| 100 lifetime tasks | Emoji explosion ('💯') + achievement toast |
| New cycle starts | Subtle glow pulse on workflow graph active node |

---

## 4. The Agent Prompt

Copy this entire block and give it to your coding agent. It has everything it needs to implement the theme system, celebration effects, and terminal styling.

---

```markdown
## Task: Implement the Agentic Application Development Design System

You are building a Next.js application called "Agentic Application Development" — a dark-mode dashboard
that visualizes an autonomous agent pipeline. The app uses the GitHub Copilot SDK on the backend and
streams agent output to a React frontend.

### Design System Implementation

#### 1. Theme System

Implement a theme switcher with 4 themes: "holographic" (default), "pip-boy", "crt", "mainframe".
Use `data-theme` attribute on the `<html>` element and CSS variables for all colors.

The CSS variables are defined below. Apply them to your `globals.css`. All component styles should
reference these variables exclusively — never hardcode colors.

[PASTE THE FULL CSS VARIABLES FROM SECTION 2 ABOVE]

Store the selected theme in localStorage and provide a dropdown in the Settings panel to switch themes.
When switching themes, the change should be instant (no page reload).

#### 2. Terminal/Stream Panel Styling

The agent output stream panel is the main visual element. Apply these effects based on the active theme:

**All themes:**
- Font: `var(--font-terminal)` 
- Background: `var(--bg-panel)`
- Text colors per line type: pass=`var(--color-pass)`, fail=`var(--color-fail)`, 
  warn=`var(--color-warn)`, info=`var(--text-secondary)`, task=agent's color
- Agent label prefix on each line, colored with that agent's `--color-{agent}` variable
- Blinking cursor at the bottom when pipeline is active

**Pip-Boy and CRT themes additionally:**
- Scanline overlay using `.scanlines` CSS class (repeating-linear-gradient, 2-4px intervals)
- Vignette overlay using `.vignette` CSS class (radial-gradient darkening edges)
- Text glow using `text-shadow: var(--phosphor-glow)` on all terminal text
- Pip-Boy: monochromatic (all agent text same green color), "ROBCO INDUSTRIES" header
- CRT: multi-color (different colors per agent/status), VT323 font at 15px, 
  heavier scanlines (3px, 0.25 opacity), deeper box-shadow inset for "sunk" CRT feel

**Mainframe theme additionally:**
- Subtle grid background (1px lines at 20px intervals, 3% opacity, cyan)
- Metrics bar in terminal header showing CPU%, CTX%, Token count
- Each agent gets their own distinct color (cyan/amber/purple/red)

#### 3. Celebration Effects

Install these packages:
- `canvas-confetti` — for all confetti/firework effects
- `framer-motion` — already installed, use for screen shake, glow, toasts, counters
- `@tsparticles/react` + `@tsparticles/engine` + `@tsparticles/slim` — ambient particles + fireworks preset
- `party-js` — for element-targeted sparkles/confetti

Create a `lib/celebrations.ts` utility that exports these functions:

- `confettiBurst()` — basic confetti from center
- `sideCannons(colors?)` — confetti from both screen edges
- `fireworks(durationMs?)` — random fireworks across screen
- `goldStars()` — gold star shapes for UX milestones  
- `emojiExplosion(emoji)` — custom emoji particles (e.g., '🚀', '✅', '🎯', '💯')
- `screenShake(intensity: 'light' | 'heavy')` — returns framer-motion animation controls
- `glowPulse(color)` — returns framer-motion boxShadow animation values
- `agentGlow(agentId)` — glow pulse in that agent's theme color

Create an `AchievementToast` component using framer-motion AnimatePresence:
- Slides in from the right with spring physics
- Shows icon + title + description
- Auto-dismisses after 4 seconds
- Stacks vertically if multiple toasts fire

Create a `CelebrationManager` context/provider that:
- Listens to task status changes and cycle completions
- Automatically triggers the correct celebration based on the milestone
- Uses this trigger map:

| Event | Effects |
|-------|---------|
| Task resolved | Small confetti + achievement toast |
| All CRITICALs cleared | Fireworks (5s) + side cannons + toast |
| UX score > 8.0 | Gold stars + sparkles on score panel |
| UX verdict "YES" | Fireworks + emoji '🎉' + toast |
| Clean cycle | Star confetti + "Clean Cycle" badge glow |
| Pipeline converges | Victory fireworks + summary toast |
| Build succeeds | Small green confetti from fixer panel |
| Build fails | Screen shake (heavy) + red glow on fixer panel |
| Cycle starts | Subtle glow pulse on active workflow node |

#### 4. Workflow Graph

The pipeline visualization is an SVG showing 4 agent nodes in a horizontal flow with a loop-back arc.
Use framer-motion for:
- Pulsing glow on the active node (`animate={{ scale: [1, 1.05, 1] }}` with `transition={{ repeat: Infinity }}`)
- Animated traveling dot on the active edge (SVG `animateMotion`)
- Cycle count displayed on the loop-back arc

Node colors use the `--color-{agent}` CSS variables.

#### 5. Key Framer Motion Patterns

Use these animation presets throughout the UI:

```typescript
// Stagger children on mount
const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const staggerItem = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

// Layout animation for task list reordering
<motion.div layout layoutId={task.id} />

// AnimatePresence for modals
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {/* modal content */}
    </motion.div>
  )}
</AnimatePresence>

// Number counters for stats
const count = useMotionValue(0);
const rounded = useTransform(count, v => Math.round(v));
useEffect(() => { animate(count, targetValue, { duration: 1 }); }, [targetValue]);
```

#### 6. Critical Layout Rules

- Agent output stream: `flex: 1; overflow-y: auto; min-height: 0` — scrolls internally
- Steering bar: `flex-shrink: 0` — NEVER moves, always pinned to bottom
- Right panel: `overflow-y: auto; min-height: 0` — scrolls internally
- Modals: `position: fixed; inset: 0; z-index: 50` with backdrop blur
- The stream panel must NEVER push the steering bar or other UI elements down

#### 7. Typography

- All UI text: `var(--font-mono)`
- Terminal output: `var(--font-terminal)` (changes per theme)
- Agent labels: uppercase, letter-spacing 0.06em, font-weight 700, 9-10px
- Section headers: uppercase, letter-spacing 0.06em, font-weight 700, 10-11px, `var(--text-muted)`
- Body text: 12px, `var(--text-secondary)`
- Emphasis: `var(--text-primary)`, font-weight 700

#### 8. File References

The full specification with data models, API routes, SDK patterns, and phase plan is in:
`AGENTIC-APP-DEV-SPEC.md`

Refer to that document for the TypeScript interfaces (Task, TimelineEntry, Project, CycleReport),
the SQLite schema, the API route structure, and the OTel instrumentation patterns.
```

---

## 5. Reference Links

| Resource | URL |
|----------|-----|
| Framer Motion docs | https://motion.dev/docs |
| Framer Motion examples (330+) | https://examples.motion.dev/react |
| canvas-confetti npm | https://www.npmjs.com/package/canvas-confetti |
| canvas-confetti demos (magic ui) | https://magicui.design/docs/components/confetti |
| tsParticles React | https://github.com/tsparticles/tsparticles |
| tsParticles presets (confetti, fireworks, firefly) | https://particles.js.org |
| party-js (element-targeted effects) | https://party.js.org |
| react-confetti-explosion (CSS-only) | https://www.npmjs.com/package/react-confetti-explosion |
| VT323 font (CRT bitmap) | https://fonts.google.com/specimen/VT323 |
| Share Tech Mono (retro sci-fi) | https://fonts.google.com/specimen/Share+Tech+Mono |
| IBM Plex Mono (mainframe) | https://fonts.google.com/specimen/IBM+Plex+Mono |
| Fira Code (modern dev) | https://fonts.google.com/specimen/Fira+Code |
| sonner (toast library) | https://sonner.emilkowal.dev |
| Advanced framer-motion patterns | https://blog.maximeheckel.com/posts/advanced-animation-patterns-with-framer-motion/ |
| Framer motion shake animation | https://kodaschool.com/blog/creaing-interactive-ui-elements-with-framer-motion |