function parsePositiveInt(v: string | undefined, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export const MAINTENANCE_EDIT_WINDOW_MINUTES = parsePositiveInt(
  process.env.NEXT_PUBLIC_MAINTENANCE_EDIT_WINDOW_MINUTES || process.env.MAINTENANCE_EDIT_WINDOW_MINUTES,
  120
);
