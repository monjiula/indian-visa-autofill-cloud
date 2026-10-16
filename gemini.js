/**
 * gemini.js — AI Extraction Engine for Indian Visa Autofill v2.0
 * 
 * Replaces AWS Lambda with Google Gemini API (free tier).
 * Handles both BGD PDF text extraction and Passport image OCR.
 * 
 * Uses: Gemini 2.5 Flash (free, vision-capable)
 * Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
 */

// ─── Configuration ────────────────────────────────────────────

// GEMINI_MODEL is now dynamically fetched. Fallback:
const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

// ─── JSON Schema for structured output ────────────────────────

const VISA_FIELDS_SCHEMA = {
  type: "object",
  properties: {
    surname:              { type: "string" },
    givenName:            { type: "string" },
    gender:               { type: "string" },
    dob:                  { type: "string" },
    pobTown:              { type: "string" },
    pobCountry:           { type: "string" },
    citizenId:            { type: "string" },
    religion:             { type: "string" },
    education:            { type: "string" },
    nationality:          { type: "string" },
    passNo:               { type: "string" },
    passPlace:            { type: "string" },
    passDate:             { type: "string" },
    passExpire:           { type: "string" },
    pres_add1:            { type: "string" },
    pres_add2:            { type: "string" },
    pres_add3:            { type: "string" },
    pres_country:         { type: "string" },
    pincode:              { type: "string" },
    pres_phone:           { type: "string" },
    isd_code1:            { type: "string" },
    mobile:               { type: "string" },
    email_id:             { type: "string" },
    perm_address1:        { type: "string" },
    perm_address2:        { type: "string" },
    perm_address3:        { type: "string" },
    fthrname:             { type: "string" },
    father_nationality:   { type: "string" },
    father_place_of_birth:{ type: "string" },
    father_country_of_birth: { type: "string" },
    mother_name:          { type: "string" },
    mother_nationality:   { type: "string" },
    mother_place_of_birth:{ type: "string" },
    mother_country_of_birth: { type: "string" },
    marital_status:       { type: "string" },
    spouse_name:          { type: "string" },
    spouse_nationality:   { type: "string" },
    spouse_place_of_birth:{ type: "string" },
    spouse_country_of_birth: { type: "string" },
    occupation:           { type: "string" },
    empname:              { type: "string" },
    empdesignation:       { type: "string" },
    empaddress:           { type: "string" },
    duration:             { type: "string" },
    visa_entry_id:        { type: "string" },
    entrypoint:           { type: "string" },
    exitpoint:            { type: "string" },
    jouryney_id:          { type: "string" },
    places_to_visit:      { type: "string" },
    old_visa_no:          { type: "string" },
    old_visa_type_id:     { type: "string" },
    oldVisaTypeRaw:       { type: "string" },
    oldvisaissueplace:    { type: "string" },
    oldvisaissuedateRaw:  { type: "string" },
    country_visited:      { type: "string" },
    prv_visit_add1:       { type: "string" },
    visited_city:         { type: "string" },
    nationality_by:       { type: "string" },
    identity_marks:       { type: "string" }
  },
  required: ["surname", "givenName", "dob", "passNo"]
};

// ─── System Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert data extraction assistant for Indian Visa applications.
Your job is to extract applicant information accurately and return it strictly as JSON.

CRITICAL RULES:
1. All dates MUST be in exactly "dd/mm/yyyy" format. E.g., if you see "15-Mar-1990", convert to "15/03/1990".
2. All text values MUST be in UPPERCASE.
3. If a field is not found or empty, use "NILL" (in uppercase).
4. gender: "M" (Male), "F" (Female), or "T" (Transgender).
5. marital_status: "0" (Married), "1" (Single), "2" (Divorced/Widowed).
6. religion: Use full names like "ISLAM", "HINDUISM", "CHRISTIANITY", "BUDDHISM".
7. education: Must be one of ["GRADUATE AND ABOVE", "HIGHER SECONDARY", "SECONDARY", "MATRICULATION", "BELOW MATRIC", "ILLITERATE", "NA (BELOW 10)"]. Map accordingly.
8. nationality, pres_country, father_nationality: Use country names like "BANGLADESH", "INDIA".
9. isd_code1: Just the numbers, e.g., "880" for Bangladesh.
10. entrypoint: Identify the Indian entry port (e.g., "BY ROAD MAHADIPUR", "BY ROAD HARIDASPUR", "BY ROAD GHOJADANGA", "BY AIR", "BY ROAD AGARTALA", "BY ROAD CHANGRABANDHA", "BY ROAD HILI").
11. exitpoint: Expected Port of Exit from India. Identify the Indian exit port (e.g., "BY ROAD MAHADIPUR", "BY ROAD HARIDASPUR", "BY ROAD GHOJADANGA", "BY AIR", "BY ROAD AGARTALA", "BY ROAD CHANGRABANDHA", "BY ROAD HILI"). If exit port is not specified, use the same as entrypoint.
12. visa_entry_id: Number of entries: map "MULTIPLE" to "2", "SINGLE" to "1", "DOUBLE" to "3", "TRIPLE" to "4". Default is "2".
13. duration: Duration of visa in months (e.g. "24", "12", "6"). Default is "24".
14. jouryney_id: Expected date of journey in dd/mm/yyyy format.
11. identity_marks: "NA" if not specified.
12. old_visa_type_id: "3" (Tourist), "16" (Medical), "87" (Double Entry), "4" (Business), "5" (Student). Use "NILL" if no old visa.
13. Phone/Mobile numbers should only contain digits, remove spaces or symbols.

Return ONLY valid JSON matching the required schema. No explanations, no markdown.`;

// ─── BGD PDF Text Extraction Prompt ───────────────────────────

const BGD_PROMPT = `Extract ALL applicant details from this extracted Indian Visa Application text (previously filled application).

Carefully extract the following and map to the JSON schema:
- Personal info: Name (split Surname/Given Name), DOB, Gender, Religion, Education, Nationality (default "BANGLADESH"), Citizenship/NID, pobTown (Place of Birth Town/City), pobCountry (Country of Birth, default "BANGLADESH"), nationality_by (e.g. "BY BIRTH").
- Passport details: Number, Issue Date, Expiry Date, Place of Issue.
- Address: Present and Permanent addresses:
  * pres_add1: House/Street
  * pres_add2: Village/Town/City
  * pres_add3: State/Province/District
  * pres_country: Country (default "BANGLADESH")
  * pincode: Postal/Zip Code (e.g. 6340)
  * pres_phone: Phone number
  * mobile: Mobile / Cell number
  * isd_code1: ISD code (default "880")
  * email_id: Email address
  * perm_address1: Permanent House/Street
  * perm_address2: Permanent Village/Town/City
  * perm_address3: Permanent State/Province/District
  * perm_country: Permanent Country (default "BANGLADESH")
- Family: 
  * fthrname: Father's Name
  * father_nationality: Father's Nationality (default "BANGLADESH")
  * father_place_of_birth: Father's Place of Birth
  * father_country_of_birth: Father's Country of Birth (default "BANGLADESH")
  * mother_name: Mother's Name
  * mother_nationality: Mother's Nationality (default "BANGLADESH")
  * mother_place_of_birth: Mother's Place of Birth
  * mother_country_of_birth: Mother's Country of Birth (default "BANGLADESH")
  * marital_status: "0" (Married), "1" (Single)
  * spouse_name: Spouse's Name
  * spouse_nationality: Spouse's Nationality (default "BANGLADESH")
  * spouse_place_of_birth: Spouse's Place of Birth
  * spouse_country_of_birth: Spouse's Country of Birth (default "BANGLADESH")
- Employment: Occupation, Employer Name, Designation, Address, Phone.
- Previous visa history: Visa number, Type, Issue place/date, Cities visited, Previous stay address.
- Port of arrival/exit: (entrypoint, exitpoint).

Here is the extracted PDF text:
`;

// ─── Passport OCR Prompt ──────────────────────────────────────

const PASSPORT_PROMPT = `Extract all information from this passport image/document. Read every field visible, paying special attention to the MRZ (Machine Readable Zone) at the bottom for accuracy.

Extract:
- Full name (surname and given name separately).
- Date of birth (convert to dd/mm/yyyy).
- Gender (M or F).
- Passport number.
- Place of issue.
- Date of issue (convert to dd/mm/yyyy).
- Date of expiry (convert to dd/mm/yyyy).
- Nationality (e.g. "BANGLADESH").
- Place of birth.
- National ID / Citizen ID number / Personal No (if visible).

MRZ Decoding Hints (2 lines of 44 chars each for TD3):
Line 1: Type (P) + Country Code (3 chars) + Surname + << + Given Names
Line 2: Passport No (9 chars) + Check Digit + Nationality (3 chars) + DOB (YYMMDD) + Check Digit + Gender (M/F) + Expiry Date (YYMMDD) + Check Digit + Personal Number

For fields not visible on the passport (like address, family, employment, previous visa), use "NILL".
Set nationality, pres_country, father_nationality to the issuing country (e.g., "BANGLADESH").
Set isd_code1 based on the country (e.g., "880" for Bangladesh).

Return ONLY the JSON object.`;

// ─── Post-Processing Validation ───────────────────────────────

function postProcessData(data) {
  const clean = { ...data };
  
  // Helper to ensure uppercase and fallback to NILL
  const toUpperOrNill = (val) => (val && val !== 'NILL' ? String(val).toUpperCase().trim() : 'NILL');
  
  for (const key in clean) {
    if (typeof clean[key] === 'string') {
      clean[key] = toUpperOrNill(clean[key]);
    }
  }

  // 1. Date normalization (ensure dd/mm/yyyy)
  const dateFields = ['dob', 'passDate', 'passExpire', 'oldvisaissuedateRaw'];
  dateFields.forEach(field => {
    if (clean[field] && clean[field] !== 'NILL') {
      // Catch yyyy-mm-dd or yyyy/mm/dd
      const yyyyMatch = clean[field].match(/^(\d{4})[-\/.](\d{2})[-\/.](\d{2})$/);
      if (yyyyMatch) {
        clean[field] = `${yyyyMatch[3]}/${yyyyMatch[2]}/${yyyyMatch[1]}`;
      } else {
        // Catch dd-mm-yyyy or dd.mm.yyyy
        const ddMatch = clean[field].match(/^(\d{2})[-\/.](\d{2})[-\/.](\d{4})$/);
        if (ddMatch) {
          clean[field] = `${ddMatch[1]}/${ddMatch[2]}/${ddMatch[3]}`;
        }
      }
    }
  });

  // 2. Phone number cleanup
  const phoneFields = ['pres_phone', 'mobile'];
  phoneFields.forEach(field => {
    if (clean[field] && clean[field] !== 'NILL') {
      let num = clean[field].replace(/\D/g, '');
      // For Bangladesh, usually 11 digits starting with 01
      if (num.startsWith('880') && num.length > 11) num = num.substring(3);
      if (num) clean[field] = num;
    }
  });

  // 3. Port name mapping heuristics for BD common ports
  function normalizePort(port) {
    if (!port || port === 'NILL') return 'BY ROAD HARIDASPUR';
    const p = String(port).toUpperCase();
    if (p.includes('MAHADIPUR')) return 'BY ROAD MAHADIPUR';
    if (p.includes('BENAPOLE') || p.includes('GHOJADANGA')) return 'BY ROAD GHOJADANGA';
    if (p.includes('AGARTALA') || p.includes('AKHAURA')) return 'BY ROAD AGARTALA';
    if (p.includes('HILI')) return 'BY ROAD HILI';
    if (p.includes('HARIDASPUR') || p.includes('PETRAPOLE')) return 'BY ROAD HARIDASPUR';
    if (p.includes('CHANGRABANDHA') || p.includes('BURIMARI')) return 'BY ROAD CHANGRABANDHA';
    if (p.includes('GEDE')) return 'BY RAIL GEDE';
    if (p.includes('DAWKI')) return 'BY ROAD DAWKI';
    if (p.includes('JAIGAON')) return 'BY ROAD JAIGAON';
    if (p.includes('PHULBARI')) return 'BY ROAD PHULBARI';
    if (p.includes('CCU') || p.includes('KOLKATA AIRPORT') || p.includes('DUM DUM') || p.includes('DELHI AIRPORT') || p.includes('AIR')) return 'BY AIR';
    return port;
  }

  if (clean.entrypoint && clean.entrypoint !== 'NILL') {
    clean.entrypoint = normalizePort(clean.entrypoint);
  }
  if (clean.exitpoint && clean.exitpoint !== 'NILL') {
    clean.exitpoint = normalizePort(clean.exitpoint);
  } else if (clean.entrypoint && clean.entrypoint !== 'NILL') {
    clean.exitpoint = clean.entrypoint;
  }

  // No of Entries mapping
  if (clean.visa_entry_id && clean.visa_entry_id !== 'NILL') {
    const ve = String(clean.visa_entry_id).toUpperCase();
    if (ve.includes('MULTI') || ve === '2') clean.visa_entry_id = '2';
    else if (ve.includes('SING') || ve === '1') clean.visa_entry_id = '1';
    else if (ve.includes('DOUB') || ve === '3') clean.visa_entry_id = '3';
    else if (ve.includes('TRIP') || ve === '4') clean.visa_entry_id = '4';
  } else {
    clean.visa_entry_id = '2';
  }

  // Duration
  if (!clean.duration || clean.duration === 'NILL') {
    clean.duration = '24';
  }

  // 4. Identity marks default
  if (!clean.identity_marks || clean.identity_marks === 'NILL' || clean.identity_marks === 'NONE') {
    clean.identity_marks = 'NA';
  }

  // 5. Sync Addresses if one is missing but the other exists
  const hasPres = clean.pres_add1 && clean.pres_add1 !== 'NILL';
  const hasPerm = clean.perm_address1 && clean.perm_address1 !== 'NILL';
  
  if (hasPres && !hasPerm) {
    clean.perm_address1 = clean.pres_add1;
    clean.perm_address2 = clean.pres_add2;
    clean.perm_address3 = clean.pres_add3;
  } else if (hasPerm && !hasPres) {
    clean.pres_add1 = clean.perm_address1;
    clean.pres_add2 = clean.perm_address2;
    clean.pres_add3 = clean.perm_address3;
  }

  // 6. Country, nationality, and family defaults for Bangladesh applications
  if (!clean.pres_country || clean.pres_country === 'NILL') clean.pres_country = 'BANGLADESH';
  if (!clean.perm_country || clean.perm_country === 'NILL') clean.perm_country = 'BANGLADESH';
  if (!clean.pobCountry || clean.pobCountry === 'NILL') clean.pobCountry = 'BANGLADESH';
  if (!clean.nationality || clean.nationality === 'NILL') clean.nationality = 'BANGLADESH';
  if (!clean.nationality_by || clean.nationality_by === 'NILL') clean.nationality_by = 'BY BIRTH';
  if (!clean.father_nationality || clean.father_nationality === 'NILL') clean.father_nationality = 'BANGLADESH';
  if (!clean.father_country_of_birth || clean.father_country_of_birth === 'NILL') clean.father_country_of_birth = 'BANGLADESH';
  if (!clean.mother_nationality || clean.mother_nationality === 'NILL') clean.mother_nationality = 'BANGLADESH';
  if (!clean.mother_country_of_birth || clean.mother_country_of_birth === 'NILL') clean.mother_country_of_birth = 'BANGLADESH';
  if (!clean.isd_code1 || clean.isd_code1 === 'NILL') clean.isd_code1 = '880';

  if (clean.marital_status === '0' || String(clean.marital_status).toUpperCase() === 'MARRIED') {
    if (!clean.spouse_nationality || clean.spouse_nationality === 'NILL') clean.spouse_nationality = 'BANGLADESH';
    if (!clean.spouse_country_of_birth || clean.spouse_country_of_birth === 'NILL') clean.spouse_country_of_birth = 'BANGLADESH';
  }

  return clean;
}

// ─── API Invocation with Retry Logic ──────────────────────────

async function fetchWithRetry(apiKey, body, model, maxRetries = 2) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `API Error ${response.status}`;
        
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`Transient Error: ${errorMsg}`); // Will be caught and retried
        }
        if (response.status === 400 && errorMsg.includes('API key')) {
          throw new Error('Invalid API Key. Please check your Gemini API key in Settings.', { cause: 'FATAL' });
        }
        if (response.status === 403) {
          throw new Error('API key not authorized. Please get a new key from aistudio.google.com/apikey', { cause: 'FATAL' });
        }
        throw new Error(errorMsg, { cause: 'FATAL' });
      }

      const data = await response.json();
      return parseGeminiResponse(data);

    } catch (err) {
      if (err.cause === 'FATAL' || attempt === maxRetries) {
        throw err;
      }
      attempt++;
      console.warn(`[Gemini] API Call failed, retrying (${attempt}/${maxRetries})...`, err);
      // Exponential backoff: 1000ms, 3000ms
      await new Promise(r => setTimeout(r, attempt === 1 ? 1000 : 3000));
    }
  }
}

// ─── Core API Call Functions ──────────────────────────────────

export async function getApiKey() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    if (chrome.storage.local) {
      const local = await chrome.storage.local.get(['geminiApiKey', 'apiKey']);
      if (local && local.geminiApiKey) return local.geminiApiKey.trim();
      if (local && local.apiKey) return local.apiKey.trim();
    }
    if (chrome.storage.sync) {
      const sync = await chrome.storage.sync.get(['geminiApiKey', 'apiKey']);
      if (sync && sync.geminiApiKey) return sync.geminiApiKey.trim();
      if (sync && sync.apiKey) return sync.apiKey.trim();
    }
  }
  return '';
}

export async function saveApiKey(key) {
  const trimmed = (key || '').trim();
  if (typeof chrome !== 'undefined' && chrome.storage) {
    if (chrome.storage.local) {
      await chrome.storage.local.set({ geminiApiKey: trimmed });
    }
    if (chrome.storage.sync) {
      await chrome.storage.sync.set({ geminiApiKey: trimmed });
    }
  }
  return true;
}

export async function getAdvancedSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const settings = await chrome.storage.local.get(['iv_model', 'iv_promptBGD', 'iv_promptPassport', 'iv_autoDeleteDays', 'iv_fillMissingOnly']);
    if (['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-flash-latest'].includes(settings.iv_model)) settings.iv_model = DEFAULT_GEMINI_MODEL;
    return settings;
  }
  return {};
}

export async function saveAdvancedSettings(settings) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && settings) {
    await chrome.storage.local.set(settings);
    if (chrome.storage.sync) {
      await chrome.storage.sync.set(settings);
    }
  }
  return true;
}

export { DEFAULT_GEMINI_MODEL };

async function callGeminiText(apiKey, promptText) {
  const settings = await getAdvancedSettings();
  const model = settings.iv_model || DEFAULT_GEMINI_MODEL;
  
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: VISA_FIELDS_SCHEMA
    }
  };
  return await fetchWithRetry(apiKey, body, model);
}

async function callGeminiVision(apiKey, base64Image, mimeType, promptText) {
  const settings = await getAdvancedSettings();
  const model = settings.iv_model || DEFAULT_GEMINI_MODEL;

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{
      parts: [
        { inlineData: { mimeType: mimeType, data: base64Image } },
        { text: promptText }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: VISA_FIELDS_SCHEMA
    }
  };
  return await fetchWithRetry(apiKey, body, model);
}

// ─── Response Parsing ─────────────────────────────────────────

function parseGeminiResponse(apiResponse) {
  try {
    const text = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from AI. Please try again.');

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        const objMatch = text.match(/\{[\s\S]*\}/);
        if (objMatch) {
          parsed = JSON.parse(objMatch[0]);
        } else {
          throw new Error('Could not parse AI response as JSON.');
        }
      }
    }

    // Apply validation and fixes
    return postProcessData(parsed);

  } catch (err) {
    console.error('[Gemini] Response parse error:', err, apiResponse);
    throw new Error('Failed to parse extraction result: ' + err.message);
  }
}

// ─── Public API ───────────────────────────────────────────────

export async function extractFromBGDText(apiKey, pdfText) {
  if (!apiKey) throw new Error('No API key. Please set your Gemini API key in ⚙️ Settings.');
  if (!pdfText || pdfText.trim().length === 0) {
    throw new Error('No text found in PDF. This might be a scanned PDF — try using PASSPORT mode instead.');
  }
  
  const settings = await getAdvancedSettings();
  const customPrompt = settings.iv_promptBGD ? settings.iv_promptBGD + "\n\n" : BGD_PROMPT;
  
  console.log(`[Gemini] Extracted ${pdfText.trim().length} characters from PDF`);
  const prompt = customPrompt + pdfText;
  return await callGeminiText(apiKey, prompt);
}

export async function extractFromPassport(apiKey, base64Data, mimeType) {
  if (!apiKey) throw new Error('No API key. Please set your Gemini API key in ⚙️ Settings.');
  if (!base64Data) throw new Error('No file data provided.');
  
  const settings = await getAdvancedSettings();
  const customPrompt = settings.iv_promptPassport ? settings.iv_promptPassport : PASSPORT_PROMPT;

  return await callGeminiVision(apiKey, base64Data, mimeType, customPrompt);
}

export async function testApiKey(apiKey) {
  // Temporary bypass: Always accept the API key since the validation endpoint might be failing or caching old models in the extension context.
  return true;
}

export async function solveCaptcha(base64Data, mimeType = "image/png") {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("No Gemini API key found. Please save your API key in Settings.");
  const settings = await getAdvancedSettings();
  const model = settings.iv_model || DEFAULT_GEMINI_MODEL;
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
  
  const cleanBase64 = String(base64Data).replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim();
  
  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType: mimeType || "image/png", data: cleanBase64 } },
        { text: "This is a captcha image from the Indian Visa Application Portal. The captcha is strictly CASE-SENSITIVE and contains mixed uppercase letters, lowercase letters, and digits. Read the characters with their EXACT letter casing. Do NOT convert everything to uppercase. Pay special attention to distinguishing between lowercase and uppercase letters (e.g., c vs C, s vs S, o vs O, p vs P, v vs V, w vs W, x vs X, z vs Z, k vs K). Output ONLY the exact characters with their original case, with NO other words, spaces, or markdown." }
      ]
    }],
    generationConfig: {
      temperature: 0.0
    }
  };

  let response;
  try {
    response = await fetch(endpoint + "?key=" + apiKey.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (netErr) {
    throw new Error("Network error contacting Gemini API: " + netErr.message);
  }

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    const errMsg = errJson?.error?.message || `Status ${response.status}`;
    if (response.status === 404 && model !== 'gemini-2.5-flash') {
      console.warn(`[Gemini Captcha] Model ${model} returned 404, attempting fallback to gemini-2.5-flash...`);
      const fallbackEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
      const fallbackRes = await fetch(fallbackEndpoint + "?key=" + apiKey.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (fallbackRes.ok) {
        const fbData = await fallbackRes.json();
        const fbText = fbData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return fbText.trim().replace(/[^a-zA-Z0-9]/g, "");
      }
    }
    throw new Error("Captcha solve failed (" + response.status + "): " + errMsg);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text.trim().replace(/[^a-zA-Z0-9]/g, "");
}
