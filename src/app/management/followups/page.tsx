import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

function pill(text: string) {
  return <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs">{text}</span>;
}

function fmt(n: any) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString();
}

export default async function FollowupsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const sp = (searchParams ? await searchParams : {}) as any;
  const status = (sp?.status || "open") as string; // open | in_progress | resolved | all
  const attention = (sp?.attention || "all") as string; // all | needs | ok

  let q = supabase.from("v_followups_queue").select("*");

  if (status !== "all") {
    if (status === "open") q = q.eq("followup_status_effective", "open");
    if (status === "in_progress") q = q.eq("followup_status_effective", "in_progress");
    if (status === "resolved") q = q.eq("followup_status_effective", "resolved");
  }

  if (attention === "needs") q = q.eq("needs_attention", true);
  if (attention === "ok") q = q.eq("needs_attention", false);

  const { data: rows, error } = await q.order("report_date", { ascending: false }).limit(200);

  const openCount = rows?.filter((r) => r.followup_status_effective === "open").length ?? 0;
  const inProgressCount = rows?.filter((r) => r.followup_status_effective === "in_progress").length ?? 0;
  const resolvedCount = rows?.filter((r) => r.followup_status_effective === "resolved").length ?? 0;
  const needsCount = rows?.filter((r) => r.needs_attention).length ?? 0;

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Follow-ups</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Work queue for items that need review or action.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">
              Reports
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/exceptions">
              Exceptions
            </Link>
            <SignOutButton />
          </div>
        </header>

        {error ? (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-red-600">{error.message}</p>
          </section>
        ) : null}

        <section className="rounded-xl border bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {pill(`open: ${openCount}`)}
            {pill(`in progress: ${inProgressCount}`)}
            {pill(`resolved: ${resolvedCount}`)}
            {pill(`needs attention: ${needsCount}`)}
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status</span>
              <a className={`rounded border px-2 py-1 ${status === "open" ? "bg-black text-white" : ""}`} href="?status=open">
                open
              </a>
              <a className={`rounded border px-2 py-1 ${status === "in_progress" ? "bg-black text-white" : ""}`} href="?status=in_progress">
                in progress
              </a>
              <a className={`rounded border px-2 py-1 ${status === "resolved" ? "bg-black text-white" : ""}`} href="?status=resolved">
                resolved
              </a>
              <a className={`rounded border px-2 py-1 ${status === "all" ? "bg-black text-white" : ""}`} href="?status=all">
                all
              </a>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Attention</span>
              <a className={`rounded border px-2 py-1 ${attention === "needs" ? "bg-black text-white" : ""}`} href={`?status=${status}&attention=needs`}>
                needs
              </a>
              <a className={`rounded border px-2 py-1 ${attention === "ok" ? "bg-black text-white" : ""}`} href={`?status=${status}&attention=ok`}>
                ok
              </a>
              <a className={`rounded border px-2 py-1 ${attention === "all" ? "bg-black text-white" : ""}`} href={`?status=${status}&attention=all`}>
                all
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-0 border-b bg-gray-50 px-4 py-3 text-xs font-medium text-muted-foreground">
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Assigned</div>
            <div className="col-span-2">Deltas</div>
            <div className="col-span-3">Flags</div>
            <div className="col-span-1 text-right">Link</div>
          </div>

          {rows?.length ? (
            <div className="divide-y">
              {rows.map((r: any) => {
                const flags: string[] = [];
                if (r.generator_not_completed) flags.push("generator");
                if (r.water_spike) flags.push("water spike");
                if (r.electric_spike) flags.push("electric spike");
                if (r.water_tanks_almost_empty) flags.push("tanks empty");
                if (r.softwater_hard) flags.push("softwater hard");
                if (r.pump_psi_out_of_range) flags.push("pump PSI");
                if (!flags.length && r.needs_attention) flags.push("check readings");

                return (
                  <div key={r.report_id} className="grid grid-cols-12 px-4 py-3 text-sm">
                    <div className="col-span-2">{r.report_date}</div>
                    <div className="col-span-2">{pill(r.followup_status_effective)}</div>
                    <div className="col-span-2">{r.assigned_to || "—"}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">
                      W {fmt(r.water_delta)} / E {fmt(r.electric_delta)}
                    </div>
                    <div className="col-span-3 text-xs text-muted-foreground">
                      {flags.length ? flags.join(", ") : "—"}
                    </div>
                    <div className="col-span-1 text-right">
                      <Link className="underline" href={`/management/reports/${r.report_id}`}>
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">No follow-ups found for this filter.</div>
          )}
        </section>
      </div>
    </main>
  );
}
