import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function yesNo(v: any) {
  if (v === true) return "OK";
  if (v === false) return "Issue";
  return "—";
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { id: reportId } = await params;

  if (!UUID_RE.test(reportId)) {
    return (
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Report Detail</h1>
            <div className="flex items-center gap-3">
              <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">
                Back
              </Link>
              <SignOutButton />
            </div>
          </header>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-red-600">
              Invalid report id: <span className="font-mono">{reportId}</span>
            </p>
          </div>
        </div>
      </main>
    );
  }

  const { data: report, error: repErr } = await supabase
    .from("maintenance_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  const { data: genItems, error: genErr } = await supabase
    .from("generator_check_items")
    .select("category,item_key,status,notes")
    .eq("report_id", reportId)
    .order("category", { ascending: true })
    .order("item_key", { ascending: true });

  const { data: keyRows } = await supabase
    .from("generator_item_keys")
    .select("category,item_key,label")
    .eq("is_active", true);

  const labelMap = new Map<string, string>();
  (keyRows || []).forEach((k: any) => {
    labelMap.set(`${k.category}:${k.item_key}`, k.label);
  });

  if (repErr) {
    return (
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Report</h1>
            <div className="flex items-center gap-3">
              <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">
                Back
              </Link>
              <SignOutButton />
            </div>
          </header>
          <div className="rounded-xl border bg-white p-6 shadow-sm text-sm text-red-600">
            {repErr.message}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Report Detail</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.report_date} • Submitted {new Date(report.submitted_at).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">{report.id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">
              Back
            </Link>
            <SignOutButton />
          </div>
        </header>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Meters</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Water meter</div>
              <div className="text-lg font-semibold">{report.water_meter_reading}</div>
              <div className="text-xs text-muted-foreground">Time: {report.water_meter_time ?? "—"}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-xs">Electric meter</div>
              <div className="text-lg font-semibold">{report.electric_meter_reading}</div>
              <div className="text-xs text-muted-foreground">Time: {report.electric_meter_time ?? "—"}</div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Generator checklist</h2>
          {genErr ? (
            <p className="text-sm text-red-600">{genErr.message}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              {(genItems || []).map((g: any, idx: number) => {
                const label = labelMap.get(`${g.category}:${g.item_key}`) || g.item_key;
                return (
                  <div key={idx} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{g.category}</div>
                    <div className="font-medium">{label}</div>
                    <div className="mt-1 font-semibold">{g.status}</div>
                    {g.notes ? <div className="text-xs text-muted-foreground mt-1">{g.notes}</div> : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Issues / actions taken</h2>
          <p className="text-sm">{report.issues_summary ?? "—"}</p>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Show full raw report fields
            </summary>
            <pre className="mt-3 whitespace-pre-wrap text-xs">
{JSON.stringify(report, null, 2)}
            </pre>
          </details>
        </section>
      </div>
    </main>
  );
}
