/**
 * Fondo espacial animado: estrellas que titilan y estrellas fugaces.
 * Solo CSS (sin JavaScript en el cliente). Las posiciones salen de un
 * generador con semilla fija, así el HTML del servidor y del cliente coinciden.
 * Con "reducir movimiento" activado en el sistema, las animaciones se detienen.
 */

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const COLORS = ["#F5F3FF", "#67E8F9", "#C04CF5", "#F5F3FF", "#9333EA"];

function makeStars(count: number, seed: number) {
  const rnd = seeded(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: rnd() * 100,
    top: rnd() * 100,
    size: rnd() < 0.15 ? 3 : rnd() < 0.5 ? 2 : 1,
    color: COLORS[Math.floor(rnd() * COLORS.length)],
    delay: rnd() * 6,
    duration: 2.5 + rnd() * 4,
  }));
}

function makeShooting(count: number, seed: number) {
  const rnd = seeded(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: 20 + rnd() * 80,
    top: rnd() * 45,
    delay: i * 3.7 + rnd() * 2,
    duration: 1.1 + rnd() * 0.8,
    length: 90 + rnd() * 120,
  }));
}

export function SpaceBackground({
  stars = 110,
  shooting = 5,
  seed = 7,
  className = "",
}: {
  stars?: number;
  shooting?: number;
  seed?: number;
  className?: string;
}) {
  const starList = makeStars(stars, seed);
  const shootList = makeShooting(shooting, seed + 1);
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Nebulosas suaves */}
      <div className="nebula absolute -top-1/4 -left-1/4 size-[70%] rounded-full bg-purple/25 blur-3xl" />
      <div className="nebula nebula-slow absolute -right-1/4 -bottom-1/3 size-[60%] rounded-full bg-cyan/10 blur-3xl" />

      {starList.map((s) => (
        <span
          key={s.id}
          className="star absolute"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            backgroundColor: s.color,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {shootList.map((s) => (
        <span
          key={s.id}
          className="shooting-star absolute"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.length,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration + 16}s`,
          }}
        />
      ))}
    </div>
  );
}
