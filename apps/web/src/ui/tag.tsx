import { cva } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

const tagStyles = cva("inline-block rounded-sm px-2.5 py-0.5 text-eyebrow", {
  variants: {
    tone: {
      accent: "bg-selected text-on-selected",
      urgent: "bg-urgent-tint text-on-urgent",
      neutral: "bg-surface text-ink-secondary",
      outline: "border border-accent text-accent",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "accent" | "urgent" | "neutral" | "outline";
}

export function Tag({ tone = "neutral", className, ...rest }: TagProps) {
  return <span className={cn(tagStyles({ tone }), className)} {...rest} />;
}
