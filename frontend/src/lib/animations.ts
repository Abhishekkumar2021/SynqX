import { type Transition, type Variants } from 'framer-motion'

/**
 * Standard spring transition for layout elements (Sidebars, Headers, Modals)
 * Optimized for a "snappy yet fluid" feel.
 */
export const LAYOUT_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
}

/**
 * Standard variants for top-down entry (Headers)
 */
export const HEADER_VARIANTS: Variants = {
  hidden: { y: -100, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: LAYOUT_TRANSITION,
  },
  exit: {
    y: -100,
    opacity: 0,
    transition: LAYOUT_TRANSITION,
  },
}

/**
 * Standard variants for side entry (Sidebars)
 */
export const SIDEBAR_VARIANTS: Variants = {
  hidden: { x: -300, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: LAYOUT_TRANSITION,
  },
  exit: {
    x: -300,
    opacity: 0,
    transition: LAYOUT_TRANSITION,
  },
}
