"use client";

export default function PrintButton() {
  return (
    <button
      className="rounded-lg border px-3 py-2 text-sm"
      onClick={() => window.print()}
    >
      Print
    </button>
  );
}
