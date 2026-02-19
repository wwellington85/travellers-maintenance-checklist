import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PrintButton from "./PrintButton";
import { withBasePath } from "@/lib/app-path";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ReportPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(withBasePath("/auth/login"));

  const { id: reportId } = await params;
  if (!UUID_RE.test(reportId)) redirect(withBasePath("/management/reports"));

  const { data: report } = await supabase
    .from("maintenance_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (!report) redirect(withBasePath("/management/reports"));

  const { data: exRow } = await supabase
    .from("v_report_exceptions")
    .select("exception_reasons")
    .eq("report_date", report.report_date)
    .maybeSingle();

  const reasons: string[] = exRow?.exception_reasons || [];

  return (
    <main className="min-h-screen p-6 print:p-0">
      <div className="mx-auto max-w-3xl space-y-6 print:max-w-none print:space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <div className="text-xl font-semibold">Night Report Print View</div>
            <div className="text-sm text-muted-foreground">{report.report_date}</div>
          </div>
          <PrintButton />
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm print:border-none print:shadow-none print:p-0">
          <h1 className="text-2xl font-semibold">Travellers Beach Resort — Maintenance Night Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Date: {report.report_date} • Submitted: {new Date(report.submitted_at).toLocaleString()}
          </p>

          {reasons.length ? (
            <>
              <h2 className="mt-6 text-lg font-semibold">Flags</h2>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          ) : null}

          <h2 className="mt-6 text-lg font-semibold">Meter readings</h2>
          <div className="mt-2 text-sm">
            Water: {report.water_meter_reading} (time: {report.water_meter_time ?? "—"})<br />
            Electric: {report.electric_meter_reading} (time: {report.electric_meter_time ?? "—"})
          </div>

          <h2 className="mt-6 text-lg font-semibold">Notes / issues</h2>
          <div className="mt-2 text-sm whitespace-pre-wrap">
            {report.issues_summary ?? "—"}
          </div>
        </div>
      </div>
    </main>
  );
}
