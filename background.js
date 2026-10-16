import { solveCaptcha } from "./gemini.js";

// Ensure local session is always authenticated and active
function ensureAuthenticated() {
  chrome.storage.local.get(["isLoggedIn", "userProfile"], (res) => {
    if (!res.isLoggedIn || !res.userProfile || !res.userProfile.token) {
      chrome.storage.local.set({
        isLoggedIn: true,
        userProfile: {
          name: "Pro User",
          token: "gemini_unlimited_token",
          balance: 999999,
          userId: "gemini_pro"
        }
      });
      console.log("IV Autofill: Unlocked local Pro session.");
    }
  });
}

chrome.runtime.onMessage.addListener((e, t, n) => {
  if (e && "EXECUTE_IN_MAIN_WORLD" === e.type) {
    if (t.tab && t.tab.id) {
      chrome.scripting.executeScript({
        target: { tabId: t.tab.id },
        func: (e, s) => {
          const t = typeof jQuery !== "undefined" ? jQuery : typeof $ !== "undefined" ? $ : null;
          if (t) {
            const n = t("#" + e);
            n.length && n.val(s).trigger("chosen:updated").trigger("change");
          }
        },
        args: [e.id, e.value],
        world: "MAIN"
      }).catch(err => console.error("Error executing script in MAIN world:", err));
    }
    n({ success: true });
    return false;
  }

  if (e && "SOLVE_CAPTCHA" === e.type) {
    solveCaptcha(e.fileData, e.mimeType || "image/png")
      .then(text => n({ ok: true, data: { captchaText: text } }))
      .catch(err => {
        console.warn("IV Autofill: Gemini Captcha Solve notice:", err.message);
        n({ ok: false, error: err.message });
      });
    return true;
  }

  if (e && "FETCH_LAMBDA" === e.type) {
    // Fallback lambda fetcher if ever needed
    fetch(e.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e.payload)
    }).then(async res => {
      const text = await res.text();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (err) {}
      n({ ok: res.ok, status: res.status, data: parsed, rawText: text });
    }).catch(err => {
      n({ ok: false, error: err.message || "Network Error" });
    });
    return true;
  }

  if (e && "REGISTER_DYNAMIC_SCRIPTS" === e.type) {
    registerDynamicScripts().then(() => n({ success: true })).catch(err => n({ success: false, error: err.message }));
    return true;
  }

  if (e && "CHECK_ORIGIN_PERMISSION" === e.type) {
    const origins = e.origin ? [e.origin] : [];
    if (origins.length === 0) {
      n({ granted: true });
      return false;
    }
    chrome.permissions.contains({ origins }).then(granted => n({ granted })).catch(() => n({ granted: false }));
    return true;
  }
});

const dynamicScripts = [
  { id: "iv_dynamic_intl", matches: ["https://indianvisaonline.gov.in/*"], css: ["modal.css"], js: ["html2pdf.bundle.min.js", "content.js"], runAt: "document_end", persistAcrossSessions: true },
  { id: "iv_dynamic_passtrack", matches: ["https://passtrack.net/*", "https://www.passtrack.net/*"], css: ["modal.css"], js: ["html2pdf.bundle.min.js", "content.js"], runAt: "document_end", persistAcrossSessions: true },
  { id: "iv_dynamic_airsuvidha", matches: ["https://airsuvidha.civilaviation.gov.in/*"], css: ["modal.css"], js: ["html2pdf.bundle.min.js", "content.js"], runAt: "document_end", persistAcrossSessions: true },
  { id: "iv_dynamic_traveltax", matches: ["https://billpay.sonalibank.com.bd/*"], css: ["modal.css"], js: ["html2pdf.bundle.min.js", "content.js"], runAt: "document_end", persistAcrossSessions: true },
  { id: "iv_dynamic_porttax", matches: ["https://passenger.blpa.gov.bd/*"], css: ["modal.css"], js: ["html2pdf.bundle.min.js", "content.js"], runAt: "document_end", persistAcrossSessions: true }
];

async function registerDynamicScripts() {
  try {
    const grantedOrigins = (await chrome.permissions.getAll()).origins || [];
    const registered = await chrome.scripting.getRegisteredContentScripts();
    const registeredIds = new Set(registered.map(s => s.id));
    const toRegister = [];

    for (const script of dynamicScripts) {
      const matchFound = script.matches.some(m => {
        const cleanM = m.replace("/*", "");
        return grantedOrigins.some(g => {
          const cleanG = g.replace("/*", "");
          return cleanM.includes(cleanG) || cleanG.includes(cleanM);
        });
      });

      if (matchFound && !registeredIds.has(script.id)) {
        toRegister.push(script);
      }
    }

    if (toRegister.length > 0) {
      await chrome.scripting.registerContentScripts(toRegister);
      console.log("IV Autofill: Registered dynamic scripts for granted origins:", toRegister.map(s => s.id));
    }
  } catch (err) {
    console.warn("IV Autofill: Dynamic script sync notice:", err);
  }
}

chrome.runtime.onInstalled.addListener(e => {
  ensureAuthenticated();
  registerDynamicScripts();
  if (e && ("update" === e.reason || "install" === e.reason)) {
    try {
      chrome.tabs.create({ url: chrome.runtime.getURL("update.html") });
    } catch (err) {
      console.warn("Could not open update tab:", err);
    }
  }
});

chrome.runtime.onStartup.addListener(() => {
  ensureAuthenticated();
  registerDynamicScripts();
});

if (chrome.permissions && chrome.permissions.onAdded) {
  chrome.permissions.onAdded.addListener(registerDynamicScripts);
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if ("complete" === changeInfo.status && tab.url && !tab.url.startsWith("chrome://")) {
    for (const script of dynamicScripts) {
      if (script.matches.some(m => tab.url.startsWith(m.replace("/*", "")))) {
        try {
          if (await chrome.permissions.contains({ origins: script.matches })) {
            await registerDynamicScripts();
            chrome.tabs.sendMessage(tabId, { type: "PING_IV_CONTENT" }, response => {
              if (chrome.runtime.lastError || !response || !response.initialized) {
                chrome.scripting.insertCSS({ target: { tabId }, files: script.css }).catch(() => {});
                chrome.scripting.executeScript({ target: { tabId }, files: script.js }).catch(() => {});
              }
            });
          }
        } catch (err) {
          console.warn("IV Autofill: Tab update handler notice:", err);
        }
      }
    }
  }
});
