"use client";

import { useFormStatus } from "react-dom";

export default function FormPendingButton({
  idleLabel,
  pendingLabel,
  className,
}: {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className || ""} disabled:opacity-60`}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
