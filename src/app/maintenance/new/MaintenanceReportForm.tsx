"use client";

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/app-path";
import { MAINTENANCE_EDIT_WINDOW_MINUTES } from "@/lib/config";

export type GeneratorKey = {
  category: "visual" | "operational";
  item_key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

type GeneratorStatus = "completed" | "not_completed" | "na";
const DRAFT_KEY = "maintenance_report_draft_v1";
type WaterHeaterStatus = "hot" | "warm" | "cold" | "";

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function currentTimeHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function MaintenanceReportForm({
  generatorKeys,
}: {
  generatorKeys: GeneratorKey[];
}) {
  const visualKeys = generatorKeys.filter((k) => k.category === "visual");
  const operationalKeys = generatorKeys.filter((k) => k.category === "operational");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [successSubmittedAt, setSuccessSubmittedAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [lastAutosaveAt, setLastAutosaveAt] = useState<string | null>(null);

  // --- Report fields ---
  const [reportDate, setReportDate] = useState(todayISODate());

  const [waterMeterReading, setWaterMeterReading] = useState("");
  const [waterMeterTime, setWaterMeterTime] = useState(() => currentTimeHHMM());

  const [electricMeterReading, setElectricMeterReading] = useState("");
  const [electricMeterTime, setElectricMeterTime] = useState(() => currentTimeHHMM());

  const [kitchenTank1, setKitchenTank1] = useState("");
  const [kitchenTank2, setKitchenTank2] = useState("");
  const [laundryTank1, setLaundryTank1] = useState("");
  const [laundryTank2, setLaundryTank2] = useState("");
  const [spareTank1, setSpareTank1] = useState("");
  const [spareTank2, setSpareTank2] = useState("");

  const [waterHeaterTemp, setWaterHeaterTemp] = useState<WaterHeaterStatus>("");
  const [waterHeaterTempTime, setWaterHeaterTempTime] = useState(() => currentTimeHHMM());

  const [softwater1, setSoftwater1] = useState<"hard" | "soft" | "">("");
  const [softwater2, setSoftwater2] = useState<"hard" | "soft" | "">("");

  const [waterTanksStatus, setWaterTanksStatus] = useState<
    "all_full" | "some_full" | "almost_empty" | ""
  >("");
  const [waterLevelCheckTime, setWaterLevelCheckTime] = useState(() => currentTimeHHMM());
  const [waterTanksNotes, setWaterTanksNotes] = useState("");

  const [pumpPsi, setPumpPsi] = useState("");
  const [pumpPsiTime, setPumpPsiTime] = useState(() => currentTimeHHMM());

  const [lights, setLights] = useState({
    deluxe: false,
    superior: false,
    standard: false,
    garden: false,
    pooldeck: false,
    restaurant: false,
    restaurantDeck: false,
  });
  const [lightsIssuesNotes, setLightsIssuesNotes] = useState("");

  const [plumbing, setPlumbing] = useState({
    restaurantMale: false,
    restaurantFemale: false,
    scubaShower: false,
    gymFootwash: false,
    poolShower: false,
    familyRoomBathroom: false,
    laundryFemaleBathroom: false,
    laundryMaleBathroom: false,
    lobbyMaleBathroom: false,
    lobbyFemaleBathroom: false,
  });

  const [issuesSummary, setIssuesSummary] = useState("");

  // generator statuses keyed by `${category}:${item_key}`
  const [generatorStatuses, setGeneratorStatuses] = useState<Record<string, GeneratorStatus>>({});

  const errorRef = useRef<HTMLDivElement | null>(null);
  const windowMinutes = MAINTENANCE_EDIT_WINDOW_MINUTES;

  function waterHeaterNumeric(status: WaterHeaterStatus) {
    if (status === "hot") return 2;
    if (status === "warm") return 1;
    if (status === "cold") return 0;
    return null;
  }

  function resetForm() {
    setWaterMeterReading("");
    setWaterMeterTime(currentTimeHHMM());
    setElectricMeterReading("");
    setElectricMeterTime(currentTimeHHMM());
    setKitchenTank1("");
    setKitchenTank2("");
    setLaundryTank1("");
    setLaundryTank2("");
    setSpareTank1("");
    setSpareTank2("");
    setWaterHeaterTemp("");
    setWaterHeaterTempTime(currentTimeHHMM());
    setSoftwater1("");
    setSoftwater2("");
    setWaterTanksStatus("");
    setWaterLevelCheckTime(currentTimeHHMM());
    setWaterTanksNotes("");
    setPumpPsi("");
    setPumpPsiTime(currentTimeHHMM());
    setLights({
      deluxe: false,
      superior: false,
      standard: false,
      garden: false,
      pooldeck: false,
      restaurant: false,
      restaurantDeck: false,
    });
    setLightsIssuesNotes("");
    setPlumbing({
      restaurantMale: false,
      restaurantFemale: false,
      scubaShower: false,
      gymFootwash: false,
      poolShower: false,
      familyRoomBathroom: false,
      laundryFemaleBathroom: false,
      laundryMaleBathroom: false,
      lobbyMaleBathroom: false,
      lobbyFemaleBathroom: false,
    });
    setIssuesSummary("");
    setGeneratorStatuses({});
  }

  function clearDraftState() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setDraftRestoredAt(null);
    setLastAutosaveAt(null);
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      const values = parsed?.values || {};
      setReportDate(values.reportDate || todayISODate());
      setWaterMeterReading(values.waterMeterReading || "");
      setWaterMeterTime(values.waterMeterTime || currentTimeHHMM());
      setElectricMeterReading(values.electricMeterReading || "");
      setElectricMeterTime(values.electricMeterTime || currentTimeHHMM());
      setKitchenTank1(values.kitchenTank1 || "");
      setKitchenTank2(values.kitchenTank2 || "");
      setLaundryTank1(values.laundryTank1 || "");
      setLaundryTank2(values.laundryTank2 || "");
      setSpareTank1(values.spareTank1 || "");
      setSpareTank2(values.spareTank2 || "");
      setWaterHeaterTemp(values.waterHeaterTemp || "");
      setWaterHeaterTempTime(values.waterHeaterTempTime || currentTimeHHMM());
      setSoftwater1(values.softwater1 || "");
      setSoftwater2(values.softwater2 || "");
      setWaterTanksStatus(values.waterTanksStatus || "");
      setWaterLevelCheckTime(values.waterLevelCheckTime || currentTimeHHMM());
      setWaterTanksNotes(values.waterTanksNotes || "");
      setPumpPsi(values.pumpPsi || "");
      setPumpPsiTime(values.pumpPsiTime || currentTimeHHMM());
      setLights(values.lights || {
        deluxe: false,
        superior: false,
        standard: false,
        garden: false,
        pooldeck: false,
        restaurant: false,
        restaurantDeck: false,
      });
      setLightsIssuesNotes(values.lightsIssuesNotes || "");
      setPlumbing(values.plumbing || {
        restaurantMale: false,
        restaurantFemale: false,
        scubaShower: false,
        gymFootwash: false,
        poolShower: false,
        familyRoomBathroom: false,
        laundryFemaleBathroom: false,
        laundryMaleBathroom: false,
        lobbyMaleBathroom: false,
        lobbyFemaleBathroom: false,
      });
      setIssuesSummary(values.issuesSummary || "");
      setGeneratorStatuses(values.generatorStatuses || {});
      if (parsed?.savedAt) {
        setDraftRestoredAt(parsed.savedAt);
        setLastAutosaveAt(parsed.savedAt);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (successId) return;
    const payload = {
      savedAt: new Date().toISOString(),
      values: {
        reportDate,
        waterMeterReading,
        waterMeterTime,
        electricMeterReading,
        electricMeterTime,
        kitchenTank1,
        kitchenTank2,
        laundryTank1,
        laundryTank2,
        spareTank1,
        spareTank2,
        waterHeaterTemp,
        waterHeaterTempTime,
        softwater1,
        softwater2,
        waterTanksStatus,
        waterLevelCheckTime,
        waterTanksNotes,
        pumpPsi,
        pumpPsiTime,
        lights,
        lightsIssuesNotes,
        plumbing,
        issuesSummary,
        generatorStatuses,
      },
    };
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        setLastAutosaveAt(payload.savedAt);
      } catch {}
    }, 2500);
    return () => window.clearTimeout(t);
  }, [
    successId,
    reportDate,
    waterMeterReading,
    waterMeterTime,
    electricMeterReading,
    electricMeterTime,
    kitchenTank1,
    kitchenTank2,
    laundryTank1,
    laundryTank2,
    spareTank1,
    spareTank2,
    waterHeaterTemp,
    waterHeaterTempTime,
    softwater1,
    softwater2,
    waterTanksStatus,
    waterLevelCheckTime,
    waterTanksNotes,
    pumpPsi,
    pumpPsiTime,
    lights,
    lightsIssuesNotes,
    plumbing,
    issuesSummary,
    generatorStatuses,
  ]);

  function setGenStatus(category: "visual" | "operational", item_key: string, status: GeneratorStatus) {
    setGeneratorStatuses((prev) => ({ ...prev, [`${category}:${item_key}`]: status }));
  }

  function clearGenStatus(category: "visual" | "operational", item_key: string) {
    const stateKey = `${category}:${item_key}`;
    setGeneratorStatuses((prev) => {
      if (!prev[stateKey]) return prev;
      const next = { ...prev };
      delete next[stateKey];
      return next;
    });
  }

  function allGeneratorKeysHaveStatus() {
    const all = [...visualKeys, ...operationalKeys];
    return all.every((k) => generatorStatuses[`${k.category}:${k.item_key}`]);
  }

  function parseNum(v: string): number | null {
    if (!v.trim()) return null;
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    return n;
  }

  function validate(): string | null {
    if (!reportDate) return "Please select the date of check.";
    if (waterMeterReading.trim() === "") return "Please enter the water meter reading.";
    if (electricMeterReading.trim() === "") return "Please enter the electric meter reading.";
    if (!waterHeaterTemp) return "Please select water heater status (hot, warm, or cold).";
    if (!waterHeaterTempTime) return "Please enter the time you recorded the water heater status.";
    if (waterTanksStatus && waterTanksStatus !== "all_full" && waterTanksNotes.trim().length === 0) {
      return "If water tanks are not all full, please state which ones.";
    }
    if (!allGeneratorKeysHaveStatus()) return "Please select a status for every generator checklist item.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessId(null);

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      window.setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return;
    }

    setIsSubmitting(true);

    try {
      const reportPayload: Record<string, any> = {
        report_date: reportDate,

        water_meter_reading: Number(waterMeterReading),
        water_meter_time: waterMeterTime || null,

        electric_meter_reading: Number(electricMeterReading),
        electric_meter_time: electricMeterTime || null,

        kitchen_tank_1: parseNum(kitchenTank1),
        kitchen_tank_2: parseNum(kitchenTank2),
        laundry_tank_1: parseNum(laundryTank1),
        laundry_tank_2: parseNum(laundryTank2),
        spare_tank_1: parseNum(spareTank1),
        spare_tank_2: parseNum(spareTank2),

        water_heater_temp: waterHeaterNumeric(waterHeaterTemp),
        water_heater_temp_time: waterHeaterTempTime,

        softwater_tank_1: softwater1 || null,
        softwater_tank_2: softwater2 || null,

        water_tanks_status: waterTanksStatus || null,
        water_level_check_time: waterLevelCheckTime || null,
        water_tanks_notes: waterTanksNotes.trim() || null,

        pump_psi: parseNum(pumpPsi),
        pump_psi_time: pumpPsiTime || null,

        lights_deluxe_ok: lights.deluxe,
        lights_superior_ok: lights.superior,
        lights_standard_ok: lights.standard,
        lights_garden_ok: lights.garden,
        lights_pooldeck_ok: lights.pooldeck,
        lights_restaurant_ok: lights.restaurant,
        lights_restaurant_deck_ok: lights.restaurantDeck,
        lights_issues_notes: lightsIssuesNotes.trim() || null,

        plumbing_restaurant_male_ok: plumbing.restaurantMale,
        plumbing_restaurant_female_ok: plumbing.restaurantFemale,
        plumbing_scuba_shower_ok: plumbing.scubaShower,
        plumbing_gym_footwash_ok: plumbing.gymFootwash,
        plumbing_pool_shower_ok: plumbing.poolShower,
        plumbing_family_room_bathroom_ok: plumbing.familyRoomBathroom,
        plumbing_laundry_female_bathroom_ok: plumbing.laundryFemaleBathroom,
        plumbing_laundry_male_bathroom_ok: plumbing.laundryMaleBathroom,
        plumbing_lobby_male_bathroom_ok: plumbing.lobbyMaleBathroom,
        plumbing_lobby_female_bathroom_ok: plumbing.lobbyFemaleBathroom,

        issues_summary:
          [issuesSummary.trim(), waterHeaterTemp === "cold" ? "[AUTO FLAG] Water heater reported COLD." : ""]
            .filter(Boolean)
            .join("\n") || null,
      };

      const items = [...visualKeys, ...operationalKeys].map((k) => ({
        category: k.category,
        item_key: k.item_key,
        status: generatorStatuses[`${k.category}:${k.item_key}`] as GeneratorStatus,
        notes: null,
      }));

      const submitRes = await fetch(withBasePath("/new/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportPayload, items }),
      });

      const submitJson = await submitRes.json().catch(() => null);
      if (!submitRes.ok || !submitJson?.ok || !submitJson?.reportId) {
        throw new Error(submitJson?.error || "Could not submit report.");
      }

      setSuccessId(submitJson.reportId);
      setSuccessSubmittedAt(submitJson.submittedAt || new Date().toISOString());
      clearDraftState();
    } catch (err: any) {
      // handle unique violation (one report per date)
      const msg =
        err?.message ||
        (typeof err === "string" ? err : "Something went wrong submitting the report.");
      setErrorMsg(msg);
      window.setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successId) {
    return (
      <section className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm overflow-hidden sm:p-6">
        <h2 className="text-lg font-semibold text-green-900">Report saved successfully</h2>
        <p className="mt-2 text-sm text-green-800">
          Your checklist has been submitted to the database.
        </p>
        <p className="mt-1 text-sm text-green-900">
          Saved at:{" "}
          <span className="font-medium">
            {successSubmittedAt ? new Date(successSubmittedAt).toLocaleString() : new Date().toLocaleString()}
          </span>
        </p>
        <p className="mt-1 text-xs text-green-900">
          Report ID: <span className="font-mono">{successId}</span>
        </p>
        <div className="mt-6 flex gap-3">
          <button
            className="rounded-lg bg-black px-4 py-2 text-white"
            onClick={() => {
              setSuccessId(null);
              setSuccessSubmittedAt(null);
              setErrorMsg(null);
              resetForm();
            }}
          >
            Submit another
          </button>
          <a className="rounded-lg border px-4 py-2" href={withBasePath("/history")}>
            View my history
          </a>
          <a className="rounded-lg border px-4 py-2" href={withBasePath(`/history/${successId}/edit`)}>
            Edit this report ({windowMinutes} min)
          </a>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 space-y-6">
      {draftRestoredAt ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Restored unsent draft from {new Date(draftRestoredAt).toLocaleString()}.
        </div>
      ) : null}
      {errorMsg ? (
        <div ref={errorRef} className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      ) : null}

      {/* Report details */}
      <section className="rounded-xl border bg-white p-4 shadow-sm overflow-hidden sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Report details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 flex max-w-[14rem] flex-col gap-2 sm:max-w-full">
            <label className="text-sm font-medium">Date of check *</label>
            <input
              type="date"
              required
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            />
          </div>
        </div>
      </section>

      {/* Water & Electric */}
      <section className="rounded-xl border bg-white p-4 shadow-sm overflow-hidden sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Meters</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Water meter reading *</label>
            <input
              type="number"
              inputMode="decimal"
              required
              value={waterMeterReading}
              onChange={(e) => setWaterMeterReading(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
              placeholder="e.g. 12345"
            />
          </div>
          <div className="min-w-0 flex max-w-[12rem] flex-col gap-2 sm:max-w-full">
            <label className="text-sm font-medium">Time checked (water)</label>
            <input
              type="time"
              value={waterMeterTime}
              onChange={(e) => setWaterMeterTime(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            />
          </div>

          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Electric meter reading *</label>
            <input
              type="number"
              inputMode="decimal"
              required
              value={electricMeterReading}
              onChange={(e) => setElectricMeterReading(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
              placeholder="e.g. 67890"
            />
          </div>
          <div className="min-w-0 flex max-w-[12rem] flex-col gap-2 sm:max-w-full">
            <label className="text-sm font-medium">Time checked (electric)</label>
            <input
              type="time"
              value={electricMeterTime}
              onChange={(e) => setElectricMeterTime(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            />
          </div>
        </div>
      </section>

      {/* Gas */}
      <section className="rounded-xl border bg-white p-4 shadow-sm overflow-hidden sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Gas levels</h2>
        <p className="text-sm text-muted-foreground">
          Enter numeric values (use a consistent unit like %).
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Kitchen tank 1</label>
            <input type="number" inputMode="decimal" value={kitchenTank1} onChange={(e)=>setKitchenTank1(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring" />
          </div>
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Kitchen tank 2</label>
            <input type="number" inputMode="decimal" value={kitchenTank2} onChange={(e)=>setKitchenTank2(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring" />
          </div>
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Laundry tank 1</label>
            <input type="number" inputMode="decimal" value={laundryTank1} onChange={(e)=>setLaundryTank1(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring" />
          </div>
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Laundry tank 2</label>
            <input type="number" inputMode="decimal" value={laundryTank2} onChange={(e)=>setLaundryTank2(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring" />
          </div>
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Spare tank 1</label>
            <input type="text" value={spareTank1} onChange={(e)=>setSpareTank1(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring" />
          </div>
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Spare tank 2</label>
            <input type="text" value={spareTank2} onChange={(e)=>setSpareTank2(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring" />
          </div>
        </div>
      </section>

      {/* Water heaters + softwater */}
      <section className="rounded-xl border bg-white p-4 shadow-sm overflow-hidden sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Water heaters & Softwater</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Water heater status *</label>
            <select
              value={waterHeaterTemp}
              onChange={(e) => setWaterHeaterTemp(e.target.value as WaterHeaterStatus)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            >
              <option value="">Select…</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
          <div className="min-w-0 flex max-w-[12rem] flex-col gap-2 sm:max-w-full">
            <label className="text-sm font-medium">Time recorded (water heater / softwater) *</label>
            <input
              type="time"
              required
              value={waterHeaterTempTime}
              onChange={(e) => setWaterHeaterTempTime(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            />
          </div>

          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Softwater tank 1</label>
            <select
              value={softwater1}
              onChange={(e) => setSoftwater1(e.target.value as any)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            >
              <option value="">Select…</option>
              <option value="soft">Soft</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Softwater tank 2</label>
            <select
              value={softwater2}
              onChange={(e) => setSoftwater2(e.target.value as any)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            >
              <option value="">Select…</option>
              <option value="soft">Soft</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </section>

      {/* Water tanks */}
      <section className="rounded-xl border bg-white p-4 shadow-sm overflow-hidden sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Water tanks</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Tank levels</label>
            <select
              value={waterTanksStatus}
              onChange={(e) => setWaterTanksStatus(e.target.value as any)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            >
              <option value="">Select…</option>
              <option value="all_full">All Full</option>
              <option value="some_full">Some Full</option>
              <option value="almost_empty">Almost all Empty</option>
            </select>
          </div>

          <div className="min-w-0 flex max-w-[12rem] flex-col gap-2 sm:max-w-full">
            <label className="text-sm font-medium">Time checked</label>
            <input
              type="time"
              value={waterLevelCheckTime}
              onChange={(e) => setWaterLevelCheckTime(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">
              If not all full, which tanks?
            </label>
            <textarea
              value={waterTanksNotes}
              onChange={(e) => setWaterTanksNotes(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
              rows={3}
              placeholder="e.g. Back tank low, rooftop tank half…"
            />
          </div>
        </div>
      </section>

      {/* Pump */}
      <section className="rounded-xl border bg-white p-4 shadow-sm overflow-hidden sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Pump</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <label className="text-sm font-medium">Pump PSI</label>
            <input
              type="number"
              inputMode="decimal"
              value={pumpPsi}
              onChange={(e) => setPumpPsi(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            />
          </div>
          <div className="min-w-0 flex max-w-[12rem] flex-col gap-2 sm:max-w-full">
            <label className="text-sm font-medium">Time checked</label>
            <input
              type="time"
              value={pumpPsiTime}
              onChange={(e) => setPumpPsiTime(e.target.value)}
              className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            />
          </div>
        </div>
      </section>

      {/* Lights */}
      <section className="rounded-xl border bg-white p-4 shadow-sm overflow-hidden sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Lights</h2>
        <p className="text-sm text-muted-foreground">
          Check each box only after you verify lights are on and working.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["Deluxe", "deluxe"],
            ["Superior", "superior"],
            ["Standard", "standard"],
            ["Garden lights", "garden"],
            ["Pool Deck Lights", "pooldeck"],
            ["Restaurant Lights", "restaurant"],
            ["Restaurant Deck Lights", "restaurantDeck"],
          ].map(([label, key]) => (
            <label key={key} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">{label}</span>
              <input
                type="checkbox"
                checked={(lights as any)[key]}
                onChange={(e) => setLights((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
            </label>
          ))}
        </div>

        <div className="min-w-0 space-y-2">
          <label className="text-sm font-medium">Issues / materials needed</label>
          <textarea
            value={lightsIssuesNotes}
            onChange={(e) => setLightsIssuesNotes(e.target.value)}
            className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
            rows={3}
          />
        </div>
      </section>

      {/* Plumbing */}
      <section className="rounded-xl border bg-white p-4 shadow-sm overflow-hidden sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Faucets / Toilets / Drains</h2>
        <p className="text-sm text-muted-foreground">
          Check each box only after you verify each faucet, toilet, and drain is in working order.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ["Restaurant Male", "restaurantMale"],
            ["Restaurant Female", "restaurantFemale"],
            ["Scuba shower", "scubaShower"],
            ["Gym Footwash", "gymFootwash"],
            ["Pool Shower", "poolShower"],
            ["Family Room bathroom", "familyRoomBathroom"],
            ["Laundry Female Bathroom", "laundryFemaleBathroom"],
            ["Laundry Male Bathroom", "laundryMaleBathroom"],
            ["Lobby Male bathroom", "lobbyMaleBathroom"],
            ["Lobby Female bathroom", "lobbyFemaleBathroom"],
          ].map(([label, key]) => (
            <label key={key} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">{label}</span>
              <input
                type="checkbox"
                checked={(plumbing as any)[key]}
                onChange={(e) => setPlumbing((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
            </label>
          ))}
        </div>
      </section>

      {/* Generator checks */}
      <section className="rounded-xl border bg-white p-4 shadow-sm overflow-hidden space-y-6 sm:p-6">
        <h2 className="text-lg font-semibold">Generator</h2>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Visual check</h3>
          <GeneratorChecklistTable
            keys={visualKeys}
            statuses={generatorStatuses}
            onSet={setGenStatus}
            onClear={clearGenStatus}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Operational check</h3>
          <GeneratorChecklistTable
            keys={operationalKeys}
            statuses={generatorStatuses}
            onSet={setGenStatus}
            onClear={clearGenStatus}
          />
        </div>
      </section>

      {/* Summary */}
      <section className="rounded-xl border bg-white p-4 shadow-sm overflow-hidden sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Issues & actions taken</h2>
        <textarea
          value={issuesSummary}
          onChange={(e) => setIssuesSummary(e.target.value)}
          className="w-full min-w-0 max-w-full rounded-lg border px-3 py-2 outline-none focus:ring"
          rows={5}
          placeholder="Write any issues found, action taken, and materials needed..."
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit report"}
        </button>

        <a href={withBasePath("/history")} className="rounded-lg border px-4 py-2">
          My history
        </a>
        <button
          type="button"
          className="rounded-lg border px-4 py-2 text-sm"
          onClick={() => {
            clearDraftState();
            resetForm();
            setReportDate(todayISODate());
          }}
        >
          Clear draft
        </button>
      </div>
      {errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {lastAutosaveAt ? `Draft autosaved at ${new Date(lastAutosaveAt).toLocaleTimeString()}` : "Draft autosave enabled."}
      </p>
    </form>
  );
}

function GeneratorChecklistTable({
  keys,
  statuses,
  onSet,
  onClear,
}: {
  keys: GeneratorKey[];
  statuses: Record<string, GeneratorStatus>;
  onSet: (category: "visual" | "operational", item_key: string, status: GeneratorStatus) => void;
  onClear: (category: "visual" | "operational", item_key: string) => void;
}) {
  if (!keys.length) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        No items configured.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <div className="divide-y md:hidden">
        {keys.map((k) => {
          const key = `${k.category}:${k.item_key}`;
          const v = statuses[key];

          return (
            <div key={key} className="space-y-2.5 p-3">
              <div className="text-sm font-medium leading-snug">{k.label}</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(["completed", "not_completed", "na"] as GeneratorStatus[]).map((opt) => {
                  const checked = v === opt;
                  const label = opt === "completed" ? "Done" : opt === "not_completed" ? "Issue" : "N/A";
                  return (
                    <button
                      type="button"
                      key={opt}
                      className={`min-h-11 rounded-lg border px-2 py-2 text-center text-xs font-semibold leading-tight transition-colors ${
                        checked
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white text-gray-700"
                      }`}
                      onClick={() =>
                        checked
                          ? onClear(k.category, k.item_key)
                          : onSet(k.category, k.item_key, opt)
                      }
                      aria-pressed={checked}
                      aria-label={`${k.label} ${label}`}
                    >
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left font-medium">Item</th>
              <th className="p-3 text-center font-medium">Completed</th>
              <th className="p-3 text-center font-medium">Not Completed</th>
              <th className="p-3 text-center font-medium">N/A</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const key = `${k.category}:${k.item_key}`;
              const v = statuses[key];

              return (
                <tr key={key} className="border-t">
                  <td className="p-3 align-top">{k.label}</td>
                  {(["completed", "not_completed", "na"] as GeneratorStatus[]).map((opt) => (
                    <td key={opt} className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={v === opt}
                        onChange={(e) =>
                          e.target.checked
                            ? onSet(k.category, k.item_key, opt)
                            : onClear(k.category, k.item_key)
                        }
                        aria-label={`${k.label} ${opt}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
