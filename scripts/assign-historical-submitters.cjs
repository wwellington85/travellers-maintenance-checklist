#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseIsoDate(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s|$)/);
  if (m) {
    const mm = Number(m[1]);
    const dd = Number(m[2]);
    let yyyy = Number(m[3]);
    if (yyyy < 100) yyyy += 2000;
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseStrictNumber(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim().replace(/,/g, '');
  if (!s) return null;
  if (!/^-?\d+(?:\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function parseTimestampMs(v) {
  const d = new Date(String(v || '').trim());
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function canonicalName(raw) {
  const n = normalize(raw);
  if (!n || n === 'option 1' || n === 'travellers' || n.includes('travellers negril jamaica')) return 'Travellers Negril Jamaica';
  if (n === 'vincent' || n === 'vincent gray') return 'Vincent Gray';
  if (n === 'jason' || n === 'jason davis' || n === 'jason davis ') return 'Jason Davis';
  if (n === 'car' || n === 'carl' || n === 'carl francis' || n.startsWith('carl ') || n === 'francis') return 'Carl Francis';
  if (n === 'howard anthony knight') return 'Howard Anthony Knight';
  if (n === 'kenroy') return 'Kenroy';
  if (n === 'kevay white') return 'Kevay White';
  return String(raw || '').trim() || 'Travellers Negril Jamaica';
}

function placeholderEmail(fullName) {
  const slug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${slug || 'staff'}@travellers.local`;
}

async function ensureProfileForName(supabase, fullName) {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id,full_name')
    .eq('full_name', fullName)
    .maybeSingle();
  if (existingProfile?.id) return existingProfile.id;

  const email = placeholderEmail(fullName);

  let userId = null;
  let page = 1;
  const perPage = 200;
  while (!userId) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const users = data?.users || [];
    const found = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (found) {
      userId = found.id;
      break;
    }
    if (users.length < perPage) break;
    page += 1;
  }

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: `Temp-${Math.random().toString(36).slice(2)}!`,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw new Error(`createUser(${fullName}) failed: ${error.message}`);
    userId = data.user.id;
  }

  const { error: upsertErr } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    role: 'maintenance',
    is_active: true,
  });
  if (upsertErr) throw new Error(`profile upsert (${fullName}) failed: ${upsertErr.message}`);

  return userId;
}

async function run() {
  const fileArgIdx = process.argv.indexOf('--file');
  const filePath =
    fileArgIdx >= 0 && process.argv[fileArgIdx + 1]
      ? process.argv[fileArgIdx + 1]
      : '/Users/preston/Downloads/MAINTENANCE NIGHT TIME CHECK LIST (Responses).xlsx';

  const env = loadDotEnv(path.join(process.cwd(), '.env.local'));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  const headers = rows[0] || [];
  const dataRows = rows.slice(1);

  const hDate = headers.find((x) => String(x).includes('Please state date of check'));
  const hName = headers.find((x) => String(x).includes('Name of Maintenance Personnel'));
  const hTimestamp = headers.find((x) => String(x).includes('Timestamp'));
  const hWater = headers.find((x) => String(x).includes('record water meter reading'));
  const hElectric = headers.find((x) => String(x).includes('record the electric meter reading'));

  const colIndex = new Map(headers.map((x, i) => [String(x || ''), i]));
  const get = (r, h) => {
    const i = colIndex.get(String(h || ''));
    return i == null ? '' : r[i];
  };

  const parsed = [];
  for (const r of dataRows) {
    const reportDate = parseIsoDate(get(r, hDate)) || parseIsoDate(get(r, hTimestamp));
    const water = parseStrictNumber(get(r, hWater));
    const electric = parseStrictNumber(get(r, hElectric));
    if (!reportDate || water == null || electric == null) continue;
    const name = canonicalName(get(r, hName));
    parsed.push({ reportDate, ts: parseTimestampMs(get(r, hTimestamp)), name });
  }

  const byDate = new Map();
  for (const p of parsed) {
    const ex = byDate.get(p.reportDate);
    if (!ex || p.ts >= ex.ts) byDate.set(p.reportDate, p);
  }

  const dateToName = new Map([...byDate.entries()].map(([d, v]) => [d, v.name]));
  const names = [...new Set([...dateToName.values()])].sort();

  const nameToId = new Map();
  for (const name of names) {
    const id = await ensureProfileForName(supabase, name);
    nameToId.set(name, id);
  }

  const { data: reports, error: repErr } = await supabase
    .from('maintenance_reports')
    .select('id, report_date')
    .order('report_date', { ascending: true });
  if (repErr) throw new Error(repErr.message);

  let updated = 0;
  let unmapped = 0;
  for (const r of reports || []) {
    const name = dateToName.get(r.report_date);
    if (!name) {
      unmapped += 1;
      continue;
    }
    const submittedBy = nameToId.get(name);
    if (!submittedBy) {
      unmapped += 1;
      continue;
    }
    const { error: upErr } = await supabase
      .from('maintenance_reports')
      .update({ submitted_by: submittedBy })
      .eq('id', r.id);
    if (upErr) throw new Error(`update ${r.id} failed: ${upErr.message}`);
    updated += 1;
  }

  console.log('Profiles ensured:', names.length);
  console.log('Names:', names);
  console.log('Reports updated submitted_by:', updated);
  console.log('Reports without mapping:', unmapped);
}

run().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
