import SignOutButton from "@/components/SignOutButton";

export default function MaintenanceNewPage() {
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Night Maintenance Report</h1>
          <SignOutButton />
        </header>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            This page is ready. Next step is building the full checklist form.
          </p>
        </div>
      </div>
    </main>
  );
}
