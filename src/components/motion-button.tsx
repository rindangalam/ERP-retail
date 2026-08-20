"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

type ButtonProps = React.ComponentProps<typeof Button>;

type MotionButtonProps = ButtonProps & {
  whileHoverScale?: number;
  whileTapScale?: number;
};

const MotionButtonBase = motion.create(Button);

export function MotionButton({
  whileHoverScale = 1.02,
  whileTapScale = 0.97,
  ...props
}: MotionButtonProps) {
  const reduce = useReducedMotion();
  if (reduce) return <Button {...props} />;
  return (
    <MotionButtonBase
      whileHover={{ scale: whileHoverScale }}
      whileTap={{ scale: whileTapScale }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      {...(props as React.ComponentProps<typeof MotionButtonBase>)}
    />
  );
}