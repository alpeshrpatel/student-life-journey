import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Non-interactive unit or currency label shown inside the start edge, e.g. "$". */
  prefix?: string;
}

const NO_SPINNERS =
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&[type=number]]:[appearance:textfield]";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, prefix, className, ...rest },
  ref,
) {
  const control = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-11 w-full rounded-md border bg-surface px-2.5 text-body text-ink placeholder:text-ink-tertiary focus:border-accent disabled:cursor-not-allowed disabled:opacity-45",
        invalid ? "border-urgent-edge" : "border-control",
        prefix === undefined ? null : "ps-8",
        NO_SPINNERS,
        className,
      )}
      {...rest}
    />
  );
  if (prefix === undefined) {
    return control;
  }
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-body text-ink-secondary"
      >
        {prefix}
      </span>
      {control}
    </div>
  );
});
