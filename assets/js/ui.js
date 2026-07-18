/* Shared UI chrome: sidebar nav (public pages) + standalone header
   (gated internal pages) + shared widgets, used across every page. */

// Public suite nav — Overview, Store Cohort, Trend Data. Admin & Cases are
// intentionally never listed here; they're separate, gated tools, not tabs
// of this dashboard.
function renderSidebar(active) {
  const html = `
  <div class="brand">
    <div class="brand-mark">H</div>
    <div class="brand-text">
      <div class="top">Hamleys</div>
      <div class="sub">Mystery Audit Intel</div>
    </div>
  </div>
  <div class="nav-group">
    <div class="nav-label">Dashboards</div>
    <a class="nav-link ${active === "index.html" ? "active" : ""}" href="index.html"><span class="ic">\u25A6</span>Overview</a>
    <a class="nav-link ${active === "cohort.html" ? "active" : ""}" href="cohort.html"><span class="ic">\u25A4</span>Store Cohort</a>
    <a class="nav-link ${active === "trend.html" ? "active" : ""}" href="trend.html"><span class="ic">\u2248</span>Trend Data</a>
  </div>
  <div class="sidebar-foot">Data refreshed via Admin uploads.<br>Static build &middot; GitHub Pages</div>`;
  document.querySelector(".sidebar").innerHTML = html;
}

// Standalone header for admin.html / cases.html — deliberately has no links
// to the public Overview/Cohort/Trend pages or to each other; each is a
// single-purpose tool behind its own password gate. "Exit" just returns to
// the public dashboard, it's not a nav tab.
function renderStandaloneHeader(title, subtitle) {
  const bar = document.createElement("div");
  bar.className = "standalone-header";
  bar.innerHTML = `
    <div class="brand" style="border:none;padding:0;">
      <div class="brand-mark">H</div>
      <div class="brand-text">
        <div class="top" style="color:var(--hamleys-navy);">${title}</div>
        <div class="sub" style="color:var(--ink-faint);">${subtitle || ""}</div>
      </div>
    </div>
    <div style="display:flex; gap:10px; align-items:center;">
      <a href="index.html" class="btn btn-ghost btn-sm">Exit to Dashboard</a>
      <button class="btn btn-ghost btn-sm" onclick="sessionStorage.removeItem('hmai_access_ok'); location.reload();">Log out</button>
    </div>`;
  document.body.prepend(bar);
}

function toast(msg) {
  let el = document.getElementById("hmai-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "hmai-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.style.display = "none", 2600);
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function scorePill(score) {
  const cls = HMAI.scoreClass(score);
  return `<span class="score-pill ${cls}">${score}</span>`;
}

function fillSelect(sel, values, placeholder) {
  sel.innerHTML = `<option value="">${placeholder}</option>` + values.map(v => `<option value="${v}">${v}</option>`).join("");
}

// Friendly full-page error when data can't load (e.g. opened via file://,
// or the JSON files are missing) instead of a silently blank dashboard.
function showLoadError(err) {
  const isFileProto = err && err.message === "FILE_PROTOCOL";
  const container = document.querySelector(".standalone-main, .main") || document.body;
  container.insertAdjacentHTML("afterbegin", `
    <div class="card" style="margin:24px; border-color:#F3C6C6; background:#FDEAEA;">
      <h3 style="color:var(--hamleys-red);">Couldn't load dashboard data</h3>
      ${isFileProto ? `
        <p>This page was opened directly from a file (a <code>file://</code> address) — browsers block local data
        loading that way for security. Run a tiny local server instead:</p>
        <pre style="background:#fff;padding:10px 14px;border-radius:8px;overflow-x:auto;">cd path/to/hamleys-mystery-audit-dashboard
python -m http.server 8000</pre>
        <p>then open <code>http://localhost:8000/</code> in your browser. On the live GitHub Pages link this isn't an issue.</p>
      ` : `<p>${err && err.message ? err.message : "Unknown error"} — check that assets/data/*.json exist and are reachable.</p>`}
    </div>`);
}
