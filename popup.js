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
  res.father_previous_nationality = "BANGLADESH";
  res.father_country_of_birth = "BANGLADESH";

  res.mother_place_of_birth = res.pobTown || "";
  res.mother_nationality = "BANGLADESH";
  res.mother_previous_nationality = "BANGLADESH";
  res.mother_country_of_birth = "BANGLADESH";

  res.spouse_place_of_birth = res.pobTown || "";
  res.spouse_nationality = "BANGLADESH";
  res.spouse_previous_nationality = "BANGLADESH";
  res.spouse_country_of_birth = "BANGLADESH";

  return res;
}
import { extractFromBGDText, extractFromPassport, getApiKey, saveApiKey, testApiKey, getAdvancedSettings, saveAdvancedSettings, DEFAULT_GEMINI_MODEL } from "./gemini.js";
import { getDocument as e, GlobalWorkerOptions as t } from "./build/pdf.mjs"; t.workerSrc = chrome.runtime.getURL("build/pdf.worker.mjs"); const o = e => document.getElementById(e); async function n(e, t = {}) { /* GA disabled for privacy */ } const s = { BGD: { lambdaUrl: "", msgType: "FILL_FORM", price: "Free - Gemini AI", btnColor: "#0d6efd", serviceId: "indbgd" }, PASSPORT: { lambdaUrl: "", msgType: "FILL_FORM", price: "Free - Gemini AI", btnColor: "#198754", serviceId: "indpassport" } }; function a(e) { if (e) { o("main-content").classList.add("hidden"), o("hidden-view").classList.remove("hidden"); c(o("btn-pdf-mode").classList.contains("active") ? "BGD" : "PASSPORT", !0) } else { o("hidden-view").classList.add("hidden"), o("main-content").classList.remove("hidden"); c(o("btn-pdf-mode").classList.contains("active") ? "BGD" : "PASSPORT", !1) } } function r(e) { chrome.storage.local.set({ lastServiceMode: e }), i(e); c(e, !o("hidden-view").classList.contains("hidden")) } function i(e) { o("btn-pdf-mode").className = "BGD" === e ? "toggle-btn active" : "toggle-btn", o("btn-passport-mode").className = "PASSPORT" === e ? "toggle-btn active" : "toggle-btn", "BGD" === e ? (o("pdf-upload-section").classList.remove("hidden"), o("passport-upload-section").classList.add("hidden"), o("toggle-slider").style.transform = "translateX(0%)") : (o("pdf-upload-section").classList.add("hidden"), o("passport-upload-section").classList.remove("hidden"), o("toggle-slider").style.transform = "translateX(100%)"); const t = s[e], n = o("saveProfileButton"); n && (n.innerHTML = `Extract Data (${t.price})`, n.style.backgroundColor = t.btnColor) } async function c(e, t = !1) { const n = o(t ? "hiddenProfileList" : "profileList"); if (!n) return; n.innerHTML = ""; const s = await chrome.storage.local.get(null), a = s.lastSelectedProfile; let r = 0; Object.keys(s).forEach(o => { if (["userProfile", "isLoggedIn", "lastServiceMode", "lastSelectedProfile", "ga_client_id"].includes(o)) return; const i = s[o]; if (i._type !== e) return; const l = !0 === i._isHidden; if (t && !l) return; if (!t && l) return; r++; const d = function (e) { if (!e || "string" != typeof e) return !1; const t = e.trim(); if (!t || ["NILL", "NA", "UNKNOWN", "NULL"].includes(t.toUpperCase())) return !1; let o, n, s; const a = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/); if (a) o = parseInt(a[1], 10), n = parseInt(a[2], 10) - 1, s = parseInt(a[3], 10); else { const e = t.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/); if (e) s = parseInt(e[1], 10), n = parseInt(e[2], 10) - 1, o = parseInt(e[3], 10); else { const e = new Date(t); if (isNaN(e.getTime())) return !1; o = e.getDate(), n = e.getMonth(), s = e.getFullYear() } } const r = new Date(s, n, o, 23, 59, 59); if (isNaN(r.getTime())) return !1; const i = new Date; return r < new Date(i.getFullYear(), i.getMonth() + 6, i.getDate(), 0, 0, 0) }(i.passExpire), p = document.createElement("div"); p.className = d ? "profile-item expiry-warning" : "profile-item", p.dataset.key = o, d && (p.title = "Passport expiry date is less then 6 month"), o === a && p.classList.add("selected"); let f = ""; f = t ? '\n                <button class="show-btn" title="Restore">Show</button>\n                <button class="del-btn" title="Delete">Del</button>\n            ' : '\n                <button class="edit-btn" title="Edit">Edit</button>\n                <button class="del-btn" title="Delete">Del</button>\n            '; const m = d ? "⚠️ " : ""; p.innerHTML = `\n            <span class="profile-name-text" style="flex-grow:1; font-weight:${d ? "700" : "500"}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m}${i._savedName}</span>\n            <div class="profile-actions">${f}</div>\n        `, t || p.addEventListener("click", async e => { "BUTTON" !== e.target.tagName && (document.querySelectorAll(".profile-item").forEach(e => e.classList.remove("selected")), p.classList.add("selected"), await chrome.storage.local.set({ lastSelectedProfile: o })) }); const u = p.querySelector(".edit-btn"); u && (u.onclick = () => chrome.tabs.create({ url: `editor.html?profile=${encodeURIComponent(o)}` })); const h = p.querySelector(".rename-btn"); h && (h.onclick = async () => { const t = prompt("Enter new profile name:", i._savedName); if (t && t !== i._savedName) { const n = { ...i, _savedName: t }, s = `${e}_${Date.now()}`; await chrome.storage.local.set({ [s]: n }), await chrome.storage.local.remove(o), o === a && await chrome.storage.local.set({ lastSelectedProfile: s }), c(e, !1) } }); const _ = p.querySelector(".hide-btn"); _ && (_.onclick = async () => { confirm("Hide this profile?") && (i._isHidden = !0, await chrome.storage.local.set({ [o]: i }), c(e, !1)) }); const g = p.querySelector(".show-btn"); g && (g.onclick = async () => { i._isHidden = !1, await chrome.storage.local.set({ [o]: i }), c(e, !0) }), p.querySelector(".del-btn").onclick = async () => { confirm("Delete permanently?") && (await chrome.storage.local.remove(o), c(e, t)) }, n.appendChild(p) }), 0 === r && (n.innerHTML = '<div style="padding:10px;text-align:center;color:#777">No profiles found.</div>') } async function l(t) { const a = s[t], r = o("BGD" === t ? "pdfUpload" : "passportUpload"), i = r?.files[0], l = o("BGD" === t ? "saveProfileButton" : "saveProfileButtonPassport"); if (!i) return f("Please select a file.", "error"); if (i.size > 5242880) return r.value = "", f("File is too large! Maximum allowed size is 3MB.", "error"); const d = await chrome.storage.local.get(["userProfile"]); if (!d.userProfile?.token) { await chrome.storage.local.set({ isLoggedIn: true, userProfile: { name: "Pro User", token: "gemini_unlimited_token", balance: 999999, userId: "gemini_pro" } }); } f("Processing...", "processing"), l.disabled = !0, l.innerText = "Wait..."; try { let s = { token: "gemini_unlimited_token", service_type: a.serviceId }, r = "", l = []; if ("BGD" === t) { if ("application/pdf" !== i.type) throw new Error("Only PDF supported for BGD."); const t = await i.arrayBuffer(), o = await e(new Uint8Array(t)).promise; let n = ""; for (let e = 1; e <= o.numPages; e++) { const t = await o.getPage(e), s = await t.getTextContent(); n += s.items.map(e => e.str).join(" "); for (const t of s.items) t && t.str && t.str.trim() && l.push({ str: t.str.trim(), x: Math.round(10 * (t.transform ? t.transform[4] : 0)) / 10, y: Math.round(10 * (t.transform ? t.transform[5] : 0)) / 10, page: e }); if (1 === e) try { r = await g(t) } catch (e) { console.warn("Could not extract PDF photo", e) } } s.text = n } else if ("PASSPORT" === t) { const e = await function (e) { return new Promise((t, o) => { const n = new FileReader; n.readAsDataURL(e), n.onload = () => { const e = n.result.split(",")[1]; t(e) }, n.onerror = e => o(e) }) }(i); s.fileData = e, s.mimeType = i.type } 
    const apiKey = await getApiKey();
    if (!apiKey) {
      const modal = o("settingsModal");
      if (modal) { modal.classList.remove("hidden"); modal.style.display = "flex"; }
      throw new Error("Gemini API Key missing! Please click ⚙️ Settings and save your free key.");
    }
    let m = null;
    if ("BGD" === t) {
      m = await extractFromBGDText(apiKey, s.text);
    } else if ("PASSPORT" === t) {
      m = await extractFromPassport(apiKey, s.fileData, s.mimeType || "image/jpeg");
    }
    if (!m) throw new Error("Gemini extraction returned empty result.");
    if ("BGD" === t && s && s.text) {
      const vDetails = extractVisaDetailsFromText(s.text);
      for (const k in vDetails) {
        if (vDetails[k] && (!m[k] || m[k] === "NILL" || m[k] === "")) {
          m[k] = vDetails[k];
        }
      }
      if (!m.exitpoint && m.entrypoint) m.exitpoint = m.entrypoint;
    }
   if ("BGD" === t && Array.isArray(l) && l.length > 0) { const e = function (e) { let t = { nameofsponsor_ind: "NILL", add1ofsponsor_ind: "NILL", add2ofsponsor_ind: "NILL", stateofsponsor_ind: "NILL", districtofsponsor_ind: "NILL", phoneofsponsor_ind: "NILL", nameofsponsor_msn: "NILL", add1ofsponsor_msn: "NILL", add2ofsponsor_msn: "NILL", phoneofsponsor_msn: "NILL" }; if (!Array.isArray(e) || 0 === e.length) return t; const o = e.find(e => /Details of Two Reference/i.test(e.str)); if (!o) return t; const n = o.page || 1, s = e.filter(e => (e.page || 1) === n && e.str && e.str.trim()), a = s.find(e => /In India/i.test(e.str)), r = s.find(e => /In BANGLADESH/i.test(e.str)); let i = 310; a && r && r.x > a.x && (i = (a.x + r.x) / 2); const c = s.find(e => /^Name$/i.test(e.str.trim()) && e.y < o.y), l = s.find(e => /^Address$/i.test(e.str.trim()) && c && e.y < c.y), d = s.find(e => /^Phone Number$/i.test(e.str.trim()) && l && e.y < l.y), p = s.find(e => /(DOCUMENTS UPLOADED|DECLARATION)/i.test(e.str) && d && e.y < d.y); if (c && l && d) { const e = e => { const t = []; return e.forEach(e => { const o = t[t.length - 1]; o && Math.abs(o.y - e.y) <= 4 ? o.items.push(e) : t.push({ y: e.y, items: [e] }) }), t.map(e => (e.items.sort((e, t) => e.x - t.x), e.items.map(e => e.str).join(" ").trim())).filter(Boolean) }, o = s.filter(e => Math.abs(e.y - c.y) <= 6 && e.x > c.x + 10 && e.x < i).sort((e, t) => e.x - t.x), n = s.filter(e => Math.abs(e.y - c.y) <= 6 && e.x >= i).sort((e, t) => e.x - t.x); o.length && (t.nameofsponsor_ind = o.map(e => e.str).join(" ").trim()), n.length && (t.nameofsponsor_msn = n.map(e => e.str).join(" ").trim()); const a = c.y - 7, r = d.y + 6, l = s.filter(e => e.y <= a && e.y > r && e.x > c.x + 10 && e.x < i), f = s.filter(e => e.y <= a && e.y > r && e.x >= i), m = l.filter(e => !/^Address$/i.test(e.str.trim())).sort((e, t) => t.y - e.y || e.x - t.x), u = f.filter(e => !/^Address$/i.test(e.str.trim())).sort((e, t) => t.y - e.y || e.x - t.x), h = e(m), _ = e(u); if (h.length > 0) { const e = h.join(" "), o = e.match(/\b(\d{6})\b/); o && (t.add2ofsponsor_ind = o[1]); const n = /\b(ANDAMAN AND NICOBAR|ANDHRA PRADESH|ARUNACHAL PRADESH|ASSAM|BIHAR|CHANDIGARH|CHHATTISGARH|DADRA AND NAGAR HAVELI|DAMAN AND DIU|DELHI|GOA|GUJARAT|HARYANA|HIMACHAL PRADESH|JAMMU AND KASHMIR|JHARKHAND|KARNATAKA|KERALA|LADAKH|LAKSHADWEEP|MADHYA PRADESH|MAHARASHTRA|MANIPUR|MEGHALAYA|MIZORAM|NAGALAND|ODISHA|ORISSA|PUDUCHERRY|PUNJAB|RAJASTHAN|SIKKIM|TAMIL NADU|TELANGANA|TRIPURA|UTTAR PRADESH|UTTARAKHAND|WEST BENGAL)\b/i, s = e.match(n); if (s) { t.stateofsponsor_ind = s[1].toUpperCase(); const o = e.slice(0, s.index).trim().match(/([A-Z\s]+)$/i); if (o) { let e = o[1].trim().split(/\s+/).slice(-2).join(" ").replace(/^\d{6}\s*/, "").trim().toUpperCase(); "NEW" === e && "DELHI" === t.stateofsponsor_ind && (e = "NEW DELHI"), t.districtofsponsor_ind = e } } /\bNEW\s+DELHI\b/i.test(e) && (t.stateofsponsor_ind = "DELHI", t.districtofsponsor_ind = "NEW DELHI"); let a = h.findIndex(e => /\b\d{6}\b/.test(e) || n.test(e)); -1 === a && (a = h.length); const r = h.slice(0, a); r.length > 0 ? t.add1ofsponsor_ind = r.map(e => e.trim()).join(" ").replace(/\s*,\s*/g, ", ").replace(/,\s*,+/g, ", ").replace(/[,\s]+$/, "").slice(0, 50) : t.add1ofsponsor_ind = e.replace(/\b\d{6}\b.*/, "").replace(/\s*,\s*/g, ", ").replace(/,\s*,+/g, ", ").replace(/[,\s]+$/, "").slice(0, 50) } _.length > 0 && (t.add1ofsponsor_msn = _[0].trim().replace(/^[,\s]+|[,\s]+$/g, "").replace(/,\s*,+/g, ", ").slice(0, 50), _.length > 1 && (t.add2ofsponsor_msn = _.slice(1).map(e => e.trim().replace(/^[,\s]+|[,\s]+$/g, "")).join(", ").replace(/,\s*,+/g, ", ").replace(/[,\s]+$/, "").slice(0, 50))); const g = d.y + 6, y = p ? p.y + 4 : d.y - 25, w = s.filter(e => e.y <= g && e.y > y && e.x > d.x + 10 && e.x < i).sort((e, t) => t.y - e.y || e.x - t.x), v = s.filter(e => e.y <= g && e.y > y && e.x >= i).sort((e, t) => t.y - e.y || e.x - t.x), x = w.map(e => e.str).join("").replace(/[^\d]/g, ""), b = v.map(e => e.str).join("").replace(/[^\d]/g, ""); if (x && (t.phoneofsponsor_ind = x), b) { const e = b.match(/(?:88)?(01[3-9]\d{8})/); t.phoneofsponsor_msn = e ? e[1] : b } } return t }(l); if (e.nameofsponsor_ind && "NILL" !== e.nameofsponsor_ind && (m.nameofsponsor_ind = e.nameofsponsor_ind), e.add1ofsponsor_ind && "NILL" !== e.add1ofsponsor_ind && (m.add1ofsponsor_ind = e.add1ofsponsor_ind), e.add2ofsponsor_ind && "NILL" !== e.add2ofsponsor_ind && (m.add2ofsponsor_ind = e.add2ofsponsor_ind), e.stateofsponsor_ind && "NILL" !== e.stateofsponsor_ind && (m.stateofsponsor_ind = e.stateofsponsor_ind), e.districtofsponsor_ind && "NILL" !== e.districtofsponsor_ind && (m.districtofsponsor_ind = e.districtofsponsor_ind), e.phoneofsponsor_ind && "NILL" !== e.phoneofsponsor_ind && (m.phoneofsponsor_ind = e.phoneofsponsor_ind), e.nameofsponsor_msn && "NILL" !== e.nameofsponsor_msn && (m.nameofsponsor_msn = e.nameofsponsor_msn), e.add1ofsponsor_msn && "NILL" !== e.add1ofsponsor_msn && (m.add1ofsponsor_msn = e.add1ofsponsor_msn), e.add2ofsponsor_msn && "NILL" !== e.add2ofsponsor_msn && (m.add2ofsponsor_msn = e.add2ofsponsor_msn), e.phoneofsponsor_msn && "NILL" !== e.phoneofsponsor_msn && (m.phoneofsponsor_msn = e.phoneofsponsor_msn), m.place_of_stay1 && "NILL" !== m.place_of_stay1 || (m.place_of_stay1 = m.nameofsponsor_ind, m.pos_address1 = m.add1ofsponsor_ind, m.pos_phone1 = m.phoneofsponsor_ind), !m.bgd_id || "NILL" === m.bgd_id) { const e = (s?.text || "").match(/(?:Web\s*File\s*No\.?|Application\s*Id|File\s*No\.?)\s*:?\s*(BGD[A-Z0-9]{7,12})/i) || (s?.text || "").match(/\b(BGD[A-Z0-9]{8,12})\b/i); e && (m.bgd_id = e[1].toUpperCase().trim()) } } const u = [m.givenName, m.surname].filter(Boolean), h = u.length > 0 ? u.join(" ") : "New Profile"; m._type = t, m._savedName = h, r && (m._photo = r); const _ = `${t}_${Date.now()}`; await chrome.storage.local.set({ [_]: m }), await chrome.storage.local.set({ lastSelectedProfile: _ }), n("profile_extraction", { service_mode: t }), f("Success!", "success"), c(t, !1), confirm(`Saved. Edit "${h}"?`) && chrome.tabs.create({ url: `editor.html?profile=${encodeURIComponent(_)}` }) } catch (e) { console.error(e), f(e.message, "error") } finally { l.disabled = !1, l.innerHTML = `Extract Data (${a.price})` } } async function d() { const e = document.querySelector(".profile-item.selected"); if (!e) return f("Select a profile first.", "error"); const t = e.dataset.key, o = await chrome.storage.local.get(t); if (o[t]) { const [e] = await chrome.tabs.query({ active: !0, currentWindow: !0 }); chrome.scripting.executeScript({ target: { tabId: e.id }, files: ["content.js"] }, () => { chrome.tabs.sendMessage(e.id, { type: "FILL_FORM", data: o[t] }), n("autofill_started", { service_mode: o[t]._type }), window.close() }) } } async function p() {
      const authView = o("auth-view"), loginView = o("login-view"), appView = o("app-view");
      if (authView) { authView.classList.add("hidden"); authView.style.display = "none"; }
      if (loginView) { loginView.classList.add("hidden"); loginView.style.display = "none"; }
      if (appView) { appView.classList.remove("hidden"); appView.style.display = "block"; }
      if (o("userNameDisplay")) o("userNameDisplay").textContent = "✨ Gemini AI";
      if (o("userCredits")) o("userCredits").textContent = "FREE";
    } function f(e, t) { const n = o("statusMessage"); n && (n.innerText = e, n.className = t) } document.addEventListener("DOMContentLoaded", async () => {
    setupSettingsModal(); !function () { o("btn-pdf-mode").onclick = () => r("BGD"), function () { o("mainExportBtn") && (o("mainExportBtn").onclick = () => { o("exportModal").classList.remove("hidden"), o("exportModal").style.display = "flex", chrome.storage.local.get(null, e => { let t = 0, n = 0; const s = []; for (const o in e) !["userProfile", "isLoggedIn", "lastServiceMode", "lastSelectedProfile", "recentTempIds", "autoCaptchaEnabled", "autoStartupCaptchaEnabled", "autoGeneralCaptchaEnabled", "autoFillPopupEnabled", "autoFillOnLoadEnabled", "autoPopup_temp_id", "autoPopup_status_check", "autoPopup_bgd_download", "autoPopup_earrival", "autoPopup_airsuvidha", "autoPopup_tax", "ga_client_id"].includes(o) && e[o] && e[o]._type && (s.push({ key: o, data: e[o] }), "BGD" === e[o]._type && t++, "PASSPORT" === e[o]._type && n++); const a = [{ key: "bgd", title: "BGD Profile", count: t, defaultChecked: !0, filename: "BGD_Profiles.ivprof" }, { key: "passport", title: "Passport Profile", count: n, defaultChecked: !0, filename: "Passport_Profiles.ivprof" }, { key: "hotels", title: "Saved Hotels", count: Array.isArray(e.iv_custom_hotels) ? e.iv_custom_hotels.length : 0, defaultChecked: !0, filename: "Saved_Hotels.ivprof" }, { key: "noc", title: "NOC Company", count: Array.isArray(e.iv_noc_companies) ? e.iv_noc_companies.length : 0, defaultChecked: !1, filename: "NOC_Companies.ivprof" }, { key: "recent", title: "Recent Temp,BGD,Status", count: (Array.isArray(e.recentTempIds) ? e.recentTempIds.length : 0) + (Array.isArray(e.recentResumeChecks) ? e.recentResumeChecks.length : 0) + (Array.isArray(e.recentBgdDownloads) ? e.recentBgdDownloads.length : 0) + (Array.isArray(e.recentStatusChecks) ? e.recentStatusChecks.length : 0), defaultChecked: !1, filename: "Recent_Temp_BGD_Status.ivprof" }], r = o("exportCategoryList"); r && (r.innerHTML = "", a.forEach(t => { const o = document.createElement("div"); o.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 5px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;", o.innerHTML = `\n                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; margin: 0; font-size: 11px; font-weight: 600; color: #1e293b; user-select: none;">\n                        <input type="checkbox" class="export-cat-chk" data-cat="${t.key}" ${t.defaultChecked ? "checked" : ""} style="cursor: pointer; width: 13px; height: 13px; accent-color: #4f46e5; margin: 0;">\n                        <span>${t.title}</span>\n                        <span style="font-size: 9.5px; font-weight: 700; color: #64748b; background: #e2e8f0; padding: 1px 5px; border-radius: 10px;">${t.count}</span>\n                    </label>\n                    <button class="cat-single-export-btn" data-cat="${t.key}" data-filename="${t.filename}" style="background: #6366f1; color: white; border: none; border-radius: 4px; padding: 2px 7px; font-size: 9.5px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Export</button>\n                `, o.querySelector(".cat-single-export-btn").onclick = () => { h(_(e, t.key), t.filename) }, r.appendChild(o) })); const i = o("exportSelectedBtn"); i && (i.onclick = () => { const t = document.querySelectorAll(".export-cat-chk:checked"); if (0 === t.length) return void alert("Please select at least one category to export."); const o = {}; t.forEach(t => { const n = t.dataset.cat, s = _(e, n); Object.assign(o, s) }); const n = `Exported_Backup_${(new Date).toISOString().slice(0, 10)}.ivprof`; h(o, n) }); const c = o("exportProfileList"); c && (c.innerHTML = "", 0 === s.length ? c.innerHTML = '<div style="padding: 8px; text-align: center; color: #64748b; font-size: 11px;">No individual profiles found</div>' : s.forEach(({ key: e, data: t }) => { const o = document.createElement("div"); o.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; border-bottom: 1px solid #f1f2f6;"; const n = document.createElement("span"); n.style.cssText = "font-size: 11px; font-weight: 600; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;", n.textContent = t._savedName || t.Name || t.name || "Unnamed Profile"; const s = document.createElement("button"); s.textContent = "Export", s.style.cssText = "background: #64748b; color: white; border: none; border-radius: 4px; padding: 2px 6px; font-size: 9.5px; font-weight: 600; cursor: pointer; flex-shrink: 0;", s.onclick = () => { const o = (n.textContent || "Profile").replace(/[^\w\s-]/g, "").trim(); h({ [e]: t }, `${o}.ivprof`) }, o.appendChild(n), o.appendChild(s), c.appendChild(o) })) }) }); o("closeExportModalBtn") && (o("closeExportModalBtn").onclick = () => { o("exportModal").classList.add("hidden"), o("exportModal").style.display = "none" }); o("mainImportBtn") && (o("mainImportBtn").onclick = () => { o("importFileInput").click() }); o("importFileInput") && o("importFileInput").addEventListener("change", async e => { const t = e.target.files[0]; if (!t) return; const n = new FileReader; n.onload = async e => { try { const t = function (e) { try { const t = atob(e), o = new Uint8Array(t.length); for (let e = 0; e < t.length; e++)o[e] = t.charCodeAt(e); const n = (new TextEncoder).encode(m); for (let e = 0; e < o.length; e++)o[e] = o[e] ^ n[e % n.length]; const s = (new TextDecoder).decode(o); return JSON.parse(s) } catch (e) { return null } }(e.target.result); if (!t || "object" != typeof t) return void alert("Invalid or corrupted backup file."); const n = await chrome.storage.local.get(null), s = {}; let a = 0; const r = []; let i = 0; for (const e in t) if (!["userProfile", "isLoggedIn", "lastServiceMode", "lastSelectedProfile", "recentTempIds", "autoCaptchaEnabled", "autoStartupCaptchaEnabled", "autoGeneralCaptchaEnabled", "autoFillPopupEnabled", "autoFillOnLoadEnabled", "autoPopup_temp_id", "autoPopup_status_check", "autoPopup_bgd_download", "autoPopup_earrival", "autoPopup_airsuvidha", "autoPopup_tax", "ga_client_id", "iv_custom_hotels", "iv_noc_companies", "iv_modified_defaults", "iv_deleted_default_ids", "recentResumeChecks", "recentBgdDownloads", "recentStatusChecks", "iv_recent_traveltax_checks", "iv_recent_porttax_checks"].includes(e)) { const o = t[e]; if (o && o._type && ["BGD", "PASSPORT"].includes(o._type)) { let t = e; n[e] && (t = o._type + "_" + Date.now() + Math.floor(1e3 * Math.random()), o._savedName && (o._savedName += " (Imported)"), o.Name && (o.Name += " (Imported)"), o.name && (o.name += " (Imported)")), s[t] = o, i++, a++ } } if (i > 0 && r.push(`${i} profile(s)`), Array.isArray(t.iv_custom_hotels) && t.iv_custom_hotels.length > 0) { const e = [...Array.isArray(n.iv_custom_hotels) ? n.iv_custom_hotels : []]; let o = 0; t.iv_custom_hotels.forEach(t => { e.some(e => e.name === t.name && e.state === t.state) || (e.push(t), o++) }), o > 0 && (s.iv_custom_hotels = e, a += o, r.push(`${o} hotel(s)`)), t.iv_modified_defaults && (s.iv_modified_defaults = { ...n.iv_modified_defaults || {}, ...t.iv_modified_defaults }), t.iv_deleted_default_ids && (s.iv_deleted_default_ids = [...new Set([...n.iv_deleted_default_ids || [], ...t.iv_deleted_default_ids])]) } if (Array.isArray(t.iv_noc_companies) && t.iv_noc_companies.length > 0) { const e = [...Array.isArray(n.iv_noc_companies) ? n.iv_noc_companies : []]; let o = 0; t.iv_noc_companies.forEach(t => { e.some(e => e.name === t.name) || (e.push(t), o++) }), o > 0 && (s.iv_noc_companies = e, a += o, r.push(`${o} NOC company(s)`)) } if (Array.isArray(t.recentTempIds) && t.recentTempIds.length > 0) { let e = [...Array.isArray(n.recentTempIds) ? n.recentTempIds : []], o = 0; t.recentTempIds.forEach(t => { e.some(e => e.id === t.id) || (e.push(t), o++) }), e.length > 20 && (e = e.slice(0, 20)), o > 0 && (s.recentTempIds = e, a += o, r.push(`${o} Temp/BGD ID(s)`)) } if (["recentResumeChecks", "recentBgdDownloads", "recentStatusChecks", "iv_recent_traveltax_checks", "iv_recent_porttax_checks"].forEach(e => { if (Array.isArray(t[e]) && t[e].length > 0) { let o = [...Array.isArray(n[e]) ? n[e] : []]; t[e].forEach(e => { o.some(t => JSON.stringify(t) === JSON.stringify(e)) || o.push(e) }); const a = "iv_recent_traveltax_checks" === e || "iv_recent_porttax_checks" === e ? 30 : 20; o.length > a && (o = o.slice(0, a)), s[e] = o } }), a > 0 || Object.keys(s).length > 0) { await chrome.storage.local.set(s), alert(`Successfully imported: ${r.join(", ") || "data"}.`); c(o("btn-pdf-mode").classList.contains("active") ? "BGD" : "PASSPORT", !o("hidden-view").classList.contains("hidden")) } else alert("No new items found to import in the file.") } catch (e) { alert("Invalid backup file or corrupted data.") } }, n.readAsText(t), o("importFileInput").value = "" }) }(), o("btn-passport-mode").onclick = () => r("PASSPORT"), o("viewHiddenBtn").onclick = () => a(!0), o("backToMainBtn").onclick = () => a(!1), o("followBtn") && (o("followBtn").onclick = () => chrome.tabs.create({ url: "https://www.facebook.com/AverageStudentbd" })); o("addBalanceBtn") && (o("addBalanceBtn").onclick = () => chrome.tabs.create({ url: "https://www.facebook.com/AverageStudentbd" })); o("userNameDisplay") && (o("userNameDisplay").onclick = () => chrome.tabs.create({ url: "https://www.facebook.com/AverageStudentbd" })); o("saveProfileButton") && (o("saveProfileButton").onclick = () => l("BGD")); o("saveProfileButtonPassport") && (o("saveProfileButtonPassport").onclick = () => l("PASSPORT")); o("autofillButton") && (o("autofillButton").onclick = d); o("logoutBtn") && (o("logoutBtn").onclick = async () => { confirm("Logout?") && (await chrome.storage.local.clear(), window.location.reload()) }); o("btnLogin") && (o("btnLogin").onclick = () => chrome.tabs.create({ url: "https://www.facebook.com/AverageStudentbd" })); const e = o("openSidePanelBtn"); e && (e.onclick = async () => { const e = await chrome.windows.getCurrent(); chrome.sidePanel && chrome.sidePanel.open ? (await chrome.sidePanel.open({ windowId: e.id }), window.close()) : alert("Side Panel not supported.") }) }(), async function () { const e = await chrome.storage.local.get("pendingExport"); e.pendingExport && chrome.permissions.contains({ permissions: ["downloads"] }, async t => { t && u(e.pendingExport.content, e.pendingExport.filename), await chrome.storage.local.remove("pendingExport") }) }(), await p(); let e = (await chrome.storage.local.get(["lastServiceMode"])).lastServiceMode || "BGD"; i(e), c(e), chrome.storage.onChanged.addListener((e, t) => { "local" === t && (e.userProfile || e.isLoggedIn) && p() }) }); const m = "NexSoftIVPro!2026"; function u(e, t) { const o = new Blob([e], { type: "application/octet-stream" }), n = URL.createObjectURL(o); if (chrome.downloads && chrome.downloads.download) chrome.downloads.download({ url: n, filename: t, conflictAction: "uniquify" }, () => { URL.revokeObjectURL(n) }); else { const e = document.createElement("a"); e.href = n, e.download = t, document.body.appendChild(e), e.click(), document.body.removeChild(e), URL.revokeObjectURL(n) } } async function h(e, t) { if (!e || 0 === Object.keys(e).length) return void alert("No items found to export in the selected category."); const o = function (e) { const t = JSON.stringify(e), o = (new TextEncoder).encode(t), n = (new TextEncoder).encode(m); for (let e = 0; e < o.length; e++)o[e] = o[e] ^ n[e % n.length]; let s = ""; for (let e = 0; e < o.length; e++)s += String.fromCharCode(o[e]); return btoa(s) }(e); await chrome.storage.local.set({ pendingExport: { content: o, filename: t } }), chrome.permissions.request({ permissions: ["downloads"] }, async e => { e ? (u(o, t), await chrome.storage.local.remove("pendingExport")) : (console.warn("User denied the downloads permission."), await chrome.storage.local.remove("pendingExport")) }) } function _(e, t) { const o = {}; if ("bgd" === t) for (const t in e) e[t] && "BGD" === e[t]._type && (o[t] = e[t]); else if ("passport" === t) for (const t in e) e[t] && "PASSPORT" === e[t]._type && (o[t] = e[t]); else "hotels" === t ? (e.iv_custom_hotels && (o.iv_custom_hotels = e.iv_custom_hotels), e.iv_modified_defaults && (o.iv_modified_defaults = e.iv_modified_defaults), e.iv_deleted_default_ids && (o.iv_deleted_default_ids = e.iv_deleted_default_ids)) : "noc" === t ? e.iv_noc_companies && (o.iv_noc_companies = e.iv_noc_companies) : "recent" === t && (e.recentTempIds && (o.recentTempIds = e.recentTempIds), e.recentResumeChecks && (o.recentResumeChecks = e.recentResumeChecks), e.recentBgdDownloads && (o.recentBgdDownloads = e.recentBgdDownloads), e.recentStatusChecks && (o.recentStatusChecks = e.recentStatusChecks), e.iv_recent_traveltax_checks && (o.iv_recent_traveltax_checks = e.iv_recent_traveltax_checks), e.iv_recent_porttax_checks && (o.iv_recent_porttax_checks = e.iv_recent_porttax_checks)); return o } async function g(e) { try { const t = await e.getOperatorList(), o = []; for (let e = 0; e < t.fnArray.length; e++) { const n = t.argsArray[e]; if (n && n[0] && "string" == typeof n[0]) { const e = n[0]; (e.startsWith("img_") || e.startsWith("g_img") || e.includes("img") || e.includes("Img")) && o.push(e) } } const n = [...new Set(o)], s = t => new Promise(o => { try { e.objs && "function" == typeof e.objs.get ? e.objs.get(t, e => o(e)) : e.commonObjs && "function" == typeof e.commonObjs.get ? e.commonObjs.get(t, e => o(e)) : o(null) } catch (e) { o(null) } setTimeout(() => o(null), 300) }), a = e => { let t = 0, o = 0; for (let n = 0; n < e.length; n += 148)t += Math.max(e[n], e[n + 1], e[n + 2]) - Math.min(e[n], e[n + 1], e[n + 2]), o++; return o ? t / o / 255 : 0 }; let r = null, i = -1; for (const e of n) { const t = await s(e); if (!t) continue; const o = t.width, n = t.height; if (!o || !n) continue; const c = o / n; if (c < .7 || c > 1.4) continue; if (o < 60 || n < 60) continue; const l = document.createElement("canvas"); l.width = o, l.height = n; const d = l.getContext("2d"); let p = !1; if (t.bitmap) try { d.drawImage(t.bitmap, 0, 0), p = !0 } catch (e) { } if (!p && t.data) try { const e = d.createImageData(o, n), s = t.data, a = t.kind; if (3 === a && s.length >= o * n * 4) e.data.set(s.subarray(0, o * n * 4)); else if (2 === a || s.length >= o * n * 3) for (let t = 0, a = 0; t < o * n; t++)e.data[a++] = s[3 * t], e.data[a++] = s[3 * t + 1], e.data[a++] = s[3 * t + 2], e.data[a++] = 255; else if (s.length >= o * n) for (let t = 0, a = 0; t < o * n; t++) { const o = s[t]; e.data[a++] = o, e.data[a++] = o, e.data[a++] = o, e.data[a++] = 255 } else { const t = Math.ceil(o / 8); for (let a = 0; a < n; a++)for (let n = 0; n < o; n++) { const r = (s[a * t + (n >> 3)] || 0) >> 7 - (7 & n) & 1 ? 255 : 0, i = 4 * (a * o + n); e.data[i] = r, e.data[i + 1] = r, e.data[i + 2] = r, e.data[i + 3] = 255 } } d.putImageData(e, 0, 0), p = !0 } catch (e) { } if (!p) continue; let f = 0; try { f = a(d.getImageData(0, 0, o, n).data) } catch (e) { } const m = 1 - Math.min(Math.abs(c - 1), 1), u = 3 * m + 2 * f + .3 * (Math.min(o * n, 25e4) / 25e4); u > i && (i = u, r = l) } if (r) { const e = Math.max(350, r.width, r.height), t = document.createElement("canvas"); t.width = e, t.height = e; const o = t.getContext("2d"); o.fillStyle = "#ffffff", o.fillRect(0, 0, e, e); const n = Math.max(e / r.width, e / r.height), s = r.width * n, a = r.height * n, i = (e - s) / 2, c = (e - a) / 2; return o.drawImage(r, i, c, s, a), t.toDataURL("image/jpeg", .92) } } catch (e) { console.warn("PDF photo extraction notice", e) } try { const t = e.getViewport({ scale: 2 }), o = document.createElement("canvas"); o.width = t.width, o.height = t.height; const n = o.getContext("2d"); await e.render({ canvasContext: n, viewport: t }).promise; const s = Math.floor(.082 * t.width), a = Math.floor(.12 * t.height), r = Math.floor(.185 * t.width), i = Math.floor(.132 * t.height), c = 350, l = document.createElement("canvas"); l.width = c, l.height = c; const d = l.getContext("2d"); d.fillStyle = "#ffffff", d.fillRect(0, 0, c, c); const p = Math.max(c / r, c / i), f = r * p, m = i * p, u = (c - f) / 2, h = (c - m) / 2; return d.drawImage(o, s, a, r, i, u, h, f, m), l.toDataURL("image/jpeg", .9) } catch (e) { return console.warn("PDF photo crop error", e), "" } }

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
