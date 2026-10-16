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
  if (spouseMatch) res.spouse_name = spouseMatch[1].trim();

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
  res.father_nationality = "BANGLADESH";
  res.mother_nationality = "BANGLADESH";
  res.father_country_of_birth = "BANGLADESH";
  res.mother_country_of_birth = "BANGLADESH";
  res.spouse_nationality = "BANGLADESH";
  res.spouse_country_of_birth = "BANGLADESH";

  return res;
}

function extractReferencesFromCoordinates(items, fullText) {
  let t = {
    nameofsponsor_ind: "NILL",
    add1ofsponsor_ind: "NILL",
    add2ofsponsor_ind: "NILL",
    stateofsponsor_ind: "NILL",
    districtofsponsor_ind: "NILL",
    phoneofsponsor_ind: "NILL",
    nameofsponsor_msn: "NILL",
    add1ofsponsor_msn: "NILL",
    add2ofsponsor_msn: "NILL",
    phoneofsponsor_msn: "NILL"
  };
  if (!Array.isArray(items) || items.length === 0) return t;
  const o = items.find(e => /Details of Two Reference/i.test(e.str));
  if (!o) return t;
  const n = o.page || 1;
  const s = items.filter(e => (e.page || 1) === n && e.str && e.str.trim());
  const a = s.find(e => /In India/i.test(e.str));
  const r = s.find(e => /In BANGLADESH/i.test(e.str));
  let i = 310;
  if (a && r && r.x > a.x) i = (a.x + r.x) / 2;
  const c = s.find(e => /^Name$/i.test(e.str.trim()) && e.y < o.y);
  const l = s.find(e => /^Address$/i.test(e.str.trim()) && c && e.y < c.y);
  const d = s.find(e => /^Phone Number$/i.test(e.str.trim()) && l && e.y < l.y);
  const p = s.find(e => /(DOCUMENTS UPLOADED|DECLARATION)/i.test(e.str) && d && e.y < d.y);
  if (c && l && d) {
    const formatLine = e => {
      const arr = [];
      e.forEach(item => {
        const last = arr[arr.length - 1];
        last && Math.abs(last.y - item.y) <= 4 ? last.items.push(item) : arr.push({ y: item.y, items: [item] });
      });
      return arr.map(row => (row.items.sort((a, b) => a.x - b.x), row.items.map(it => it.str).join(" ").trim())).filter(Boolean);
    };
    const indNames = s.filter(e => Math.abs(e.y - c.y) <= 6 && e.x > c.x + 10 && e.x < i).sort((a, b) => a.x - b.x);
    const msnNames = s.filter(e => Math.abs(e.y - c.y) <= 6 && e.x >= i).sort((a, b) => a.x - b.x);
    if (indNames.length) t.nameofsponsor_ind = indNames.map(e => e.str).join(" ").trim();
    if (msnNames.length) t.nameofsponsor_msn = msnNames.map(e => e.str).join(" ").trim();

    const topY = c.y - 7, botY = d.y + 6;
    const indAddrItems = s.filter(e => e.y <= topY && e.y > botY && e.x > c.x + 10 && e.x < i && !/^Address$/i.test(e.str.trim())).sort((a, b) => b.y - a.y || a.x - b.x);
    const msnAddrItems = s.filter(e => e.y <= topY && e.y > botY && e.x >= i && !/^Address$/i.test(e.str.trim())).sort((a, b) => b.y - a.y || a.x - b.x);
    const indLines = formatLine(indAddrItems);
    const msnLines = formatLine(msnAddrItems);

    if (indLines.length > 0) {
      const fullAddr = indLines.join(" ");
      const pinMatch = fullAddr.match(/\b(\d{6})\b/);
      if (pinMatch) t.add2ofsponsor_ind = pinMatch[1];
      const stateRegex = /\b(ANDAMAN AND NICOBAR|ANDHRA PRADESH|ARUNACHAL PRADESH|ASSAM|BIHAR|CHANDIGARH|CHHATTISGARH|DADRA AND NAGAR HAVELI|DAMAN AND DIU|DELHI|GOA|GUJARAT|HARYANA|HIMACHAL PRADESH|JAMMU AND KASHMIR|JHARKHAND|KARNATAKA|KERALA|LADAKH|LAKSHADWEEP|MADHYA PRADESH|MAHARASHTRA|MANIPUR|MEGHALAYA|MIZORAM|NAGALAND|ODISHA|ORISSA|PUDUCHERRY|PUNJAB|RAJASTHAN|SIKKIM|TAMIL NADU|TELANGANA|TRIPURA|UTTAR PRADESH|UTTARAKHAND|WEST BENGAL)\b/i;
      const stateMatch = fullAddr.match(stateRegex);
      if (stateMatch) {
        t.stateofsponsor_ind = stateMatch[1].toUpperCase();
        const distMatch = fullAddr.slice(0, stateMatch.index).trim().match(/([A-Z\s]+)$/i);
        if (distMatch) {
          let dist = distMatch[1].trim().split(/\s+/).slice(-2).join(" ").replace(/^\d{6}\s*/, "").trim().toUpperCase();
          if (dist === "NEW" && t.stateofsponsor_ind === "DELHI") dist = "NEW DELHI";
          t.districtofsponsor_ind = dist;
        }
      }
      if (/\bNEW\s+DELHI\b/i.test(fullAddr)) {
        t.stateofsponsor_ind = "DELHI";
        t.districtofsponsor_ind = "NEW DELHI";
      }
      let stopIdx = indLines.findIndex(e => /\b\d{6}\b/.test(e) || stateRegex.test(e));
      if (stopIdx === -1) stopIdx = indLines.length;
      const streetLines = indLines.slice(0, stopIdx);
      t.add1ofsponsor_ind = (streetLines.length > 0 ? streetLines.map(e => e.trim()).join(" ") : fullAddr.replace(/\b\d{6}\b.*/, "")).replace(/\s*,\s*/g, ", ").slice(0, 50);
    }

    if (msnLines.length > 0) {
      t.add1ofsponsor_msn = msnLines[0].trim().replace(/^[,\s]+|[,\s]+$/g, "").slice(0, 50);
      if (msnLines.length > 1) {
        t.add2ofsponsor_msn = msnLines.slice(1).map(e => e.trim().replace(/^[,\s]+|[,\s]+$/g, "")).join(", ").slice(0, 50);
      }
    }

    const pTopY = d.y + 6, pBotY = p ? p.y + 4 : d.y - 25;
    const indPhoneItems = s.filter(e => e.y <= pTopY && e.y > pBotY && e.x > d.x + 10 && e.x < i).sort((a, b) => b.y - a.y || a.x - b.x);
    const msnPhoneItems = s.filter(e => e.y <= pTopY && e.y > pBotY && e.x >= i).sort((a, b) => b.y - a.y || a.x - b.x);
    const indPhone = indPhoneItems.map(e => e.str).join("").replace(/[^\d]/g, "");
    const msnPhone = msnPhoneItems.map(e => e.str).join("").replace(/[^\d]/g, "");
    if (indPhone) t.phoneofsponsor_ind = indPhone;
    if (msnPhone) {
      const bdMatch = msnPhone.match(/(?:88)?(01[3-9]\d{8})/);
      t.phoneofsponsor_msn = bdMatch ? bdMatch[1] : msnPhone;
    }
  }
  return t;
}

async function extractPhotoFromPage(page) {
  try {
    const opList = await page.getOperatorList();
    const imgNames = [];
    for (let i = 0; i < opList.fnArray.length; i++) {
      const arg = opList.argsArray[i];
      if (arg && arg[0] && typeof arg[0] === 'string') {
        const s = arg[0];
        if (s.startsWith("img_") || s.startsWith("g_img") || s.includes("img") || s.includes("Img")) imgNames.push(s);
      }
    }
    const unique = [...new Set(imgNames)];
    const getObj = name => new Promise(res => {
      try {
        if (page.objs && typeof page.objs.get === 'function') page.objs.get(name, obj => res(obj));
        else if (page.commonObjs && typeof page.commonObjs.get === 'function') page.commonObjs.get(name, obj => res(obj));
        else res(null);
      } catch (err) { res(null); }
      setTimeout(() => res(null), 300);
    });
    for (const name of unique) {
      const obj = await getObj(name);
      if (!obj) continue;
      const w = obj.width, h = obj.height;
      if (!w || !h || w < 60 || h < 60) continue;
      const aspect = w / h;
      if (aspect < 0.7 || aspect > 1.4) continue;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (obj.bitmap) {
        ctx.drawImage(obj.bitmap, 0, 0);
        return canvas.toDataURL("image/jpeg", 0.92);
      }
    }
  } catch (err) {
    console.warn("Photo extraction error:", err);
  }
  return "";
}

/**
 * popup.js — Indian Visa Autofill v2.0
 */

import { getDocument, GlobalWorkerOptions } from './build/pdf.mjs';
import { extractFromBGDText, extractFromPassport, testApiKey } from './gemini.js';
import { getProfiles, saveProfile, deleteProfile } from './storage.js';

GlobalWorkerOptions.workerSrc = './build/pdf.worker.mjs';

const $ = (id) => document.getElementById(id);

let currentUser = null;

// Auth Initialization
if (window.auth) {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            $('auth-view').style.display = 'none';
            $('app-view').style.display = 'block';
            
            // Check if admin
            db.collection('roles').doc(user.uid).get().then(doc => {
                if (doc.exists && doc.data().role === 'admin') {
                    $('adminBtn').style.display = 'inline-flex';
                }
            }).catch(()=>{});

            loadProfiles($('btn-pdf-mode').classList.contains('active') ? 'BGD' : 'PASSPORT', false);
        } else {
            $('auth-view').style.display = 'block';
            $('app-view').style.display = 'none';
        }
    });

    $('loginBtn').onclick = () => {
        const email = $('authEmail').value.trim();
        const pass = $('authPassword').value.trim();
        if(!email || !pass) return $('authError').innerText = "Email/Password cannot be empty", $('authError').style.display = 'block';
        auth.signInWithEmailAndPassword(email, pass).catch(err => {
            $('authError').innerText = err.message;
            $('authError').style.display = 'block';
        });
    };

    $('signupBtn').onclick = () => {
        const email = $('authEmail').value.trim();
        const pass = $('authPassword').value.trim();
        if(!email || !pass) return $('authError').innerText = "Email/Password cannot be empty", $('authError').style.display = 'block';
        auth.createUserWithEmailAndPassword(email, pass).catch(err => {
            $('authError').innerText = err.message;
            $('authError').style.display = 'block';
        });
    };

    $('forgotBtn').onclick = (e) => {
        e.preventDefault();
        const email = $('authEmail').value.trim();
        if(!email) return $('authError').innerText = "Please enter your email first", $('authError').style.display = 'block';
        auth.sendPasswordResetEmail(email)
            .then(() => {
                $('authError').innerText = "Password reset email sent!";
                $('authError').style.display = 'block';
                $('authError').style.color = '#10b981'; // green
            })
            .catch(err => {
                $('authError').innerText = err.message;
                $('authError').style.display = 'block';
                $('authError').style.color = '#ef4444'; // red back
            });
    };

    $('logoutBtn').onclick = () => auth.signOut();
    
    $('adminBtn').onclick = () => {
        chrome.tabs.create({ url: 'admin.html' });
    };
}

// ─── UI State ─────────────────────────────────────────────────

function showHiddenView(show) {
  if (show) {
    $('main-content').classList.add('hidden');
    $('hidden-view').classList.remove('hidden');
    loadProfiles($('btn-pdf-mode').classList.contains('active') ? 'BGD' : 'PASSPORT', true);
  } else {
    $('hidden-view').classList.add('hidden');
    $('main-content').classList.remove('hidden');
    loadProfiles($('btn-pdf-mode').classList.contains('active') ? 'BGD' : 'PASSPORT', false);
  }
}

function switchMode(mode) {
  chrome.storage.local.set({ lastServiceMode: mode });
  updateToggleUI(mode);
  loadProfiles(mode, !$('hidden-view').classList.contains('hidden'));
}

function updateToggleUI(mode) {
  $('btn-pdf-mode').className = mode === 'BGD' ? 'toggle-btn active' : 'toggle-btn';
  $('btn-passport-mode').className = mode === 'PASSPORT' ? 'toggle-btn active' : 'toggle-btn';
  
  if (mode === 'BGD') {
    $('pdf-upload-section').classList.remove('hidden');
    $('passport-upload-section').classList.add('hidden');
    $('toggle-slider').style.transform = 'translateX(0%)';
  } else {
    $('pdf-upload-section').classList.add('hidden');
    $('passport-upload-section').classList.remove('hidden');
    $('toggle-slider').style.transform = 'translateX(100%)';
  }
}

// ─── Settings (API Key) ──────────────────────────────────────

async function loadApiKey() {
  const stored = await chrome.storage.sync.get(['geminiApiKey']);
  const key = stored.geminiApiKey || '';
  $('apiKeyInput').value = key;
  updateKeyStatus(key ? '✅ API key saved' : '', key ? 'valid' : '');
  return key;
}

async function saveApiKey() {
  const key = $('apiKeyInput').value.trim();
  if (!key) {
    updateKeyStatus('❌ Please enter an API key', 'invalid');
    return;
  }

  updateKeyStatus('🔄 Checking key...', 'checking');
  const isValid = await testApiKey(key);

  if (isValid) {
    await chrome.storage.sync.set({ geminiApiKey: key });
    updateKeyStatus('✅ API key saved & verified!', 'valid');
  } else {
    updateKeyStatus('❌ Invalid key. Please check and try again.', 'invalid');
  }
}

function updateKeyStatus(text, className) {
  const el = $('keyStatus');
  el.textContent = text;
  el.className = 'key-status ' + (className || '');
}

// ─── Profile Management ──────────────────────────────────────

async function loadProfiles(mode, showHidden = false) {
  const listEl = $(showHidden ? 'hiddenProfileList' : 'profileList');
  if (!listEl) return;
  listEl.innerHTML = '';

  const localPrefs = await chrome.storage.local.get(['lastSelectedProfile']);
  const selectedKey = localPrefs.lastSelectedProfile;
  const cloudProfiles = await getProfiles();
  let count = 0;

  Object.keys(cloudProfiles).forEach((key) => {
    const profile = cloudProfiles[key];
    if (profile._type !== mode) return;
    const isHidden = profile._isHidden === true;
    if (showHidden && !isHidden) return;
    if (!showHidden && isHidden) return;

    count++;
    const item = document.createElement('div');
    item.className = 'profile-item';
    item.dataset.key = key;
    if (key === selectedKey) item.classList.add('selected');

    let actionsHTML = showHidden
      ? '<button class="show-btn" title="Restore">Show</button><button class="del-btn" title="Delete">Del</button>'
      : '<button class="edit-btn" title="Edit">Edit</button><button class="rename-btn" title="Rename">Rename</button><a class="export-btn" title="Export" download>Exp</a><button class="hide-btn" title="Hide">Hide</button><button class="del-btn" title="Delete">Del</button>';

    item.innerHTML = `
      <span style="flex-grow:1; font-weight:500;">${profile._savedName || 'Unknown'}</span>
      <div class="profile-actions">${actionsHTML}</div>
    `;

    if (!showHidden) {
      item.addEventListener('click', async (e) => {
        if (e.target.tagName !== 'BUTTON' && !e.target.classList.contains('export-btn')) {
          document.querySelectorAll('.profile-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          await chrome.storage.local.set({ lastSelectedProfile: key });
        }
      });
    }

    const editBtn = item.querySelector('.edit-btn');
    if (editBtn) editBtn.onclick = () => chrome.tabs.create({ url: `editor.html?profile=${encodeURIComponent(key)}` });

    const renameBtn = item.querySelector('.rename-btn');
    if (renameBtn) {
      renameBtn.onclick = async () => {
        const newName = prompt('Enter new profile name:', profile._savedName);
        if (newName && newName !== profile._savedName) {
          const updated = { ...profile, _savedName: newName };
          const newKey = `${mode}_${Date.now()}`;
          await saveProfile(newKey, updated);
          await deleteProfile(key);
          if (key === selectedKey) await chrome.storage.local.set({ lastSelectedProfile: newKey });
          loadProfiles(mode, false);
        }
      };
    }

    const exportBtn = item.querySelector('.export-btn');
    if (exportBtn) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile));
      exportBtn.setAttribute("href", dataStr);
      exportBtn.setAttribute("download", `${profile._savedName || 'Profile'}.json`);
    }

    const hideBtn = item.querySelector('.hide-btn');
    if (hideBtn) {
      hideBtn.onclick = async () => {
        const updated = { ...profile, _isHidden: true };
        await saveProfile(key, updated);
        if (key === selectedKey) await chrome.storage.local.remove('lastSelectedProfile');
        loadProfiles(mode, false);
      };
    }

    const showBtn = item.querySelector('.show-btn');
    if (showBtn) {
      showBtn.onclick = async () => {
        const updated = { ...profile, _isHidden: false };
        await saveProfile(key, updated);
        loadProfiles(mode, true);
      };
    }

    item.querySelector('.del-btn').onclick = async () => {
      if (confirm('Delete permanently?')) {
        await deleteProfile(key);
        if (key === selectedKey) await chrome.storage.local.remove('lastSelectedProfile');
        loadProfiles(mode, showHidden);
      }
    };

    listEl.appendChild(item);
  });

  if (count === 0) {
    listEl.innerHTML = '<div style="padding:10px;text-align:center;color:#777">No profiles found.</div>';
  }
}

// ─── File Upload & Extraction (Batch Processing) ─────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (err) => reject(err);
  });
}

async function checkDuplicate(passNo) {
  if (!passNo || passNo === 'NILL') return false;
  const cloudProfiles = await getProfiles();
  for (const key in cloudProfiles) {
    if (cloudProfiles[key].passNo === passNo) {
      return true;
    }
  }
  return false;
}

async function processSingleFile(file, mode, apiKey) {
  let extracted = null;
  let photoData = "";

  if (mode === 'BGD') {
    if (file.type !== 'application/pdf') throw new Error('Only PDF supported for BGD mode.');
    const arrayBuf = await file.arrayBuffer();
    const pdfDoc = await getDocument(new Uint8Array(arrayBuf)).promise;
    let fullText = '';
    let coordItems = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ');
      for (const item of content.items) {
        if (item && item.str && item.str.trim()) {
          coordItems.push({
            str: item.str.trim(),
            x: Math.round(10 * (item.transform ? item.transform[4] : 0)) / 10,
            y: Math.round(10 * (item.transform ? item.transform[5] : 0)) / 10,
            page: i
          });
        }
      }
      if (i === 1) {
        photoData = await extractPhotoFromPage(page);
      }
    }
    
    if (fullText.trim().length > 0) {
      extracted = await extractFromBGDText(apiKey, fullText);
      const vDetails = extractVisaDetailsFromText(fullText);
      for (const k in vDetails) {
        if (vDetails[k] && (!extracted[k] || extracted[k] === "NILL" || extracted[k] === "")) {
          extracted[k] = vDetails[k];
        }
      }
      if (!extracted.exitpoint && extracted.entrypoint) extracted.exitpoint = extracted.entrypoint;
      // Dual reference coordinate enhancement
      if (Array.isArray(coordItems) && coordItems.length > 0) {
        const refData = extractReferencesFromCoordinates(coordItems, fullText);
        Object.assign(extracted, refData);
      }
      if (!extracted.place_of_stay1 || extracted.place_of_stay1 === 'NILL') {
        extracted.place_of_stay1 = extracted.nameofsponsor_ind;
        extracted.pos_address1 = extracted.add1ofsponsor_ind;
        extracted.pos_phone1 = extracted.phoneofsponsor_ind;
      }
      const bgdMatch = fullText.match(/(?:Web\s*File\s*No\.?|Application\s*Id|File\s*No\.?)\s*:?\s*(BGD[A-Z0-9]{7,12})/i) || fullText.match(/\b(BGD[A-Z0-9]{8,12})\b/i);
      if (bgdMatch) extracted.bgd_id = bgdMatch[1].toUpperCase().trim();
    } else {
      const base64 = await fileToBase64(file);
      extracted = await extractFromPassport(apiKey, base64, 'application/pdf');
    }
  } else if (mode === 'PASSPORT') {
    const base64 = await fileToBase64(file);
    extracted = await extractFromPassport(apiKey, base64, file.type);
  }

  if (!extracted) throw new Error("Could not extract applicant data from file.");

  // Check duplicate
  const isDuplicate = await checkDuplicate(extracted.passNo);
  if (isDuplicate) {
    if (!confirm(`Profile with passport ${extracted.passNo} already exists. Add anyway?`)) {
      return null;
    }
  }

  const nameParts = [extracted.givenName, extracted.surname].filter(Boolean);
  const profileName = nameParts.length > 0 ? nameParts.join(' ') : 'New Profile';

  extracted._type = mode;
  extracted._savedName = profileName;
  if (photoData) extracted._photo = photoData;

  const profileKey = `${mode}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  await saveProfile(profileKey, extracted);
  return profileKey;
}

async function extractData(mode) {
  const fileInput = $(mode === 'BGD' ? 'pdfUpload' : 'passportUpload');
  const files = fileInput?.files;
  const btn = $(mode === 'BGD' ? 'saveProfileButton' : 'saveProfileButtonPassport');
  const progBar = $(mode === 'BGD' ? 'pdfProgress' : 'passportProgress');
  const progFill = $(mode === 'BGD' ? 'pdfProgressFill' : 'passportProgressFill');

  if (!files || files.length === 0) return showStatus('Please select a file.', 'error');

  const stored = await chrome.storage.sync.get(['geminiApiKey']);
  const apiKey = stored.geminiApiKey;
  if (!apiKey) {
    showStatus('⚙️ Please set your Gemini API key first!', 'error');
    $('settingsPanel').classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  progBar.style.display = 'block';
  let successCount = 0;
  let lastKey = null;

  try {
    for (let i = 0; i < files.length; i++) {
      showStatus(`🤖 Processing ${i+1}/${files.length}...`, 'processing');
      progFill.style.width = `${((i) / files.length) * 100}%`;
      
      const key = await processSingleFile(files[i], mode, apiKey);
      if (key) {
        successCount++;
        lastKey = key;
      }
    }
    
    progFill.style.width = `100%`;
    showStatus(`✅ Successfully extracted ${successCount} profile(s).`, 'success');
    
    if (lastKey) {
      await chrome.storage.local.set({ lastSelectedProfile: lastKey });
    }
    loadProfiles(mode, false);
    fileInput.value = '';

    if (successCount === 1 && lastKey && confirm(`Saved! Open editor to review/edit?`)) {
      chrome.tabs.create({ url: `editor.html?profile=${encodeURIComponent(lastKey)}` });
    }

  } catch (err) {
    console.error(err);
    showStatus('❌ ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    setTimeout(() => { progBar.style.display = 'none'; }, 2000);
  }
}

// ─── Import Logic ─────────────────────────────────────────────

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data._savedName || !data.passNo) {
        throw new Error("Invalid profile JSON file");
      }
      
      const mode = data._type || 'PASSPORT';
      const key = `${mode}_${Date.now()}`;
      
      await saveProfile(key, data);
      showStatus(`✅ Imported ${data._savedName}`, 'success');
      loadProfiles(mode, false);
      
    } catch (err) {
      showStatus(`❌ Import failed: ${err.message}`, 'error');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ─── Autofill ─────────────────────────────────────────────────

async function doAutofill() {
  const selectedEl = document.querySelector('.profile-item.selected');
  if (!selectedEl) return showStatus('Select a profile first.', 'error');

  const key = selectedEl.dataset.key;
  let profileData = null;
  const cloudProfiles = await getProfiles();
  if (cloudProfiles[key]) {
    profileData = cloudProfiles[key];
  } else {
    const stored = await chrome.storage.local.get(key);
    profileData = stored[key];
  }

  if (profileData) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'FILL_FORM', 
        data: profileData,
        fillMissingOnly: $('fillMissingOnly')?.checked || false
      });
      window.close();
    });
  }
}

// ─── Status Message ───────────────────────────────────────────

function showStatus(text, type) {
  const el = $('statusMessage');
  if (el) {
    el.innerText = text;
    el.className = type;
  }
}

// ─── Advanced Settings Logic ────────────────────────────────────

async function loadAdvancedSettings() {
  const stored = await chrome.storage.local.get(['iv_model', 'iv_autoDeleteDays', 'iv_fillMissingOnly', 'iv_promptBGD', 'iv_promptPassport']);
  
  if ($('modelSelect')) $('modelSelect').value = stored.iv_model || 'gemini-2.5-flash';
  if ($('autoDeleteSelect')) $('autoDeleteSelect').value = stored.iv_autoDeleteDays || '0';
  if ($('fillMissingOnly')) $('fillMissingOnly').checked = stored.iv_fillMissingOnly || false;
  if ($('promptBGD')) $('promptBGD').value = stored.iv_promptBGD || '';
  if ($('promptPassport')) $('promptPassport').value = stored.iv_promptPassport || '';

  if ($('modelSelect')) $('modelSelect').onchange = (e) => chrome.storage.local.set({ iv_model: e.target.value });
  if ($('autoDeleteSelect')) $('autoDeleteSelect').onchange = (e) => chrome.storage.local.set({ iv_autoDeleteDays: e.target.value });
  if ($('fillMissingOnly')) $('fillMissingOnly').onchange = (e) => chrome.storage.local.set({ iv_fillMissingOnly: e.target.checked });
  if ($('promptBGD')) $('promptBGD').onchange = (e) => chrome.storage.local.set({ iv_promptBGD: e.target.value });
  if ($('promptPassport')) $('promptPassport').onchange = (e) => chrome.storage.local.set({ iv_promptPassport: e.target.value });
  
  if ($('clearDataBtn')) {
    $('clearDataBtn').onclick = async () => {
      if (confirm('Are you sure you want to delete ALL extracted profiles? This cannot be undone.')) {
        const storage = await chrome.storage.local.get(null);
        for (const key in storage) {
          if (key.startsWith('BGD_') || key.startsWith('PASSPORT_')) {
            await chrome.storage.local.remove(key);
          }
        }
        showStatus('✅ All profiles cleared.', 'success');
        loadProfiles((await chrome.storage.local.get(['lastServiceMode'])).lastServiceMode || 'BGD', false);
      }
    };
  }
}

// ─── Initialize ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  $('btn-pdf-mode').onclick = () => switchMode('BGD');
  $('btn-passport-mode').onclick = () => switchMode('PASSPORT');

  $('viewHiddenBtn').onclick = () => showHiddenView(true);
  $('backToMainBtn').onclick = () => showHiddenView(false);

  $('settingsToggleBtn').onclick = () => $('settingsPanel').classList.toggle('hidden');
  $('saveKeyBtn').onclick = saveApiKey;
  $('getKeyLink').onclick = () => chrome.tabs.create({ url: 'https://aistudio.google.com/apikey' });

  if ($('importBtn')) {
    $('importBtn').onclick = () => $('importInput').click();
    $('importInput').addEventListener('change', handleImport);
  }

  if ($('saveProfileButton')) $('saveProfileButton').onclick = () => extractData('BGD');
  if ($('saveProfileButtonPassport')) $('saveProfileButtonPassport').onclick = () => extractData('PASSPORT');

  if ($('autofillButton')) $('autofillButton').onclick = doAutofill;

  if ($('openSidePanelBtn')) {
    $('openSidePanelBtn').onclick = async () => {
      const win = await chrome.windows.getCurrent();
      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ windowId: win.id });
        window.close();
      } else {
        alert('Side Panel not supported.');
      }
    };
  }

  let mode = (await chrome.storage.local.get(['lastServiceMode'])).lastServiceMode || 'BGD';
  updateToggleUI(mode);
  loadProfiles(mode);
  loadApiKey();
  loadAdvancedSettings();
  
  // Theme initialization
  chrome.storage.local.get(['ivapTheme'], (res) => {
    if (res.ivapTheme === 'light') {
      document.body.classList.add('light-mode');
    }
  });

  if ($('themeToggleBtn')) {
    $('themeToggleBtn').onclick = () => {
      const isLight = document.body.classList.toggle('light-mode');
      chrome.storage.local.set({ ivapTheme: isLight ? 'light' : 'dark' });
    };
  }

  // ─── Document Generators ────────────────────
  async function getSelectedProfileData() {
    const storage = await chrome.storage.local.get(null);
    const key = storage.lastSelectedProfile;
    if (!key) { alert('Please select a profile first!'); return null; }
    return storage[key] || null;
  }

  if ($('popup-doc-cover')) $('popup-doc-cover').onclick = async () => {
    const d = await getSelectedProfileData();
    if (!d) return;
    const name = [d.givenName, d.surname].filter(Boolean).join(' ') || 'APPLICANT';
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const html = `<!DOCTYPE html><html><head><title>Cover Letter - ${name}</title>
    <style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.8;color:#333;position:relative}
    h2{text-align:center;border-bottom:2px solid #333;padding-bottom:10px}
    .sig{margin-top:60px} @media print{body{margin:20px}}</style></head><body>
    ${d.photoBase64 ? `<img src="${d.photoBase64}" style="position:absolute; top:20px; right:20px; width:120px; height:120px; object-fit:cover; border:1px solid #000;">` : ''}
    <h2>COVER LETTER</h2>
    <p style="text-align:right">${today}</p>
    <p>To,<br>The Visa Officer,<br>High Commission of India,<br>Dhaka, Bangladesh.</p>
    <p>Subject: Application for Indian Visa</p>
    <p>Dear Sir/Madam,</p>
    <p>I, <b>${name}</b>, a citizen of Bangladesh, bearing Passport No. <b>${d.passNo || '___________'}</b>, 
    respectfully submit my application for an Indian Visa for the purpose of <b>${d.visa_purpose || 'Tourism'}</b>.</p>
    <p>I am a <b>${d.occupation || 'professional'}</b> by profession and I intend to visit India for a period of 
    <b>${d.duration || 24} months</b>. I assure you that I will abide by all the rules and regulations of the 
    Government of India during my stay and will return to Bangladesh before the expiry of my visa.</p>
    <p>I have attached all the necessary documents with this application for your kind consideration.</p>
    <p>I shall be highly obliged if you kindly grant me the visa at the earliest convenience.</p>
    <p>Yours faithfully,</p>
    <div class="sig"><p>____________________<br><b>${name}</b><br>Passport No: ${d.passNo || '___________'}<br>
    Mobile: ${d.mobile || '___________'}<br>Address: ${d.pres_add1 || '___________'}</p></div>
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 500);
  };

  if ($('popup-doc-noc')) $('popup-doc-noc').onclick = async () => {
    const d = await getSelectedProfileData();
    if (!d) return;
    const name = [d.givenName, d.surname].filter(Boolean).join(' ') || 'APPLICANT';
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const html = `<!DOCTYPE html><html><head><title>NOC - ${name}</title>
    <style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.8;color:#333;position:relative}
    h2{text-align:center;border-bottom:2px solid #333;padding-bottom:10px}
    .sig{margin-top:60px} @media print{body{margin:20px}}</style></head><body>
    ${d.photoBase64 ? `<img src="${d.photoBase64}" style="position:absolute; top:20px; right:20px; width:120px; height:120px; object-fit:cover; border:1px solid #000;">` : ''}
    <h2>NO OBJECTION CERTIFICATE (NOC)</h2>
    <p style="text-align:right">${today}</p>
    <p>To Whom It May Concern,</p>
    <p>This is to certify that <b>${name}</b>, bearing Passport No. <b>${d.passNo || '___________'}</b>, 
    is known to us and is a person of good character and reputation.</p>
    <p>We have no objection to his/her travel to <b>India</b> for the purpose of <b>${d.visa_purpose || 'Tourism'}</b>. 
    All expenses during the stay in India will be borne by the applicant.</p>
    <p>We confirm that we have no objection to the above-mentioned person traveling to India and 
    we assure that he/she will return to Bangladesh after the completion of the visit.</p>
    <p>This certificate is issued upon request of the applicant for the purpose of obtaining an Indian Visa.</p>
    <div class="sig"><p>____________________<br><b>Authorized Signatory</b><br>Date: ${today}</p></div>
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 500);
  };

  if ($('popup-doc-undertaking')) $('popup-doc-undertaking').onclick = async () => {
    const d = await getSelectedProfileData();
    if (!d) return;
    const name = [d.givenName, d.surname].filter(Boolean).join(' ') || 'APPLICANT';
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const html = `<!DOCTYPE html><html><head><title>Medical Undertaking - ${name}</title>
    <style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.8;color:#333;position:relative}
    h2{text-align:center;border-bottom:2px solid #333;padding-bottom:10px}
    .sig{margin-top:60px} @media print{body{margin:20px}}</style></head><body>
    ${d.photoBase64 ? `<img src="${d.photoBase64}" style="position:absolute; top:20px; right:20px; width:120px; height:120px; object-fit:cover; border:1px solid #000;">` : ''}
    <h2>MEDICAL UNDERTAKING</h2>
    <p style="text-align:right">${today}</p>
    <p>To,<br>The Visa Officer,<br>High Commission of India,<br>Dhaka, Bangladesh.</p>
    <p>Subject: Medical Undertaking for Indian Visa Application</p>
    <p>I, <b>${name}</b>, a citizen of Bangladesh, bearing Passport No. <b>${d.passNo || '___________'}</b>, 
    do hereby solemnly declare and undertake as follows:</p>
    <ol>
    <li>I am traveling to India for the purpose of medical treatment.</li>
    <li>I undertake to bear all expenses related to my medical treatment, hospitalization, and stay in India.</li>
    <li>I shall abide by all the rules and regulations of the Government of India during my stay.</li>
    <li>I shall not engage in any activity other than the purpose for which the visa is granted.</li>
    <li>I undertake to leave India upon completion of my medical treatment or before the expiry of my visa, whichever is earlier.</li>
    <li>I understand that any false statement or misrepresentation may result in cancellation of my visa and legal action.</li>
    </ol>
    <div class="sig"><p>____________________<br><b>${name}</b><br>Passport No: ${d.passNo || '___________'}<br>
    Date: ${today}</p></div>
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 500);
  };

  if ($('popup-doc-photo')) $('popup-doc-photo').onclick = async () => {
    const d = await getSelectedProfileData();
    if (!d) return;
    const name = [d.givenName, d.surname].filter(Boolean).join(' ') || 'APPLICANT';
    const html = `<!DOCTYPE html><html><head><title>Photo Attachment - ${name}</title>
    <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.8;color:#333;position:relative}
    h2{text-align:center;border-bottom:2px solid #333;padding-bottom:10px;text-transform:uppercase}
    .box{border:2px dashed #666;width:2in;height:2in;margin:40px auto;display:flex;align-items:center;justify-content:center;text-align:center;color:#666;font-weight:bold;}
    table{width:100%;border-collapse:collapse;margin-top:30px;}
    th,td{border:1px solid #ccc;padding:10px;text-align:left;}
    th{background:#f9f9f9;width:40%;}
    @media print{body{margin:20px}}</style></head><body>
    <h2>PHOTO ATTACHMENT FORM</h2>
    ${d.photoBase64 ? 
        `<div style="text-align:center;margin:40px 0;"><img src="${d.photoBase64}" style="width:2in;height:2in;object-fit:cover;border:1px solid #000;"></div>` : 
        `<div class="box">PASTE 2x2 INCH<br>PHOTOGRAPH HERE</div>`
    }
    <table>
        <tr><th>Name of Applicant</th><td>${name}</td></tr>
        <tr><th>Passport Number</th><td>${d.passNo || ''}</td></tr>
        <tr><th>Visa Category</th><td>${d.visa_purpose || 'Tourism'}</td></tr>
        <tr><th>Date of Birth</th><td>${d.dob || ''}</td></tr>
    </table>
    <div style="margin-top:60px;display:flex;justify-content:space-between;">
        <div>Date: __________________</div>
        <div>Signature: __________________</div>
    </div>
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 500);
  };
});