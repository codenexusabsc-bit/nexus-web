import type { ComponentProps, ReactNode } from "react";

/** Campo de formulario con etiqueta. */
export function Field({
  label,
  id,
  ...props
}: { label: string; id: string } & ComponentProps<"input">) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm font-medium text-text">
      {label}
      <input
        id={id}
        className="rounded-lg border border-border bg-white px-3.5 py-2.5 text-base font-normal text-text outline-none transition placeholder:text-muted/70 focus:border-purple focus:ring-2 focus:ring-purple/20"
        {...props}
      />
    </label>
  );
}

/** Botón principal. */
export function Button({
  loading,
  children,
  className = "",
  ...props
}: { loading?: boolean } & ComponentProps<"button">) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-purple px-4 py-2.5 font-semibold text-white transition hover:bg-violet disabled:cursor-wait disabled:opacity-70 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Mensaje de error o de éxito de un formulario. */
export function Alert({ kind, children }: { kind: "error" | "ok"; children: ReactNode }) {
  const tone =
    kind === "error"
      ? "border-red-300 bg-red-50 text-red-800"
      : "border-teal/60 bg-teal/10 text-teal-900";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg border px-3.5 py-2.5 text-sm ${tone}`}>
      {children}
    </div>
  );
}
