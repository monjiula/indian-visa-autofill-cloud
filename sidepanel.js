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
  let extracted;
  if (mode === 'BGD') {
    if (file.type !== 'application/pdf') throw new Error('Only PDF supported for BGD mode.');
    const arrayBuf = await file.arrayBuffer();
    const pdfDoc = await getDocument(new Uint8Array(arrayBuf)).promise;
    let fullText = '';
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ');
    }
    
    if (fullText.trim().length > 0) {
      extracted = await extractFromBGDText(apiKey, fullText);
    } else {
      const base64 = await fileToBase64(file);
      extracted = await extractFromPassport(apiKey, base64, 'application/pdf');
    }
  } else if (mode === 'PASSPORT') {
    const base64 = await fileToBase64(file);
    extracted = await extractFromPassport(apiKey, base64, file.type);
  }

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