// Export de reportes sin dependencias: CSV con Blob, PDF vía ventana de impresión.

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const s = value == null ? '' : String(value);
  // Escapar comillas y envolver si contiene coma/comilla/salto de línea
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\n'); // BOM para Excel/acentos
}

const dateStr = (ts, isEn) => new Date(ts).toLocaleDateString(isEn ? 'en-US' : 'es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── Historial del Closer ─────────────────────────────────────────────────────
export function exportHistoryCSV(sessions, isEn = false) {
  const header = isEn
    ? ['Date', 'Lead', 'Industry', 'Objection', 'Duration (min)', 'Overall', 'Rapport', 'Objections', 'Closing', 'Listening']
    : ['Fecha', 'Lead', 'Industria', 'Objeción', 'Duración (min)', 'General', 'Rapport', 'Objeciones', 'Cierre', 'Escucha'];
  const rows = [header];
  sessions.forEach(s => {
    const a = s.analysis || {};
    const sc = a.scores || {};
    rows.push([
      dateStr(s.savedAt, isEn), s.scenario?.name, s.scenario?.industry, s.scenario?.objection,
      s.sessionDurationMinutes || '', a.overallScore ?? '',
      sc.rapport ?? '', sc.objectionHandling ?? '', sc.closing ?? '', sc.activeListening ?? ''
    ]);
  });
  downloadBlob(toCsv(rows), `sales-arena-historial-${Date.now()}.csv`, 'text/csv;charset=utf-8');
}

export function exportHistoryPDF(sessions, userEmail, isEn = false) {
  const avg = sessions.length
    ? (sessions.reduce((s, x) => s + (x.analysis?.overallScore || 0), 0) / sessions.length).toFixed(1)
    : '—';
  const best = sessions.length ? Math.max(...sessions.map(s => s.analysis?.overallScore || 0)) : '—';

  const rows = sessions.map(s => {
    const a = s.analysis || {};
    const color = (a.overallScore || 0) >= 8 ? '#30d158' : (a.overallScore || 0) >= 6 ? '#ff9f0a' : '#ff453a';
    return `<tr>
      <td>${dateStr(s.savedAt, isEn)}</td>
      <td>${esc(s.scenario?.name)} <span class="muted">· ${esc(s.scenario?.industry)}</span></td>
      <td>${s.sessionDurationMinutes || '—'} min</td>
      <td style="text-align:center"><b style="color:${color}">${a.overallScore ?? '—'}</b>/10</td>
      <td class="muted">${esc((a.nextSessionTip || '').slice(0, 90))}</td>
    </tr>`;
  }).join('');

  const body = `
    <div class="stats">
      <div class="stat"><div class="stat-num">${sessions.length}</div><div class="stat-label">${isEn ? 'Sessions' : 'Sesiones'}</div></div>
      <div class="stat"><div class="stat-num">${avg}</div><div class="stat-label">${isEn ? 'Avg score' : 'Promedio'}</div></div>
      <div class="stat"><div class="stat-num">${best}</div><div class="stat-label">${isEn ? 'Best' : 'Mejor'}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>${isEn ? 'Date' : 'Fecha'}</th><th>Lead</th><th>${isEn ? 'Duration' : 'Duración'}</th>
        <th style="text-align:center">Score</th><th>${isEn ? 'Next tip' : 'Próximo tip'}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  openPrintReport(isEn ? 'My Progress Report' : 'Mi Reporte de Progreso', userEmail, body);
}

// ─── Cohorte del Trainer ──────────────────────────────────────────────────────
export function exportCohortCSV(students, isEn = false) {
  const header = isEn
    ? ['Student', 'Email', 'Sessions', 'Avg score', 'Best score', 'Last session']
    : ['Alumno', 'Email', 'Sesiones', 'Promedio', 'Mejor', 'Última sesión'];
  const rows = [header];
  students.forEach(st => {
    const sessions = Object.values(st.sessions || {});
    const avg = sessions.length ? (sessions.reduce((s, x) => s + (x.overallScore || 0), 0) / sessions.length).toFixed(1) : '';
    const best = sessions.length ? Math.max(...sessions.map(s => s.overallScore || 0)) : '';
    const last = sessions.length ? dateStr(Math.max(...sessions.map(s => s.savedAt)), isEn) : '';
    rows.push([st.profile?.name, st.profile?.email, sessions.length, avg, best, last]);
  });
  downloadBlob(toCsv(rows), `sales-arena-cohorte-${Date.now()}.csv`, 'text/csv;charset=utf-8');
}

export function exportCohortPDF(students, trainerEmail, isEn = false) {
  const allSessions = students.flatMap(s => Object.values(s.sessions || {}));
  const cohortAvg = allSessions.length ? (allSessions.reduce((s, x) => s + (x.overallScore || 0), 0) / allSessions.length).toFixed(1) : '—';

  const rows = students.map(st => {
    const sessions = Object.values(st.sessions || {});
    const avg = sessions.length ? sessions.reduce((s, x) => s + (x.overallScore || 0), 0) / sessions.length : 0;
    const best = sessions.length ? Math.max(...sessions.map(s => s.overallScore || 0)) : '—';
    const color = avg >= 8 ? '#30d158' : avg >= 6 ? '#ff9f0a' : '#ff453a';
    return `<tr>
      <td>${esc(st.profile?.name)} <span class="muted">${esc(st.profile?.email || '')}</span></td>
      <td style="text-align:center">${sessions.length}</td>
      <td style="text-align:center"><b style="color:${color}">${sessions.length ? avg.toFixed(1) : '—'}</b></td>
      <td style="text-align:center">${best}</td>
    </tr>`;
  }).join('');

  const body = `
    <div class="stats">
      <div class="stat"><div class="stat-num">${students.length}</div><div class="stat-label">${isEn ? 'Students' : 'Alumnos'}</div></div>
      <div class="stat"><div class="stat-num">${allSessions.length}</div><div class="stat-label">${isEn ? 'Sessions' : 'Sesiones'}</div></div>
      <div class="stat"><div class="stat-num">${cohortAvg}</div><div class="stat-label">${isEn ? 'Cohort avg' : 'Promedio cohorte'}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>${isEn ? 'Student' : 'Alumno'}</th><th style="text-align:center">${isEn ? 'Sessions' : 'Sesiones'}</th>
        <th style="text-align:center">${isEn ? 'Avg' : 'Prom.'}</th><th style="text-align:center">${isEn ? 'Best' : 'Mejor'}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  openPrintReport(isEn ? 'Cohort Progress Report' : 'Reporte de Progreso del Cohorte', trainerEmail, body);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function openPrintReport(title, subtitle, bodyHtml) {
  const win = window.open('', '_blank');
  if (!win) { alert('Permití las ventanas emergentes para exportar el PDF.'); return; }
  const today = new Date().toLocaleDateString();
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; margin: 0; padding: 40px; }
      .header { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #5e5ce6; padding-bottom: 16px; margin-bottom: 8px; }
      .logo { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg,#0a84ff,#5e5ce6,#4d4ad9); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 20px; }
      h1 { font-size: 22px; margin: 0; }
      .subtitle { color: #666; font-size: 13px; margin: 2px 0 24px; }
      .stats { display: flex; gap: 16px; margin-bottom: 28px; }
      .stat { flex: 1; background: #f5f3ff; border: 1px solid #e5e0ff; border-radius: 12px; padding: 16px; text-align: center; }
      .stat-num { font-size: 28px; font-weight: 800; color: #5e5ce6; }
      .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { text-align: left; padding: 10px 12px; background: #f8f8fc; border-bottom: 2px solid #e5e0ff; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
      td { padding: 10px 12px; border-bottom: 1px solid #eee; }
      .muted { color: #999; font-size: 11px; }
      .footer { margin-top: 32px; text-align: center; color: #aaa; font-size: 11px; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <div class="header">
      <div class="logo">♞</div>
      <div><h1>${esc(title)}</h1></div>
    </div>
    <div class="subtitle">${esc(subtitle || '')} · ${today} · Sales Arena</div>
    ${bodyHtml}
    <div class="footer">Generado por Sales Arena — sales-arena.netlify.app</div>
    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}
