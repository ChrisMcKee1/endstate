"use client";

import { memo, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

const _SIZES = {
  sm: "sm",
  md: "md",
  lg: "lg",
} as const;
type Size = (typeof _SIZES)[keyof typeof _SIZES];

const _VARIANTS = {
  GHOST: "ghost",
  SUBTLE: "subtle",
  ACCENT: "accent",
} as const;
type Variant = (typeof _VARIANTS)[keyof typeof _VARIANTS];

interface IconButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  /** The icon to render (SVG, emoji, or any ReactNode) */
  icon: ReactNode;
  /** Required — used as aria-label for accessibility */
  label: string;
  /** Button size: sm=28px, md=32px (default), lg=40px */
  size?: Size;
  /** Visual variant: ghost (invisible bg), subtle (faint bg on hover), accent (cyan tint) */
  variant?: Variant;
  /** Tooltip text — falls back to label if omitted */
  title?: string;
}

// ─── Static config (hoisted) ─────────────────────────────────────────────────

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5",
  md: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
  lg: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
};

const VARIANT_CLASSES: Record<Variant, string> = {
  ghost:
    "text-text-muted hover:text-text-primary hover:bg-white/[0.04]",
  subtle:
    "text-text-muted hover:text-text-primary bg-white/[0.02] hover:bg-white/[0.06]",
  accent:
    "text-text-muted hover:text-accent hover:bg-accent/[0.06]",
};

const SPRING = { type: "spring" as const, stiffness: 400, damping: 17 };

// ─── Component ───────────────────────────────────────────────────────────────

export const IconButton = memo(function IconButton({
  icon,
  label,
  size = "md",
  variant = "ghost",
  title,
  className = "",
  disabled,
  ...rest
}: IconButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.1 }}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={SPRING}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        disabled ? "pointer-events-none opacity-30" : "cursor-pointer",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {icon}
    </motion.button>
  );
});
