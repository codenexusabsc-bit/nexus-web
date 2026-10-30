/** Primer valor de un parámetro de búsqueda (?a=1&a=2 → "1"). */
export function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
