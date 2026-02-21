import React from "react";

type PwaIconProps = {
  size: number;
  maskable?: boolean;
};

export function PwaIcon({ size, maskable = false }: PwaIconProps) {
  const pad = maskable ? Math.round(size * 0.18) : Math.round(size * 0.1);
  const cardRadius = Math.round((size - pad * 2) * 0.22);
  const cardSize = size - pad * 2;
  const stroke = Math.max(2, Math.round(size * 0.01));

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0B5E55 0%, #083B5B 100%)",
      }}
    >
      <div
        style={{
          width: cardSize,
          height: cardSize,
          borderRadius: cardRadius,
          border: `${stroke}px solid rgba(155, 215, 204, 0.7)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          color: "#F3E7B2",
          fontWeight: 800,
          fontSize: Math.round(size * 0.28),
          letterSpacing: "-0.03em",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        TB
        <div
          style={{
            position: "absolute",
            top: Math.round(size * 0.15),
            right: Math.round(size * 0.12),
            width: Math.round(size * 0.16),
            height: Math.round(size * 0.16),
            borderRadius: 999,
            border: `${stroke}px solid #D6F3EC`,
            opacity: 0.95,
          }}
        />
      </div>
    </div>
  );
}
