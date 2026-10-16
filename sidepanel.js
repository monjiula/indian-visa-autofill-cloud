function extractVisaDetailsFromText(text) {
  if (!text) return {};
  const res = {};
  const exitMatch = text.match(/Port\s*of\s*Exit\s+([A-Za-z0-9\/\(\)\s\-]+?)(?=\s*(?:Required|Application|Places|Purpose|F\.|Previous|$))/i);
  if (exitMatch) res.exitpoint = exitMatch[1].trim().replace(/\s+/g, ' ');

  const entryMatch = text.match(/Port\s*Of\s*Arrival\s+([A-Za-z0-9\/\(\)\s\-]+?)(?=\s*Port\s*of\s*Exit)/i);
  if (entryMatch) res.entrypoint = entryMatch[1].trim().replace(/\s+/g, ' ');

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
 * sidepanel.js — Indian Visa Autofill v2.0
 */

import { getDocument, GlobalWorkerOptions } from './build/pdf.mjs';
import { extractFromBGDText, extractFromPassport, testApiKey } from './gemini.js';
import { getProfiles, saveProfile, deleteProfile } from './storage.js';

GlobalWorkerOptions.workerSrc = './build/pdf.worker.mjs';
const $ = (id) => document.getElementById(id);

let currentMode = 'BGD';
let allProfilesCache = [];
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

            loadProfiles(currentMode, false);
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
                $('authError').style.color = '#10b981';
            })
            .catch(err => {
                $('authError').innerText = err.message;
                $('authError').style.display = 'block';
                $('authError').style.color = '#ef4444';
            });
    };

    $('logoutBtn').onclick = () => auth.signOut();
    
    $('adminBtn').onclick = () => {
        chrome.tabs.create({ url: 'admin.html' });
    };
}

// ─── Search & UI State ────────────────────────────────────────

$('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderProfileList(allProfilesCache, q);
});

function showHiddenView(show) {
  if (show) {
    $('main-content').classList.add('hidden');
    $('hidden-view').classList.remove('hidden');
    loadProfiles(currentMode, true);
  } else {
    $('hidden-view').classList.add('hidden');
    $('main-content').classList.remove('hidden');
    loadProfiles(currentMode, false);
  }
}

function switchMode(mode) {
  currentMode = mode;
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
  const localPrefs = await chrome.storage.local.get(['lastSelectedProfile']);
  const selectedKey = localPrefs.lastSelectedProfile;
  const cloudProfiles = await getProfiles();
  
  allProfilesCache = [];

  Object.keys(cloudProfiles).forEach((key) => {
    const profile = cloudProfiles[key];
    if (profile._type !== mode) return;
    const isHidden = profile._isHidden === true;
    if (showHidden && !isHidden) return;
    if (!showHidden && isHidden) return;

    allProfilesCache.push({ key, data: profile, selected: key === selectedKey });
  });

  const query = $('searchInput')?.value.toLowerCase() || '';
  renderProfileList(allProfilesCache, query, showHidden);
}

function renderProfileList(profiles, query = '', isHiddenView = false) {
  const listEl = $(isHiddenView ? 'hiddenProfileList' : 'profileList');
  if (!listEl) return;
  listEl.innerHTML = '';

  const filtered = profiles.filter(p => (p.data._savedName || '').toLowerCase().includes(query));

  filtered.forEach(p => {
    const item = document.createElement('div');
    item.className = 'profile-item';
    item.dataset.key = p.key;
    if (p.selected && !isHiddenView) item.classList.add('selected');

    let actionsHTML = isHiddenView
      ? '<button class="show-btn" title="Restore">Show</button><button class="del-btn" title="Delete">Del</button>'
      : '<button class="edit-btn" title="Edit">Edit</button><button class="rename-btn" title="Rename">Rename</button><a class="export-btn" title="Export" download>Exp</a><button class="hide-btn" title="Hide">Hide</button><button class="del-btn" title="Delete">Del</button>';

    item.innerHTML = `
      <span style="flex-grow:1; font-weight:500;">${p.data._savedName || 'Unknown'}</span>
      <div class="profile-actions">${actionsHTML}</div>
    `;

    if (!isHiddenView) {
      item.addEventListener('click', async (e) => {
        if (e.target.tagName !== 'BUTTON' && !e.target.classList.contains('export-btn')) {
          document.querySelectorAll('.profile-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          await chrome.storage.local.set({ lastSelectedProfile: p.key });
        }
      });
    }

    const editBtn = item.querySelector('.edit-btn');
    if (editBtn) editBtn.onclick = () => chrome.tabs.create({ url: `editor.html?profile=${encodeURIComponent(p.key)}` });

    const renameBtn = item.querySelector('.rename-btn');
    if (renameBtn) {
      renameBtn.onclick = async () => {
        const newName = prompt('Enter new profile name:', p.data._savedName);
        if (newName && newName !== p.data._savedName) {
          const updated = { ...p.data, _savedName: newName };
          const newKey = `${currentMode}_${Date.now()}`;
          await saveProfile(newKey, updated);
          await deleteProfile(p.key);
          const localPrefs = await chrome.storage.local.get(['lastSelectedProfile']);
          if (p.key === localPrefs.lastSelectedProfile) await chrome.storage.local.set({ lastSelectedProfile: newKey });
          loadProfiles(currentMode, false);
        }
      };
    }

    const exportBtn = item.querySelector('.export-btn');
    if (exportBtn) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(p.data));
      exportBtn.setAttribute("href", dataStr);
      exportBtn.setAttribute("download", `${p.data._savedName || 'Profile'}.json`);
    }

    const hideBtn = item.querySelector('.hide-btn');
    if (hideBtn) {
      hideBtn.onclick = async () => {
        const updated = { ...p.data, _isHidden: true };
        await saveProfile(p.key, updated);
        const localPrefs = await chrome.storage.local.get(['lastSelectedProfile']);
        if (p.key === localPrefs.lastSelectedProfile) await chrome.storage.local.remove('lastSelectedProfile');
        loadProfiles(currentMode, false);
      };
    }

    const showBtn = item.querySelector('.show-btn');
    if (showBtn) {
      showBtn.onclick = async () => {
        const updated = { ...p.data, _isHidden: false };
        await saveProfile(p.key, updated);
        loadProfiles(currentMode, true);
      };
    }

    item.querySelector('.del-btn').onclick = async () => {
      if (confirm('Delete permanently?')) {
        await deleteProfile(p.key);
        const localPrefs = await chrome.storage.local.get(['lastSelectedProfile']);
        if (p.key === localPrefs.lastSelectedProfile) await chrome.storage.local.remove('lastSelectedProfile');
        loadProfiles(currentMode, isHiddenView);
      }
    };

    listEl.appendChild(item);
  });

  if (filtered.length === 0) {
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
      if (vDetails.exitpoint && (!extracted.exitpoint || extracted.exitpoint === "NILL")) extracted.exitpoint = vDetails.exitpoint;
      if (vDetails.entrypoint && (!extracted.entrypoint || extracted.entrypoint === "NILL")) extracted.entrypoint = vDetails.entrypoint;
      if (vDetails.visa_entry_id && (!extracted.visa_entry_id || extracted.visa_entry_id === "NILL")) extracted.visa_entry_id = vDetails.visa_entry_id;
      if (vDetails.duration && (!extracted.duration || extracted.duration === "NILL")) extracted.duration = vDetails.duration;
      if (vDetails.jouryney_id && (!extracted.jouryney_id || extracted.jouryney_id === "NILL")) extracted.jouryney_id = vDetails.jouryney_id;
      if (vDetails.places_to_visit && (!extracted.places_to_visit || extracted.places_to_visit === "NILL")) extracted.places_to_visit = vDetails.places_to_visit;
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
    if (!tab) return showStatus('No active tab to autofill.', 'error');

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }, () => {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'FILL_FORM', 
        data: profileData,
        fillMissingOnly: $('fillMissingOnly')?.checked || false
      });
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

// ─── Sync with other views ────────────────────────────────────

// Prevent infinite update loops by debouncing sync updates
let syncTimeout = null;
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    // Only reload if relevant profiles or settings changed
    const hasRelevantChanges = Object.keys(changes).some(k => !k.startsWith('ga_'));
    if (hasRelevantChanges) {
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            loadProfiles(currentMode, !$('hidden-view').classList.contains('hidden'));
        }, 300);
    }
  }
});

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
        loadProfiles(currentMode, false);
      }
    };
  }
}

// ─── Initialize ───────────────────────────────────────────────

function loadTempIds() {
  chrome.storage.local.get(['iv_temp_ids']).then(res => {
    const ids = res.iv_temp_ids || [];
    const container = $('tempIdList');
    if (!container) return; // In case sidepanel doesn't have it
    if (ids.length === 0) {
      container.innerHTML = '<div style="text-align:center; color:#9ca3af; font-size:11px; padding:10px;">No IDs found yet. Fill a form to track.</div>';
      return;
    }
    container.innerHTML = '';
    ids.forEach(item => {
      const div = document.createElement('div');
      div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding: 6px 8px; background: rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 4px; font-size: 11px;";
      div.innerHTML = `
        <div>
          <strong style="color:#c4b5fd;">${item.id}</strong><br>
          <span style="color:#9ca3af; font-size:9px;">${item.date}</span>
        </div>
        <button class="copy-id-btn" data-id="${item.id}" style="padding:4px 8px; font-size:10px; background:#4f46e5; border:none; border-radius:4px; color:white; cursor:pointer;">Copy</button>
      `;
      container.appendChild(div);
    });

    // Add copy listeners
    document.querySelectorAll('.copy-id-btn').forEach(btn => {
      btn.onclick = () => {
        navigator.clipboard.writeText(btn.getAttribute('data-id'));
        const originalText = btn.innerText;
        btn.innerText = "Copied!";
        btn.style.background = "#10b981";
        setTimeout(() => {
          btn.innerText = originalText;
          btn.style.background = "#4f46e5";
        }, 1500);
      };
    });
  });
}

// Watch for changes to update instantly if new temp ID added while panel is open
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.iv_temp_ids) {
        loadTempIds();
  setupAdditionalServices();
    }
});

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

  let mode = (await chrome.storage.local.get(['lastServiceMode'])).lastServiceMode || 'BGD';
  currentMode = mode;
  updateToggleUI(mode);
  loadProfiles(mode);
  loadApiKey();
  loadAdvancedSettings();
  loadTempIds();
});

// ─── V10.0 Additional Services & Automation Handlers ─────────

function setupAdditionalServices() {
  const capModal = $('captchaControlModal');
  const addModal = $('additionalServicesModal');

  if ($('openCaptchaControlBtn')) {
    $('openCaptchaControlBtn').onclick = () => {
      if (capModal) { capModal.classList.remove('hidden'); capModal.style.display = 'flex'; }
    };
  }
  const closeCap = () => { if (capModal) { capModal.classList.add('hidden'); capModal.style.display = 'none'; } };
  if ($('closeCaptchaModalBtn')) $('closeCaptchaModalBtn').onclick = closeCap;
  if ($('doneCaptchaModalBtn')) $('doneCaptchaModalBtn').onclick = closeCap;

  if ($('openAdditionalServicesBtn')) {
    $('openAdditionalServicesBtn').onclick = () => {
      if (addModal) { addModal.classList.remove('hidden'); addModal.style.display = 'flex'; }
    };
  }
  const closeAdd = () => { if (addModal) { addModal.classList.add('hidden'); addModal.style.display = 'none'; } };
  if ($('closeAdditionalServicesModalBtn')) $('closeAdditionalServicesModalBtn').onclick = closeAdd;
  if ($('doneAdditionalServicesModalBtn')) $('doneAdditionalServicesModalBtn').onclick = closeAdd;

  // Temp IDs View toggle
  if ($('viewTempIdsBtn')) {
    $('viewTempIdsBtn').onclick = () => {
      $('main-content').classList.add('hidden');
      $('temp-ids-view').classList.remove('hidden');
      renderTempIdsList();
    };
  }
  if ($('backFromTempIdsBtn')) {
    $('backFromTempIdsBtn').onclick = () => {
      $('temp-ids-view').classList.add('hidden');
      $('main-content').classList.remove('hidden');
    };
  }

  // Toggles
  chrome.storage.local.get(['autoStartupCaptchaEnabled', 'autoGeneralCaptchaEnabled', 'autoFillPopupEnabled']).then(res => {
    if ($('autoStartupCaptchaToggle')) $('autoStartupCaptchaToggle').checked = res.autoStartupCaptchaEnabled !== false;
    if ($('autoGeneralCaptchaToggle')) $('autoGeneralCaptchaToggle').checked = res.autoGeneralCaptchaEnabled !== false;
    if ($('modalAutoFillPopupToggle')) $('modalAutoFillPopupToggle').checked = res.autoFillPopupEnabled !== false;
  });

  if ($('autoStartupCaptchaToggle')) $('autoStartupCaptchaToggle').onchange = (e) => chrome.storage.local.set({ autoStartupCaptchaEnabled: e.target.checked });
  if ($('autoGeneralCaptchaToggle')) $('autoGeneralCaptchaToggle').onchange = (e) => chrome.storage.local.set({ autoGeneralCaptchaEnabled: e.target.checked });
  if ($('modalAutoFillPopupToggle')) $('modalAutoFillPopupToggle').onchange = (e) => chrome.storage.local.set({ autoFillPopupEnabled: e.target.checked });

  // Wizard triggers
  const triggerWizard = (name) => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab) chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_WIZARD', wizard: name }, () => {});
    });
  };

  if ($('asCoverLetterBtn')) $('asCoverLetterBtn').onclick = () => { closeAdd(); triggerWizard('cover_letter'); };
  if ($('asNocBtn')) $('asNocBtn').onclick = () => { closeAdd(); triggerWizard('noc'); };
  if ($('asUndertakingBtn')) $('asUndertakingBtn').onclick = () => { closeAdd(); triggerWizard('undertaking'); };

  // Portal navigation helpers
  const openPortal = async (matchDomain, targetUrl, triggerMsg, storageFlag, permissions) => {
    closeAdd();
    if (storageFlag) await chrome.storage.local.set({ [storageFlag]: Date.now() });
    if (permissions && permissions.length > 0) {
      try {
        const has = await chrome.permissions.contains({ origins: permissions });
        if (!has) await chrome.permissions.request({ origins: permissions });
        await chrome.runtime.sendMessage({ type: "REGISTER_DYNAMIC_SCRIPTS" });
      } catch (e) {}
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes(matchDomain)) {
      if (triggerMsg) chrome.tabs.sendMessage(tab.id, { type: triggerMsg }, () => {});
      else chrome.tabs.update(tab.id, { url: targetUrl });
    } else {
      chrome.tabs.create({ url: targetUrl });
    }
  };

  if ($('asStatusCheckBtn')) $('asStatusCheckBtn').onclick = () => openPortal('indianvisaonline.gov.in', 'https://indianvisaonline.gov.in/visa/', 'TRIGGER_STATUS_CHECK', 'autoOpenStatusModal', ['https://indianvisaonline.gov.in/*']);
  if ($('asResumeAppBtn')) $('asResumeAppBtn').onclick = () => openPortal('indianvisa-bangladesh.nic.in', 'https://indianvisa-bangladesh.nic.in/', 'TRIGGER_RESUME_MODAL', 'autoOpenResumeModal', null);
  if ($('asBgdDownloadBtn')) $('asBgdDownloadBtn').onclick = () => openPortal('indianvisa-bangladesh.nic.in', 'https://indianvisa-bangladesh.nic.in/', 'TRIGGER_PRINT_MODAL', 'autoOpenBgdDownloadModal', null);
  if ($('asEArrivalBtn')) $('asEArrivalBtn').onclick = () => openPortal('indianvisaonline.gov.in', 'https://indianvisaonline.gov.in/earrival/', 'TRIGGER_EARRIVAL_MODAL', 'autoOpenEArrivalModal', ['https://indianvisaonline.gov.in/*']);
  if ($('asAirSuvidhaBtn')) $('asAirSuvidhaBtn').onclick = () => openPortal('airsuvidha.civilaviation.gov.in', 'https://airsuvidha.civilaviation.gov.in/', 'TRIGGER_AIRSUVIDHA_MODAL', 'autoOpenAirSuvidhaModal', ['https://airsuvidha.civilaviation.gov.in/*']);
  if ($('asTravelTaxBtn')) $('asTravelTaxBtn').onclick = () => openPortal('billpay.sonalibank.com.bd', 'https://billpay.sonalibank.com.bd/nbrTravelTax/Collection/Create', 'TRIGGER_TRAVELTAX_MODAL', 'autoOpenTravelTaxModal', ['https://billpay.sonalibank.com.bd/*']);
  if ($('asPortTaxBtn')) $('asPortTaxBtn').onclick = () => openPortal('passenger.blpa.gov.bd', 'https://passenger.blpa.gov.bd/', 'TRIGGER_PORTTAX_MODAL', 'autoOpenPortTaxModal', ['https://passenger.blpa.gov.bd/*']);
}

async function renderTempIdsList() {
  const container = $('tempIdsList');
  if (!container) return;
  container.innerHTML = '';
  const res = await chrome.storage.local.get(['recentTempIds']);
  const items = res.recentTempIds || [];
  if (items.length === 0) {
    container.innerHTML = '<div style="padding:10px;text-align:center;color:#94a3b8">No Temporary IDs saved yet.</div>';
    return;
  }
  items.forEach(t => {
    if (!t || !t.id) return;
    const isBgd = String(t.id).toUpperCase().startsWith('BGD');
    const div = document.createElement('div');
    div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; margin-bottom: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;";
    div.innerHTML = `
      <div>
        <div style="font-weight:700; color:${isBgd ? '#34d399' : '#f87171'};">${t.id}</div>
        <div style="font-size:10px; color:#94a3b8;">${t.name || ''} ${t.passport ? '(' + t.passport + ')' : ''}</div>
      </div>
      <button class="btn" style="padding:4px 8px; font-size:10px; width:auto; background:#4f46e5;">Copy</button>
    `;
    div.querySelector('button').onclick = () => {
      navigator.clipboard.writeText(t.id);
      div.querySelector('button').innerText = 'Copied!';
      setTimeout(() => div.querySelector('button').innerText = 'Copy', 1200);
    };
    container.appendChild(div);
  });
}
