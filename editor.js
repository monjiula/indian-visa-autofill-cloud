import { getProfiles, saveProfile } from "./storage.js";
/**
 * editor.js — Indian Visa Autofill v2.0
 * Handles the profile editing interface.
 */

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const profileKey = urlParams.get("profile");

    if (!profileKey) {
        document.body.innerHTML = '<h2 style="text-align:center; margin-top:50px;">Error: No profile selected. Please open this from the extension popup.</h2>';
        return;
    }

    const titleEl = document.getElementById("profileName");
    const badgeEl = document.getElementById("typeBadge");
    let currentProfileData = {};

    // 1. Load data
    let storage = await chrome.storage.local.get(profileKey);
    
    // Wait for auth to initialize
    await new Promise(r => {
        if (window.auth && window.auth.currentUser) return r();
        if (window.auth) {
            const unsub = window.auth.onAuthStateChanged(user => {
                if (user) { unsub(); r(); }
            });
            setTimeout(() => { unsub(); r(); }, 3000);
        } else {
            r();
        }
    });

    let cloudProfiles = {};
    if (window.auth && window.auth.currentUser) {
        cloudProfiles = await getProfiles();
    }

    if (cloudProfiles[profileKey]) {
        currentProfileData = cloudProfiles[profileKey];
    } else if (storage[profileKey]) {
        currentProfileData = storage[profileKey];
    } else {
        document.body.innerHTML = `<h2 style="text-align:center; margin-top:50px;">Error: Could not load data for ${profileKey}.</h2>`;
        return;
    }
    titleEl.textContent = currentProfileData._savedName || "Unknown Profile";
    
    if (currentProfileData._type) {
        badgeEl.textContent = currentProfileData._type === 'BGD' ? '📄 BGD PDF' : '🛂 PASSPORT';
    }

    // 2. Populate fields
    const inputs = document.querySelectorAll("input:not([type='file']), select, textarea");
    inputs.forEach(input => {
        if (input.id && currentProfileData.hasOwnProperty(input.id)) {
            input.value = currentProfileData[input.id];
            updateValidationIndicator(input);
        }

        // Add validation on input
        if (input.type !== 'hidden') {
            input.addEventListener('input', () => updateValidationIndicator(input));
        }
    });

    // 2.5 Photo logic
    const photoInput = document.getElementById("photoInput");
    const photoPreview = document.getElementById("photoPreview");
    const photoBase64 = document.getElementById("photoBase64");

    if (currentProfileData.photoBase64) {
        photoPreview.src = currentProfileData.photoBase64;
        photoPreview.style.display = 'block';
    }

    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64Str = event.target.result;
                photoBase64.value = base64Str;
                photoPreview.src = base64Str;
                photoPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });
    }

    // 3. Validation Logic
    function updateValidationIndicator(input) {
        // Remove existing dot
        const existingDot = input.parentElement.querySelector('.status-dot');
        if (existingDot) existingDot.remove();

        const dot = document.createElement('div');
        dot.className = 'status-dot';

        if (!input.value || input.value.trim() === '' || input.value.trim().toUpperCase() === 'NILL') {
            dot.classList.add('empty');
            dot.title = "Empty or NILL value";
        } else {
            dot.classList.add('valid');
            dot.title = "Valid value";
        }
        
        input.parentElement.appendChild(dot);
    }

    // 4. Save Logic
    async function saveChanges() {
        const statusTop = document.getElementById("statusTextTop");
        const statusBottom = document.getElementById("statusTextBottom");
        
        statusTop.textContent = "Saving...";
        statusBottom.textContent = "Saving...";
        statusTop.className = "status-saving";
        statusBottom.className = "status-saving";

        let newData = { ...currentProfileData };
        
        inputs.forEach(input => {
            if (input.id) {
                if (input.id === 'photoBase64') {
                    newData[input.id] = input.value; // Don't uppercase base64
                } else {
                    newData[input.id] = input.value.toUpperCase();
                    input.value = newData[input.id]; // force uppercase in UI
                }
            }
        });

        // Update saved name if name changed
        const nameParts = [newData.givenName, newData.surname].filter(Boolean);
        if (nameParts.length > 0) {
            newData._savedName = nameParts.join(' ');
            titleEl.textContent = newData._savedName;
        }

        if (window.auth && window.auth.currentUser) {
            await saveProfile(profileKey, newData);
        } else {
            await chrome.storage.local.set({ [profileKey]: newData });
        }
        currentProfileData = newData;

        statusTop.textContent = "✅ Saved!";
        statusBottom.textContent = "✅ Saved!";
        statusTop.className = "status-success";
        statusBottom.className = "status-success";

        setTimeout(() => {
            statusTop.textContent = "";
            statusBottom.textContent = "";
        }, 2500);
    }

    document.getElementById("saveButtonTop").addEventListener("click", saveChanges);
    document.getElementById("saveButtonBottom").addEventListener("click", saveChanges);

    // 5. Copy Profile Logic
    document.getElementById("copyButton").addEventListener("click", async () => {
        const type = currentProfileData._type || 'PASSPORT';
        const newKey = `${type}_${Date.now()}`;
        
        let copiedData = { ...currentProfileData };
        copiedData._savedName = `${copiedData._savedName} (Copy)`;
        
        await chrome.storage.local.set({ [newKey]: copiedData });
        
        // Redirect to new profile editor
        window.location.href = `editor.html?profile=${newKey}`;
    });
});