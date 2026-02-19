#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

function argValue(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  return process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true;
}

const isApply = process.argv.includes('--apply');
const shouldWipe = process.argv.includes('--wipe');
const filePath = argValue('--file', '/Users/preston/Downloads/MAINTENANCE NIGHT TIME CHECK LIST (Responses).xlsx');
const explicitSubmittedBy = argValue('--submitted-by', null);

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseIsoDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s|$)/);
  if (m) {
    const mm = Number(m[1]);
    const dd = Number(m[2]);
    let yyyy = Number(m[3]);
    if (yyyy < 100) yyyy += 2000;
    const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseTimeHHMM(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  if (!s) return null;

  let m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/);
  if (m) {
    let h = Number(m[1]);
    const min = Number(m[2]);
    const ampm = m[3].toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  }

  const d = new Date(`1970-01-01 ${s}`);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  return null;
}

function parseNumberLoose(v, strategy = 'first') {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (!s) return null;

  const direct = Number(s.replace(/,/g, ''));
  if (!Number.isNaN(direct)) return direct;

  const matches = s.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || !matches.length) return null;
  const nums = matches.map(Number).filter((n) => !Number.isNaN(n));
  if (!nums.length) return null;
  if (strategy === 'max') return Math.max(...nums);
  return nums[0];
}

function parseStrictNumber(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim().replace(/,/g, '');
  if (!s) return null;
  if (!/^-?\d+(?:\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function parseMeterReading(v, kind) {
  const n = parseStrictNumber(v);
  if (n == null) return null;
  if (kind === 'electric' && n >= 1000000) {
    const digits = String(Math.trunc(Math.abs(n)));
    if (digits.length >= 5) {
      const tail5 = Number(digits.slice(-5));
      if (!Number.isNaN(tail5) && tail5 >= 1000 && tail5 <= 99999) return tail5;
    }
  }
  return n;
}

function parseCsvList(v) {
  const s = String(v || '').trim();
  if (!s) return [];
  return s.split(',').map((x) => normalize(x)).filter(Boolean);
}

function mapWaterTankStatus(v) {
  const s = normalize(v);
  if (!s) return null;
  if (s.includes('all full')) return 'all_full';
  if (s.includes('some full')) return 'some_full';
  if (s.includes('almost') && s.includes('empty')) return 'almost_empty';
  return null;
}

function mapSoftwater(v) {
  const s = normalize(v);
  if (!s) return null;
  if (s.includes('soft')) return 'soft';
  if (s.includes('hard')) return 'hard';
  return null;
}

function mapGeneratorStatus(v) {
  const s = normalize(v);
  if (!s) return 'na';
  const yes = ['yes', 'y', 'true', 'checked', 'check', 'x', '1', 'ok', 'good', 'done'];
  const no = ['no', 'n', 'false', '0', 'not completed', 'not done', 'issue', 'bad'];
  if (yes.some((k) => s === k || s.includes(` ${k} `) || s.startsWith(`${k} `) || s.endsWith(` ${k}`))) {
    return 'completed';
  }
  if (no.some((k) => s === k || s.includes(k))) return 'not_completed';
  return 'completed';
}

function pickHeader(headers, contains) {
  const needle = contains.toLowerCase();
  return headers.find((h) => String(h || '').toLowerCase().includes(needle));
}

async function run() {
  const cwd = process.cwd();
  const envLocal = loadDotEnv(path.join(cwd, '.env.local'));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || envLocal.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || envLocal.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment/.env.local');
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found: ${filePath}`);
  }

  const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rowsA = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  const headers = rowsA[0] || [];
  const dataRows = rowsA.slice(1);

  const h = {
    timestamp: pickHeader(headers, 'Timestamp'),
    name: pickHeader(headers, 'Name of Maintenance Personnel'),
    laundry_tank_1: pickHeader(headers, 'gas level of Laundry tank 1'),
    lights_ok: pickHeader(headers, 'Are all lights on and working properly'),
    lights_notes: pickHeader(headers, 'issues with lights on property'),
    water_tanks_status: pickHeader(headers, 'Check level of water tanks'),
    water_level_time: pickHeader(headers, 'time of water level check'),
    water_tanks_notes: pickHeader(headers, 'If Water tanks are not full'),
    pump_psi: pickHeader(headers, 'PSI of the Pump'),
    pump_time: pickHeader(headers, 'time did you check the PSI of the pump'),
    water_heater_temp: pickHeader(headers, 'temperature of the water heaters'),
    water_heater_temp_time: pickHeader(headers, 'time did you record the temperature of the water heaters'),
    water_meter: pickHeader(headers, 'record water meter reading'),
    water_meter_time: pickHeader(headers, 'time did you check the water meter'),
    electric_meter: pickHeader(headers, 'record the electric meter reading'),
    electric_meter_time: pickHeader(headers, 'time did you check the electric meter'),
    plumbing_ok: pickHeader(headers, 'Faucets, Toilets, and Drains you observed'),
    issues_summary: pickHeader(headers, 'Please write any issues that were found in the night'),
    softwater_1: pickHeader(headers, 'Softwater tank 1 hard or soft'),
    softwater_2: pickHeader(headers, 'Softwater tank 2 hard or soft'),
    kitchen_tank_1: pickHeader(headers, 'gas level of Kitchen tank 1'),
    kitchen_tank_2: pickHeader(headers, 'gas level of Kitchen tank 2'),
    laundry_tank_2: pickHeader(headers, 'gas level of Laundry tank 2'),
    spare_tank_1: pickHeader(headers, 'gas level of Spare Gas tank 1'),
    spare_tank_2: pickHeader(headers, 'gas level of Spare Gas tank 2'),
    report_date: pickHeader(headers, 'state date of check'),
  };

  const generatorHeaders = headers
    .map((col) => String(col || '').trim())
    .filter(Boolean)
    .map((col) => {
      if (col.startsWith('GENERATOR VISUAL CHECK')) {
        const m = col.match(/\[(.*)\]/);
        return { header: col, category: 'visual', label: normalize(m ? m[1] : col) };
      }
      if (col.startsWith('GENERATOR OPERATIONAL CHECK')) {
        const m = col.match(/\[(.*)\]/);
        return { header: col, category: 'operational', label: normalize(m ? m[1] : col) };
      }
      return null;
    })
    .filter(Boolean);

  const { data: keyRows, error: keyErr } = await supabase
    .from('generator_item_keys')
    .select('category,item_key,label,is_active')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });
  if (keyErr) throw new Error(`generator_item_keys lookup failed: ${keyErr.message}`);

  const keyMap = new Map();
  for (const k of keyRows || []) keyMap.set(`${k.category}:${normalize(k.label)}`, k);

  const colIndex = new Map(headers.map((x, i) => [String(x || ''), i]));
  const getVal = (arr, header) => {
    if (!header) return '';
    const i = colIndex.get(header);
    return i == null ? '' : arr[i];
  };

  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id,full_name,is_active,role');
  if (profErr) throw new Error(`profiles lookup failed: ${profErr.message}`);

  const activeProfiles = (profiles || []).filter((p) => p.is_active);
  const profileByName = new Map(activeProfiles.map((p) => [normalize(p.full_name), p.id]));

  let fallbackSubmittedBy = explicitSubmittedBy || null;
  if (!fallbackSubmittedBy) {
    const pref = activeProfiles.find((p) => ['maintenance', 'manager', 'admin'].includes(p.role));
    fallbackSubmittedBy = pref?.id || activeProfiles[0]?.id || null;
  }
  if (!fallbackSubmittedBy) throw new Error('No active profile found for submitted_by fallback. Create/activate at least one profile.');

  const lightMap = {
    [normalize('Deluxe')]: 'deluxe',
    [normalize('Superior')]: 'superior',
    [normalize('Standard')]: 'standard',
    [normalize('Garden lights')]: 'garden',
    [normalize('Pool Deck Lights')]: 'pooldeck',
    [normalize('Restaurant Lights')]: 'restaurant',
    [normalize('Restaurant Deck Lights')]: 'restaurantDeck',
  };

  const plumbingMap = {
    [normalize('Restaurant Male')]: 'restaurantMale',
    [normalize('Restaurant Female')]: 'restaurantFemale',
    [normalize('Scuba shower')]: 'scubaShower',
    [normalize('Gym Footwash')]: 'gymFootwash',
    [normalize('Pool Shower')]: 'poolShower',
    [normalize('Family Room bathroom')]: 'familyRoomBathroom',
    [normalize('Laundry Female Bathroom')]: 'laundryFemaleBathroom',
    [normalize('Laundry Male Bathroom')]: 'laundryMaleBathroom',
    [normalize('Lobby Male bathroom')]: 'lobbyMaleBathroom',
    [normalize('Lobby Female bathroom')]: 'lobbyFemaleBathroom',
  };

  const parsed = [];
  const skipped = [];
  const unmatchedNames = new Set();

  for (let idx = 0; idx < dataRows.length; idx++) {
    const r = dataRows[idx];
    const rowNum = idx + 2;
    const reportDate = parseIsoDate(getVal(r, h.report_date)) || parseIsoDate(getVal(r, h.timestamp));
    const waterReading = parseMeterReading(getVal(r, h.water_meter), 'water');
    const electricReading = parseMeterReading(getVal(r, h.electric_meter), 'electric');

    if (!reportDate) {
      skipped.push({ rowNum, reason: 'missing report_date' });
      continue;
    }
    if (waterReading == null || electricReading == null) {
      skipped.push({ rowNum, reason: 'missing/invalid water or electric meter reading' });
      continue;
    }

    const nameRaw = String(getVal(r, h.name) || '').trim();
    const submittedBy = profileByName.get(normalize(nameRaw)) || fallbackSubmittedBy;
    if (!profileByName.get(normalize(nameRaw)) && nameRaw) unmatchedNames.add(nameRaw);

    const lightsSelected = new Set(parseCsvList(getVal(r, h.lights_ok)));
    const plumbingSelected = new Set(parseCsvList(getVal(r, h.plumbing_ok)));

    const lights = {
      deluxe: false,
      superior: false,
      standard: false,
      garden: false,
      pooldeck: false,
      restaurant: false,
      restaurantDeck: false,
    };
    for (const token of lightsSelected) {
      const key = lightMap[token];
      if (key) lights[key] = true;
    }

    const plumbing = {
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
    };
    for (const token of plumbingSelected) {
      const key = plumbingMap[token];
      if (key) plumbing[key] = true;
    }

    const payload = {
      report_date: reportDate,
      submitted_by: submittedBy,
      water_meter_reading: waterReading,
      water_meter_time: parseTimeHHMM(getVal(r, h.water_meter_time)),
      electric_meter_reading: electricReading,
      electric_meter_time: parseTimeHHMM(getVal(r, h.electric_meter_time)),
      kitchen_tank_1: parseNumberLoose(getVal(r, h.kitchen_tank_1)),
      kitchen_tank_2: parseNumberLoose(getVal(r, h.kitchen_tank_2)),
      laundry_tank_1: parseNumberLoose(getVal(r, h.laundry_tank_1)),
      laundry_tank_2: parseNumberLoose(getVal(r, h.laundry_tank_2)),
      spare_tank_1: parseNumberLoose(getVal(r, h.spare_tank_1)),
      spare_tank_2: parseNumberLoose(getVal(r, h.spare_tank_2)),
      water_heater_temp: parseNumberLoose(getVal(r, h.water_heater_temp), 'max'),
      water_heater_temp_time: parseTimeHHMM(getVal(r, h.water_heater_temp_time)),
      softwater_tank_1: mapSoftwater(getVal(r, h.softwater_1)),
      softwater_tank_2: mapSoftwater(getVal(r, h.softwater_2)),
      water_tanks_status: mapWaterTankStatus(getVal(r, h.water_tanks_status)),
      water_level_check_time: parseTimeHHMM(getVal(r, h.water_level_time)),
      water_tanks_notes: String(getVal(r, h.water_tanks_notes) || '').trim() || null,
      pump_psi: parseNumberLoose(getVal(r, h.pump_psi)),
      pump_psi_time: parseTimeHHMM(getVal(r, h.pump_time)),
      lights_deluxe_ok: lights.deluxe,
      lights_superior_ok: lights.superior,
      lights_standard_ok: lights.standard,
      lights_garden_ok: lights.garden,
      lights_pooldeck_ok: lights.pooldeck,
      lights_restaurant_ok: lights.restaurant,
      lights_restaurant_deck_ok: lights.restaurantDeck,
      lights_issues_notes: String(getVal(r, h.lights_notes) || '').trim() || null,
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
      issues_summary: String(getVal(r, h.issues_summary) || '').trim() || null,
    };

    if (!payload.water_meter_time) payload.water_meter_time = '00:00';
    if (!payload.electric_meter_time) payload.electric_meter_time = payload.water_meter_time;
    if (!payload.pump_psi_time) payload.pump_psi_time = payload.water_meter_time;
    if (!payload.water_level_check_time) payload.water_level_check_time = payload.water_meter_time;
    if (!payload.water_heater_temp_time) payload.water_heater_temp_time = payload.water_meter_time;

    const ts = new Date(String(getVal(r, h.timestamp) || '')).getTime() || 0;

    const generatorStatuses = {};
    for (const k of keyRows || []) {
      const wanted = normalize(k.label);
      const col = generatorHeaders.find((g) => g.category === k.category && g.label === wanted);
      const status = col ? mapGeneratorStatus(getVal(r, col.header)) : 'na';
      generatorStatuses[`${k.category}:${k.item_key}`] = status;
    }

    parsed.push({ rowNum, ts, payload, generatorStatuses, sourceName: nameRaw });
  }

  // dedupe by report_date, keep latest timestamp row
  const byDate = new Map();
  let dedupedOut = 0;
  for (const p of parsed) {
    const d = p.payload.report_date;
    const existing = byDate.get(d);
    if (!existing || p.ts >= existing.ts) {
      if (existing) dedupedOut += 1;
      byDate.set(d, p);
    } else {
      dedupedOut += 1;
    }
  }

  const finalRows = [...byDate.values()].sort((a, b) => a.payload.report_date.localeCompare(b.payload.report_date));

  console.log('--- Import Dry Run Summary ---');
  console.log('file:', filePath);
  console.log('worksheet rows:', dataRows.length);
  console.log('parsed rows:', parsed.length);
  console.log('deduped out (same report_date):', dedupedOut);
  console.log('ready to import:', finalRows.length);
  console.log('skipped rows:', skipped.length);
  if (skipped.length) {
    console.log('first skipped examples:', skipped.slice(0, 8));
  }
  if (unmatchedNames.size) {
    console.log('unmatched personnel names (fallback submitted_by used):', [...unmatchedNames]);
  }
  console.log('fallback submitted_by:', fallbackSubmittedBy);

  if (!isApply) {
    console.log('\nDry run only. Re-run with --apply to write. Add --wipe to clear existing report data first.');
    return;
  }

  if (shouldWipe) {
    console.log('\nWiping existing report-related data...');
    const { error: fErr } = await supabase.from('maintenance_followups').delete().not('report_id', 'is', null);
    if (fErr) throw new Error(`wipe maintenance_followups failed: ${fErr.message}`);
    const { error: gErr } = await supabase.from('generator_check_items').delete().not('report_id', 'is', null);
    if (gErr) throw new Error(`wipe generator_check_items failed: ${gErr.message}`);
    const { error: rErr } = await supabase.from('maintenance_reports').delete().not('id', 'is', null);
    if (rErr) throw new Error(`wipe maintenance_reports failed: ${rErr.message}`);
    console.log('Wipe complete.');
  }

  let insertedReports = 0;
  const allGenItems = [];

  for (const row of finalRows) {
    const { data: inserted, error: insErr } = await supabase
      .from('maintenance_reports')
      .insert(row.payload)
      .select('id')
      .single();

    if (insErr) {
      throw new Error(`insert failed for report_date=${row.payload.report_date}: ${insErr.message}`);
    }

    insertedReports += 1;
    const reportId = inserted.id;

    for (const k of keyRows || []) {
      allGenItems.push({
        report_id: reportId,
        category: k.category,
        item_key: k.item_key,
        status: row.generatorStatuses[`${k.category}:${k.item_key}`] || 'na',
      });
    }
  }

  let insertedGen = 0;
  const chunkSize = 500;
  for (let i = 0; i < allGenItems.length; i += chunkSize) {
    const chunk = allGenItems.slice(i, i + chunkSize);
    const { error: gErr } = await supabase.from('generator_check_items').insert(chunk);
    if (gErr) throw new Error(`generator_check_items insert chunk failed: ${gErr.message}`);
    insertedGen += chunk.length;
  }

  console.log('\nImport complete.');
  console.log('reports inserted:', insertedReports);
  console.log('generator items inserted:', insertedGen);
  console.log('skipped rows:', skipped.length);
}

run().catch((err) => {
  console.error('IMPORT FAILED:', err.message);
  process.exit(1);
});
