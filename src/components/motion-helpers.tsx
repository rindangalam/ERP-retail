"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { useReducedMotion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

export function useMotionPrefs() {
  return { reduce: useReducedMotion(), ease: EASE };
}

export const StaggerContainer = motion.div;

export function StaggerItem({
  children,
  className,
  delay = 0,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
} & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: EASE }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export const MotionTableRow = motion.tr;

export { EASE };