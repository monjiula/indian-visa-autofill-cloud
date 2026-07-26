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
const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

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
    mother_name:          { type: "string" },
    mother_place_of_birth:{ type: "string" },
    marital_status:       { type: "string" },
    spouse_name:          { type: "string" },
    spouse_place_of_birth:{ type: "string" },
    occupation:           { type: "string" },
    empname:              { type: "string" },
    empdesignation:       { type: "string" },
    empaddress:           { type: "string" },
    entrypoint:           { type: "string" },
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
10. entrypoint: Identify the Indian entry port and map to correct spelling if possible (e.g., "GHOJADANGA(BENAPOLE)", "KOLKATA AIRPORT", "BY ROAD HARIDASPUR", "AGARTALA", "HILI ROAD", "CHANGRABANDHA").
11. identity_marks: "NA" if not specified.
12. old_visa_type_id: "3" (Tourist), "16" (Medical), "87" (Double Entry), "4" (Business), "5" (Student). Use "NILL" if no old visa.
13. Phone/Mobile numbers should only contain digits, remove spaces or symbols.

Return ONLY valid JSON matching the required schema. No explanations, no markdown.`;

// ─── BGD PDF Text Extraction Prompt ───────────────────────────

const BGD_PROMPT = `Extract ALL applicant details from this extracted Indian Visa Application text (previously filled application).

Carefully extract the following and map to the JSON schema:
- Personal info: Name (split Surname/Given Name), DOB, Gender, Religion, Education, Nationality, Citizenship/NID.
- Passport details: Number, Issue Date, Expiry Date, Place of Issue.
- Address: Present and Permanent addresses (Add1, Add2, City, Country, Pincode). Phone numbers.
- Family: Father, Mother, Spouse (Names, Nationality, Place of birth).
- Employment: Occupation, Employer Name, Designation, Address.
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
  if (clean.entrypoint && clean.entrypoint !== 'NILL') {
    const ep = clean.entrypoint;
    if (ep.includes('BENAPOLE') || ep.includes('GHOJADANGA')) clean.entrypoint = 'GHOJADANGA(BENAPOLE)';
    else if (ep.includes('AGARTALA') || ep.includes('AKHAURA')) clean.entrypoint = 'AGARTALA';
    else if (ep.includes('HILI')) clean.entrypoint = 'HILI ROAD';
    else if (ep.includes('HARIDASPUR') || ep.includes('PETRAPOLE')) clean.entrypoint = 'BY ROAD HARIDASPUR';
    else if (ep.includes('CHANGRABANDHA') || ep.includes('BURIMARI')) clean.entrypoint = 'CHANGRABANDHA';
    else if (ep.includes('CCU') || ep.includes('KOLKATA AIRPORT') || ep.includes('DUM DUM')) clean.entrypoint = 'KOLKATA AIRPORT';
    else if (ep.includes('DEL') || ep.includes('DELHI AIRPORT')) clean.entrypoint = 'DELHI AIRPORT';
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

async function getAdvancedSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const settings = await chrome.storage.local.get(['iv_model', 'iv_promptBGD', 'iv_promptPassport']);
    if (settings.iv_model === 'gemini-1.5-flash' || settings.iv_model === 'gemini-2.5-flash') settings.iv_model = DEFAULT_GEMINI_MODEL;
    return settings;
  }
  return {};
}

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
  try {
    const settings = await getAdvancedSettings();
    const model = settings.iv_model || DEFAULT_GEMINI_MODEL;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Reply with just: OK' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 5 }
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}
