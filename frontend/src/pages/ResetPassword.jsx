// src/pages/ResetPassword.jsx
// This page opens when user clicks the reset link in their email
// URL format: /reset-password?token=xxxx

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiResetPassword } from "../api";

const pageStyle = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0A3D62 0%, #1565A8 50%, #0A3D62 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "24px 16px", position: "relative", overflow: "hidden",
};
const dec1 = { position: "absolute", top: "-80px", right: "-80px", width: "340px", height: "340px", borderRadius: "50%", background: "rgba(0,180,216,0.10)", pointerEvents: "none" };
const dec2 = { position: "absolute", bottom: "-100px", left: "-60px", width: "280px", height: "280px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" };

const cardStyle = {
    width: "100%", maxWidth: "420px", background: "#fff",
    borderRadius: "20px", padding: "36px 40px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)", position: "relative", zIndex: 1,
};

const labelStyle = { display: "block", fontSize: "12.5px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "5px" };
const fieldStyle = { marginBottom: "16px" };
const iconWrap = { position: "relative" };
const iconInner = { position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", pointerEvents: "none" };

const alertStyle = (t) => ({
    padding: "11px 14px", borderRadius: "var(--radius-sm)", fontSize: "13px", marginBottom: "16px",
    background: t === "error" ? "var(--danger-bg)" : "var(--success-bg)",
    color: t === "error" ? "var(--danger)" : "var(--success)",
    fontWeight: "600", display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: 1.5,
});

const btnStyle = (loading) => ({
    width: "100%", height: "44px", marginTop: "4px",
    background: "var(--primary)", color: "#fff", border: "none",
    borderRadius: "var(--radius)", fontSize: "14px", fontWeight: "700",
    cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
});

const LOCK_ICON = <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>;

function PasswordInput({ value, onChange, placeholder }) {
    const [show, setShow] = useState(false);
    return (
        <div style={iconWrap}>
            <span style={iconInner}>{LOCK_ICON}</span>
            <input
                type={show ? "text" : "password"}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                style={{ paddingLeft: "38px", paddingRight: "44px", height: "42px", fontSize: "13.5px" }}
            />
            <span onClick={() => setShow(!show)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "var(--text-muted)", fontSize: "11.5px", fontWeight: "600", userSelect: "none" }}>
                {show ? "Hide" : "Show"}
            </span>
        </div>
    );
}

function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const [done, setDone] = useState(false);

    // If no token in URL, redirect to login
    useEffect(() => {
        if (!token) {
            navigate("/");
        }
    }, [token, navigate]);

    const handleReset = async () => {
        if (!newPass || !confirmPass) {
            setAlert({ type: "error", msg: "Please fill in both password fields." });
            return;
        }
        if (newPass !== confirmPass) {
            setAlert({ type: "error", msg: "Passwords do not match. Please check and try again." });
            return;
        }
        if (newPass.length < 6) {
            setAlert({ type: "error", msg: "Password must be at least 6 characters long." });
            return;
        }

        setLoading(true);
        setAlert(null);

        try {
            await apiResetPassword(token, newPass);
            setDone(true);
            // Auto redirect to login after 3 seconds
            setTimeout(() => navigate("/"), 3000);
        } catch (err) {
            setAlert({
                type: "error",
                msg: err.message || "Reset link may have expired. Please request a new one from the login page.",
            });
        } finally {
            setLoading(false);
        }
    };

    // Password strength checker
    const strength = (p) => {
        if (!p) return null;
        if (p.length < 6) return { label: "Too short", color: "var(--danger)", pct: 20 };
        if (p.length < 8) return { label: "Weak", color: "var(--warning)", pct: 40 };
        if (!/[A-Z]/.test(p) && !/[0-9]/.test(p)) return { label: "Fair", color: "var(--warning)", pct: 60 };
        if (/[A-Z]/.test(p) && /[0-9]/.test(p)) return { label: "Strong", color: "var(--success)", pct: 100 };
        return { label: "Good", color: "var(--success)", pct: 80 };
    };
    const s = strength(newPass);

    return (
        <div style={pageStyle}>
            <div style={dec1} /><div style={dec2} />
            <div style={cardStyle}>

                {/* Brand */}
                <div style={{ textAlign: "center", marginBottom: "28px" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "50px", height: "50px", background: "var(--primary)", borderRadius: "14px", marginBottom: "10px" }}>
                        <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--primary)", letterSpacing: "-0.5px" }}>EndoAI</div>
                    <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>AI-Based Volumetric Canal Planning</div>
                </div>

                {/* ── Done state: password changed ── */}
                {done ? (
                    <div style={{ textAlign: "center", padding: "10px 0" }}>
                        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--success-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--success)" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                        </div>
                        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>
                            Password Changed!
                        </h3>
                        <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "20px" }}>
                            Your password has been updated successfully in the database. Redirecting you to the sign in page in a moment…
                        </p>
                        <div style={{ width: "100%", height: "4px", background: "var(--border)", borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>
                            <div style={{ width: "100%", height: "100%", background: "var(--success)", borderRadius: "10px", animation: "shrink 3s linear forwards" }} />
                        </div>
                        <button onClick={() => navigate("/")} style={{ ...btnStyle(false), height: "40px" }}>
                            Go to Sign In Now →
                        </button>
                        <style>{`@keyframes shrink { from { width:100%; } to { width:0%; } }`}</style>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: "20px" }}>
                            <div style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                                Set New Password
                            </div>
                            <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                                Choose a strong password for your EndoAI account.
                            </div>
                        </div>

                        {alert && (
                            <div style={alertStyle(alert.type)}>
                                <span>{alert.type === "error" ? "⚠" : "✓"}</span>
                                <span>{alert.msg}</span>
                            </div>
                        )}

                        <div style={fieldStyle}>
                            <label style={labelStyle}>New Password</label>
                            <PasswordInput
                                value={newPass}
                                onChange={(e) => setNewPass(e.target.value)}
                                placeholder="Min. 6 characters"
                            />
                            {/* Strength bar */}
                            {s && (
                                <div style={{ marginTop: "8px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Password strength</span>
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
                            <PasswordInput
                                value={confirmPass}
                                onChange={(e) => setConfirmPass(e.target.value)}
                                placeholder="Repeat new password"
                            />
                            {/* Match indicator */}
                            {confirmPass && (
                                <div style={{ marginTop: "6px", fontSize: "11.5px", fontWeight: "600", color: newPass === confirmPass ? "var(--success)" : "var(--danger)" }}>
                                    {newPass === confirmPass ? "✓ Passwords match" : "✕ Passwords don't match"}
                                </div>
                            )}
                        </div>

                        <button onClick={handleReset} disabled={loading} style={btnStyle(loading)}>
                            {loading ? "Updating Password…" : "Save New Password ✓"}
                        </button>

                        <div style={{ textAlign: "center", marginTop: "16px" }}>
                            <span onClick={() => navigate("/")}
                                style={{ fontSize: "12.5px", color: "var(--text-muted)", cursor: "pointer" }}>
                                ← Back to Sign In
                            </span>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}

export default ResetPassword;
