"use client";

import {
  memo,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

const _MODAL_SIZES = {
  SM: "sm",
  MD: "md",
  LG: "lg",
  XL: "xl",
  FULL: "full",
} as const;
type ModalSize = (typeof _MODAL_SIZES)[keyof typeof _MODAL_SIZES];

interface ModalProps {
  /** Controls visibility */
  isOpen: boolean;
  /** Called when the user dismisses the modal (Escape, overlay click, close button) */
  onClose: () => void;
  /** Optional title — used as aria-label and rendered in the header when provided */
  title?: string;
  /** Panel width: sm=400px, md=560px (default), lg=720px, xl=900px, full=95vw */
  size?: ModalSize;
  /** Modal body content */
  children: ReactNode;
  /** Additional classes on the panel element */
  className?: string;
}

// ─── Static config (hoisted) ─────────────────────────────────────────────────

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
  xl: "max-w-[900px]",
  full: "max-w-[95vw]",
};

const OVERLAY_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
} as const;

const PANEL_VARIANTS = {
  hidden: { opacity: 0, scale: 0.92, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
} as const;

const SPRING = { type: "spring" as const, stiffness: 350, damping: 28 };

// ─── Focus trap helpers ──────────────────────────────────────────────────────

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(e: KeyboardEvent, container: HTMLElement) {
  const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export const Modal = memo(function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  children,
  className = "",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture the element that opened the modal so we can return focus
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [isOpen]);

  // Escape key + focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        trapFocus(e, panelRef.current);
      }
    };

    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Auto-focus first focusable element in the panel
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const firstFocusable =
      panelRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    if (firstFocusable) {
      // Defer to let AnimatePresence mount complete
      requestAnimationFrame(() => firstFocusable.focus());
    }
  }, [isOpen]);

  // Return focus to trigger on close
  const handleExitComplete = useCallback(() => {
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && (
        <motion.div
          key="modal-overlay"
          variants={OVERLAY_VARIANTS}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleOverlayClick}
        >
          <motion.div
            ref={panelRef}
            key="modal-panel"
            variants={PANEL_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={SPRING}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={[
              "glass-panel relative mx-4 flex max-h-[85vh] w-full flex-col rounded-2xl",
              SIZE_CLASSES[size],
              className,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* Header — rendered when title is provided */}
            {title && (
              <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3">
                <h2 className="text-sm font-semibold tracking-wide text-text-primary">
                  {title}
                </h2>
                <CloseButton onClick={onClose} />
              </div>
            )}

            {/* Close button (floating) when no title header */}
            {!title && <CloseButton onClick={onClose} floating />}

            {/* Body */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ─── Close button (internal) ─────────────────────────────────────────────────

const CLOSE_SPRING = { type: "spring" as const, stiffness: 400, damping: 17 };

function CloseButton({
  onClick,
  floating = false,
}: {
  onClick: () => void;
  floating?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={CLOSE_SPRING}
      onClick={onClick}
      aria-label="Close"
      className={[
        "rounded-lg p-1.5 text-text-muted transition-colors hover:bg-elevated hover:text-text-primary",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50",
        floating ? "absolute right-3 top-3 z-10" : "",
      ].join(" ")}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </motion.button>
  );
}
