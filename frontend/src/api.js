// api.js — All calls to the real FastAPI backend

const BASE_URL = "https://endoai-backend.onrender.com";

// ── Supabase Direct Database Config ──────────────────────────────
const SUPABASE_URL = "https://wsaghkfmwigrmjtzcfkg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzYWdoa2Ztd2lncm1qdHpjZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MzU2NjMsImV4cCI6MjEwMjAxMTY2M30.l-H8CJtdvFUNxN-xXSUQOh394ZlRrqwGELPmIU7gitY";

const SUPA_HEADERS = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};


// ── Auth helpers ──────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("endoai_token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`,
  };
}

// ── Register ──────────────────────────────────────────────────
export async function apiRegister({ name, email, password, designation, clinic, question_1, answer_1, question_2, answer_2, question_3, answer_3 }) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, designation, clinic, question_1, answer_1, question_2, answer_2, question_3, answer_3 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  localStorage.setItem("endoai_token", data.token);
  localStorage.setItem("endoai_user", JSON.stringify(data.user));
  return data;
}

// ── Login ─────────────────────────────────────────────────────
export async function apiLogin(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Invalid email or password");
  localStorage.setItem("endoai_token", data.token);
  localStorage.setItem("endoai_user", JSON.stringify(data.user));
  return data;
}

// ── Logout ────────────────────────────────────────────────────
export function apiLogout() {
  localStorage.removeItem("endoai_token");
  localStorage.removeItem("endoai_user");
  localStorage.removeItem("endoai_last_result");
}

// ── Get current user from localStorage ───────────────────────
export function getCurrentUser() {
  const u = localStorage.getItem("endoai_user");
  return u ? JSON.parse(u) : null;
}

// ── Get current user's id (used by notifications.js for a per-user key) ──
export function getCurrentUserId() {
  const user = getCurrentUser();
  return user ? user.id : null;
}

// ── Patients (Supabase Cloud Database + Local Fallback Sync) ──────
function getPatientsKey() {
  const user = getCurrentUser();
  return `endoai_patients_${user ? user.id : "guest"}`;
}

export async function apiGetPatients() {
  const user = getCurrentUser();
  const uid = user ? user.id : null;
  const key = getPatientsKey();

  let rawPatients = [];
  // 1. Direct Supabase Query (Filtered by user_id)
  try {
    const filter = uid ? `user_id=eq.${uid}&` : "";
    const url = `${SUPABASE_URL}/rest/v1/patients?${filter}select=*&order=created_at.desc`;
    const res = await fetch(url, { headers: SUPA_HEADERS });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        rawPatients = data;
      }
    }
  } catch (e) {
    console.warn("Supabase patient fetch failed, falling back to local:", e);
  }

  if (rawPatients.length === 0) {
    try {
      rawPatients = JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      rawPatients = [];
    }
  }

  // Deduplicate by name + phone or patient_id
  const seen = new Set();
  const deduped = [];
  for (const p of rawPatients) {
    const nameKey = (p.name || "").trim().toLowerCase();
    const phoneKey = (p.phone || "").trim();
    const idKey = (p.patient_id || p.id || "").trim();
    const comboKey = phoneKey && phoneKey !== "—" ? `${nameKey}_${phoneKey}` : (nameKey || idKey);
    
    if (nameKey && !seen.has(comboKey)) {
      seen.add(comboKey);
      deduped.push(p);
    }
  }

  localStorage.setItem(key, JSON.stringify(deduped));
  return deduped;
}

export async function apiCreatePatient(patient) {
  const user = getCurrentUser();
  const uid = user ? user.id : null;
  const key = getPatientsKey();
  const patName = (patient.name || "").trim();
  const patPhone = (patient.phone || "").trim();
  const patIdStr = patient.patient_id || patient.id || ("P-" + Date.now().toString().slice(-4));
  const ageInt = patient.age ? parseInt(patient.age, 10) : null;

  if (!patName || patName === "Unknown Patient") {
    return patient;
  }

  // Check if patient already exists in local list
  const currentPatients = JSON.parse(localStorage.getItem(key)) || [];
  const existing = currentPatients.find(p => 
    (p.patient_id && p.patient_id === patIdStr) ||
    (patPhone && p.phone === patPhone) ||
    (p.name && p.name.trim().toLowerCase() === patName.toLowerCase() && patPhone && p.phone === patPhone)
  );

  if (existing) {
    return existing;
  }

  const payload = {
    user_id: uid,
    patient_id: patIdStr,
    name: patName,
    age: isNaN(ageInt) ? null : ageInt,
    gender: patient.gender || "Other",
    phone: patPhone,
    email: patient.email || "",
    history: patient.history || ""
  };

  // 1. Save to Supabase Cloud Database
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/patients`, {
      method: "POST",
      headers: SUPA_HEADERS,
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const savedArr = await res.json();
      if (Array.isArray(savedArr) && savedArr.length > 0) {
        const saved = savedArr[0];
        const updated = [saved, ...currentPatients.filter(p => p.id !== saved.id && p.patient_id !== saved.patient_id)];
        localStorage.setItem(key, JSON.stringify(updated));
        return saved;
      }
    }
  } catch (e) {
    console.warn("Supabase patient insert failed, saving locally:", e);
  }

  // 2. Local fallback save
  const fallback = {
    ...payload,
    id: patient.id || `local_${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  const updated = [fallback, ...currentPatients.filter(p => p.id !== fallback.id && p.patient_id !== fallback.patient_id)];
  localStorage.setItem(key, JSON.stringify(updated));
  return fallback;
}

export async function apiDeletePatient(id) {
  // 1. Delete from Supabase
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/patients?or=(id.eq.${id},patient_id.eq.${id})`, {
      method: "DELETE",
      headers: SUPA_HEADERS,
    });
  } catch (e) {
    console.warn("Supabase delete patient error:", e);
  }

  // 2. Remove locally
  const patients = JSON.parse(localStorage.getItem(getPatientsKey())) || [];
  const filtered = patients.filter(p => p.id !== id && p.patient_id !== id);
  localStorage.setItem(getPatientsKey(), JSON.stringify(filtered));
  return { success: true };
}

// ── Save a completed case directly to Supabase + Local Cache ──────
export async function apiSaveCase(caseData) {
  const user = getCurrentUser();
  const uid = user ? user.id : null;
  const cId = caseData.caseId || caseData.case_id || ("CASE-" + Date.now().toString().slice(-6));
  const pId = caseData.patientId || caseData.patient_id || "P-0001";
  const r = caseData.result || caseData;

  const casePayload = {
    user_id: uid,
    case_id: cId,
    patient_id: pId,
    tooth: String(caseData.tooth || "16"),
    notes: caseData.notes || "",
    slice_count: caseData.files ? caseData.files.length : (caseData.sliceCount || caseData.slice_count || 16),
  };

  // 1. Save to Supabase Cloud Database (cases & results tables)
  try {
    const caseRes = await fetch(`${SUPABASE_URL}/rest/v1/cases`, {
      method: "POST",
      headers: SUPA_HEADERS,
      body: JSON.stringify(casePayload),
    });

    if (caseRes.ok) {
      const createdCases = await caseRes.json();
      if (Array.isArray(createdCases) && createdCases.length > 0) {
        const createdCase = createdCases[0];

        const resultsPayload = {
          case_id: createdCase.id,
          n_canals: r.n_canals || r.nCanals || (r.canals ? r.canals.length : 3),
          canal_volume: parseFloat(r.canal_volume || r.canalVolume || r.volume || 420.5),
          canal_length: parseFloat(r.canal_length || r.canalLength || r.length || 4.2),
          curvature: parseFloat(r.curvature || (r.curvatureAngle ? parseFloat(r.curvatureAngle) : 18.5)),
          dentin: parseFloat(r.dentin || r.dentinThickness || 1.5),
          risk: r.risk || "Low",
          taper: r.taper || "0.06",
          apical: r.apical || "#30",
          irrigation: r.irrigation || "NaOCl 2%",
          obturation: r.obturation || "Single cone",
          calcification: parseFloat(r.calcification || 300.0),
          ledge_risk: parseFloat(r.ledge_risk || r.ledgeRisk || 350.0),
          perf_risk: parseFloat(r.perf_risk || r.perfRisk || 150.0),
          sep_risk: parseFloat(r.sep_risk || r.sepRisk || 220.0),
          source: r.source || "ai_model",
        };

        await fetch(`${SUPABASE_URL}/rest/v1/results`, {
          method: "POST",
          headers: SUPA_HEADERS,
          body: JSON.stringify(resultsPayload),
        });
      }
    }
  } catch (e) {
    console.warn("Supabase case insert failed, saving locally:", e);
  }

  // 2. Save locally for instant UI update & offline support
  try {
    const key = uid ? `endoai_cases_${uid}` : "endoai_cases_guest";
    const local = JSON.parse(localStorage.getItem(key)) || [];
    const updated = [caseData, ...local.filter(c => (c.caseId || c.case_id) !== cId)];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (e) {
    console.warn("saveLocalCase error:", e);
  }

  return caseData;
}

export function saveLocalCase(caseData) {
  return apiSaveCase(caseData);
}

// ── Get all cases from Supabase Cloud Database View (case_summary) ─
export async function apiGetCases() {
  const user = getCurrentUser();
  const uid = user ? user.id : null;
  const key = uid ? `endoai_cases_${uid}` : "endoai_cases_guest";

  // 1. Direct Supabase Query on case_summary view filtered by user_id
  try {
    const filter = uid ? `user_id=eq.${uid}&` : "";
    const url = `${SUPABASE_URL}/rest/v1/case_summary?${filter}select=*&order=upload_date.desc`;
    const res = await fetch(url, { headers: SUPA_HEADERS });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        // Normalize fields for Dashboard, History, and Reports
        const normalized = data.map(c => ({
          ...c,
          caseId: c.case_id || c.id,
          patientId: c.patient_id,
          uploadDate: c.upload_date,
          curvature: c.curvature || 0,
          risk: c.risk || "Low",
          result: {
            risk: c.risk || "Low",
            curvature: c.curvature || 0,
            curvatureAngle: c.curvature ? `${c.curvature}°` : "0°",
            n_canals: c.n_canals || 3,
            canal_volume: c.canal_volume || 0,
            canal_length: c.canal_length || 0,
            dentin: c.dentin || 1.5,
            taper: c.taper || "0.06",
            apical: c.apical || "#30",
            irrigation: c.irrigation || "NaOCl 2%",
            obturation: c.obturation || "Single cone",
            calcification: c.calcification || 0,
            ledge_risk: c.ledge_risk || 0,
            perf_risk: c.perf_risk || 0,
            sep_risk: c.sep_risk || 0,
          }
        }));

        localStorage.setItem(key, JSON.stringify(normalized));
        return normalized;
      }
    }
  } catch (e) {
    console.warn("Supabase case_summary fetch failed, falling back to local:", e);
  }

  // 2. Local fallback strictly for this user
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

// ── Security Questions: Get questions for an email (localStorage) ──
// Login.jsx calls this during Forgot Password Step 1
export async function apiGetSecurityQuestions(email) {
  try {
    const users = JSON.parse(localStorage.getItem("endoai_users")) || [];
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { exists: false, error: "No account found with this email." };
    if (!user.securityQuestions || user.securityQuestions.length < 3)
      return { exists: false, error: "No security questions set for this account." };
    return {
      exists: true,
      name: user.name,
      questions: user.securityQuestions.map((sq) => sq.q),
    };
  } catch {
    return { exists: false, error: "Something went wrong. Try again." };
  }
}

// ── Security Questions: Verify answers (localStorage) ────────────
// Login.jsx calls this during Forgot Password Step 2
export async function apiVerifySecurityAnswers(email, answers) {
  try {
    const users = JSON.parse(localStorage.getItem("endoai_users")) || [];
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { success: false, error: "Account not found." };

    const correct = user.securityQuestions.every(
      (sq, i) => sq.a === (answers[i] || "").trim().toLowerCase()
    );
    if (!correct) return { success: false, error: "One or more answers are incorrect." };
    return { success: true };
  } catch {
    return { success: false, error: "Something went wrong. Try again." };
  }
}

// ── Reset Password (localStorage) ────────────────────────────────
// Login.jsx calls this during Forgot Password Step 3
export async function apiResetPassword(email, newPassword) {
  try {
    const users = JSON.parse(localStorage.getItem("endoai_users")) || [];
    const idx = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) return { success: false };
    users[idx].password = newPassword;
    localStorage.setItem("endoai_users", JSON.stringify(users));
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ── Wake backend (prevents Render free tier cold start delay) ─────
export async function wakeBackend() {
  try { await fetch(`${BASE_URL}/health`); } catch (_) { }
}

// ── Analyze (upload DICOM files + form data to real backend) ─
export async function apiAnalyze({ files, patientId, tooth, notes, caseId }) {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  form.append("patient_id", patientId);
  form.append("tooth", tooth);
  form.append("notes", notes || "");
  form.append("case_id", caseId);

  // 90-second abort controller to allow Render cold-start to wake up
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(`${BASE_URL}/analyze`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getToken()}`,
      },
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Analysis failed on AI backend server");
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("AI Backend connection timed out (90s). The server took too long to wake up.");
    }
    throw err;
  }
}

const FALLBACK_SECURITY_QUESTIONS = [
  "What is the name of your first dental clinic or hospital?",
  "In what city did you complete your dental degree?",
  "What was the name of your first mentor in endodontics?",
  "What was your childhood nickname?",
  "What is the name of the street you grew up on?",
  "What was the make and model of your first car?",
  "What was your favorite subject in dental school?",
  "What is your mother's maiden name?",
  "What is the name of your first pet?"
];

// ── Security Questions (for registration) ─────────────────────
export async function apiGetSecurityQuestionsRandom() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${BASE_URL}/auth/security-questions/random`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.questions) && data.questions.length >= 3) {
        return data;
      }
    }
  } catch (e) {
    console.warn("Using offline fallback security questions:", e);
  }

  // Instant fallback questions
  const shuffled = [...FALLBACK_SECURITY_QUESTIONS].sort(() => 0.5 - Math.random());
  return {
    questions: shuffled.slice(0, 3)
  };
}

// ── Forgot Password Step 1: Verify email → returns questions ──
export async function apiForgotVerifyEmail(email) {
  const res = await fetch(`${BASE_URL}/auth/forgot/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Email verification failed");
  return data;
}

// ── Forgot Password Step 2: Verify security answers ───────────
export async function apiForgotVerifyAnswers(email, answer_1, answer_2, answer_3) {
  const res = await fetch(`${BASE_URL}/auth/forgot/verify-answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, answer_1, answer_2, answer_3 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Answer verification failed");
  return data;
}

// ── Forgot Password Step 3: Reset password ────────────────────
export async function apiForgotResetPassword(email, new_password) {
  const res = await fetch(`${BASE_URL}/auth/forgot/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, new_password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Password reset failed");
  return data;
}