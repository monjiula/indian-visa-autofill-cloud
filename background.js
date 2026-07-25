/**
 * background.js — Service Worker for Indian Visa Autofill Pro v2.1
 */

import { extractFromPassport } from './gemini.js';

// ─── Initialization ───────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log('[IVAP] Extension installed/updated.');

  // Create Context Menu safely by removing old ones first
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "extract-ivap",
      title: "Extract for Indian Visa (PDF/Image)",
      contexts: ["link", "image"]
    });
  });

  // Create Alarm for Auto-delete (runs once a day)
  chrome.alarms.create("cleanupProfiles", { periodInMinutes: 1440 });
});

// ─── Auto-delete Logic ────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "cleanupProfiles") {
    await runAutoDelete();
  }
});

async function runAutoDelete() {
  const storage = await chrome.storage.local.get(null);
  const autoDeleteDays = parseInt(storage.iv_autoDeleteDays || "0");
  
  if (autoDeleteDays === 0) return; // Feature disabled

  const now = Date.now();
  const maxAgeMs = autoDeleteDays * 24 * 60 * 60 * 1000;
  
  let deletedCount = 0;
  for (const key in storage) {
    if (key.startsWith('BGD_') || key.startsWith('PASSPORT_')) {
      const timestampPart = key.split('_')[1];
      if (timestampPart) {
        const createdTime = parseInt(timestampPart);
        if (now - createdTime > maxAgeMs) {
          await chrome.storage.local.remove(key);
          deletedCount++;
        }
      }
    }
  }

  if (deletedCount > 0) {
    console.log(`[IVAP] Auto-deleted ${deletedCount} old profiles.`);
  }
}

// ─── Context Menu Extraction Logic ────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "extract-ivap") {
    const url = info.linkUrl || info.srcUrl;
    if (!url) return;

    try {
      // Fetch the file
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not fetch the file. It might require login or is blocked.");
      
      const blob = await response.blob();
      const mimeType = blob.type;
      
      // Convert Blob to Base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        await processExtraction(base64data, mimeType, tab.id);
      };
      reader.readAsDataURL(blob);

    } catch (err) {
      console.error("[IVAP] Context menu extraction failed:", err);
      // Optional: Notify user via a content script injection if possible
    }
  }
});

async function processExtraction(base64, mimeType, tabId) {
  const storage = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = storage.geminiApiKey;
  if (!apiKey) {
    console.warn("[IVAP] No API key found for background extraction.");
    return; // Could notify user here
  }

  try {
    // We use extractFromPassport for both images and PDFs in background 
    // because we don't have access to pdf.js easily here. Gemini Vision handles PDFs.
    const extracted = await extractFromPassport(apiKey, base64, mimeType);
    
    const mode = mimeType === 'application/pdf' ? 'BGD' : 'PASSPORT';
    const nameParts = [extracted.givenName, extracted.surname].filter(Boolean);
    const profileName = nameParts.length > 0 ? nameParts.join(' ') : 'New Profile (Web)';

    extracted._type = mode;
    extracted._savedName = profileName;

    const profileKey = `${mode}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    await chrome.storage.local.set({ [profileKey]: extracted });
    await chrome.storage.local.set({ lastSelectedProfile: profileKey });

    console.log(`[IVAP] Successfully extracted via context menu: ${profileName}`);
    
    // Open the side panel for the user to see the result
    if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ tabId });
    }
  } catch (err) {
    console.error("[IVAP] Extraction error:", err);
  }
}