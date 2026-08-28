"use client";

export type FormSetter = (
  k: string,
) => (e: React.ChangeEvent<HTMLInputElement>) => void;

export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        inputMode="decimal"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

export const EMPTY_FORM = {
  rent: "",
  utilities: "",
  internet: "",
  transportation: "",
  laundry: "",
  recurringFees: "",
  deposit: "",
  applicationFee: "",
  connectivitySetup: "",
  furnitureSetup: "",
  initialGroceries: "",
  transportationSetup: "",
};
