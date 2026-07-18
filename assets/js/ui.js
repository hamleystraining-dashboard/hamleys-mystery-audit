/* Shared UI chrome: sidebar nav + toast helper, used by every page. */

function renderSidebar(active) {
  const links = [
    { href: "index.html", ic: "\u25A6", label: "Overview" },
    { href: "cohort.html", ic: "\u25A4", label: "Store Cohort" },
    { href: "cases.html", ic: "\u26A0", label: "Cases" },
    { href: "admin.html", ic: "\u2699", label: "Admin", group: "L&D Only" },
  ];
  let html = `
  <div class="brand">
    <div class="brand-mark">H</div>
    <div class="brand-text">
      <div class="top">Hamleys</div>
      <div class="sub">Mystery Audit Intel</div>
    </div>
  </div>
  <div class="nav-group">
    <div class="nav-label">Dashboards</div>`;
  ["index.html", "cohort.html", "cases.html"].forEach(href => {
    const l = links.find(x => x.href === href);
    html += `<a class="nav-link ${active === href ? "active" : ""}" href="${href}"><span class="ic">${l.ic}</span>${l.label}</a>`;
  });
  html += `</div><div class="nav-group"><div class="nav-label">L&amp;D Team</div>`;
  const admin = links.find(x => x.href === "admin.html");
  html += `<a class="nav-link ${active === "admin.html" ? "active" : ""}" href="admin.html"><span class="ic">${admin.ic}</span>${admin.label}</a>`;
  html += `</div>
  <div class="sidebar-foot">Data refreshed via Admin uploads.<br>Static build &middot; GitHub Pages</div>`;

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
