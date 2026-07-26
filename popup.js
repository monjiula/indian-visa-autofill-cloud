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