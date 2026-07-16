import { useEffect, useState } from "react";

export function ScoreRing({
  value,
  label,
  size = 120,
}: {
  value: number | null | undefined;
  label?: string;
  size?: number;
}) {
  const target = Math.max(0, Math.min(100, Number(value ?? 0)));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = display;
    const duration = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const offset = c - (display / 100) * c;
  const color =
    target >= 80 ? "#7ee787" : target >= 60 ? "#f2cc60" : target >= 40 ? "#f0883e" : "#f85149";

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke 0.4s ease" }}
        />
      </svg>
      <div className="-mt-[calc(50%+8px)] pointer-events-none font-serif text-3xl tabular-nums">
        {value == null ? "—" : Math.round(display)}
      </div>
      {label && (
        <div className="text-[10px] uppercase tracking-[0.2em] opacity-60 mt-1">{label}</div>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={
        "animate-pulse bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] bg-[length:200%_100%] rounded-md " +
        className
      }
      style={{ animation: "flovix-shimmer 1.8s linear infinite" }}
    />
  );
}
