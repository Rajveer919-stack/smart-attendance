import { useState } from 'react';
import api from '../api/axios';

const MAX_ROWS = 200;
const inputClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

// ---------- CSV padhna ----------
// Comma, semicolon ya tab se alag kiya hua text; "..." ke andar comma/new line bhi chalta hai
export function parseCSV(raw) {
  const text = String(raw || '').replace(/^﻿/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const delim = [',', ';', '\t'].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const ALIASES = {
  name: ['name', 'studentname', 'fullname', 'naam'],
  email: ['email', 'emailid', 'emailaddress', 'mail'],
  rollNo: ['rollno', 'roll', 'rollnumber', 'rollnum', 'rno'],
  department: ['department', 'dept', 'course', 'branch'],
  semester: ['semester', 'sem'],
  password: ['password', 'pass', 'pwd'],
};

// Header ke naam (kisi bhi tarah likhe ho) ko hamare naam se jodta hai
export function rowsFromCSV(text) {
  const table = parseCSV(text);
  if (table.length < 2) return { rows: [], missing: ['file me header aur kam se kam ek student chahiye'] };
  const head = table[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const idx = {};
  Object.keys(ALIASES).forEach((k) => {
    idx[k] = head.findIndex((h) => ALIASES[k].includes(h));
  });
  const need = { name: 'name', email: 'email', rollNo: 'roll no', department: 'department', semester: 'semester' };
  const missing = Object.keys(need).filter((k) => idx[k] < 0).map((k) => need[k]);
  if (missing.length) return { rows: [], missing };
  const rows = table.slice(1).map((r) => {
    const o = {};
    Object.keys(idx).forEach((k) => {
      o[k] = idx[k] >= 0 ? String(r[idx[k]] === undefined ? '' : r[idx[k]]).trim() : '';
    });
    return o;
  });
  return { rows, missing: [] };
}

// ---------- CSV banana / download ----------
// "=" ya "+" se shuru hone wale text ko Excel formula na samjhe
const safe = (v, raw) => {
  const s = String(v === undefined || v === null ? '' : v);
  const t = !raw && /^[=+\-@]/.test(s) ? "'" + s : s;
  return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};

// rawCol: is column me text jaisa ka waisa likho (password badalna nahi chahiye)
function downloadCSV(fileName, lines, rawCol) {
  const blob = new Blob(['﻿' + lines.map((l) => l.map((v, i) => safe(v, i === rawCol)).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

const TEMPLATE = [
  ['name', 'email', 'roll no', 'department', 'semester', 'password (optional)'],
  ['Rahul Sharma', 'rahul.sharma@gmail.com', '1', 'BCA', '6', ''],
  ['Priya Verma', 'priya.verma@gmail.com', '2', 'BCA', '6', ''],
];

// Admin ke liye: CSV file se ek sath bahut saare students jodna
// onDone: upload ke baad list dobara load karne ke liye
export default function BulkUpload({ onDone }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [check, setCheck] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setRows([]);
    setFileName('');
    setCheck(null);
    setResult(null);
    setError('');
  };

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    reset();
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      setError('Excel file seedhi nahi chalegi. Excel me File → Save As → "CSV (Comma delimited)" chuno aur wo .csv file upload karo.');
      return;
    }
    const text = await file.text();
    const parsed = rowsFromCSV(text);
    if (parsed.missing.length) {
      setError('File me ye column nahi mile: ' + parsed.missing.join(', ') + '. Template download karke dekho.');
      return;
    }
    if (parsed.rows.length > MAX_ROWS) {
      setError('Ek baar me ' + MAX_ROWS + ' se zyada student nahi (file me ' + parsed.rows.length + ' hain). File ko hisso me baant do.');
      return;
    }
    setFileName(file.name);
    setRows(parsed.rows);
    await runCheck(parsed.rows);
  };

  const runCheck = async (list) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/users/bulk', { rows: list, dryRun: true });
      setCheck(data);
    } catch (err) {
      setError((err.response && err.response.data && err.response.data.message) || 'Check nahi ho paya');
    } finally {
      setBusy(false);
    }
  };

  const upload = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/users/bulk', { rows });
      setResult(data);
      setCheck(null);
      if (onDone) onDone();
    } catch (err) {
      setError((err.response && err.response.data && err.response.data.message) || 'Upload nahi ho paya');
    } finally {
      setBusy(false);
    }
  };

  const credentials = () =>
    downloadCSV('student-passwords.csv', [
      ['name', 'email', 'roll no', 'department', 'semester', 'password'],
      ...result.created.map((c) => [c.name, c.email, c.rollNo, c.department, c.semester, c.password]),
    ], 5);

  const failedTable = (list) =>
    list.length > 0 && (
      <div className="overflow-x-auto rounded-lg border border-red-100">
        <table className="w-full text-sm">
          <thead className="bg-red-50 text-red-800">
            <tr>
              <th className="px-3 py-2 text-left">Line</th>
              <th className="px-3 py-2 text-left">Naam</th>
              <th className="px-3 py-2 text-left">Kya dikkat hai</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 100).map((f, i) => (
              <tr key={i} className="border-t border-red-100">
                <td className="px-3 py-1.5 text-slate-600">{f.line}</td>
                <td className="px-3 py-1.5 text-slate-700">{f.name || f.email || '-'}</td>
                <td className="px-3 py-1.5 text-red-700">{f.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length > 100 && <p className="px-3 py-2 text-xs text-slate-500">Pehli 100 galtiyan dikha rahe hain.</p>}
      </div>
    );

  return (
    <section className="bg-white rounded-2xl shadow p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Bulk upload (CSV se students jodo)</h2>
          <p className="text-sm text-slate-500">Ek sath {MAX_ROWS} tak student, ek-ek karke nahi.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            reset();
          }}
          className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
        >
          {open ? 'Band karo' : 'Upload shuru karo'}
        </button>
      </div>

      {open && (
        <div className="space-y-4">
          <ol className="list-decimal pl-5 text-sm text-slate-600 space-y-1">
            <li>Template download karo aur Excel me students bharo (naam, email, roll no, department, semester).</li>
            <li>Excel me File → Save As → "CSV (Comma delimited)" karke save karo.</li>
            <li>Neeche wo .csv file chuno. Pehle check hoga, phir tum upload dabaoge.</li>
            <li>Password column khali chhodoge to har student ka apne aap ban jayega (baad me download kar paoge).</li>
          </ol>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => downloadCSV('students-template.csv', TEMPLATE)}
              className="rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-2 hover:bg-indigo-100"
            >
              Template download
            </button>
            <input type="file" accept=".csv,.txt,.tsv,text/csv" onChange={onFile} className={inputClass} aria-label="CSV file chuno" />
          </div>

          {fileName && !error && (
            <p className="text-sm text-slate-600">
              {'File: ' + fileName + ' (' + rows.length + ' rows)'}
            </p>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {busy && <p className="text-sm text-slate-500">Ho raha hai, thoda ruko...</p>}

          {check && !result && (
            <div className="space-y-3">
              <p className="text-sm rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                <b className="text-green-700">{check.valid + ' sahi'}</b>
                {'  ·  '}
                <b className={check.failed.length ? 'text-red-700' : 'text-slate-500'}>{check.failed.length + ' galat'}</b>
                {'  (kul ' + check.total + ')'}
              </p>
              {failedTable(check.failed)}
              {check.failed.length > 0 && (
                <p className="text-xs text-slate-500">Galat rows chhod di jayengi. Chaho to file theek karke dobara chuno.</p>
              )}
              <button
                type="button"
                onClick={upload}
                disabled={busy || check.valid === 0}
                className="rounded-lg bg-green-600 text-white text-sm font-medium px-4 py-2 hover:bg-green-700 disabled:opacity-60"
              >
                {'Sahi ' + check.valid + ' students banao'}
              </button>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <p className="text-sm rounded-lg bg-green-50 text-green-800 px-3 py-2">
                {result.createdCount + ' students ban gaye.' + (result.failed.length ? ' ' + result.failed.length + ' nahi bane.' : '')}
              </p>
              {result.createdCount > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 space-y-2">
                  <p className="text-sm text-amber-900">
                    Passwords sirf abhi dikhte hain, baad me wapas nahi milenge. Ye file download karke students ko do (wo baad me Account me badal sakte hain).
                  </p>
                  <button
                    type="button"
                    onClick={credentials}
                    className="rounded-lg bg-amber-600 text-white text-sm font-medium px-4 py-2 hover:bg-amber-700"
                  >
                    Passwords ki file download karo
                  </button>
                </div>
              )}
              {failedTable(result.failed)}
              <button type="button" onClick={reset} className="text-sm font-medium text-indigo-600">
                Dusri file upload karo
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}