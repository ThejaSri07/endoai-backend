// auth.js — Calls real FastAPI backend via api.js

import { apiLogin, apiRegister, apiLogout, getCurrentUser as _getCurrentUser } from "./api";

// ── Register — sends security questions to backend ────────────
export async function registerUser({ name, email, password, designation, clinic, question_1, answer_1, question_2, answer_2, question_3, answer_3 }) {
  try {
    await apiRegister({ name, email, password, designation, clinic, question_1, answer_1, question_2, answer_2, question_3, answer_3 });
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message || "Registration failed." };
  }
}

// ── Login ─────────────────────────────────────────────────────
export async function loginUser(email, password) {
  try {
    await apiLogin(email, password);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message || "Invalid email or password." };
  }
}

export function getCurrentUser() {
  return _getCurrentUser();
}

export function logoutUser() {
  apiLogout();
}

export async function getUserCases() {
  try {
    const { apiGetCases } = await import("./api");
    return await apiGetCases();
  } catch {
    const user = _getCurrentUser();
    if (!user) return [];
    return JSON.parse(localStorage.getItem("endoai_cases_" + user.id)) || JSON.parse(localStorage.getItem("endoai_local_cases")) || [];
  }
}

export function saveUserCase(caseData) {
  const user = _getCurrentUser();
  if (!user) return;
  const key = "endoai_cases_" + user.id;
  const existing = JSON.parse(localStorage.getItem(key)) || [];
  existing.unshift(caseData);
  localStorage.setItem(key, JSON.stringify(existing));
}