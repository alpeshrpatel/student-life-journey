import { cva } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn.js";

const buttonStyles = cva(
  "relative inline-flex select-none items-center justify-center gap-2 rounded-md font-extrabold text-control transition-colors duration-(--duration-fast) disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed",
        secondary: "border border-control text-ink",
        ghost: "text-accent",
        icon: "min-w-11 border border-control px-0 text-ink",
      },
      size: { md: "h-11 px-4", lg: "h-12 px-5" },
      block: { true: "w-full justify-start text-start", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

interface ButtonBaseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  size?: "md" | "lg";
  /** Full width with the label flush left. */
  block?: boolean;
  /** Disables the button and shows `loadingLabel`; the button keeps its width. */
  loading?: boolean;
  loadingLabel?: string;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
}

export type ButtonProps = ButtonBaseProps &
  (
    | { variant?: "primary" | "secondary" | "ghost"; "aria-label"?: string }
    | { variant: "icon"; "aria-label": string }
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    block = false,
    loading = false,
    loadingLabel,
    iconStart,
    iconEnd,
    type = "button",
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const inactive = disabled === true || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={inactive}
      aria-disabled={inactive || undefined}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size, block }), className)}
      {...rest}
    >
      <span
        aria-hidden={loading || undefined}
        className={cn("inline-flex items-center gap-2", loading && "invisible")}
      >
        {iconStart === undefined ? null : <span aria-hidden="true">{iconStart}</span>}
        {children}
        {iconEnd === undefined ? null : <span aria-hidden="true">{iconEnd}</span>}
      </span>
      {loading ? (
        <span
          className={cn(
            "absolute inset-0 inline-flex items-center gap-2 px-4",
            block ? "justify-start" : "justify-center",
          )}
        >
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          {loadingLabel}
        </span>
      ) : null}
    </button>
  );
});
