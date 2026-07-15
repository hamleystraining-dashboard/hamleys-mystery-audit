
const DB={
 init(){if(!localStorage.hm_stores)localStorage.hm_stores=JSON.stringify(SEED_DATA.stores);if(!localStorage.hm_audits)localStorage.hm_audits=JSON.stringify(SEED_DATA.audits);if(!localStorage.hm_cases)localStorage.hm_cases='[]';},
 get stores(){return JSON.parse(localStorage.hm_stores||'[]')},set stores(v){localStorage.hm_stores=JSON.stringify(v)},
 get audits(){return JSON.parse(localStorage.hm_audits||'[]')},set audits(v){localStorage.hm_audits=JSON.stringify(v)},
 get cases(){return JSON.parse(localStorage.hm_cases||'[]')},set cases(v){localStorage.hm_cases=JSON.stringify(v)},
 reset(){localStorage.removeItem('hm_stores');localStorage.removeItem('hm_audits');localStorage.removeItem('hm_cases');location.reload()}
};DB.init();
const SECTIONS=['Hamleys First Impression','Approaching Right','Meeting Thy Needs','Lost in Demos','Engaging Till Experience','You Come First','Seeing Them Off'];
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function scoreClass(v){return v<60?'bad':v<80?'warn':'good'}
function nav(active){return `<header><div class="brand"><img class="logo-img" src="hamleys-logo.png" alt="Hamleys"><div><b>Mystery Audit</b><div class="sub">Leadership Intelligence V1</div></div></div><nav>
<a class="${active==='dash'?'active':''}" href="index.html">Dashboard</a><a class="${active==='admin'?'active':''}" href="admin.html">Admin</a><a class="${active==='def'?'active':''}" href="defaulters.html">Defaulters</a><a class="${active==='hr'?'active':''}" href="hr-action.html">HR Actions</a></nav></header>`}
