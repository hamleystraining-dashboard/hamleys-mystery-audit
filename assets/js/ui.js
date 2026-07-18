/* Shared UI chrome: sidebar nav + toast helper, used by every page. */

// `internal` = true shows the L&D-only nav group (Admin, Cases). Only pass
// true from admin.html / cases.html themselves, once the password gate has
// already passed — index.html and cohort.html (the public pages) always
// call this with internal=false so those links aren't advertised publicly.
function renderSidebar(active, internal) {
  let html = `
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
  </div>`;

  if (internal) {
    html += `
  <div class="nav-group">
    <div class="nav-label">L&amp;D / ROM / HRBP</div>
    <a class="nav-link ${active === "cases.html" ? "active" : ""}" href="cases.html"><span class="ic">\u26A0</span>Cases</a>
    <a class="nav-link ${active === "admin.html" ? "active" : ""}" href="admin.html"><span class="ic">\u2699</span>Admin</a>
  </div>`;
  }

  html += `<div class="sidebar-foot">Data refreshed via Admin uploads.<br>Static build &middot; GitHub Pages</div>`;
  document.querySelector(".sidebar").innerHTML = html;
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
