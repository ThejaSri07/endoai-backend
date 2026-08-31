// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../auth";
import { apiGetSecurityQuestionsRandom, apiForgotVerifyEmail, apiForgotVerifyAnswers, apiForgotResetPassword } from "../api";

// ── Styles ─────────────────────────────────────────────────────
const pageStyle = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #0A3D62 0%, #1565A8 50%, #0A3D62 100%)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "24px 16px", position: "relative", overflow: "hidden",
};
const dec1 = { position: "absolute", top: "-80px", right: "-80px", width: "340px", height: "340px", borderRadius: "50%", background: "rgba(0,180,216,0.10)", pointerEvents: "none" };
const dec2 = { position: "absolute", bottom: "-100px", left: "-60px", width: "280px", height: "280px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" };

const cardStyle = {
  width: "100%", maxWidth: "460px", background: "#fff",
  borderRadius: "20px", padding: "36px 40px",
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)", position: "relative", zIndex: 1,
};

const tabWrap = { display: "flex", background: "var(--surface)", borderRadius: "10px", padding: "4px", marginBottom: "22px", border: "1px solid var(--border)" };
const tabBtn = (active) => ({
  flex: 1, padding: "9px", textAlign: "center", fontSize: "13.5px",
  fontWeight: active ? "700" : "500", color: active ? "var(--primary)" : "var(--text-muted)",
  background: active ? "#fff" : "transparent",
  border: active ? "1px solid var(--border)" : "1px solid transparent",
  borderRadius: "8px", cursor: "pointer", transition: "all 0.18s",
  boxShadow: active ? "var(--shadow-sm)" : "none",
});

const fieldStyle = { marginBottom: "13px" };
const labelStyle = { display: "block", fontSize: "12.5px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "5px" };
const iconWrap = { position: "relative" };
const iconInner = { position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" };
const twoCol = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" };

const alertStyle = (t) => ({
  padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: "13px", marginBottom: "14px",
  background: t === "error" ? "var(--danger-bg)" : t === "info" ? "var(--info-bg)" : "var(--success-bg)",
  color: t === "error" ? "var(--danger)" : t === "info" ? "var(--info)" : "var(--success)",
  fontWeight: "600", display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: 1.5,
});

const btnStyle = (loading, bg) => ({
  width: "100%", height: "44px", marginTop: "6px",
  background: bg || "var(--primary)", color: "#fff", border: "none",
  borderRadius: "var(--radius)", fontSize: "14px", fontWeight: "700",
  cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
});

const ICONS = {
  email: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  lock: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
  user: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  building: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  shield: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
};

function IconInput({ icon, type, ...props }) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div style={iconWrap}>
      <span style={iconInner}>{icon}</span>
      <input {...props} type={isPass ? (show ? "text" : "password") : type}
        style={{ paddingLeft: "38px", paddingRight: isPass ? "44px" : "12px", height: "42px", fontSize: "13.5px" }} />
      {isPass && (
        <span onClick={() => setShow(!show)}
          style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "var(--text-muted)", fontSize: "11.5px", fontWeight: "600", userSelect: "none" }}>
          {show ? "Hide" : "Show"}
        </span>
      )}
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [view, setView] = useState("login"); // login | register | forgot
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [regStep, setRegStep] = useState(1); // 1=basic info 2=security questions

  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register
  const [reg, setReg] = useState({ name: "", email: "", password: "", confirm: "", designation: "Endodontist", clinic: "" });
  const [questions, setQuestions] = useState([]); // 3 random questions from backend
  const [answers, setAnswers] = useState(["", "", ""]);
  const [qLoading, setQLoading] = useState(false);

  // Forgot password — 3 steps
  const [forgotStep, setForgotStep] = useState(1); // 1=email 2=questions 3=new pass
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotQuestions, setForgotQ] = useState([]);
  const [forgotAnswers, setForgotAnswers] = useState(["", "", ""]);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const showAlert = (type, msg) => setAlert({ type, msg });

  // ── Password strength check ─────────────────────────────────
  const checkPasswordStrength = (pw) => {
    const checks = {
      length: pw.length >= 8,
      upper: /[A-Z]/.test(pw),
      lower: /[a-z]/.test(pw),
      number: /[0-9]/.test(pw),
      symbol: /[^A-Za-z0-9]/.test(pw),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    return { checks, passed, isStrong: passed === 5 };
  };
  const switchView = (v) => { setView(v); setAlert(null); setRegStep(1); setForgotStep(1); setForgotEmail(""); setForgotQ([]); setForgotAnswers(["", "", ""]); setNewPass(""); setConfirmPass(""); };

  // Load random questions when user moves to step 2 of registration
  const loadQuestions = async () => {
    setQLoading(true);
    try {
      const res = await apiGetSecurityQuestionsRandom();
      setQuestions(res?.questions || [
        "What is the name of your first dental clinic or hospital?",
        "In what city did you complete your dental degree?",
        "What was the name of your first mentor in endodontics?"
      ]);
      setAnswers(["", "", ""]);
    } catch {
      setQuestions([
        "What is the name of your first dental clinic or hospital?",
        "In what city did you complete your dental degree?",
        "What was the name of your first mentor in endodontics?"
      ]);
      setAnswers(["", "", ""]);
    } finally {
      setQLoading(false);
    }
  };

  // ── Sign In ────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) { showAlert("error", "Please enter your email and password."); return; }
    setLoading(true); setAlert(null);
    const res = await loginUser(email, password);
    setLoading(false);
    if (!res.success) showAlert("error", res.message || "Login failed.");
    else navigate("/dashboard");
  };

  // ── Register Step 1 → Step 2 ───────────────────────────────
  const handleRegStep1 = async () => {
    const { name, email, password, confirm, designation, clinic } = reg;
    if (!name || !email || !password || !confirm) { showAlert("error", "Please fill in all required fields."); return; }
    if (password !== confirm) { showAlert("error", "Passwords do not match."); return; }
    const strength = checkPasswordStrength(password);
    if (!strength.isStrong) {
      const missing = [];
      if (!strength.checks.length) missing.push("at least 8 characters");
      if (!strength.checks.upper) missing.push("an uppercase letter");
      if (!strength.checks.lower) missing.push("a lowercase letter");
      if (!strength.checks.number) missing.push("a number");
      if (!strength.checks.symbol) missing.push("a symbol (e.g. !@#$%)");
      showAlert("error", `Password needs: ${missing.join(", ")}.`);
      return;
    }
    setAlert(null);
    await loadQuestions();
    setRegStep(2);
  };

  // ── Register Step 2: Submit with questions ─────────────────
  const handleRegister = async () => {
    if (answers.some(a => !a.trim())) { showAlert("error", "Please answer all 3 security questions."); return; }
    setLoading(true); setAlert(null);
    const res = await registerUser({
      ...reg,
      question_1: questions[0], answer_1: answers[0],
      question_2: questions[1], answer_2: answers[1],
      question_3: questions[2], answer_3: answers[2],
    });
    setLoading(false);
    if (!res.success) showAlert("error", res.message || "Registration failed.");
    else navigate("/dashboard");
  };

  // ── Forgot Step 1: Verify email → get questions ────────────
  const handleForgotEmail = async () => {
    if (!forgotEmail) { showAlert("error", "Please enter your email address."); return; }
    setLoading(true); setAlert(null);
    try {
      const res = await apiForgotVerifyEmail(forgotEmail);
      setForgotQ([res.question_1, res.question_2, res.question_3]);
      setForgotAnswers(["", "", ""]);
      setForgotStep(2);
      setAlert(null);
    } catch (err) {
      showAlert("error", err.message || "No account found with this email.");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Step 2: Verify answers ─────────────────────────
  const handleForgotAnswers = async () => {
    if (forgotAnswers.some(a => !a.trim())) { showAlert("error", "Please answer all 3 questions."); return; }
    setLoading(true); setAlert(null);
    try {
      await apiForgotVerifyAnswers(forgotEmail, forgotAnswers[0], forgotAnswers[1], forgotAnswers[2]);
      setForgotStep(3);
      setAlert(null);
    } catch (err) {
      showAlert("error", err.message || "One or more answers are incorrect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Step 3: Reset password ─────────────────────────
  const handleForgotReset = async () => {
    if (!newPass || !confirmPass) { showAlert("error", "Please fill in both fields."); return; }
    if (newPass !== confirmPass) { showAlert("error", "Passwords do not match."); return; }
    const strengthCheck = checkPasswordStrength(newPass);
    if (!strengthCheck.isStrong) {
      const missing = [];
      if (!strengthCheck.checks.length) missing.push("at least 8 characters");
      if (!strengthCheck.checks.upper) missing.push("an uppercase letter");
      if (!strengthCheck.checks.lower) missing.push("a lowercase letter");
      if (!strengthCheck.checks.number) missing.push("a number");
      if (!strengthCheck.checks.symbol) missing.push("a symbol (e.g. !@#$%)");
      showAlert("error", `Password needs: ${missing.join(", ")}.`);
      return;
    }
    setLoading(true); setAlert(null);
    try {
      await apiForgotResetPassword(forgotEmail, newPass);
      showAlert("success", "Password updated! Redirecting to sign in…");
      setTimeout(() => switchView("login"), 2000);
    } catch (err) {
      // Backend also rejects if new password matches the old one (can't check that client-side, since we never have the old plaintext)
      showAlert("error", err.message || "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Password strength (same 5-point rule as registration, for a consistent bar)
  const strength = (p) => {
    if (!p) return null;
    const s = checkPasswordStrength(p);
    const label = s.passed <= 2 ? "Weak" : s.passed <= 4 ? "Okay" : "Strong";
    const color = s.passed <= 2 ? "var(--danger)" : s.passed <= 4 ? "var(--warning)" : "var(--success)";
    return { label, color, pct: (s.passed / 5) * 100 };
  };
  const s = strength(newPass);

  return (
    <div style={pageStyle}>
      <div style={dec1} /><div style={dec2} />
      <div style={cardStyle}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "50px", height: "50px", background: "var(--primary)", borderRadius: "14px", marginBottom: "10px" }}>
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          </div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--primary)", letterSpacing: "-0.5px" }}>EndoAI</div>
          <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>AI-Based Volumetric Canal Planning</div>
        </div>

        {/* Tabs */}
        {view !== "forgot" && (
          <div style={tabWrap}>
            <button style={tabBtn(view === "login")} onClick={() => switchView("login")}>Sign In</button>
            <button style={tabBtn(view === "register")} onClick={() => switchView("register")}>Create Account</button>
          </div>
        )}

        {alert && (
          <div style={alertStyle(alert.type)}>
            <span>{alert.type === "error" ? "⚠" : "✓"}</span>
            <span>{alert.msg}</span>
          </div>
        )}

        {/* ══ LOGIN ══ */}
        {view === "login" && (
          <form onSubmit={handleLogin}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email Address</label>
              <IconInput icon={ICONS.email} type="email" placeholder="doctor@clinic.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Password</label>
              <IconInput icon={ICONS.lock} type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div style={{ textAlign: "right", marginBottom: "14px", marginTop: "-4px" }}>
              <span onClick={() => switchView("forgot")} style={{ fontSize: "12.5px", color: "var(--primary-light)", fontWeight: "600", cursor: "pointer" }}>
                Forgot Password?
              </span>
            </div>
            <button type="submit" style={btnStyle(loading)} disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <div style={{ textAlign: "center", marginTop: "14px", fontSize: "13px", color: "var(--text-muted)" }}>
              Don't have an account?{" "}
              <span onClick={() => switchView("register")} style={{ color: "var(--primary-light)", fontWeight: "600", cursor: "pointer" }}>Register here</span>
            </div>
          </form>
        )}

        {/* ══ REGISTER ══ */}
        {view === "register" && (
          <div>
            {/* Step progress */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }}>
              {[1, 2].map(s => (
                <div key={s} style={{ flex: 1, height: "4px", borderRadius: "10px", background: regStep >= s ? "var(--primary-light)" : "var(--border)", transition: "background 0.3s" }} />
              ))}
            </div>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>
              {regStep === 1 ? "Step 1 — Account Details" : "Step 2 — Security Questions"}
            </div>

            {/* Step 1 */}
            {regStep === 1 && (
              <>
                <div style={twoCol}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Full Name</label>
                    <IconInput icon={ICONS.user} type="text" placeholder="Dr. Jane Smith" value={reg.name} onChange={e => setReg({ ...reg, name: e.target.value })} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Designation</label>
                    <select value={reg.designation} onChange={e => setReg({ ...reg, designation: e.target.value })} style={{ height: "42px", fontSize: "13.5px" }}>
                      <option>Endodontist</option><option>General Dentist</option>
                      <option>Oral Surgeon</option><option>Prosthodontist</option><option>Researcher</option>
                    </select>
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Clinic / Hospital Name</label>
                  <IconInput icon={ICONS.building} type="text" placeholder="e.g. Smile Dental Clinic" value={reg.clinic} onChange={e => setReg({ ...reg, clinic: e.target.value })} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Email Address</label>
                  <IconInput icon={ICONS.email} type="email" placeholder="doctor@clinic.com" value={reg.email} onChange={e => setReg({ ...reg, email: e.target.value })} />
                </div>
                <div style={twoCol}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Password</label>
                    <IconInput icon={ICONS.lock} type="password" placeholder="Min. 8 chars, mixed case, number, symbol" value={reg.password} onChange={e => setReg({ ...reg, password: e.target.value })} />
                    {reg.password && (() => {
                      const s = checkPasswordStrength(reg.password);
                      const label = s.passed <= 2 ? "Weak" : s.passed <= 4 ? "Okay" : "Strong";
                      const color = s.passed <= 2 ? "var(--danger)" : s.passed <= 4 ? "var(--warning)" : "var(--success)";
                      return (
                        <div style={{ marginTop: "6px" }}>
                          <div style={{ display: "flex", gap: "3px", marginBottom: "4px" }}>
                            {[0, 1, 2, 3, 4].map(i => (
                              <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: i < s.passed ? color : "var(--border)" }} />
                            ))}
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: "600", color }}>{label}{s.isStrong ? " ✓" : ""}</span>
                        </div>
                      );
                    })()}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Confirm Password</label>
                    <IconInput icon={ICONS.lock} type="password" placeholder="Repeat password" value={reg.confirm} onChange={e => setReg({ ...reg, confirm: e.target.value })} />
                  </div>
                </div>
                <button onClick={handleRegStep1} style={btnStyle(false)} type="button">
                  Next: Security Questions →
                </button>
              </>
            )}

            {/* Step 2 */}
            {regStep === 2 && (
              <>
                <div style={{ background: "var(--info-bg)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: "var(--info)", lineHeight: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                  <span><strong>🔒 Security Questions</strong> — These will be used to verify your identity if you forget your password. Answer carefully and remember them.</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
                  <button type="button" onClick={loadQuestions} disabled={qLoading}
                    style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1.5px solid var(--border)", borderRadius: "20px", padding: "6px 14px", fontSize: "12.5px", fontWeight: "600", color: "var(--primary-light)", cursor: qLoading ? "default" : "pointer", opacity: qLoading ? 0.6 : 1 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: qLoading ? "spin 0.8s linear infinite" : "none" }}>
                      <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                    Shuffle Questions
                  </button>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                {qLoading ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>Loading questions…</div>
                ) : questions.map((q, i) => (
                  <div key={i} style={fieldStyle}>
                    <label style={labelStyle}>{q}</label>
                    <IconInput icon={ICONS.shield} type="text" placeholder="Your answer"
                      value={answers[i]}
                      onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a); }} />
                  </div>
                ))}
                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button onClick={() => setRegStep(1)} type="button"
                    style={{ ...btnStyle(false, "var(--surface)"), color: "var(--text-secondary)", border: "1.5px solid var(--border)", flex: "0 0 80px" }}>
                    ← Back
                  </button>
                  <button onClick={handleRegister} disabled={loading} type="button"
                    style={{ ...btnStyle(loading), flex: 1, marginTop: 0 }}>
                    {loading ? "Creating Account…" : "Create Account"}
                  </button>
                </div>
              </>
            )}

            <div style={{ textAlign: "center", marginTop: "14px", fontSize: "13px", color: "var(--text-muted)" }}>
              Already have an account?{" "}
              <span onClick={() => switchView("login")} style={{ color: "var(--primary-light)", fontWeight: "600", cursor: "pointer" }}>Sign in</span>
            </div>
          </div>
        )}

        {/* ══ FORGOT PASSWORD ══ */}
        {view === "forgot" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {forgotStep === 1 && "Forgot Password"}
                  {forgotStep === 2 && "Security Questions"}
                  {forgotStep === 3 && "Set New Password"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Step {forgotStep} of 3</div>
              </div>
              <button onClick={() => switchView("login")} style={{ background: "none", border: "none", color: "var(--primary-light)", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>
                ← Back
              </button>
            </div>

            {/* Progress */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ flex: 1, height: "4px", borderRadius: "10px", background: forgotStep >= s ? "var(--primary-light)" : "var(--border)", transition: "background 0.3s" }} />
              ))}
            </div>

            {/* Step 1 — Enter Email */}
            {forgotStep === 1 && (
              <>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px", lineHeight: 1.5 }}>
                  Enter your registered email. We'll verify it and show your security questions.
                </p>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Registered Email Address</label>
                  <IconInput icon={ICONS.email} type="email" placeholder="doctor@clinic.com"
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
                </div>
                <button onClick={handleForgotEmail} disabled={loading} style={btnStyle(loading)}>
                  {loading ? "Verifying Email…" : "Verify Email →"}
                </button>
              </>
            )}

            {/* Step 2 — Security Questions */}
            {forgotStep === 2 && (
              <>
                <div style={{ background: "var(--success-bg)", border: "1px solid rgba(14,164,123,0.2)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: "var(--success)", fontWeight: "600" }}>
                  ✓ Email verified — Answer your security questions to continue
                </div>
                {forgotQuestions.map((q, i) => (
                  <div key={i} style={fieldStyle}>
                    <label style={labelStyle}>{q}</label>
                    <IconInput icon={ICONS.shield} type="text" placeholder="Your answer"
                      value={forgotAnswers[i]}
                      onChange={e => { const a = [...forgotAnswers]; a[i] = e.target.value; setForgotAnswers(a); }} />
                  </div>
                ))}
                <button onClick={handleForgotAnswers} disabled={loading} style={btnStyle(loading)}>
                  {loading ? "Verifying Answers…" : "Verify Answers →"}
                </button>
              </>
            )}

            {/* Step 3 — New Password */}
            {forgotStep === 3 && (
              <>
                <div style={{ background: "var(--success-bg)", border: "1px solid rgba(14,164,123,0.2)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: "16px", fontSize: "12.5px", color: "var(--success)", fontWeight: "600" }}>
                  ✓ Identity verified — Set your new password below
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>New Password</label>
                  <IconInput icon={ICONS.lock} type="password" placeholder="Min. 8 chars, mixed case, number, symbol" value={newPass} onChange={e => setNewPass(e.target.value)} />
                  {s && (
                    <div style={{ marginTop: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Strength</span>
                        <span style={{ fontSize: "11px", fontWeight: "600", color: s.color }}>{s.label}</span>
                      </div>
                      <div style={{ height: "4px", background: "var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                        <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, borderRadius: "10px", transition: "width 0.3s" }} />
                      </div>
                    </div>
                  )}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Confirm New Password</label>
                  <IconInput icon={ICONS.lock} type="password" placeholder="Repeat new password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                  {confirmPass && (
                    <div style={{ marginTop: "5px", fontSize: "11.5px", fontWeight: "600", color: newPass === confirmPass ? "var(--success)" : "var(--danger)" }}>
                      {newPass === confirmPass ? "✓ Passwords match" : "✕ Passwords don't match"}
                    </div>
                  )}
                </div>
                <button onClick={handleForgotReset} disabled={loading} style={btnStyle(loading, "var(--success)")}>
                  {loading ? "Saving Password…" : "Save New Password ✓"}
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: "11.5px", color: "var(--text-muted)", marginTop: "18px" }}>
          © 2026 EndoAI · HIPAA Compliant · Secure Access
        </div>
      </div>
    </div>
  );
}

export default Login;
