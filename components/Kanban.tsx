"use client";

import { useState, type ReactNode } from "react";

export interface Column {
  id: string;
  label: string;
  color: string;
}

/**
 * Tablero por columnas: se arrastran las tarjetas entre columnas (o se usa el
 * menú de cada tarjeta en celular). El cambio se muestra al instante y luego se guarda.
 */
export function Kanban<T extends { id: string }>({
  columns,
  items,
  columnOf,
  onMove,
  renderCard,
  footer,
}: {
  columns: readonly Column[];
  items: T[];
  columnOf: (item: T) => string;
  onMove: (item: T, to: string) => Promise<boolean>;
  renderCard: (item: T, move: (to: string) => void) => ReactNode;
  footer?: (column: Column) => ReactNode;
}) {
  const [local, setLocal] = useState<Record<string, string>>({});
  const [over, setOver] = useState<string | null>(null);
  const col = (it: T) => local[it.id] ?? columnOf(it);

  const move = async (it: T, to: string) => {
    if (col(it) === to) return;
    const prev = col(it);
    setLocal((m) => ({ ...m, [it.id]: to }));
    const ok = await onMove(it, to);
    if (!ok) setLocal((m) => ({ ...m, [it.id]: prev }));
  };

  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-2">
      {columns.map((c) => {
        const list = items.filter((it) => col(it) === c.id);
        return (
          <section
            key={c.id}
            aria-label={c.label}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(c.id);
            }}
            onDragLeave={() => setOver((o) => (o === c.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const it = items.find((x) => x.id === e.dataTransfer.getData("text/plain"));
              if (it) move(it, c.id);
            }}
            className={`flex w-72 shrink-0 snap-start flex-col gap-2 rounded-xl border p-2 transition ${over === c.id ? "border-purple bg-purple/5" : "border-border bg-bg/70"}`}
          >
            <h3 className="flex items-center gap-2 px-1 pt-1 text-sm font-bold text-navy">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
              <span className="flex-1">{c.label}</span>
              <span className="rounded-full bg-white px-2 text-xs text-muted">{list.length}</span>
            </h3>
            <ul className="flex min-h-16 flex-col gap-2">
              {list.map((it) => (
                <li
                  key={it.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", it.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className="cursor-grab active:cursor-grabbing"
                >
                  {renderCard(it, (to) => move(it, to))}
                </li>
              ))}
            </ul>
            {footer?.(c)}
          </section>
        );
      })}
    </div>
  );
}
