/**
 * content.js — Indian Visa Autofill v2.0
 * Injected into indianvisa-bangladesh.nic.in to fill the form.
 */

if (!window.IV_AUTOFILL_INJECTED) {
window.IV_AUTOFILL_INJECTED = true;

// Custom hotel dictionary
const HOTELS = {
    DELHI: { name: "VISHAL HOTEL", add1: "1576 MAIN BAZAR ROAD, PAHARGANJ", add2_pincode: "110021", state: "DELHI", district: "NEW DELHI", phone: "919560640328" },
    KOLKATA: { name: "The Park Hotel", add1: "17, Park St, Taltala", add2_pincode: "700016", state: "WEST BENGAL", district: "KOLKATA", phone: "913322499000" },
    CHENNAI: { name: "The Park Chennai", add1: "601, Anna Salai, Tirumurthy Nagar, Nungambakkam", add2_pincode: "600006", state: "TAMIL NADU", district: "CHENNAI", phone: "914442676000" },
    BANGALORE: { name: "GREENS RESIDENCY", add1: "118, KALASIPALYA MAIN RD, OPPOSITE AYYAPPASWAMY TEMPLE, KALASIPALYA", add2_pincode: "560002", state: "KARNATAKA", district: "BANGALORE", phone: "918026703912" },
    MUMBAI: { name: "Hotel Golden Crown", add1: "Road No. 3, Tank View, Sahar Village, Andheri East", add2_pincode: "400099", state: "MAHARASHTRA", district: "MUMBAI", phone: "91 91524 32787" },
    "EMBASSY-BULGARIA": { name: "Embassy of Bulgaria", add1: "E P16/17, Chandra Gupta Marg, Chanakyapuri", add2_pincode: "110021", state: "DELHI", district: "NEW DELHI", phone: "91 11 2611 5550" }
};

let filledFieldsCount = 0;
let totalFieldsCount = 0;

console.log("IV Autofill: content.js loaded.");

/**
 * Utility to show a floating toast message for status.
 */
function showToast(message, type = 'info') {
    let toast = document.getElementById('iv-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'iv-toast';
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 999999;
            padding: 12px 20px; border-radius: 8px; font-family: sans-serif;
            font-size: 14px; font-weight: bold; color: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
    }
    toast.style.backgroundColor = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6');
    toast.innerHTML = message;
    
    setTimeout(() => {
        if (toast) toast.style.opacity = '0';
        setTimeout(() => toast && toast.remove(), 300);
    }, 4000);
}

let fillMissingOnly = false;

/**
 * Fills a text input field safely.
 */
function fillText(id, value) {
    if (!value || value === 'NILL') return;
    const el = document.getElementById(id);
    if (el) {
        if (fillMissingOnly && el.value.trim() !== '' && el.value.trim() !== '0' && el.value.trim() !== 'Select') {
            console.log(`- Skipping Text Field #${id} (Fill Missing Only is ON and field is not empty)`);
            return;
        }

        totalFieldsCount++;
        console.log(`- Filling Text Field #${id} with value: ${value}`);
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        filledFieldsCount++;
        highlightField(el);
    }
}

/**
 * Fuzzy matches and selects a dropdown option.
 */
function fillSelect(id, value, silent = false) {
    if (!value || value === 'NILL') return false;
    const el = document.getElementById(id);
    if (!el) return false;
    
    if (fillMissingOnly && el.value && el.value.trim() !== '' && el.value.trim() !== '0' && el.options?.[el.selectedIndex]?.text !== 'Select') {
        console.log(`- Skipping Dropdown #${id} (Fill Missing Only is ON and field is selected)`);
        return true;
    }

    totalFieldsCount++;
    let matched = false;
    
    // 1. Try exact value match
    for (let i = 0; i < (el.options || []).length; i++) {
        const option = el.options[i];
        if (option.value === value) {
            el.value = option.value;
            el.selectedIndex = i;
            option.selected = true;
            matched = true;
            break;
        }
    }
    
    // 2. Try exact text match (case-insensitive)
    if (!matched) {
        for (let i = 0; i < (el.options || []).length; i++) {
            const option = el.options[i];
            if (option.text.toUpperCase() === String(value).toUpperCase()) {
                el.value = option.value;
                el.selectedIndex = i;
                option.selected = true;
                matched = true;
                break;
            }
        }
    }

    // 3. Try fuzzy/includes text match (e.g., "KOLKATA" matches "KOLKATA (CCU)")
    if (!matched) {
        for (let i = 0; i < (el.options || []).length; i++) {
            const option = el.options[i];
            if (option.text.toUpperCase().includes(String(value).toUpperCase()) || 
                String(value).toUpperCase().includes(option.text.toUpperCase())) {
                el.value = option.value;
                el.selectedIndex = i;
                option.selected = true;
                matched = true;
                break;
            }
        }
    }

    if (matched) {
        console.log(`- Setting Dropdown #${id} to: ${value}`);
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        
        // Break out of isolated extension world logic removed due to CSP violations.
        // Native event dispatching above is sufficient for modern browsers.

        filledFieldsCount++;
        highlightField(el);
        return true;
    } else {
        if (!silent) {
            console.warn(`   -> Could not find option "${value}" in dropdown #${id}`);
        }
        return false;
    }
}

/**
 * Waits for a select to populate, then fills it.
 */
async function fillSelectWait(id, value, timeoutMs = 2500, silent = false) {
    if (!value || value === 'NILL') return false;
    await waitForSelectPopulate(id, value, timeoutMs);
    return fillSelect(id, value, silent);
}

/**
 * Clicks a radio button by name and value.
 */
function fillRadio(name, value) {
    if (!value) return;
    const els = document.querySelectorAll(`input[name="${name}"]`);
    
    if (fillMissingOnly) {
        let isAnyChecked = false;
        els.forEach(el => { if (el.checked) isAnyChecked = true; });
        if (isAnyChecked) {
            console.log(`- Skipping Radio Group ${name} (Fill Missing Only is ON and an option is checked)`);
            return;
        }
    }

    if (els.length > 0) totalFieldsCount++;
    
    els.forEach(el => {
        if (el.value.toUpperCase() === String(value).toUpperCase()) {
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('click', { bubbles: true }));
            filledFieldsCount++;
            highlightField(el.parentElement);
        }
    });
}

/**
 * Waits for a dropdown to populate via AJAX using MutationObserver.
 */
function waitForSelectPopulate(id, targetValue, timeoutMs = 4000) {
    return new Promise((resolve) => {
        const el = document.getElementById(id);
        if (!el) return resolve();
        
        // If it already has the option
        for (const opt of Array.from(el.options || [])) {
            if (opt.text.toUpperCase().includes(targetValue.toUpperCase()) || String(opt.value).toUpperCase() === String(targetValue).toUpperCase()) {
                return resolve();
            }
        }

        let timeout;
        const observer = new MutationObserver(() => {
            for (const opt of Array.from(el.options || [])) {
                if (opt.text.toUpperCase().includes(targetValue.toUpperCase()) || String(opt.value).toUpperCase() === String(targetValue).toUpperCase()) {
                    clearTimeout(timeout);
                    observer.disconnect();
                    resolve();
                }
            }
        });

        observer.observe(el, { childList: true });

        timeout = setTimeout(() => {
            console.warn(`Timeout waiting for ${targetValue} in ${id}`);
            observer.disconnect();
            resolve();
        }, timeoutMs);
    });
}

function highlightField(el) {
    if (el) el.style.border = '2px solid #10b981';
}

/**
 * Handle Hotel Modal Selection
 */
async function openHotelSelector(data) {
    if (document.getElementById("iv-modal-backdrop")) return;

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("modal.css");
    document.head.appendChild(link);

    // Get custom hotels
    const storage = await chrome.storage.local.get(["iv_custom_hotels"]);
    const customHotels = storage.iv_custom_hotels || [];

    const modal = document.createElement("div");
    modal.id = "iv-modal-backdrop";

    let optionsHTML = "";
    Object.keys(HOTELS).forEach(key => {
        optionsHTML += `<button class="btn-default" data-key="${key}">${key}</button>`;
    });

    if (customHotels.length > 0) {
        optionsHTML += '<div style="margin: 15px 0 5px 0; border-top: 1px dashed #ccc; padding-top:10px; font-size:11px; color:#777; font-weight:bold; text-align:left;">MY SAVED LOCATIONS</div>';
        customHotels.forEach((hotel, idx) => {
            let name = hotel.name ? hotel.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") : '';
            optionsHTML += `
                <div class="custom-hotel-wrapper">
                    <button class="btn-custom" data-index="${idx}">${name}</button>
                    <div class="btn-delete-custom" data-index="${idx}" title="Delete">×</div>
                </div>`;
        });
    }

    optionsHTML += '<button id="btn-add-new-hotel" class="btn-add-new">+ Add New Hotel/Embassy</button>';

    modal.innerHTML = `
        <div id="iv-modal-content">
            <h3>Select Reference</h3>
            <div class="iv-modal-options">
                ${optionsHTML}
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Event listeners
    modal.querySelectorAll(".btn-default").forEach(btn => {
        btn.addEventListener("click", () => applyHotel(HOTELS[btn.dataset.key]));
    });

    modal.querySelectorAll(".btn-custom").forEach(btn => {
        btn.addEventListener("click", () => applyHotel(customHotels[btn.dataset.index]));
    });

    modal.querySelectorAll(".btn-delete-custom").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (confirm("Delete this saved location permanently?")) {
                const idx = parseInt(btn.dataset.index);
                customHotels.splice(idx, 1);
                await chrome.storage.local.set({ iv_custom_hotels: customHotels });
                modal.remove();
                openHotelSelector(data);
            }
        });
    });

    // Handle closing
    modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });

    // Handle add new
    const addBtn = document.getElementById("btn-add-new-hotel");
    if (addBtn) addBtn.addEventListener("click", () => {
        modal.remove();
        showAddNewHotelForm();
    });
}

async function showAddNewHotelForm() {
    let statesDistricts = [];
    try {
        const url = chrome.runtime.getURL("states-and-districts.json");
        const resp = await fetch(url);
        const data = await resp.json();
        statesDistricts = data.states;
    } catch (e) {
        alert("Error loading states data.");
        return;
    }

    const modal = document.createElement("div");
    modal.id = "iv-modal-backdrop";
    modal.innerHTML = `
        <div id="iv-modal-content" style="width: 450px;">
            <h3>Add New Reference</h3>
            <div class="iv-modal-form">
                <div class="iv-input-group"><label>Reference Name*</label><input type="text" id="new-name" placeholder="e.g. VISHAL HOTEL"></div>
                <div class="iv-input-group"><label>Address*</label><input type="text" id="new-addr" placeholder="e.g. 1576 MAIN BAZAR"></div>
                <div class="iv-input-group"><label>State*</label><select id="new-state"><option value="">Select State</option></select></div>
                <div class="iv-input-group"><label>District*</label><select id="new-dist"><option value="">Select District</option></select></div>
                <div class="iv-input-group"><label>Phone*</label><input type="text" id="new-phone" placeholder="e.g. 91956040328"></div>
                <div class="iv-input-group"><label>Pincode</label><input type="text" id="new-pin" placeholder="e.g. 110021"></div>
                <div class="iv-action-row">
                    <button class="btn-cancel" id="btn-cancel-add">Cancel</button>
                    <button class="btn-save" id="btn-save-hotel">Save & Select</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const stateSel = document.getElementById("new-state");
    const distSel = document.getElementById("new-dist");

    statesDistricts.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.state;
        opt.text = s.state.toUpperCase();
        stateSel.appendChild(opt);
    });

    stateSel.addEventListener("change", () => {
        distSel.innerHTML = '<option value="">Select District</option>';
        const found = statesDistricts.find(s => s.state === stateSel.value);
        if (found) {
            found.districts.forEach(d => {
                const opt = document.createElement("option");
                opt.value = d;
                opt.text = d.toUpperCase();
                distSel.appendChild(opt);
            });
        }
    });

    document.getElementById("btn-save-hotel").addEventListener("click", async () => {
        const h = {
            name: document.getElementById("new-name").value.toUpperCase(),
            add1: document.getElementById("new-addr").value.toUpperCase(),
            state: stateSel.options[stateSel.selectedIndex].text,
            district: document.getElementById("new-dist").value.toUpperCase(),
            phone: document.getElementById("new-phone").value,
            add2_pincode: document.getElementById("new-pin").value
        };
        if (!h.name || !h.state || !h.district || h.state === "Select State") {
            return alert("Please fill all required fields.");
        }
        const storage = await chrome.storage.local.get(["iv_custom_hotels"]);
        const arr = storage.iv_custom_hotels || [];
        arr.push(h);
        await chrome.storage.local.set({ iv_custom_hotels: arr });
        modal.remove();
        applyHotel(h);
    });

    document.getElementById("btn-cancel-add").addEventListener("click", () => {
        modal.remove();
        openHotelSelector();
    });
}

async function applyHotel(hotel) {
    if (!hotel) return;
    const modal = document.getElementById("iv-modal-backdrop");
    if (modal) modal.remove();

    try {
        if (document.getElementById("nameofsponsor_ind")) {
            // Reference Form
            fillText("nameofsponsor_ind", hotel.name);
            fillText("add1ofsponsor_ind", hotel.add1);
            fillText("add2ofsponsor_ind", hotel.add2_pincode);
            fillText("phoneofsponsor_ind", hotel.phone);
            fillSelect("stateofsponsor_ind", hotel.state);
            await fillSelectWait("districtofsponsor_ind", hotel.district);
        } 
        
        let placeOfStayHandled = false;
        
        if (document.getElementById("place_of_stay1") || document.getElementById("pos_state_id1")) {
            // Place of Stay Form
            fillText("place_of_stay1", hotel.name);
            fillText("pos_address1", hotel.add1 + ", " + hotel.add2_pincode);
            fillText("pos_phone1", hotel.phone);
            fillSelect("pos_state_id1", hotel.state);
            await fillSelectWait("pos_dist_id1", hotel.district);
            placeOfStayHandled = true;
        }

        // Fallback for new/unknown Visit Details pages
        if (!placeOfStayHandled) {
            const tables = Array.from(document.querySelectorAll('table'));
            for (let table of tables) {
                if (table.innerText.includes("Address at Place of Stay/Hotel")) {
                    const inputs = table.querySelectorAll('input[type="text"]');
                    const selects = table.querySelectorAll('select');
                    if (inputs.length >= 3 && selects.length >= 2) {
                        fillText(inputs[0].id, hotel.name);
                        fillText(inputs[1].id, hotel.add1 + ", " + hotel.add2_pincode);
                        fillSelect(selects[0].id, hotel.state);
                        await fillSelectWait(selects[1].id, hotel.district);
                        if (inputs.length > 2) {
                            fillText(inputs[3] ? inputs[3].id : inputs[2].id, hotel.phone);
                        }
                    }
                    break;
                }
            }
        }

        // Always try to fill Places to be Visited on this page when a hotel is selected
        const placesNames = ["places_to_be_visited", "cities", "places", "city", "place_of_visit"];
        for (let name of placesNames) {
            const el = document.getElementById(name) || document.getElementsByName(name)[0];
            if (el) {
                el.value = hotel.district;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
        }

        showToast(`✅ Reference filled with ${hotel.name}`, 'success');
    } catch (e) {
        console.error(e);
        alert("Could not select District automatically. Please check if State is correct.");
    }
}

/**
 * Handle initial Email/Visa selection modal (Page 0)
 */
function openVisaStarterModal(data) {
    if (document.getElementById("iv-visa-modal")) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("modal.css");
    document.head.appendChild(link);

    const email = data.email_id && data.email_id !== "NILL" ? data.email_id : "";

    const modal = document.createElement("div");
    modal.id = "iv-visa-modal";
    modal.innerHTML = `
        <div class="iv-visa-content">
            <h3>Start Application</h3>
            <div class="iv-email-section">
                <label>Applicant Email ID:</label>
                <input type="email" id="iv-user-email" class="iv-email-input" value="${email}" placeholder="Enter valid email...">
                <span class="iv-warning">⚠ Please check your email very carefully!</span>
            </div>
            <div class="iv-visa-grid">
                <button class="iv-visa-btn btn-tourist" id="btn-tourist">Tourist Visa</button>
                <button class="iv-visa-btn btn-business" id="btn-business">Business Visa</button>
                <button class="iv-visa-btn btn-double" id="btn-double">Double Entry</button>
                <button class="iv-visa-btn btn-med-pat" id="btn-med-pat">Medical Patient</button>
                <button class="iv-visa-btn btn-med-att" id="btn-med-att">Medical Attendant</button>
                <button class="iv-visa-btn btn-other" id="btn-other">Others (Manual)</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const handleSelect = async (visaType, purpose, fallbackText) => {
        const em = document.getElementById("iv-user-email").value;
        if (em) {
            fillText("email_id", em);
            fillText("email_re_id", em);
            data.email_id = em;
            sessionStorage.setItem('autofillData', JSON.stringify(data));
        }
        modal.remove();

        if (visaType && purpose) {
            // First try to fill the high-level Visa Service category if it exists (legacy 2-dropdown layout)
            const vServiceIds = ["visaService", "visa_service_id", "visatype_id"];
            let vFound = null;
            for (const id of vServiceIds) {
                if (document.getElementById(id)) { vFound = id; break; }
            }
            if (vFound) fillSelect(vFound, visaType);
            
            // Wait 1.5 seconds for any AJAX triggered by the Visa Service dropdown to complete.
            // This prevents us from selecting the Purpose before the dropdown is wiped and repopulated by the server.
            await new Promise(r => setTimeout(r, 1500));
            
            // Now dynamically find whichever dropdown contains the actual purpose (like 'TOURIST')
            let targetSelectId = null;
            
            for (let retry = 0; retry < 15; retry++) {
                const selects = document.querySelectorAll('select');
                for (const select of selects) {
                    for (const opt of Array.from(select.options || [])) {
                        if (opt.text.toUpperCase().includes(fallbackText.toUpperCase()) || opt.value === purpose) {
                            if (!select.id) select.id = "iv_auto_purpose_" + Date.now();
                            targetSelectId = select.id;
                            break;
                        }
                    }
                    if (targetSelectId) break;
                }
                if (targetSelectId) break;
                await new Promise(r => setTimeout(r, 200)); // wait and retry if AJAX is still loading
            }

            if (targetSelectId) {
                // Select the option in the found dropdown (try value first silently)
                let success = fillSelect(targetSelectId, purpose, true);
                if (!success) {
                    // Also try text fallback if value didn't match (with warning if it fails)
                    fillSelect(targetSelectId, fallbackText);
                }
            } else {
                console.warn("IV Autofill: Could not find any dropdown containing " + fallbackText);
            }
            
            showToast('✅ Visa type and email filled!', 'success');
        }
    };

    document.getElementById("btn-tourist").onclick = () => handleSelect("3", "234", "TOURIST VISA (T1)");
    document.getElementById("btn-business").onclick = () => handleSelect("3", "233", "BUSINESS VISA");
    document.getElementById("btn-double").onclick = () => handleSelect("87", "186", "DOUBLE ENTRY");
    document.getElementById("btn-med-pat").onclick = () => handleSelect("16", "235", "MEDICAL VISA");
    document.getElementById("btn-med-att").onclick = () => handleSelect("16", "236", "MEDICAL ATTENDANT");
    document.getElementById("btn-other").onclick = () => handleSelect(null, null);
}

// ─── Routing & Page Filling Logic ─────────────────────────────

async function routeAndFill(data) {
    filledFieldsCount = 0;
    totalFieldsCount = 0;

    // PAGE 1: Personal Details
    if (document.getElementById('surname')) {
        console.log("IV Autofill: Detected Page 1.");
        fillText('surname', data.surname);
        fillText('givenName', data.givenName);
        fillText('birth_place', data.pobTown);
        fillText('nic_number', data.citizenId);
        fillText('identity_marks', data.identity_marks || "NA");
        fillText('passport_no', data.passNo);
        fillText('passport_issue_place', data.passPlace);
        fillText('passport_issue_date', data.passDate);
        fillText('passport_expiry_date', data.passExpire);
        fillRadio('appl.oth_ppt', 'NO');
        const othNoBtn = document.querySelector('input[name="othPassYN"][value="N"]');
        if (othNoBtn) othNoBtn.click();
        
        await fillSelectWait('gender', data.gender);
        await fillSelectWait('country_birth', data.pobCountry);
        await fillSelectWait('religion', data.religion);
        await fillSelectWait('education', data.education);
        // Do NOT fill nationality/nationality_by on Page 1 to avoid 2.5s timeout, they are auto-filled by server
        
        // Generate random expected date of arrival (~1.5 months / 40-50 days in the future)
        const daysToAdd = Math.floor(Math.random() * (50 - 40 + 1)) + 40;
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysToAdd);
        const dd = String(futureDate.getDate()).padStart(2, '0');
        const mm = String(futureDate.getMonth() + 1).padStart(2, '0');
        const yyyy = futureDate.getFullYear();
        const formattedDate = `${dd}/${mm}/${yyyy}`;
        
        fillText('expected_date_journey', formattedDate);
        fillText('expected_journey_date', formattedDate);
        
        showToast(`✅ Page 1 filled (${filledFieldsCount} fields)`, 'success');
    }
    // PAGE 2: Address & Family
    else if (document.getElementById('pres_add1')) {
        console.log("IV Autofill: Detected Page 2.");
        fillText('pres_add1', data.pres_add1);
        fillText('pres_add2', data.pres_add2);
        await fillSelectWait('pres_country', data.pres_country);
        fillText('pres_add3', data.pres_add3);
        fillText('pincode', data.pincode);
        fillText('pres_phone', data.pres_phone);
        fillText('isd_code1', data.isd_code1);
        fillText('mobile', data.mobile);
        
        // Smart Permanent Address Handling
        if (!data.perm_address1 || data.perm_address1 === 'NILL' || data.perm_address1 === data.pres_add1) {
            // If identical or missing, check 'Same as Present Address' checkbox
            const sameCheck = document.querySelector('input[type="checkbox"][name="appl.same_as_pres_add"]') || 
                              document.querySelector('input[type="checkbox"][id*="same"]');
            if (sameCheck && !sameCheck.checked) {
                sameCheck.click();
            }
        } else {
            // Fill both possible IDs for the Indian Visa form
            fillText('perm_address1', data.perm_address1);
            fillText('perm_add1', data.perm_address1);
            fillText('perm_address2', data.perm_address2);
            fillText('perm_add2', data.perm_address2);
            fillText('perm_address3', data.perm_address3);
            fillText('perm_add3', data.perm_address3);
        }
        
        fillText('fthrname', data.fthrname);
        await fillSelectWait('father_nationality', data.father_nationality);
        await fillSelectWait('father_country_of_birth', data.father_nationality);
        fillText('father_place_of_birth', data.father_place_of_birth);
        
        fillText('mother_name', data.mother_name);
        await fillSelectWait('mother_nationality', data.father_nationality); // fallback to father nat
        await fillSelectWait('mother_country_of_birth', data.father_nationality);
        fillText('mother_place_of_birth', data.mother_place_of_birth);
        
        await fillSelectWait('marital_status', data.marital_status);
        if (data.marital_status === "0" || data.marital_status === "MARRIED") {
            fillText('spouse_name', data.spouse_name);
            await fillSelectWait('spouse_nationality', data.father_nationality);
            fillText('spouse_place_of_birth', data.spouse_place_of_birth);
            await fillSelectWait('spouse_country_of_birth', data.father_nationality);
        }
        
        await fillSelectWait('occupation', data.occupation);
        fillText('empname', data.empname);
        fillText('empdesignation', data.empdesignation);
        fillText('empaddress', data.empaddress);
        
        fillRadio('appl.grandparent_flag', 'NO');
        fillRadio('appl.prev_org', 'NO');
        
        showToast(`✅ Page 2 filled (${filledFieldsCount} fields)`, 'success');
    }
    // PAGE 0: Initial Setup (Mission & Visa type)
    else if (document.getElementById('email_id')) {
        console.log("IV Autofill: Detected Page 0.");
        await fillSelectWait('countryname_id', 'BANGLADESH');
        
        const mission = (data.missioncode_id && data.missioncode_id !== "NILL") ? data.missioncode_id : 'RAJSHAHI';
        await fillSelectWait('missioncode_id', mission, 15000);
        await fillSelectWait('nationality_id', 'BANGLADESH', 15000);
        fillText('dob_id', data.dob);
        
        openVisaStarterModal(data);
    }
    // PAGE 3: Visa Details & Previous Visa
    else if (document.getElementById('duration')) {
        console.log("IV Autofill: Detected Page 3.");
        
        // Handle Medical Visa specific fields if present
        if (document.getElementById('hsptNameMsn')) {
            fillText('hsptNameMsn', data.hsptNameMsn);
            fillText('hsptAddMsn', data.hsptAddMsn);
            fillText('docNameMsn', data.docNameMsn);
            fillText('phMsn', data.phMsn);
            fillText('emailMsn', data.emailMsn);
            fillText('illness', data.illness);
        }

        fillText('duration', data.duration || 24);
        
        // Auto-fill places to be visited immediately on Fill Form
        const placesNames = ["places_to_be_visited", "cities", "places", "city", "place_of_visit"];
        for (let name of placesNames) {
            const el = document.getElementById(name) || document.getElementsByName(name)[0];
            if (el && (!el.value || el.value.trim() === '')) {
                el.value = data.places_visited || 'KOLKATA';
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
        }
        
        // Use exact text mappings to avoid changing value issues
        let entryVal = data.visa_entry_id;
        if (!entryVal) entryVal = "MULTIPLE";
        else if (entryVal == "1") entryVal = "SINGLE";
        else if (entryVal == "2") entryVal = "DOUBLE";
        else if (entryVal == "3") entryVal = "MULTIPLE";
        await fillSelectWait('visa_entry_id', entryVal);
        
        if (data.entrypoint && data.entrypoint !== 'NILL') {
            await fillSelectWait('entrypoint', data.entrypoint);
            await fillSelectWait('exitpointprc', data.entrypoint); // Set exit same as entry usually
        }

        const hasOldVisa = data.old_visa_no && data.old_visa_no !== 'NILL' && data.old_visa_no.trim() !== '';
        
        if (hasOldVisa) {
            fillRadio('appl.old_visa_flag', 'YES');
            fillText('prv_visit_add1', data.prv_visit_add1);
            fillText('visited_city', data.visited_city);
            fillText('old_visa_no', data.old_visa_no);
            await fillSelectWait('old_visa_type_id', data.old_visa_type_id);
            fillText('oldvisaissueplace', data.oldvisaissueplace);
            fillText('oldvisaissuedate', data.oldvisaissuedateRaw);
        } else {
            fillRadio('appl.old_visa_flag', 'NO');
        }
        
        fillRadio('appl.refuse_flag', 'NO');
        fillRadio('appl.saarc_flag', 'NO');
        const othPass = document.querySelector('input[name="othPassYN"][value="N"]');
        if (othPass) othPass.click();

        fillText('country_visited', data.country_visited);
        
        // Auto-fill reference based on family
        const refName = (data.spouse_name && data.spouse_name !== 'NILL') ? data.spouse_name : data.fthrname;
        fillText('nameofsponsor_msn', refName);
        fillText('add1ofsponsor_msn', data.pres_add1);
        fillText('add2ofsponsor_msn', data.pres_add2 + (data.pres_add3 ? ", " + data.pres_add3 : ""));
        fillText('phoneofsponsor_msn', data.pres_phone);

        showToast(`✅ Page 3 filled (${filledFieldsCount} fields). Please open Hotel Selector for Reference.`, 'success');
        
        // Open hotel selector for the second reference
        openHotelSelector(data);
    }
    // PAGE 4: Yes/No Questions
    else if (document.getElementById('question_yes_1')) {
        console.log("IV Autofill: Detected Page 4.");
        for (let i = 1; i <= 6; i++) {
            fillRadio(`radioName[${i}]`, 'NO');
        }
        const chk = document.getElementById('verifyQuestions');
        if (chk && !chk.checked) {
            chk.click();
            filledFieldsCount++;
        }
        showToast(`✅ Questions answered 'No'`, 'success');
    }
    // PAGE 5 / Visit Details: Final place of stay
    else if (document.getElementById('place_of_stay1') || document.body.innerText.includes("Address at Place of Stay/Hotel")) {
        console.log("IV Autofill: Detected Visit Details Page.");
        openHotelSelector(data);
    }
    else {
        console.log("IV Autofill: Unknown page. Ending auto-continue mode.");
        sessionStorage.removeItem('autofillInProgress');
        sessionStorage.removeItem('autofillData');
    }
}

// ─── Auto-continue logic across page loads ─────────────────────

function checkAutoContinue() {
    if (sessionStorage.getItem('autofillInProgress') === 'true') {
        const savedData = sessionStorage.getItem('autofillData');
        const fillMissingParam = sessionStorage.getItem('autofillMissingOnly');
        if (fillMissingParam === 'true') fillMissingOnly = true;

        if (savedData) {
            console.log("IV Autofill: Auto-continue mode active, filling page...");
            const data = JSON.parse(savedData);
            window.IVAP_SELECTED_PROFILE_DATA = data;
            // Slight delay to ensure DOM is ready
            setTimeout(() => routeAndFill(data), 500);
        }
    }
}

// ─── Listen for manual triggers from Popup/Sidepanel ───────────

function trackTemporaryId() {
    const text = document.body.innerText;
    const match = text.match(/Temporary Application ID\s*:?\s*([A-Z0-9]+)/i);
    if (match && match[1]) {
        const tempId = match[1];
        chrome.storage.local.get(['iv_temp_ids']).then(res => {
            let ids = res.iv_temp_ids || [];
            // Check if already top
            if (ids.length > 0 && ids[0].id === tempId) return;
            
            // Remove if exists to move to top
            ids = ids.filter(item => item.id !== tempId);
            
            // Add to top with date
            ids.unshift({
                id: tempId,
                date: new Date().toLocaleString()
            });
            
            // Keep only last 20
            if (ids.length > 20) ids.pop();
            
            chrome.storage.local.set({ iv_temp_ids: ids });
        });
    }
}

function injectPdfDraftButton() {
    if (window.location.href.includes("Verification") || document.getElementById("printButton") || document.body.innerText.includes("Applicant Details")) {
        // If there's already our button, skip
        if (document.getElementById("iv-draft-btn")) return;

        const btn = document.createElement("button");
        btn.id = "iv-draft-btn";
        btn.innerText = "📄 Download PDF Draft";
        btn.style.cssText = `
            position: fixed; bottom: 20px; left: 20px; z-index: 999999;
            padding: 12px 20px; border-radius: 8px; font-family: sans-serif;
            font-size: 14px; font-weight: bold; color: white; background-color: #f59e0b;
            border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        `;
        btn.onmouseover = () => btn.style.transform = "scale(1.05)";
        btn.onmouseout = () => btn.style.transform = "scale(1)";
        
        btn.onclick = () => {
            const getVal = (label) => {
                const els = Array.from(document.querySelectorAll("td, th, span, div")).filter(el => el.innerText && el.innerText.trim() === label);
                if (els.length > 0) {
                    // Usually the value is in the next sibling or cell
                    const next = els[0].nextElementSibling;
                    if (next) return next.innerText.trim();
                }
                return "";
            };

            const surname = getVal("Surname (as shown in your Passport)") || getVal("Surname/Family Name");
            const given = getVal("Given Name/s (Complete as in Passport)") || getVal("Given Name/s");
            const passport = getVal("Passport Number");
            
            const parts = [given, surname, passport, "(Draft)"].filter(Boolean);
            const title = parts.join(" ").replace(/[<>:"/\\|?*]/g, "");
            
            const oldTitle = document.title;
            document.title = title || "Visa Application Draft";
            window.print();
            setTimeout(() => { document.title = oldTitle; }, 1000);
        };
        document.body.appendChild(btn);
    }
}

// ─── Floating Widget on Indian Visa Website ─────────────────────

async function injectFloatingWidget() {
    if (document.getElementById('ivap-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'ivap-widget';
    widget.innerHTML = `
        <style>
            #ivap-widget {
                position: fixed; top: 16px; right: 16px; z-index: 2147483640;
                width: 320px; border-radius: 16px; overflow: hidden;
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
                animation: ivapSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
                background: linear-gradient(180deg, #FF9933 0%, #FF993320 15%, #FFFFFF 30%, #FFFFFF 70%, #13882720 85%, #138827 100%);
            }
            @keyframes ivapSlideIn { from { opacity:0; transform:translateY(-20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
            #ivap-widget.ivap-collapsed { width: auto; }
            #ivap-widget.ivap-collapsed .ivap-body { display: none; }
            #ivap-widget.ivap-collapsed .ivap-header { border-radius: 16px; }

            .ivap-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 14px 16px; background: rgba(255,255,255,0.85);
                backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                border-bottom: 3px solid;
                border-image: linear-gradient(90deg, #FF9933, #FFFFFF, #138827) 1;
            }
            .ivap-title {
                font-size: 15px; font-weight: 800; color: #1a1a2e;
                letter-spacing: -0.3px;
            }
            .ivap-close {
                width: 28px; height: 28px; border-radius: 8px; border: none;
                background: rgba(0,0,0,0.06); color: #666; font-size: 16px;
                cursor: pointer; display: flex; align-items: center; justify-content: center;
                transition: all 0.2s;
            }
            .ivap-close:hover { background: rgba(239,68,68,0.15); color: #ef4444; }

            .ivap-body {
                padding: 14px 16px 16px;
                background: rgba(255,255,255,0.92);
                backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            }

            .ivap-toggle {
                display: flex; background: #f0f0f0; border-radius: 10px;
                padding: 3px; margin-bottom: 12px; position: relative;
            }
            .ivap-toggle-btn {
                flex: 1; text-align: center; padding: 8px; cursor: pointer;
                font-size: 12px; font-weight: 700; z-index: 2;
                border: none; background: transparent; color: #888;
                transition: all 0.3s; border-radius: 8px; letter-spacing: 0.5px;
            }
            .ivap-toggle-btn.active { color: #fff; background: #1a1a2e; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }

            .ivap-select-wrap { position: relative; margin-bottom: 12px; }
            .ivap-select {
                width: 100%; padding: 11px 14px; border: 2px solid #e8e8e8;
                border-radius: 10px; font-size: 13px; font-weight: 600;
                color: #333; background: #fff; cursor: pointer;
                appearance: none; -webkit-appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
                background-repeat: no-repeat; background-position: right 12px center;
                transition: border-color 0.2s;
            }
            .ivap-select:focus { border-color: #138827; outline: none; box-shadow: 0 0 0 3px rgba(19,136,39,0.1); }

            .ivap-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
            .ivap-btn-fill {
                padding: 10px; border: none; border-radius: 10px; cursor: pointer;
                font-size: 13px; font-weight: 700; color: white;
                background: linear-gradient(135deg, #059669, #10b981);
                box-shadow: 0 2px 8px rgba(16,185,129,0.3); transition: all 0.2s;
            }
            .ivap-btn-fill:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16,185,129,0.4); }
            .ivap-btn-next {
                padding: 10px; border: none; border-radius: 10px; cursor: pointer;
                font-size: 13px; font-weight: 700; color: white;
                background: linear-gradient(135deg, #6366f1, #138827);
                box-shadow: 0 2px 8px rgba(99,102,241,0.3); transition: all 0.2s;
            }
            .ivap-btn-next:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }

            /* Widget Documents */
            .ivap-docs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; }
            .ivap-doc-btn {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                border: none; border-radius: 8px; padding: 10px;
                color: #fff; font-size: 11px; font-weight: bold; cursor: pointer;
                box-shadow: 0 4px 15px rgba(245,158,11,0.3); transition: all 0.2s;
            }
            .ivap-doc-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(245,158,11,0.5); }

            #ivap-fab {
                position: fixed; bottom: 20px; right: 20px; z-index: 2147483640;
                width: 52px; height: 52px; border-radius: 50%;
                background: linear-gradient(135deg, #FF9933, #138827);
                border: 3px solid white; color: white; font-size: 22px;
                cursor: pointer; display: none; align-items: center; justify-content: center;
                box-shadow: 0 4px 16px rgba(0,0,0,0.25); transition: all 0.3s;
            }
            #ivap-fab:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0,0,0,0.35); }

            /* DARK MODE OVERRIDES */
            #ivap-widget.ivap-dark-mode .ivap-header { background: rgba(30, 30, 46, 0.95); }
            #ivap-widget.ivap-dark-mode .ivap-title { color: #f1f5f9; }
            #ivap-widget.ivap-dark-mode .ivap-body { background: rgba(15, 15, 23, 0.95); }
            #ivap-widget.ivap-dark-mode .ivap-close { background: rgba(255,255,255,0.1); color: #cbd5e1; }
            #ivap-widget.ivap-dark-mode .ivap-close:hover { background: rgba(239,68,68,0.25); color: #fca5a5; }
            #ivap-widget.ivap-dark-mode .ivap-toggle { background: rgba(255,255,255,0.08); }
            #ivap-widget.ivap-dark-mode .ivap-toggle-btn { color: #94a3b8; }
            #ivap-widget.ivap-dark-mode .ivap-toggle-btn.active { background: #334155; color: #fff; }
            #ivap-widget.ivap-dark-mode .ivap-select { background-color: #1e293b; border-color: #334155; color: #f8fafc; }
        </style>

        <div class="ivap-header">
            <span class="ivap-title">Indian Visa Autofill</span>
            <button class="ivap-close" id="ivap-close-btn" title="Minimize">✕</button>
        </div>
        <div class="ivap-body">
            <div class="ivap-toggle">
                <button class="ivap-toggle-btn active" id="ivap-btn-bgd">BGD</button>
                <button class="ivap-toggle-btn" id="ivap-btn-pass">PASS</button>
            </div>
            <div class="ivap-select-wrap">
                <select class="ivap-select" id="ivap-profile-select">
                    <option value="">Select Profile</option>
                </select>
            </div>
            <div class="ivap-actions">
                <button class="ivap-btn-fill" id="ivap-fill-btn">Fill Form</button>
                <button class="ivap-btn-next" id="ivap-next-btn">Next Page →</button>
            </div>
            <!-- Documents -->
            <div style="font-size: 11px; font-weight:bold; margin-bottom:8px; color:var(--text); text-transform:uppercase; letter-spacing:0.5px;">Generate Documents</div>
            <div class="ivap-docs">
                <button class="ivap-doc-btn" id="ivap-doc-cover">Cover Letter</button>
                <button class="ivap-doc-btn" id="ivap-doc-noc">NOC</button>
                <button class="ivap-doc-btn" id="ivap-doc-undertaking">Undertaking</button>
                <button class="ivap-doc-btn" id="ivap-doc-photo">Photo Form</button>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    const fab = document.createElement('button');
    fab.id = 'ivap-fab';
    fab.innerHTML = '🇮🇳';
    fab.title = 'Open Indian Visa Autofill';
    document.body.appendChild(fab);

    // Document Event Listeners
    if (widget.querySelector('#ivap-doc-cover')) widget.querySelector('#ivap-doc-cover').addEventListener('click', generateCoverLetter);
    if (widget.querySelector('#ivap-doc-noc')) widget.querySelector('#ivap-doc-noc').addEventListener('click', generateNoc);
    if (widget.querySelector('#ivap-doc-undertaking')) widget.querySelector('#ivap-doc-undertaking').addEventListener('click', generateUndertaking);
    if (widget.querySelector('#ivap-doc-photo')) widget.querySelector('#ivap-doc-photo').addEventListener('click', generatePhotoForm);

    // Theme logic
    chrome.storage.local.get(['ivapTheme'], (res) => {
        if (res.ivapTheme === 'light') {
            widget.classList.remove('ivap-dark-mode');
        } else {
            widget.classList.add('ivap-dark-mode');
        }
    });

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.ivapTheme) {
            if (changes.ivapTheme.newValue === 'light') {
                widget.classList.remove('ivap-dark-mode');
            } else {
                widget.classList.add('ivap-dark-mode');
            }
        }
    });

    let currentMode = 'BGD';

    async function loadWidgetProfiles(mode) {
        const select = document.getElementById('ivap-profile-select');
        if (!select) return;
        select.innerHTML = '<option value="">Select Profile</option>';
        
        let storage;
        try {
            storage = await chrome.storage.local.get(null);
        } catch (err) {
            console.warn("IV Autofill: Extension context invalidated.");
            return;
        }
        const selectedKey = storage.lastSelectedProfile;
        Object.keys(storage).forEach(key => {
            const profile = storage[key];
            if (!profile._type || profile._type !== mode) return;
            if (profile._isHidden) return;
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = profile._savedName || 'Unknown';
            if (key === selectedKey) opt.selected = true;
            select.appendChild(opt);
        });
    }

    document.getElementById('ivap-btn-bgd').onclick = () => {
        currentMode = 'BGD';
        document.getElementById('ivap-btn-bgd').classList.add('active');
        document.getElementById('ivap-btn-pass').classList.remove('active');
        try { chrome.storage.local.set({ lastServiceMode: 'BGD' }); } catch (e) {}
        loadWidgetProfiles('BGD');
    };
    document.getElementById('ivap-btn-pass').onclick = () => {
        currentMode = 'PASSPORT';
        document.getElementById('ivap-btn-pass').classList.add('active');
        document.getElementById('ivap-btn-bgd').classList.remove('active');
        try { chrome.storage.local.set({ lastServiceMode: 'PASSPORT' }); } catch (e) {}
        loadWidgetProfiles('PASSPORT');
    };

    document.getElementById('ivap-close-btn').onclick = () => {
        widget.style.display = 'none';
        fab.style.display = 'flex';
        sessionStorage.setItem('ivapWidgetMinimized', 'true');
    };
    fab.onclick = () => {
        widget.style.display = '';
        widget.style.animation = 'none';
        void widget.offsetHeight;
        widget.style.animation = 'ivapSlideIn 0.3s ease';
        fab.style.display = 'none';
        sessionStorage.setItem('ivapWidgetMinimized', 'false');
    };

    document.getElementById('ivap-fill-btn').onclick = async () => {
        const select = document.getElementById('ivap-profile-select');
        const key = select?.value;
        if (!key) { alert('Please select a profile first!'); return; }
        
        try {
            const stored = await chrome.storage.local.get(key);
            if (stored[key]) {
                await chrome.storage.local.set({ lastSelectedProfile: key });
                sessionStorage.setItem('autofillInProgress', 'true');
                sessionStorage.setItem('autofillData', JSON.stringify(stored[key]));
                window.IVAP_SELECTED_PROFILE_DATA = stored[key];
                routeAndFill(stored[key]);
            }
        } catch (err) {
            console.warn("IV Autofill: Extension context invalidated.");
        }
    };

    document.getElementById('ivap-next-btn').onclick = () => {
        const saveBtn = document.querySelector('input[value="Save and Continue"]') ||
                        document.querySelector('button[value="Save and Continue"]') ||
                        document.querySelector('input[type="submit"][value*="Save"]') ||
                        document.querySelector('input[type="submit"][value*="Continue"]') ||
                        document.querySelector('input[type="button"][value*="Continue"]');
        if (saveBtn) {
            saveBtn.click();
            showToast('➡️ Navigating to next page...', 'info');
        } else {
            showToast('⚠️ Could not find Save button on this page.', 'error');
        }
    };

    document.getElementById('ivap-profile-select').onchange = async (e) => {
        if (e.target.value) {
            try {
                await chrome.storage.local.set({ lastSelectedProfile: e.target.value });
                const stored = await chrome.storage.local.get(e.target.value);
                window.IVAP_SELECTED_PROFILE_DATA = stored[e.target.value];
            } catch (err) {
                console.warn("IV Autofill: Extension context invalidated.", err);
            }
        }
    };

    // ─── DOCUMENT GENERATORS ────────────────────
    async function generateCoverLetter() {
        if (!window.IVAP_SELECTED_PROFILE_DATA) return alert("Please select a profile first!");
        const d = window.IVAP_SELECTED_PROFILE_DATA;
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
        const w = window.open('', '_blank'); w.document.write(html); w.document.close();
        w.focus(); setTimeout(() => w.print(), 500);
    };

    async function generateNoc() {
        if (!window.IVAP_SELECTED_PROFILE_DATA) return alert("Please select a profile first!");
        const d = window.IVAP_SELECTED_PROFILE_DATA;
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
        const w = window.open('', '_blank'); w.document.write(html); w.document.close();
        w.focus(); setTimeout(() => w.print(), 500);
    };

    async function generateUndertaking() {
        if (!window.IVAP_SELECTED_PROFILE_DATA) return alert("Please select a profile first!");
        const d = window.IVAP_SELECTED_PROFILE_DATA;
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
        const w = window.open('', '_blank'); w.document.write(html); w.document.close();
        w.focus(); setTimeout(() => w.print(), 500);
    };

    async function generatePhotoForm() {
        if (!window.IVAP_SELECTED_PROFILE_DATA) return alert("Please select a profile first!");
        const d = window.IVAP_SELECTED_PROFILE_DATA;
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
        const w = window.open('', '_blank'); w.document.write(html); w.document.close();
        w.focus(); setTimeout(() => w.print(), 500);
    }

    let savedMode = 'BGD';
    try {
        savedMode = (await chrome.storage.local.get(['lastServiceMode'])).lastServiceMode || 'BGD';
    } catch (err) {}
    
    if (savedMode === 'PASSPORT') {
        document.getElementById('ivap-btn-pass').click();
    } else {
        loadWidgetProfiles('BGD');
    }

    if (sessionStorage.getItem('ivapWidgetMinimized') === 'true') {
        widget.style.display = 'none';
        fab.style.display = 'flex';
    }

    if (sessionStorage.getItem('autofillInProgress') === 'true' || window.location.href.includes('Registration')) {
        widget.style.animation = 'none';
    }
}

// Run on page load
trackTemporaryId();
injectPdfDraftButton();
injectFloatingWidget();
checkAutoContinue();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'FILL_FORM') {
        console.log("IV Autofill: Received data from extension.");
        fillMissingOnly = request.fillMissingOnly || false;
        
        sessionStorage.setItem('autofillInProgress', 'true');
        sessionStorage.setItem('autofillData', JSON.stringify(request.data));
        sessionStorage.setItem('autofillMissingOnly', fillMissingOnly ? 'true' : 'false');
        
        routeAndFill(request.data);
    }
});

} // end window.IV_AUTOFILL_INJECTED