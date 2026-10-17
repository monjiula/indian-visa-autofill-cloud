function extractVisaDetailsFromText(text) {
  if (!text) return {};
  const res = {};
  const exitMatch = text.match(/Port\s*of\s*Exit\s+([A-Za-z0-9\/\(\)\s\-]+?)(?=\s*(?:Port\s*Of\s*Arrival|Required|Application|Places|Purpose|F\.|Previous|$))/i);
  if (exitMatch) res.exitpoint = exitMatch[1].trim().replace(/\s+/g, ' ');

  const entryMatch = text.match(/Port\s*Of\s*Arrival\s+([A-Za-z0-9\/\(\)\s\-]+?)(?=\s*(?:Port\s*of\s*Exit|Required|Application|Places|$))/i);
  if (entryMatch) {
    const val = entryMatch[1].trim().replace(/\s+/g, ' ');
    if (!val.toUpperCase().includes('REQUIRED') && !val.toUpperCase().includes('DETAIL')) {
      res.entrypoint = val;
    }
  }
  if (!res.entrypoint && res.exitpoint) res.entrypoint = res.exitpoint;
  if (!res.exitpoint && res.entrypoint) res.exitpoint = res.entrypoint;

  const entriesMatch = text.match(/No\s*of\s*Entries\s+([A-Za-z]+)/i);
  if (entriesMatch) {
    const raw = entriesMatch[1].trim().toUpperCase();
    if (raw.includes('MULTI') || raw === '2') res.visa_entry_id = '2';
    else if (raw.includes('SING') || raw === '1') res.visa_entry_id = '1';
    else if (raw.includes('DOUB') || raw === '3') res.visa_entry_id = '3';
    else if (raw.includes('TRIP') || raw === '4') res.visa_entry_id = '4';
    else res.visa_entry_id = raw;
  }

  const durationMatch = text.match(/Period\s*of\s*Visa\s*\(\s*Month\s*\)\s+(\d+)/i);
  if (durationMatch) res.duration = durationMatch[1].trim();

  const journeyMatch = text.match(/Expected\s*Date\s*of\s*Journey\s+([0-9]{2}-[A-Za-z]{3}-[0-9]{4}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
  if (journeyMatch) res.jouryney_id = journeyMatch[1].trim();

  const placesMatch = text.match(/Places\s*to\s*be\s*Visited\s+([A-Za-z0-9\s,]+?)(?=\s*\"\"|\s*Purpose|\s*NA)/i);
  if (placesMatch) res.places_to_visit = placesMatch[1].trim();

  // Country & Town of birth from Section A
  const pobCountryMatch = text.match(/Country\s*of\s*Birth\s+([A-Za-z\s]+?)(?=\s*(?:Citizenship|National|Religion|Educational|$))/i);
  if (pobCountryMatch) res.pobCountry = pobCountryMatch[1].trim().toUpperCase();

  const pobTownMatch = text.match(/Place\s*of\s*Birth\s*Town\/City\s+([A-Za-z0-9\s\-]+?)(?=\s*(?:Country|Citizenship|$))/i);
  if (pobTownMatch) res.pobTown = pobTownMatch[1].trim().toUpperCase();

  // Contact & Address Details from Section C
  const emailMatch = text.match(/Email\s*(?:address|id)?\s*:?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i);
  if (emailMatch) res.email_id = emailMatch[1].trim();

  const phoneMatch = text.match(/Phone\s*No\s+([0-9]+)/i);
  if (phoneMatch) res.pres_phone = phoneMatch[1].trim();

  const mobileMatch = text.match(/Mobile\s*\/Cell\s*No\s+([0-9]+)/i);
  if (mobileMatch) res.mobile = mobileMatch[1].trim();

  const pinMatch = text.match(/BANGLADESH\s+(\d{4,6})/i);
  if (pinMatch) res.pincode = pinMatch[1].trim();

  const cSec = text.match(/C\.\s*Applicant['’]s\s*Contact\s*Details([\s\S]*?)(?=D\.\s*Family\s*Details|$)/i);
  if (cSec) {
    const cText = cSec[1];
    const presMatch = cText.match(/Present\s+([\s\S]+?)(?=\s*Phone\s*No)/i);
    if (presMatch) res.pres_add1 = presMatch[1].trim().replace(/\s+/g, ' ');

    const addrMatch = cText.match(/Address\s+([\s\S]+?)(?=\s*Mobile\s*\/Cell\s*No)/i);
    if (addrMatch) res.pres_add2 = addrMatch[1].trim().replace(/\s+/g, ' ');

    const cityMatch = cText.match(/Mobile\s*\/Cell\s*No\s+[0-9]+\s+([A-Za-z0-9\s,\-]+?),\s*BANGLADESH\s+(\d{4,6})/i);
    if (cityMatch) res.pres_add3 = cityMatch[1].trim();

    const permMatch = cText.match(/Permanent\s+([\s\S]+?)(?=\s*Address)/i);
    if (permMatch) res.perm_address1 = permMatch[1].trim().replace(/\s+/g, ' ');
  }

  // Section D Family regex:
  const fatherMatch = text.match(/Father['’]s\s+([A-Za-z\s\.\-]+?)(?=\s+BANGLADESH|\s+INDIAN|\s+PAKISTAN)/i);
  if (fatherMatch) res.fthrname = fatherMatch[1].trim();

  const motherMatch = text.match(/Mother['’]s\s+([A-Za-z\s\.\-]+?)(?=\s+BANGLADESH|\s+INDIAN|\s+PAKISTAN)/i);
  if (motherMatch) res.mother_name = motherMatch[1].trim();

  const spouseMatch = text.match(/Spouse\s+([A-Za-z\s\.\-]+?)(?=\s+BANGLADESH|\s+INDIAN|\s+PAKISTAN)/i);
  if (spouseMatch) {
    const sName = spouseMatch[1].trim();
    if (!["NILL", "NA", "UNKNOWN", "NULL"].includes(sName.toUpperCase())) {
      res.spouse_name = sName;
      res.marital_status = "0";
    } else {
      res.marital_status = "1";
    }
  } else {
    res.marital_status = "1";
  }

  // Section E Occupation regex:
  const occMatch = text.match(/Present\s*Occupation\s+([A-Za-z\s]+?)(?=\s*Designation|Employer|$)/i);
  if (occMatch) res.occupation = occMatch[1].trim();

  const desMatch = text.match(/Designation\s*\/Rank\s+([A-Za-z0-9\s]+?)(?=\s*Employer|$)/i);
  if (desMatch) res.empdesignation = desMatch[1].trim();

  const empMatch = text.match(/Employer\s*name\/business\s+([A-Za-z0-9\s\.\-]+?)(?=\s*Employer\s*Address|$)/i);
  if (empMatch) res.empname = empMatch[1].trim();

  const addMatch = text.match(/Employer\s*Address\s*Phone\s*Number\s+([A-Za-z0-9\s,\.\-]+?)\s+([0-9]{5,})/i);
  if (addMatch) {
    res.empaddress = addMatch[1].trim();
    res.empphone = addMatch[2].trim();
  }

  res.pres_country = "BANGLADESH";
  res.perm_country = "BANGLADESH";
  res.isd_code1 = "880";
  res.nationality = "BANGLADESH";
  res.nationality_by = "BY BIRTH";

  res.father_place_of_birth = res.pobTown || "";
  res.father_nationality = "BANGLADESH";
  res.father_previous_nationality = "";
  res.father_country_of_birth = "BANGLADESH";

  res.mother_place_of_birth = res.pobTown || "";
  res.mother_nationality = "BANGLADESH";
  res.mother_previous_nationality = "";
  res.mother_country_of_birth = "BANGLADESH";

  res.spouse_place_of_birth = res.pobTown || "";
  res.spouse_nationality = "BANGLADESH";
  res.spouse_previous_nationality = "";
  res.spouse_country_of_birth = "BANGLADESH";

  return res;
}
import { extractFromBGDText, extractFromPassport, getApiKey, saveApiKey, testApiKey, getAdvancedSettings, saveAdvancedSettings, DEFAULT_GEMINI_MODEL } from "./gemini.js";
import { getDocument as e, GlobalWorkerOptions as t } from "./build/pdf.mjs"; t.workerSrc = chrome.runtime.getURL("build/pdf.worker.mjs"); const o = e => document.getElementById(e); async function a(e, t = {}) { /* GA disabled for privacy */ } const n = { BGD: { lambdaUrl: "", msgType: "FILL_FORM", price: "Free - Gemini AI", btnColor: "#0d6efd", serviceId: "indbgd" }, PASSPORT: { lambdaUrl: "", msgType: "FILL_FORM", price: "Free - Gemini AI", btnColor: "#198754", serviceId: "indpassport" } }; async function s() {
      const authView = o("auth-view"), loginView = o("login-view"), appView = o("app-view");
      if (authView) { authView.classList.add("hidden"); authView.style.display = "none"; }
      if (loginView) { loginView.classList.add("hidden"); loginView.style.display = "none"; }
      if (appView) { appView.classList.remove("hidden"); appView.style.display = "block"; }
      if (o("userNameDisplay")) o("userNameDisplay").textContent = "✨ Gemini AI";
      if (o("userCredits")) o("userCredits").textContent = "FREE";
    } async function i(e, t = !1) { const a = o(t ? "hiddenProfileList" : "profileList"); if (!a) return; a.innerHTML = ""; const n = await chrome.storage.local.get(null), s = (await chrome.storage.local.get(["lastSelectedProfile"])).lastSelectedProfile, r = (o("searchInput")?.value || "").toLowerCase().trim(); let c = 0; const d = Object.keys(n).filter(t => t.startsWith(`${e}_`)); d.sort((e, t) => { const o = parseInt(e.split("_")[1]) || 0; return (parseInt(t.split("_")[1]) || 0) - o }), d.forEach(o => { const d = n[o]; if (!d || "object" != typeof d) return; const l = !!d._isHidden; if (t && !l) return; if (!t && l) return; const p = (d._savedName || "").toLowerCase().includes(r), h = (d.passNo || "").toLowerCase().includes(r); if (r && !p && !h) return; c++; const u = function (e) { if (!e || "string" != typeof e) return !1; const t = e.trim(); if (!t || ["NILL", "NA", "UNKNOWN", "NULL"].includes(t.toUpperCase())) return !1; let o, a, n; const s = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/); if (s) o = parseInt(s[1], 10), a = parseInt(s[2], 10) - 1, n = parseInt(s[3], 10); else { const e = t.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/); if (e) n = parseInt(e[1], 10), a = parseInt(e[2], 10) - 1, o = parseInt(e[3], 10); else { const e = new Date(t); if (isNaN(e.getTime())) return !1; o = e.getDate(), a = e.getMonth(), n = e.getFullYear() } } const i = new Date(n, a, o, 23, 59, 59); if (isNaN(i.getTime())) return !1; const r = new Date; return i < new Date(r.getFullYear(), r.getMonth() + 6, r.getDate(), 0, 0, 0) }(d.passExpire), m = document.createElement("div"); m.className = u ? "profile-item expiry-warning" : "profile-item", m.dataset.key = o, u && (m.title = "Passport expiry date is less then 6 month"), o === s && m.classList.add("selected"); let g = ""; g = t ? '\n                <button class="show-btn" title="Restore">Show</button>\n                <button class="del-btn" title="Delete">Del</button>\n            ' : '\n                <button class="edit-btn" title="Edit">Edit</button>\n                <button class="rename-btn" title="Rename">Renm</button>\n                <button class="hide-btn" title="Hide">Hide</button>\n                <button class="del-btn" title="Delete">Del</button>\n            ', m.innerHTML = `\n            <span class="profile-name-text" title="${d._savedName || ""}" style="flex:1 1 0%; min-width:0; font-weight:${u ? "700" : "500"}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:4px;">${d._savedName}</span>\n            <div class="profile-actions">${g}</div>\n        `, t || m.addEventListener("click", async e => { "BUTTON" !== e.target.tagName && (document.querySelectorAll(".profile-item").forEach(e => e.classList.remove("selected")), m.classList.add("selected"), await chrome.storage.local.set({ lastSelectedProfile: o })) }); const f = m.querySelector(".edit-btn"); f && (f.onclick = () => chrome.tabs.create({ url: `editor.html?profile=${encodeURIComponent(o)}` })); const b = m.querySelector(".rename-btn"); b && (b.onclick = async () => { const t = prompt("Enter new profile name:", d._savedName); if (t && t !== d._savedName) { const a = { ...d, _savedName: t }, n = `${e}_${Date.now()}`; await chrome.storage.local.set({ [n]: a }), await chrome.storage.local.remove(o), o === s && await chrome.storage.local.set({ lastSelectedProfile: n }), i(e, !1) } }); const v = m.querySelector(".hide-btn"); v && (v.onclick = async () => { confirm("Hide this profile?") && (d._isHidden = !0, await chrome.storage.local.set({ [o]: d }), i(e, !1)) }); const w = m.querySelector(".show-btn"); w && (w.onclick = async () => { d._isHidden = !1, await chrome.storage.local.set({ [o]: d }), i(e, !0) }); const y = m.querySelector(".del-btn"); y && (y.onclick = async () => { confirm("Delete permanently?") && (await chrome.storage.local.remove(o), i(e, t)) }), a.appendChild(m) }), 0 === c && (a.innerHTML = '<div style="padding:10px;text-align:center;color:#777">No profiles found.</div>') } function r(e) { e ? (o("main-content").classList.add("hidden"), o("hidden-view").classList.remove("hidden")) : (o("hidden-view").classList.add("hidden"), o("main-content").classList.remove("hidden")); i(o("btn-pdf-mode").classList.contains("active") ? "BGD" : "PASSPORT", e) } function c(e) { chrome.storage.local.set({ lastServiceMode: e }) } function d(e) { o("btn-pdf-mode").className = "BGD" === e ? "toggle-btn active" : "toggle-btn", o("btn-passport-mode").className = "PASSPORT" === e ? "toggle-btn active" : "toggle-btn", "BGD" === e ? (o("pdf-upload-section").classList.remove("hidden"), o("passport-upload-section").classList.add("hidden"), o("toggle-slider").style.transform = "translateX(0%)") : (o("pdf-upload-section").classList.add("hidden"), o("passport-upload-section").classList.remove("hidden"), o("toggle-slider").style.transform = "translateX(100%)") } async function l(t) { const s = n[t], i = o("BGD" === t ? "pdfUpload" : "passportUpload"), r = i?.files[0], c = o("BGD" === t ? "saveProfileButton" : "saveProfileButtonPassport"); if (!r) return h("Please select a file.", "error"); if (r.size > 5242880) return i.value = "", h("File is too large! Maximum allowed size is 3MB.", "error"); const d = await chrome.storage.local.get(["userProfile"]); if (!d.userProfile?.token) { await chrome.storage.local.set({ isLoggedIn: true, userProfile: { name: "Pro User", token: "gemini_unlimited_token", balance: 999999, userId: "gemini_pro" } }); } h("Processing...", "processing"), c.disabled = !0, c.innerText = "Wait..."; try { let n = { token: "gemini_unlimited_token", service_type: s.serviceId }, i = "", c = []; if ("BGD" === t) { if ("application/pdf" !== r.type) throw new Error("Only PDF supported for BGD."); const t = await r.arrayBuffer(), o = await e(new Uint8Array(t)).promise; let a = ""; for (let e = 1; e <= o.numPages; e++) { const t = await o.getPage(e), n = await t.getTextContent(); a += n.items.map(e => e.str).join(" "); for (const t of n.items) t && t.str && t.str.trim() && c.push({ str: t.str.trim(), x: Math.round(10 * (t.transform ? t.transform[4] : 0)) / 10, y: Math.round(10 * (t.transform ? t.transform[5] : 0)) / 10, page: e }); if (1 === e) try { i = await g(t) } catch (e) { console.warn("Could not extract PDF photo", e) } } n.text = a } else if ("PASSPORT" === t) { const e = await function (e) { return new Promise((t, o) => { const a = new FileReader; a.readAsDataURL(e), a.onload = () => { const e = a.result.split(",")[1]; t(e) }, a.onerror = e => o(e) }) }(r); n.fileData = e, n.mimeType = r.type } 
    const apiKey = await getApiKey();
    if (!apiKey) {
      const modal = o("settingsModal");
      if (modal) { modal.classList.remove("hidden"); modal.style.display = "flex"; }
      throw new Error("Gemini API Key missing! Please click ⚙️ Settings and save your free key.");
    }
    let p = null;
    if ("BGD" === t) {
      p = await extractFromBGDText(apiKey, n.text);
    } else if ("PASSPORT" === t) {
      p = await extractFromPassport(apiKey, n.fileData, n.mimeType || "image/jpeg");
    }
    if (!p) throw new Error("Gemini extraction returned empty result.");
    if ("BGD" === t && n && n.text) {
      const vDetails = extractVisaDetailsFromText(n.text);
      for (const k in vDetails) {
        if (vDetails[k] && (!p[k] || p[k] === "NILL" || p[k] === "")) {
          p[k] = vDetails[k];
        }
      }
      if (!p.exitpoint && p.entrypoint) p.exitpoint = p.entrypoint;
    }
   if ("BGD" === t && Array.isArray(c) && c.length > 0) { const e = function (e) { let t = { nameofsponsor_ind: "NILL", add1ofsponsor_ind: "NILL", add2ofsponsor_ind: "NILL", stateofsponsor_ind: "NILL", districtofsponsor_ind: "NILL", phoneofsponsor_ind: "NILL", nameofsponsor_msn: "NILL", add1ofsponsor_msn: "NILL", add2ofsponsor_msn: "NILL", phoneofsponsor_msn: "NILL" }; if (!Array.isArray(e) || 0 === e.length) return t; const o = e.find(e => /Details of Two Reference/i.test(e.str)); if (!o) return t; const a = o.page || 1, n = e.filter(e => (e.page || 1) === a && e.str && e.str.trim()), s = n.find(e => /In India/i.test(e.str)), i = n.find(e => /In BANGLADESH/i.test(e.str)); let r = 310; s && i && i.x > s.x && (r = (s.x + i.x) / 2); const c = n.find(e => /^Name$/i.test(e.str.trim()) && e.y < o.y), d = n.find(e => /^Address$/i.test(e.str.trim()) && c && e.y < c.y), l = n.find(e => /^Phone Number$/i.test(e.str.trim()) && d && e.y < d.y), p = n.find(e => /(DOCUMENTS UPLOADED|DECLARATION)/i.test(e.str) && l && e.y < l.y); if (c && d && l) { const e = e => { const t = []; return e.forEach(e => { const o = t[t.length - 1]; o && Math.abs(o.y - e.y) <= 4 ? o.items.push(e) : t.push({ y: e.y, items: [e] }) }), t.map(e => (e.items.sort((e, t) => e.x - t.x), e.items.map(e => e.str).join(" ").trim())).filter(Boolean) }, o = n.filter(e => Math.abs(e.y - c.y) <= 6 && e.x > c.x + 10 && e.x < r).sort((e, t) => e.x - t.x), a = n.filter(e => Math.abs(e.y - c.y) <= 6 && e.x >= r).sort((e, t) => e.x - t.x); o.length && (t.nameofsponsor_ind = o.map(e => e.str).join(" ").trim()), a.length && (t.nameofsponsor_msn = a.map(e => e.str).join(" ").trim()); const s = c.y - 7, i = l.y + 6, d = n.filter(e => e.y <= s && e.y > i && e.x > c.x + 10 && e.x < r), h = n.filter(e => e.y <= s && e.y > i && e.x >= r), u = d.filter(e => !/^Address$/i.test(e.str.trim())).sort((e, t) => t.y - e.y || e.x - t.x), m = h.filter(e => !/^Address$/i.test(e.str.trim())).sort((e, t) => t.y - e.y || e.x - t.x), g = e(u), f = e(m); if (g.length > 0) { const e = g.join(" "), o = e.match(/\b(\d{6})\b/); o && (t.add2ofsponsor_ind = o[1]); const a = /\b(ANDAMAN AND NICOBAR|ANDHRA PRADESH|ARUNACHAL PRADESH|ASSAM|BIHAR|CHANDIGARH|CHHATTISGARH|DADRA AND NAGAR HAVELI|DAMAN AND DIU|DELHI|GOA|GUJARAT|HARYANA|HIMACHAL PRADESH|JAMMU AND KASHMIR|JHARKHAND|KARNATAKA|KERALA|LADAKH|LAKSHADWEEP|MADHYA PRADESH|MAHARASHTRA|MANIPUR|MEGHALAYA|MIZORAM|NAGALAND|ODISHA|ORISSA|PUDUCHERRY|PUNJAB|RAJASTHAN|SIKKIM|TAMIL NADU|TELANGANA|TRIPURA|UTTAR PRADESH|UTTARAKHAND|WEST BENGAL)\b/i, n = e.match(a); if (n) { t.stateofsponsor_ind = n[1].toUpperCase(); const o = e.slice(0, n.index).trim().match(/([A-Z\s]+)$/i); if (o) { let e = o[1].trim().split(/\s+/).slice(-2).join(" ").replace(/^\d{6}\s*/, "").trim().toUpperCase(); "NEW" === e && "DELHI" === t.stateofsponsor_ind && (e = "NEW DELHI"), t.districtofsponsor_ind = e } } /\bNEW\s+DELHI\b/i.test(e) && (t.stateofsponsor_ind = "DELHI", t.districtofsponsor_ind = "NEW DELHI"); let s = g.findIndex(e => /\b\d{6}\b/.test(e) || a.test(e)); -1 === s && (s = g.length); const i = g.slice(0, s); i.length > 0 ? t.add1ofsponsor_ind = i.map(e => e.trim()).join(" ").replace(/\s*,\s*/g, ", ").replace(/,\s*,+/g, ", ").replace(/[,\s]+$/, "").slice(0, 50) : t.add1ofsponsor_ind = e.replace(/\b\d{6}\b.*/, "").replace(/\s*,\s*/g, ", ").replace(/,\s*,+/g, ", ").replace(/[,\s]+$/, "").slice(0, 50) } f.length > 0 && (t.add1ofsponsor_msn = f[0].trim().replace(/^[,\s]+|[,\s]+$/g, "").replace(/,\s*,+/g, ", ").slice(0, 50), f.length > 1 && (t.add2ofsponsor_msn = f.slice(1).map(e => e.trim().replace(/^[,\s]+|[,\s]+$/g, "")).join(", ").replace(/,\s*,+/g, ", ").replace(/[,\s]+$/, "").slice(0, 50))); const b = l.y + 6, v = p ? p.y + 4 : l.y - 25, w = n.filter(e => e.y <= b && e.y > v && e.x > l.x + 10 && e.x < r).sort((e, t) => t.y - e.y || e.x - t.x), y = n.filter(e => e.y <= b && e.y > v && e.x >= r).sort((e, t) => t.y - e.y || e.x - t.x), L = w.map(e => e.str).join("").replace(/[^\d]/g, ""), _ = y.map(e => e.str).join("").replace(/[^\d]/g, ""); if (L && (t.phoneofsponsor_ind = L), _) { const e = _.match(/(?:88)?(01[3-9]\d{8})/); t.phoneofsponsor_msn = e ? e[1] : _ } } return t }(c); if (e.nameofsponsor_ind && "NILL" !== e.nameofsponsor_ind && (p.nameofsponsor_ind = e.nameofsponsor_ind), e.add1ofsponsor_ind && "NILL" !== e.add1ofsponsor_ind && (p.add1ofsponsor_ind = e.add1ofsponsor_ind), e.add2ofsponsor_ind && "NILL" !== e.add2ofsponsor_ind && (p.add2ofsponsor_ind = e.add2ofsponsor_ind), e.stateofsponsor_ind && "NILL" !== e.stateofsponsor_ind && (p.stateofsponsor_ind = e.stateofsponsor_ind), e.districtofsponsor_ind && "NILL" !== e.districtofsponsor_ind && (p.districtofsponsor_ind = e.districtofsponsor_ind), e.phoneofsponsor_ind && "NILL" !== e.phoneofsponsor_ind && (p.phoneofsponsor_ind = e.phoneofsponsor_ind), e.nameofsponsor_msn && "NILL" !== e.nameofsponsor_msn && (p.nameofsponsor_msn = e.nameofsponsor_msn), e.add1ofsponsor_msn && "NILL" !== e.add1ofsponsor_msn && (p.add1ofsponsor_msn = e.add1ofsponsor_msn), e.add2ofsponsor_msn && "NILL" !== e.add2ofsponsor_msn && (p.add2ofsponsor_msn = e.add2ofsponsor_msn), e.phoneofsponsor_msn && "NILL" !== e.phoneofsponsor_msn && (p.phoneofsponsor_msn = e.phoneofsponsor_msn), p.place_of_stay1 && "NILL" !== p.place_of_stay1 || (p.place_of_stay1 = p.nameofsponsor_ind, p.pos_address1 = p.add1ofsponsor_ind, p.pos_phone1 = p.phoneofsponsor_ind), !p.bgd_id || "NILL" === p.bgd_id) { const e = (n?.text || "").match(/(?:Web\s*File\s*No\.?|Application\s*Id|File\s*No\.?)\s*:?\s*(BGD[A-Z0-9]{7,12})/i) || (n?.text || "").match(/\b(BGD[A-Z0-9]{8,12})\b/i); e && (p.bgd_id = e[1].toUpperCase().trim()) } } const u = [p.givenName, p.surname].filter(Boolean), m = u.length > 0 ? u.join(" ") : "New Profile"; p._type = t, p._savedName = m, i && (p._photo = i); const f = `${t}_${Date.now()}`; await chrome.storage.local.set({ [f]: p }), await chrome.storage.local.set({ lastSelectedProfile: f }), a("profile_extraction", { service_mode: t }), h("Success!", "success"), confirm(`Saved. Edit "${m}"?`) && chrome.tabs.create({ url: `editor.html?profile=${encodeURIComponent(f)}` }) } catch (e) { console.error(e), h(e.message, "error") } finally { c.disabled = !1, c.innerHTML = `Extract Data (${s.price})` } } async function p() { const e = document.querySelector(".profile-item.selected"); if (!e) return h("Select a profile first.", "error"); const t = e.dataset.key, o = await chrome.storage.local.get(t); if (o[t]) { const [e] = await chrome.tabs.query({ active: !0, currentWindow: !0 }); chrome.tabs.sendMessage(e.id, { type: "FILL_FORM", data: o[t] }), a("autofill_started", { service_mode: o[t]._type }) } } function h(e, t) { const a = o("statusMessage"); a && (a.innerText = e, a.className = t) } async function u() { const e = o("tempIdsList"); if (!e) return; e.innerHTML = ""; let t = (await chrome.storage.local.get("recentTempIds")).recentTempIds || [], a = t.filter(e => e && e.id && String(e.id).trim() && "manual" !== e.source && "wetfweqasdfasf" !== e.id); a.length > 20 && (a = a.slice(0, 20)), a.length !== t.length && (await chrome.storage.local.set({ recentTempIds: a }), t = a), 0 !== t.length ? t.sort((e, t) => t.timestamp - e.timestamp).forEach(t => { if (!t || !t.id || !String(t.id).trim()) return; const o = document.createElement("div"); o.className = "profile-item", o.style.flexDirection = "column", o.style.alignItems = "flex-start", o.style.gap = "4px"; const a = String(t.id || "").toUpperCase().startsWith("BGD"), n = new Date(t.timestamp).toLocaleString(), s = t.name && "Unknown" !== t.name ? String(t.name).trim() : "", i = t.passport && "Unknown" !== t.passport ? String(t.passport).trim() : ""; let r = ""; s && i ? r = `<div style="color: #0f172a; font-weight: 700; font-size: 12px; line-height: 1.3;">${s} <span style="color: #0d6efd; font-weight: 600;">(${i})</span></div>` : s ? r = `<div style="color: #0f172a; font-weight: 700; font-size: 12px; line-height: 1.3;">${s}</div>` : i && (r = `<div style="color: #0d6efd; font-weight: 600; font-size: 12px; line-height: 1.3;">(${i})</div>`), o.innerHTML = `\n            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">\n                <div style="font-weight: bold; font-size: 14px; color: ${a ? "#059669" : "#d62c2c"}; letter-spacing: 0.5px;">\n                    ${t.id}\n                </div>\n                ${a ? '\n                    <div style="display: flex; gap: 4px; align-items: center;">\n                        <button class="btn-download-bgd" style="padding: 3px 8px; font-size: 11px; font-weight: 700; background: linear-gradient(135deg, #059669, #10b981); color: white; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 4px rgba(5,150,105,0.3); transition: all 0.2s ease;">\n                            Download BGD\n                        </button>\n                        <button class="btn-status-check" style="padding: 3px 8px; font-size: 11px; font-weight: 700; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 4px rgba(99,102,241,0.3); transition: all 0.2s ease;">\n                            Status\n                        </button>\n                    </div>\n                ' : `\n                    <button class="btn-resume-temp" data-temp-id="${t.id}" style="padding: 3px 12px; font-size: 11px; font-weight: 700; background: linear-gradient(135deg, #0d6efd, #0b5ed7); color: white; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 4px rgba(13,110,253,0.3); transition: all 0.2s ease;">\n                        Resume\n                    </button>\n                `}\n            </div>\n            ${r}\n            <div style="font-size: 10px; color: #999; margin-top: 2px;">${n}</div>\n        `; const c = o.querySelector(".btn-resume-temp"); c && c.addEventListener("click", e => { e.stopPropagation(), async function (e) { try { let t = (await chrome.storage.local.get("recentTempIds")).recentTempIds || []; const o = t.findIndex(t => t.id === e); let a = { id: e, source: "sidepanel" }; if (-1 !== o) { t[o].timestamp = Date.now(), t[o].source = "sidepanel", a = { id: e, passport: t[o].passport || "Unknown", name: t[o].name || "", dob: t[o].dob || "Unknown", mission: t[o].mission || "Unknown", source: "sidepanel" }; const n = t.splice(o, 1)[0]; t.unshift(n), await chrome.storage.local.set({ recentTempIds: t }) } await chrome.storage.local.set({ pendingResumeTempId: a }); const [n] = await chrome.tabs.query({ active: !0, currentWindow: !0 }); n && n.url && n.url.includes("indianvisa-bangladesh.nic.in") ? n.url.includes("CompletePartially") ? chrome.tabs.sendMessage(n.id, { type: "RESUME_APPLICATION", tempId: e, data: a }) : chrome.tabs.update(n.id, { url: "https://indianvisa-bangladesh.nic.in/" }) : chrome.tabs.create({ url: "https://indianvisa-bangladesh.nic.in/" }) } catch (e) { console.error("Resume temporary application error:", e) } }(t.id) }); const d = o.querySelector(".btn-download-bgd"); d && d.addEventListener("click", e => { e.stopPropagation(), async function (e) { try { let t = (await chrome.storage.local.get("recentTempIds")).recentTempIds || []; const o = t.findIndex(t => t.id === e.id); if (-1 !== o) { t[o].timestamp = Date.now(), t[o].source = "sidepanel"; const e = t.splice(o, 1)[0]; t.unshift(e), await chrome.storage.local.set({ recentTempIds: t }) } const a = { id: e.id, passport: e.passport, dob: e.dob, mission: e.mission, name: e.name || "", source: "sidepanel" }; await chrome.storage.local.set({ pendingDownloadBgd: a }); const [n] = await chrome.tabs.query({ active: !0, currentWindow: !0 }); n && n.url && n.url.includes("indianvisa-bangladesh.nic.in") ? n.url.includes("PrintApplication") ? chrome.tabs.sendMessage(n.id, { type: "DOWNLOAD_BGD_AUTOFILL", data: a }) : chrome.tabs.update(n.id, { url: "https://indianvisa-bangladesh.nic.in/" }) : chrome.tabs.create({ url: "https://indianvisa-bangladesh.nic.in/" }) } catch (e) { console.error("Download BGD error:", e) } }(t) }); const l = o.querySelector(".btn-status-check"); l && l.addEventListener("click", e => { e.stopPropagation(), async function (e) { try { let t = (await chrome.storage.local.get("recentTempIds")).recentTempIds || []; const o = t.findIndex(t => t.id === e.id); if (-1 !== o) { t[o].timestamp = Date.now(), t[o].source = "sidepanel"; const e = t.splice(o, 1)[0]; t.unshift(e), await chrome.storage.local.set({ recentTempIds: t }) } const a = { site: "indianvisaonline", bgd: e.id, applicationId: e.id, passport: e.passport || "", name: e.name || "", source: "sidepanel", timestamp: Date.now() }; await chrome.storage.local.set({ pendingStatusCheck: a }); const [n] = await chrome.tabs.query({ active: !0, currentWindow: !0 }); n && n.url && n.url.includes("indianvisaonline.gov.in") ? n.url.includes("StatusEnquiry") ? chrome.tabs.sendMessage(n.id, { type: "STATUS_CHECK_AUTOFILL", data: a }) : chrome.tabs.update(n.id, { url: "https://indianvisaonline.gov.in/visa/" }) : chrome.tabs.create({ url: "https://indianvisaonline.gov.in/visa/" }) } catch (e) { console.error("Status check application error:", e) } }(t) }), e.appendChild(o) }) : e.innerHTML = '<div style="padding:10px;text-align:center;color:#777">No Temporary IDs saved yet.</div>' } async function m(e) { try { const [t] = await chrome.tabs.query({ active: !0, currentWindow: !0 }); if (!t) return void alert("No active tab found."); chrome.tabs.sendMessage(t.id, { type: "TRIGGER_WIZARD", wizard: e }, e => { chrome.runtime.lastError && alert("Please open the Indian Visa Application page first to use this generator.") }) } catch (e) { console.error("Wizard trigger error:", e) } } async function g(e) { try { const t = await e.getOperatorList(), o = []; for (let e = 0; e < t.fnArray.length; e++) { const a = t.argsArray[e]; if (a && a[0] && "string" == typeof a[0]) { const e = a[0]; (e.startsWith("img_") || e.startsWith("g_img") || e.includes("img") || e.includes("Img")) && o.push(e) } } const a = [...new Set(o)], n = t => new Promise(o => { try { e.objs && "function" == typeof e.objs.get ? e.objs.get(t, e => o(e)) : e.commonObjs && "function" == typeof e.commonObjs.get ? e.commonObjs.get(t, e => o(e)) : o(null) } catch (e) { o(null) } setTimeout(() => o(null), 300) }), s = e => { let t = 0, o = 0; for (let a = 0; a < e.length; a += 148)t += Math.max(e[a], e[a + 1], e[a + 2]) - Math.min(e[a], e[a + 1], e[a + 2]), o++; return o ? t / o / 255 : 0 }; let i = null, r = -1; for (const e of a) { const t = await n(e); if (!t) continue; const o = t.width, a = t.height; if (!o || !a) continue; const c = o / a; if (c < .7 || c > 1.4) continue; if (o < 60 || a < 60) continue; const d = document.createElement("canvas"); d.width = o, d.height = a; const l = d.getContext("2d"); let p = !1; if (t.bitmap) try { l.drawImage(t.bitmap, 0, 0), p = !0 } catch (e) { } if (!p && t.data) try { const e = l.createImageData(o, a), n = t.data, s = t.kind; if (3 === s && n.length >= o * a * 4) e.data.set(n.subarray(0, o * a * 4)); else if (2 === s || n.length >= o * a * 3) for (let t = 0, s = 0; t < o * a; t++)e.data[s++] = n[3 * t], e.data[s++] = n[3 * t + 1], e.data[s++] = n[3 * t + 2], e.data[s++] = 255; else if (n.length >= o * a) for (let t = 0, s = 0; t < o * a; t++) { const o = n[t]; e.data[s++] = o, e.data[s++] = o, e.data[s++] = o, e.data[s++] = 255 } else { const t = Math.ceil(o / 8); for (let s = 0; s < a; s++)for (let a = 0; a < o; a++) { const i = (n[s * t + (a >> 3)] || 0) >> 7 - (7 & a) & 1 ? 255 : 0, r = 4 * (s * o + a); e.data[r] = i, e.data[r + 1] = i, e.data[r + 2] = i, e.data[r + 3] = 255 } } l.putImageData(e, 0, 0), p = !0 } catch (e) { } if (!p) continue; let h = 0; try { h = s(l.getImageData(0, 0, o, a).data) } catch (e) { } const u = 1 - Math.min(Math.abs(c - 1), 1), m = 3 * u + 2 * h + .3 * (Math.min(o * a, 25e4) / 25e4); m > r && (r = m, i = d) } if (i) { const e = Math.max(350, i.width, i.height), t = document.createElement("canvas"); t.width = e, t.height = e; const o = t.getContext("2d"); o.fillStyle = "#ffffff", o.fillRect(0, 0, e, e); const a = Math.max(e / i.width, e / i.height), n = i.width * a, s = i.height * a, r = (e - n) / 2, c = (e - s) / 2; return o.drawImage(i, r, c, n, s), t.toDataURL("image/jpeg", .92) } } catch (e) { console.warn("PDF photo extraction notice", e) } try { const t = e.getViewport({ scale: 2 }), o = document.createElement("canvas"); o.width = t.width, o.height = t.height; const a = o.getContext("2d"); await e.render({ canvasContext: a, viewport: t }).promise; const n = Math.floor(.082 * t.width), s = Math.floor(.12 * t.height), i = Math.floor(.185 * t.width), r = Math.floor(.132 * t.height), c = 350, d = document.createElement("canvas"); d.width = c, d.height = c; const l = d.getContext("2d"); l.fillStyle = "#ffffff", l.fillRect(0, 0, c, c); const p = Math.max(c / i, c / r), h = i * p, u = r * p, m = (c - h) / 2, g = (c - u) / 2; return l.drawImage(o, n, s, i, r, m, g, h, u), d.toDataURL("image/jpeg", .9) } catch (e) { return console.warn("PDF photo extraction notice", e), "" } } document.addEventListener("DOMContentLoaded", async () => {
    setupSettingsModal(); !function () { o("btn-pdf-mode").onclick = () => c("BGD"), o("btn-passport-mode").onclick = () => c("PASSPORT"), o("viewHiddenBtn").onclick = () => r(!0), o("backToMainBtn").onclick = () => r(!1), o("searchInput").addEventListener("input", () => { i(o("btn-pdf-mode").classList.contains("active") ? "BGD" : "PASSPORT", !o("hidden-view").classList.contains("hidden")) }), o("followBtn") && (o("followBtn").onclick = () => chrome.tabs.create({ url: "https://www.facebook.com/AverageStudentbd" })); o("addBalanceBtn") && (o("addBalanceBtn").onclick = () => chrome.tabs.create({ url: "https://www.facebook.com/AverageStudentbd" })); o("userNameDisplay") && (o("userNameDisplay").onclick = () => chrome.tabs.create({ url: "https://www.facebook.com/AverageStudentbd" })); const e = document.querySelector(".credits-pill"); e && (e.style.cursor = "pointer", e.title = "Click to refresh balance", e.onclick = () => chrome.tabs.create({ url: "https://www.facebook.com/AverageStudentbd" })); o("logoutBtn") && (o("logoutBtn").onclick = async () => { confirm("Logout?") && (await chrome.storage.local.clear(), window.location.reload()) }); o("btnLogin") && (o("btnLogin").onclick = () => chrome.tabs.create({ url: "https://www.facebook.com/AverageStudentbd" })); o("saveProfileButton") && (o("saveProfileButton").onclick = () => l("BGD")); o("saveProfileButtonPassport") && (o("saveProfileButtonPassport").onclick = () => l("PASSPORT")); o("autofillButton") && (o("autofillButton").onclick = p);
  const _impBtn = o("importBtn") || o("mainImportBtn"), _impIn = o("importInput") || o("importFileInput");
  if (_impBtn && _impIn) {
    _impBtn.onclick = () => _impIn.click();
    _impIn.onchange = async ev => {
      const fl = ev.target.files[0]; if (!fl) return;
      const rd = new FileReader();
      rd.onload = async e2 => {
        try {
          let dt = null;
          try { dt = JSON.parse(e2.target.result); } catch(x1) {
            try { dt = JSON.parse(atob(e2.target.result)); } catch(x2) {}
          }
          if (!dt || typeof dt !== "object") return alert("Invalid backup file.");
          const sv = {}; let cnt = 0;
          for (const k in dt) {
            if (dt[k] && (k.startsWith("BGD_") || k.startsWith("PASSPORT_") || k === "iv_custom_hotels" || k === "recentTempIds")) {
              sv[k] = dt[k]; if (k.startsWith("BGD_") || k.startsWith("PASSPORT_")) cnt++;
            }
          }
          if (cnt > 0 || Object.keys(sv).length > 0) {
            await chrome.storage.local.set(sv);
            alert("Successfully imported " + cnt + " profile(s).");
            i(o("btn-pdf-mode").classList.contains("active") ? "BGD" : "PASSPORT", !o("hidden-view").classList.contains("hidden"));
          } else alert("No profiles found in file.");
        } catch(ex) { alert("Import error: " + ex.message); }
      };
      rd.readAsText(fl); _impIn.value = "";
    };
  }
  const _expBtn = o("exportBtn") || o("mainExportBtn");
  if (_expBtn) {
    _expBtn.onclick = async () => {
      const all = await chrome.storage.local.get(null);
      const bk = {}; let cnt = 0;
      for (const k in all) {
        if (all[k] && (k.startsWith("BGD_") || k.startsWith("PASSPORT_") || k === "iv_custom_hotels" || k === "recentTempIds")) {
          bk[k] = all[k]; if (k.startsWith("BGD_") || k.startsWith("PASSPORT_")) cnt++;
        }
      }
      if (cnt === 0) return alert("No profiles to export.");
      const blb = new Blob([JSON.stringify(bk, null, 2)], { type: "application/json" });
      const u = URL.createObjectURL(blb), aEl = document.createElement("a");
      aEl.href = u; aEl.download = "Indian_Visa_Profiles_Backup_" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(aEl); aEl.click(); document.body.removeChild(aEl); URL.revokeObjectURL(u);
    };
  } const t = o("captchaControlModal"), a = o("openCaptchaControlBtn"), n = o("closeCaptchaModalBtn"), s = o("doneCaptchaModalBtn"); a && t && (a.onclick = () => { t.classList.remove("hidden"), t.style.display = "flex" }); const d = () => { t && (t.classList.add("hidden"), t.style.display = "none") }; n && (n.onclick = d); s && (s.onclick = d); t && t.addEventListener("click", e => { e.target === t && d() }); const h = o("autoStartupCaptchaToggle"); h && h.addEventListener("change", e => { chrome.storage.local.set({ autoStartupCaptchaEnabled: e.target.checked }) }); const g = o("autoGeneralCaptchaToggle"); g && g.addEventListener("change", e => { chrome.storage.local.set({ autoGeneralCaptchaEnabled: e.target.checked, autoCaptchaEnabled: e.target.checked }) }); const f = o("modalAutoFillPopupToggle"); f && f.addEventListener("change", e => { chrome.storage.local.set({ autoFillPopupEnabled: e.target.checked }) }); const b = o("modalAutoFillOnLoadToggle"); b && b.addEventListener("change", e => { chrome.storage.local.set({ autoFillOnLoadEnabled: e.target.checked }) }); const v = o("autoPopupTempIdToggle"); v && v.addEventListener("change", e => { chrome.storage.local.set({ autoPopup_temp_id: e.target.checked }) }); const w = o("autoPopupStatusCheckToggle"); w && w.addEventListener("change", e => { chrome.storage.local.set({ autoPopup_status_check: e.target.checked }) }); const y = o("autoPopupBgdDownloadToggle"); y && y.addEventListener("change", e => { chrome.storage.local.set({ autoPopup_bgd_download: e.target.checked }) }); const L = o("autoPopupEArrivalToggle"); L && L.addEventListener("change", e => { chrome.storage.local.set({ autoPopup_earrival: e.target.checked }) }); const _ = o("autoPopupAirSuvidhaToggle"); _ && _.addEventListener("change", e => { chrome.storage.local.set({ autoPopup_airsuvidha: e.target.checked }) }); const A = o("autoPopupTaxToggle"); A && A.addEventListener("change", e => { chrome.storage.local.set({ autoPopup_tax: e.target.checked }) }); o("viewTempIdsBtn").onclick = () => { o("main-content").classList.add("hidden"), o("hidden-view").classList.add("hidden"), o("temp-ids-view").classList.remove("hidden"), u() }, o("backFromTempIdsBtn").onclick = () => { o("temp-ids-view").classList.add("hidden"), o("main-content").classList.remove("hidden") }; const P = o("additionalServicesModal"), x = o("openAdditionalServicesBtn"), I = o("closeAdditionalServicesModalBtn"), T = o("doneAdditionalServicesModalBtn"); x && (x.onclick = () => { P && (P.classList.remove("hidden"), P.style.display = "flex") }); const D = () => { P && (P.classList.add("hidden"), P.style.display = "none") }; I && (I.onclick = D); T && (T.onclick = D); P && P.addEventListener("click", e => { e.target === P && D() }); o("asCoverLetterBtn") && (o("asCoverLetterBtn").onclick = () => { D(), m("cover_letter") }); o("asNocBtn") && (o("asNocBtn").onclick = () => { D(), m("noc") }); o("asUndertakingBtn") && (o("asUndertakingBtn").onclick = () => { D(), m("undertaking") }); async function k(e, t, o, a, n = null) { try { if (a && await chrome.storage.local.set({ [a]: Date.now() }), n && n.length > 0) { try { await chrome.permissions.contains({ origins: n }) || await chrome.permissions.request({ origins: n }) } catch (e) { console.warn("Permission request error:", e) } try { await chrome.runtime.sendMessage({ type: "REGISTER_DYNAMIC_SCRIPTS" }) } catch (e) { } } const [s] = await chrome.tabs.query({ active: !0, currentWindow: !0 }); s && s.url && s.url.includes(e) ? o ? chrome.tabs.sendMessage(s.id, { type: o }, () => { chrome.runtime.lastError && chrome.tabs.update(s.id, { url: t }) }) : chrome.tabs.update(s.id, { url: t }) : chrome.tabs.create({ url: t }) } catch (e) { console.error("IV Autofill: Portal open error:", e), chrome.tabs.create({ url: t }) } } o("asStatusCheckBtn") && (o("asStatusCheckBtn").onclick = async () => { D(), await k("indianvisaonline.gov.in", "https://indianvisaonline.gov.in/visa/", "TRIGGER_STATUS_CHECK", "autoOpenStatusModal", ["https://indianvisaonline.gov.in/*"]) }); o("asResumeAppBtn") && (o("asResumeAppBtn").onclick = async () => { D(); try { await chrome.storage.local.set({ autoOpenResumeModal: Date.now() }); const [e] = await chrome.tabs.query({ active: !0, currentWindow: !0 }); e && e.url && e.url.includes("indianvisa-bangladesh.nic.in") ? e.url.includes("CompletePartially") ? chrome.tabs.sendMessage(e.id, { type: "TRIGGER_RESUME_MODAL" }, () => { chrome.runtime.lastError && chrome.tabs.update(e.id, { url: "https://indianvisa-bangladesh.nic.in/" }) }) : chrome.tabs.update(e.id, { url: "https://indianvisa-bangladesh.nic.in/" }) : chrome.tabs.create({ url: "https://indianvisa-bangladesh.nic.in/" }) } catch (e) { chrome.tabs.create({ url: "https://indianvisa-bangladesh.nic.in/" }) } }); o("asBgdDownloadBtn") && (o("asBgdDownloadBtn").onclick = async () => { D(); try { await chrome.storage.local.set({ autoOpenBgdDownloadModal: Date.now() }); const [e] = await chrome.tabs.query({ active: !0, currentWindow: !0 }); e && e.url && e.url.includes("indianvisa-bangladesh.nic.in") ? e.url.includes("PrintApplication") ? chrome.tabs.sendMessage(e.id, { type: "TRIGGER_PRINT_MODAL" }, () => { chrome.runtime.lastError && chrome.tabs.update(e.id, { url: "https://indianvisa-bangladesh.nic.in/" }) }) : chrome.tabs.update(e.id, { url: "https://indianvisa-bangladesh.nic.in/" }) : chrome.tabs.create({ url: "https://indianvisa-bangladesh.nic.in/" }) } catch (e) { chrome.tabs.create({ url: "https://indianvisa-bangladesh.nic.in/" }) } }); o("asEArrivalBtn") && (o("asEArrivalBtn").onclick = async () => { D(), await k("indianvisaonline.gov.in/earrival", "https://indianvisaonline.gov.in/earrival/", "TRIGGER_EARRIVAL_MODAL", "autoOpenEArrivalModal", ["https://indianvisaonline.gov.in/*"]) }); o("asAirSuvidhaBtn") && (o("asAirSuvidhaBtn").onclick = async () => { D(), await k("airsuvidha.civilaviation.gov.in", "https://airsuvidha.civilaviation.gov.in/", "TRIGGER_AIRSUVIDHA_MODAL", "autoOpenAirSuvidhaModal", ["https://airsuvidha.civilaviation.gov.in/*"]) }); o("asTravelTaxBtn") && (o("asTravelTaxBtn").onclick = async () => { D(), await k("billpay.sonalibank.com.bd", "https://billpay.sonalibank.com.bd/nbrTravelTax/Collection/Create", "TRIGGER_TRAVELTAX_MODAL", "autoOpenTravelTaxModal", ["https://billpay.sonalibank.com.bd/*"]) }); o("asPortTaxBtn") && (o("asPortTaxBtn").onclick = async () => { D(), await k("passenger.blpa.gov.bd", "https://passenger.blpa.gov.bd/", "TRIGGER_PORTTAX_MODAL", "autoOpenPortTaxModal", ["https://passenger.blpa.gov.bd/*"]) }); o("downloadCoverBtn") && (o("downloadCoverBtn").onclick = () => m("cover_letter")); o("downloadNocBtn") && (o("downloadNocBtn").onclick = () => m("noc")); o("downloadUndertakingBtn") && (o("downloadUndertakingBtn").onclick = () => m("undertaking")) }(), await async function () { await s(); let e = (await chrome.storage.local.get(["lastServiceMode"])).lastServiceMode || "BGD"; d(e), i(e, !1); const t = await chrome.storage.local.get(["autoStartupCaptchaEnabled", "autoGeneralCaptchaEnabled", "autoCaptchaEnabled", "autoFillPopupEnabled", "autoFillOnLoadEnabled", "autoPopup_temp_id", "autoPopup_status_check", "autoPopup_bgd_download", "autoPopup_earrival", "autoPopup_airsuvidha", "autoPopup_tax"]), a = o("autoStartupCaptchaToggle"); a && (a.checked = !1 !== t.autoStartupCaptchaEnabled); const n = o("autoGeneralCaptchaToggle"); n && (n.checked = !1 !== t.autoGeneralCaptchaEnabled && !1 !== t.autoCaptchaEnabled); const r = o("modalAutoFillPopupToggle"); r && (r.checked = !1 !== t.autoFillPopupEnabled); const c = o("modalAutoFillOnLoadToggle"); c && (c.checked = !1 !== t.autoFillOnLoadEnabled); const l = o("autoPopupTempIdToggle"); l && (l.checked = !1 !== t.autoPopup_temp_id); const p = o("autoPopupStatusCheckToggle"); p && (p.checked = !1 !== t.autoPopup_status_check); const h = o("autoPopupBgdDownloadToggle"); h && (h.checked = !1 !== t.autoPopup_bgd_download); const u = o("autoPopupEArrivalToggle"); u && (u.checked = !1 !== t.autoPopup_earrival); const m = o("autoPopupAirSuvidhaToggle"); m && (m.checked = !1 !== t.autoPopup_airsuvidha); const g = o("autoPopupTaxToggle"); g && (g.checked = !1 !== t.autoPopup_tax) }() }), chrome.storage.onChanged.addListener((e, t) => { if ("local" === t) { if ((e.userProfile || e.isLoggedIn) && s(), e.lastServiceMode) { const t = e.lastServiceMode.newValue || "BGD"; d(t); i(t, !o("hidden-view").classList.contains("hidden")) } if (e.lastSelectedProfile) { i(o("btn-pdf-mode").classList.contains("active") ? "BGD" : "PASSPORT", !o("hidden-view").classList.contains("hidden")) } if (Object.keys(e).some(e => e.startsWith("BGD_") || e.startsWith("PASSPORT_"))) { i(o("btn-pdf-mode").classList.contains("active") ? "BGD" : "PASSPORT", !o("hidden-view").classList.contains("hidden")) } e.recentTempIds && u() } });

function setupSettingsModal() {
  const modal = o("settingsModal");
  const openBtn = o("openSettingsBtn");
  const closeBtn = o("closeSettingsModalBtn");
  const keyInput = o("geminiApiKeyInput");
  const modelSelect = o("geminiModelSelect");
  const toggleBtn = o("toggleApiKeyVisBtn");
  const testBtn = o("testApiKeyBtn");
  const saveBtn = o("saveApiKeyBtn");
  const statusEl = o("apiKeyStatus");

  if (!modal) return;

  async function loadSettings() {
    const key = await getApiKey();
    if (keyInput) keyInput.value = key || "";
    const settings = await getAdvancedSettings();
    if (modelSelect && settings.iv_model) modelSelect.value = settings.iv_model;
  }

  if (openBtn) {
    openBtn.onclick = async () => {
      await loadSettings();
      modal.classList.remove("hidden");
      modal.style.display = "flex";
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.add("hidden");
      modal.style.display = "none";
    };
  }

  modal.addEventListener("click", e => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }
  });

  if (toggleBtn && keyInput) {
    toggleBtn.onclick = () => {
      keyInput.type = keyInput.type === "password" ? "text" : "password";
    };
  }

  if (testBtn && keyInput) {
    testBtn.onclick = async () => {
      const val = keyInput.value.trim();
      if (!val) {
        if (statusEl) {
          statusEl.textContent = "Please enter an API Key first.";
          statusEl.style.color = "#dc2626";
        }
        return;
      }
      if (statusEl) {
        statusEl.textContent = "Testing key with Gemini...";
        statusEl.style.color = "#4f46e5";
      }
      try {
        const ok = await testApiKey(val);
        if (ok) {
          if (statusEl) {
            statusEl.textContent = "Key Verified Successfully! ✓";
            statusEl.style.color = "#16a34a";
          }
        } else {
          if (statusEl) {
            statusEl.textContent = "Invalid Key. Check API key & permissions.";
            statusEl.style.color = "#dc2626";
          }
        }
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = err.message || "Test failed.";
          statusEl.style.color = "#dc2626";
        }
      }
    };
  }

  if (saveBtn && keyInput) {
    saveBtn.onclick = async () => {
      const val = keyInput.value.trim();
      if (!val) {
        if (statusEl) {
          statusEl.textContent = "Please enter an API key.";
          statusEl.style.color = "#dc2626";
        }
        return;
      }
      await saveApiKey(val);
      if (modelSelect) {
        await saveAdvancedSettings({ iv_model: modelSelect.value });
      }
      if (statusEl) {
        statusEl.textContent = "Settings Saved Successfully! ✓";
        statusEl.style.color = "#16a34a";
      }
      setTimeout(() => {
        modal.classList.add("hidden");
        modal.style.display = "none";
        if (statusEl) statusEl.textContent = "";
      }, 1000);
    };
  }
}
