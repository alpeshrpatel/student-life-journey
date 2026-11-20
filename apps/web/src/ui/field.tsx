import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** The control; its `id` must equal `htmlFor`. */
  children: ReactNode;
}

/** Builds the `aria-describedby` value for a control: the hint and error ids that exist. */
export function fieldDescribedBy(
  id: string,
  opts: { hint?: string | undefined; error?: string | undefined },
): string | undefined {
  const ids: string[] = [];
  if (opts.hint !== undefined && opts.hint !== "") ids.push(`${id}-hint`);
  if (opts.error !== undefined && opts.error !== "") ids.push(`${id}-error`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function Field({ label, htmlFor, hint, error, required = false, children }: FieldProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-meta text-ink-secondary">
        {label}
        {required ? <span className="sr-only"> {t("a11y.required")}</span> : null}
      </label>
      {children}
      {hint !== undefined && hint !== "" ? (
        <p id={`${htmlFor}-hint`} className="text-meta text-ink-secondary">
          {hint}
        </p>
      ) : null}
      {error !== undefined && error !== "" ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1 text-small text-on-urgent"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
