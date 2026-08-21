// src/components/Navbar.jsx
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth";
import { apiLogout, apiGetPatients } from "../api";

const TITLES = {
  "/dashboard": { title: "Clinical Dashboard", sub: "CBCT Volume Analysis & Practice Overview" },
  "/upload":    { title: "New CBCT Analysis",  sub: "Upload Scan Slices & Run 3D Neural Segmentation" },
  "/results":   { title: "Analysis Results",   sub: "Volumetric Canal Curvature & Risk Assessment" },
  "/history":   { title: "Case History",       sub: "Archived CBCT Segmentations & Patient Records" },
  "/reports":   { title: "Clinical Reports",   sub: "Export Diagnostic PDFs & Summaries" },
  "/settings":  { title: "System Settings",    sub: "Doctor Profile, Clinic Info & Preferences" },
  "/patients":  { title: "Patient Directory",  sub: "Patient Management & Treatment Recall Tracker" },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const page = TITLES[location.pathname] || { title: "EndoAI", sub: "" };

  const [showCalendar, setShowCalendar] = useState(false);
  const [showProfile, setShowProfile]   = useState(false);
  const [patients, setPatients]         = useState([]);

  // Calendar View State: current year/month for the grid
  const today = new Date();
  const [currentYear, setCurrentYear]   = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(() => today.toISOString().split("T")[0]);

  const calRef = useRef(null);
  const profRef = useRef(null);

  // Load patients and recalls
  const loadRecalls = async () => {
    try {
      const list = (await apiGetPatients()) || [];
      const enriched = list.map(p => {
        const pKey = p.id || p.patient_id;
        const r6 = localStorage.getItem(`endoai_recall6_${pKey}`) || p.recall6M;
        const r12 = localStorage.getItem(`endoai_recall12_${pKey}`) || p.recall12M;
        const rNotes = localStorage.getItem(`endoai_recall_notes_${pKey}`) || p.recallNotes;
        const stages = JSON.parse(localStorage.getItem(`endoai_treatment_${pKey}`) || "null") || p.treatmentStages;
        return { ...p, recall6M: r6, recall12M: r12, recallNotes: rNotes, treatmentStages: stages };
      });
      setPatients(enriched);
    } catch {}
  };

  useEffect(() => {
    loadRecalls();
    window.addEventListener("endoai_recalls_updated", loadRecalls);
    window.addEventListener("storage", loadRecalls);
    return () => {
      window.removeEventListener("endoai_recalls_updated", loadRecalls);
      window.removeEventListener("storage", loadRecalls);
    };
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(e) {
      if (calRef.current && !calRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
      if (profRef.current && !profRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    }
    if (showCalendar || showProfile) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showCalendar, showProfile]);

  const todayStr = today.toISOString().split("T")[0];

  // Map of all recalls by date string (YYYY-MM-DD) -> Array of patient items
  const recallMap = {};
  patients.forEach(p => {
    if (p.recall6M) {
      if (!recallMap[p.recall6M]) recallMap[p.recall6M] = [];
      recallMap[p.recall6M].push({ ...p, recallType: "6-Month Recall" });
    }
    if (p.recall12M) {
      if (!recallMap[p.recall12M]) recallMap[p.recall12M] = [];
      recallMap[p.recall12M].push({ ...p, recallType: "12-Month Recall" });
    }
  });

  const todayCount = (recallMap[todayStr] || []).length;
  const selectedDateItems = recallMap[selectedDate] || [];

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate days for monthly grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Mark checkup as done
  const handleMarkDone = (p) => {
    const pKey = p.id || p.patient_id;
    if (p.recallType === "6-Month Recall") {
      localStorage.removeItem(`endoai_recall6_${pKey}`);
    } else {
      localStorage.removeItem(`endoai_recall12_${pKey}`);
    }
    window.dispatchEvent(new Event("endoai_recalls_updated"));
  };

  // Reschedule checkup
  const handleReschedule = (p) => {
    const newDate = prompt("Enter new follow-up date (YYYY-MM-DD):", todayStr);
    if (!newDate) return;
    const pKey = p.id || p.patient_id;
    if (p.recallType === "6-Month Recall") {
      localStorage.setItem(`endoai_recall6_${pKey}`, newDate);
    } else {
      localStorage.setItem(`endoai_recall12_${pKey}`, newDate);
    }
    window.dispatchEvent(new Event("endoai_recalls_updated"));
  };

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "DR";

  return (
    <header className="app-navbar">
      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="navbar-mobile-brand">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--primary)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </span>
          <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1.2 }}>{page.title}</span>
        </div>
        {page.sub && <span style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: "400" }}>{page.sub}</span>}
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

        {/* AI Status Badge */}
        <div className="navbar-ai-badge" style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--info-bg)", color: "var(--info)", padding: "5px 12px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "600" }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--success)", animation: "pulse 2s infinite" }} />
          AI Active
        </div>

        {/* ── DOCTOR'S CLINICAL MONTHLY CALENDAR (📅) ── */}
        <div ref={calRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => { setShowCalendar(!showCalendar); setShowProfile(false); }}
            title="Doctor's Checkup Calendar"
            style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: showCalendar ? "var(--info-bg)" : "var(--surface)",
              border: showCalendar ? "1.5px solid var(--primary-light)" : "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative"
            }}>
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke={showCalendar ? "var(--primary-light)" : "var(--text-secondary)"} strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>

            {/* Today's Due Recalls Notification Badge */}
            {todayCount > 0 && (
              <div style={{
                position: "absolute", top: "-3px", right: "-3px",
                minWidth: "16px", height: "16px", padding: "0 3px",
                borderRadius: "50%", background: "var(--danger)", color: "#fff",
                fontSize: "9px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {todayCount}
              </div>
            )}
          </button>

          {/* Monthly Calendar Dropdown Drawer */}
          {showCalendar && (
            <div style={{
              position: "absolute", top: "44px", right: 0, width: "330px",
              background: "var(--surface-card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", zIndex: 1100, overflow: "hidden"
            }}>
              
              {/* Month & Year Navigation Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                <button
                  type="button"
                  onClick={prevMonth}
                  style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "16px", cursor: "pointer", padding: "2px 6px" }}
                >
                  ‹
                </button>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "16px", cursor: "pointer", padding: "2px 6px" }}
                >
                  ›
                </button>
              </div>

              {/* Day of Week Headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", padding: "6px 8px 2px", borderBottom: "1px solid var(--border)" }}>
                {DAY_LABELS.map(d => (
                  <div key={d} style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", padding: "2px 0" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* 7x5 Days Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", padding: "8px 8px 10px" }}>
                {/* Empty cells before month start */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ height: "32px" }} />
                ))}

                {/* Days in Month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const count = (recallMap[dateStr] || []).length;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      style={{
                        height: "32px", borderRadius: "6px",
                        background: isSelected ? "var(--primary)" : isToday ? "var(--info-bg)" : "transparent",
                        color: isSelected ? "#fff" : isToday ? "var(--primary-light)" : "var(--text-primary)",
                        border: isToday && !isSelected ? "1px solid var(--primary-light)" : "1px solid transparent",
                        fontSize: "11.5px", fontWeight: isToday || isSelected ? "700" : "500",
                        cursor: "pointer", display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", position: "relative", padding: 0
                      }}
                    >
                      <span>{dayNum}</span>
                      {/* Notification Count Pill on that Date */}
                      {count > 0 && (
                        <span style={{
                          position: "absolute", top: "1px", right: "2px",
                          width: "12px", height: "12px", borderRadius: "50%",
                          background: isSelected ? "#fff" : "var(--danger)",
                          color: isSelected ? "var(--primary)" : "#fff",
                          fontSize: "8px", fontWeight: "800", display: "flex",
                          alignItems: "center", justifyContent: "center"
                        }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Date Checkups Panel */}
              <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", padding: "10px 14px", maxHeight: "200px", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {selectedDate === todayStr ? "Today's Checkups" : `Checkups on ${selectedDate}`}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {selectedDateItems.length} patient{selectedDateItems.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {selectedDateItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "14px 6px", color: "var(--text-muted)", fontSize: "11.5px" }}>
                    No checkups scheduled for this date.
                  </div>
                ) : (
                  selectedDateItems.map((p, idx) => (
                    <div key={idx} style={{
                      padding: "8px 10px", background: "var(--surface-card)", border: "1px solid var(--border)",
                      borderRadius: "6px", marginBottom: "6px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                        <span style={{ fontSize: "12.5px", fontWeight: "700", color: "var(--text-primary)" }}>{p.name}</span>
                        <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "8px", background: "var(--info-bg)", color: "var(--primary-light)", fontWeight: "700" }}>
                          {p.recallType}
                        </span>
                      </div>

                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>
                        Phone: {p.phone || "—"} {p.recallNotes ? `· ${p.recallNotes}` : ""}
                      </div>

                      {/* Done / Reschedule Actions */}
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => handleMarkDone(p)}
                          style={{
                            flex: 1, padding: "3px", fontSize: "10.5px", fontWeight: "600",
                            background: "var(--success-bg)", color: "var(--success)",
                            border: "1px solid rgba(46,204,113,0.3)", borderRadius: "4px", cursor: "pointer"
                          }}
                        >
                          ✓ Done
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReschedule(p)}
                          style={{
                            flex: 1, padding: "3px", fontSize: "10.5px", fontWeight: "600",
                            background: "var(--surface)", color: "var(--text-secondary)",
                            border: "1px solid var(--border)", borderRadius: "4px", cursor: "pointer"
                          }}
                        >
                          🔄 Reschedule
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ padding: "6px 12px", borderTop: "1px solid var(--border)", textAlign: "center", background: "var(--surface)" }}>
                <span onClick={() => { navigate("/patients"); setShowCalendar(false); }} style={{ fontSize: "11px", color: "var(--primary-light)", cursor: "pointer", fontWeight: "600" }}>
                  Open Full Patient Directory →
                </span>
              </div>

            </div>
          )}
        </div>

        {/* ── DOCTOR PROFILE DROPDOWN (Dedicated popup on Avatar click) ── */}
        <div ref={profRef} style={{ position: "relative" }}>
          <div
            onClick={() => { setShowProfile(!showProfile); setShowCalendar(false); }}
            title="Doctor Profile"
            style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "var(--primary)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12.5px", fontWeight: "700", cursor: "pointer",
              border: showProfile ? "2px solid var(--primary-light)" : "2px solid transparent",
              boxShadow: "var(--shadow-sm)"
            }}>
            {initials}
          </div>

          {/* Profile Card Popup */}
          {showProfile && (
            <div style={{
              position: "absolute", top: "44px", right: 0, width: "270px",
              background: "var(--surface-card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", zIndex: 1100, overflow: "hidden",
              padding: "18px 16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "700", flexShrink: 0 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {user?.name ? `Dr. ${user.name}` : "Doctor"}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--primary-light)", fontWeight: "600" }}>
                    {user?.designation || "Endodontist"}
                  </div>
                  {user?.clinic && (
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                      🏥 {user.clinic.split(":::KBA:::")[0]}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginBottom: "14px", wordBreak: "break-all" }}>
                📧 {user?.email || "doctor@clinic.com"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => { navigate("/settings"); setShowProfile(false); }}
                  style={{
                    width: "100%", padding: "8px 12px", background: "var(--surface)",
                    border: "1px solid var(--border)", borderRadius: "6px",
                    fontSize: "12px", fontWeight: "600", color: "var(--text-primary)",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "8px"
                  }}
                >
                  <span>⚙️</span>
                  <span>System Settings & Appearance</span>
                </button>

                <button
                  type="button"
                  onClick={() => { apiLogout(); navigate("/"); }}
                  style={{
                    width: "100%", padding: "8px 12px", background: "var(--danger-bg)",
                    border: "1px solid rgba(231,76,60,0.3)", borderRadius: "6px",
                    fontSize: "12px", fontWeight: "600", color: "var(--danger)",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "8px"
                  }}
                >
                  <span>🚪</span>
                  <span>Sign Out of Account</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </header>
  );
}

export default Navbar;
