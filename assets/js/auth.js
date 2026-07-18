/* ==========================================================================
   Access gate for Admin & Cases pages.
   NOTE: This is a client-side deterrent, not real security — anyone who
   views the page source can see the hash and, with effort, brute-force a
   weak password offline. It stops casual/accidental access from a shared
   link, but it is NOT a substitute for real auth. See README §2 for the
   recommended upgrade path (Google Sheets + Apps Script, which can check
   the visitor's Google account).
   ========================================================================== */

// SHA-256 hash of the shared L&D/ROM/HRBP password. Default password is
// "hamleys2026" — CHANGE THIS before you rely on it. To generate a new hash,
// open any browser console and run:
//   crypto.subtle.digest("SHA-256", new TextEncoder().encode("your-password"))
//     .then(b => console.log(Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")))
const ACCESS_HASH = "ddeb721f1b2d5c26bad8274903f7865c21c3fa1249841ccaa22b04bf1844d924"; // sha256("hamleys2026") — CHANGE THIS, see README

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function requireAccess(pageLabel) {
  if (sessionStorage.getItem("hmai_access_ok") === "1") return Promise.resolve();

  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:#101A3D;display:flex;align-items:center;justify-content:center;z-index:9999;font-family:'Inter',sans-serif;";
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:32px;max-width:340px;width:90%;box-shadow:0 20px 50px rgba(0,0,0,0.4);text-align:center;">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#E31E2B,#FF5C8A);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:22px;margin:0 auto 14px;">H</div>
        <h2 style="font-family:'Baloo 2',sans-serif;color:#101A3D;margin:0 0 6px;font-size:20px;">${pageLabel}</h2>
        <p style="color:#5A5F78;font-size:13px;margin:0 0 18px;">L&amp;D / ROM / HRBP access only. Enter the shared password to continue.</p>
        <input type="password" id="gatePw" placeholder="Password" style="width:100%;padding:10px 12px;border-radius:9px;border:1.5px solid #E8E4D8;font-size:14px;box-sizing:border-box;margin-bottom:10px;">
        <div id="gateErr" style="color:#E31E2B;font-size:12px;min-height:16px;margin-bottom:8px;"></div>
        <button id="gateBtn" style="width:100%;padding:10px;border:none;border-radius:10px;background:linear-gradient(135deg,#E31E2B,#B8121D);color:#fff;font-weight:700;font-size:14px;cursor:pointer;">Enter</button>
      </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector("#gatePw");
    const btn = overlay.querySelector("#gateBtn");
    const err = overlay.querySelector("#gateErr");
    input.focus();

    async function attempt() {
      const hash = await sha256(input.value);
      if (hash === ACCESS_HASH) {
        sessionStorage.setItem("hmai_access_ok", "1");
        overlay.remove();
        resolve();
      } else {
        err.textContent = "Incorrect password";
        input.value = "";
        input.focus();
      }
    }
    btn.addEventListener("click", attempt);
    input.addEventListener("keydown", e => { if (e.key === "Enter") attempt(); });
  });
}
