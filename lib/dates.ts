/**
 * Conversión entre instantes (timestamptz) y "hora de pared" de Colombia.
 *
 * Colombia usa UTC-5 fijo (sin horario de verano desde 1993), así que la
 * conversión es un desplazamiento constante y no requiere base de datos
 * de zonas horarias. El calendario trabaja siempre en hora de Colombia,
 * sin importar la zona del navegador.
 */

export const BOGOTA_OFFSET = "-05:00";
const OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Instante → "yyyy-MM-ddTHH:mm:ss" en hora de Colombia (sin zona). */
export function toBogotaWall(instant: string | Date): string {
  const time = new Date(instant).getTime() - OFFSET_MS;
  return new Date(time).toISOString().slice(0, 19);
}

/** "yyyy-MM-ddTHH:mm[:ss]" en hora de Colombia → instante ISO (UTC). */
export function fromBogotaWall(wall: string): string {
  const withSeconds = wall.length === 16 ? `${wall}:00` : wall.slice(0, 19);
  return new Date(`${withSeconds}${BOGOTA_OFFSET}`).toISOString();
}

/** Suma días a una fecha "yyyy-MM-dd". */
export function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/**
 * "Ahora" en hora de Colombia expresado como Date UTC.
 * FullCalendar se configura con timeZone "UTC" y recibe horas de pared
 * de Colombia; así su indicador de hora actual coincide.
 */
export function bogotaNowAsUtc(): Date {
  return new Date(Date.now() - OFFSET_MS);
}

export function isWallDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isWallTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isWallDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}
