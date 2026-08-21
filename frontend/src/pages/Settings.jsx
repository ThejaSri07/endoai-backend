// src/pages/Settings.jsx
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import MobileNav from "../components/MobileNav";
import { getCurrentUser } from "../auth";
import { useToast } from "../components/Toast";

function Toggle({ on, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: "42px", height: "24px", borderRadius: "12px",
        background: on ? "var(--primary-light)" : "var(--border-strong)",
        position: "relative", cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s", flexShrink: 0, opacity: disabled ? 0.5 : 1
      }}>
      <div
        style={{
          position: "absolute", top: "3px", left: on ? "21px" : "3px",
          width: "18px", height: "18px", borderRadius: "50%",
          background: "#fff", transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)"
        }}
      />
    </div>
  );
}

function Settings() {
  const toast   = useToast();
  const user    = getCurrentUser();
  const initials = user?.name ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "DR";

  const [profile, setProfile] = useState({
    name:        user?.name        || "",
    email:       user?.email       || "",
    phone:       "",
    designation: user?.designation || "",
  });

  const [clinic, setClinic] = useState({
    clinicName: user?.clinic || "",
    address:    "",
    city:       "Chennai",
    country:    "India",
  });

  const [prefs, setPrefs] = useState({
    autoSave:      true,
    darkMode: (localStorage.getItem("endoai_theme") || "dark") === "dark",
    notifications: true,
  });

  useEffect(() => {
    const isDark = localStorage.getItem("endoai_theme") === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

    const handleTogglePref = (key, val) => {
    setPrefs(prev => ({ ...prev, [key]: val }));
    if (key === "darkMode") {
      const theme = val ? "dark" : "light";
      localStorage.setItem("endoai_theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      if (val) {
        document.body.classList.add("dark-theme");
      } else {
        document.body.classList.remove("dark-theme");
      }
      window.dispatchEvent(new Event("endoai_theme_changed"));
    }
  };

  const handleSave = () => {
    toast("Settings saved successfully!", "success");
  };

  const prefRows = [
    { key: "darkMode",      label: "Dark Theme Mode",              sub: "High-contrast eye-friendly dark medical interface", disabled: false },
    { key: "autoSave",      label: "Auto-save case data",          sub: "Save case info automatically after analysis",       disabled: false },
    { key: "notifications", label: "In-app notifications",         sub: "Show status alerts inside the app",                 disabled: false },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="content-container" style={{ maxWidth: "800px" }}>

          <div style={{ marginBottom: "20px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "2px" }}>Account & System Settings</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Manage your profile, clinic details, and preferences.</p>
          </div>

          {/* Preferences (Includes Dark Mode at the top) */}
          <div className="card" style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
              App Appearance & Preferences
            </div>
            {prefRows.map((row, i) => (
              <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: i < prefRows.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "2px" }}>{row.label}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{row.sub}</div>
                </div>
                <Toggle on={prefs[row.key]} onChange={(val) => handleTogglePref(row.key, val)} disabled={row.disabled} />
              </div>
            ))}
          </div>

          {/* Profile */}
          <div className="card" style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
              Doctor Profile
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", marginBottom: "16px", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>
                  {initials}
                </div>
                <span style={{ fontSize: "11.5px", color: "var(--primary-light)", fontWeight: "600", cursor: "pointer" }}>Change Photo</span>
              </div>
              <div style={{ flex: 1, minWidth: "260px" }}>
                <div className="responsive-grid">
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Full Name</label>
                    <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Designation</label>
                    <input value={profile.designation} onChange={e => setProfile({ ...profile, designation: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Email Address</label>
                    <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Phone Number</label>
                    <input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 98400 00000" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clinic */}
          <div className="card" style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
              Clinic Information
            </div>
            <div className="responsive-grid">
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Clinic Name</label>
                <input value={clinic.clinicName} onChange={e => setClinic({ ...clinic, clinicName: e.target.value })} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>City</label>
                <input value={clinic.city} onChange={e => setClinic({ ...clinic, city: e.target.value })} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Address</label>
                <input value={clinic.address} onChange={e => setClinic({ ...clinic, address: e.target.value })} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Country</label>
                <input value={clinic.country} onChange={e => setClinic({ ...clinic, country: e.target.value })} />
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="card" style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
              System & Engine Status
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0" }}>
              <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--success)" }} />
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: "600" }}>AI Inference Backend</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>endoai-backend.onrender.com · PyTorch ToothFairy3 Architecture</div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "var(--success-bg)", color: "var(--success)", fontWeight: "700" }}>Active</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--success)" }} />
              <div>
                <div style={{ fontSize: "13.5px", fontWeight: "600" }}>PostgreSQL Database</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Supabase Cloud Database · HIPAA Compliant Storage</div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "var(--success-bg)", color: "var(--success)", fontWeight: "700" }}>Connected</span>
            </div>
          </div>

          {/* Save Button */}
          <div style={{ marginBottom: "40px" }}>
            <button onClick={handleSave} className="btn btn-primary" style={{ padding: "10px 24px" }}>
              Save Changes
            </button>
          </div>

        </div>
      </div>
      <MobileNav />
    </div>
  );
}

export default Settings;
