"use client";

import { useEffect, useState } from "react";

export default function AutoHideNotice({
  type,
  text,
  ms = 5000,
}: {
  type: "ok" | "err";
  text: string;
  ms?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), ms);
    return () => clearTimeout(t);
  }, [ms]);

  if (!visible) return null;

  return (
    <section
      className={`rounded-xl border p-4 text-sm transition-opacity ${
        type === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {text}
    </section>
  );
}
