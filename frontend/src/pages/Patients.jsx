// src/pages/Patients.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import MobileNav from "../components/MobileNav";
import { useToast } from "../components/Toast";
import { apiGetPatients, apiCreatePatient, apiDeletePatient } from "../api";
import { SkeletonTable } from "../components/Skeleton";
import { pushNotification } from "../notifications";

const GENDER_COLORS = {
  Male:   { color: "var(--info)",    bg: "var(--info-bg)" },
  Female: { color: "#9333ea",        bg: "#f3e8ff"        },
  Other:  { color: "var(--warning)", bg: "var(--warning-bg)" },
};

function Modal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "", age: "", gender: "Male", phone: "", email: "", history: "",
  });
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!form.name) { alert("Patient name is required"); return; }
    setLoading(true);
    await onSave(form);
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div className="card" style={{ width: "100%", maxWidth: "500px", padding: "28px", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "17px", fontWeight: "700" }}>Register New Patient</h2>
          <span style={{ cursor: "pointer", fontSize: "22px", color: "var(--text-muted)", lineHeight: 1 }} onClick={onClose}>×</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramesh Kumar" />
          </div>

          <div className="responsive-grid">
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Age</label>
              <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="e.g. 35" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Gender</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="responsive-grid">
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98400 00000" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="patient@email.com" />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "4px" }}>Medical / Dental History</label>
            <textarea value={form.history} onChange={e => setForm({ ...form, history: e.target.value })} placeholder="Allergies, chronic conditions, prior endodontic treatments…" rows={2} style={{ resize: "vertical" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13.5px", fontWeight: "600", cursor: "pointer", color: "var(--text-secondary)" }}>
            Cancel
          </button>
          <button type="button" onClick={handle} disabled={loading} className="btn btn-primary" style={{ flex: 1, padding: "10px", fontSize: "13.5px", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Saving…" : "Save Patient"}
          </button>
        </div>
      </div>
    </div>
  );
}


function TreatmentTrackerModal({ patient, onClose, onSave }) {
  const [recall6M, setRecall6M] = useState(() => {
    try {
      const saved = localStorage.getItem(`endoai_recall6_${patient.id || patient.patient_id}`);
      if (saved) return saved;
    } catch {}
    return patient.recall6M || "";
  });

  const [recall12M, setRecall12M] = useState(() => {
    try {
      const saved = localStorage.getItem(`endoai_recall12_${patient.id || patient.patient_id}`);
      if (saved) return saved;
    } catch {}
    return patient.recall12M || "";
  });

  const [recallNotes, setRecallNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(`endoai_recall_notes_${patient.id || patient.patient_id}`);
      if (saved) return saved;
    } catch {}
    return patient.recallNotes || "";
  });

  const setAuto6M = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setRecall6M(d.toISOString().split("T")[0]);
  };

  const setAuto12M = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setRecall12M(d.toISOString().split("T")[0]);
  };

  const handleSave = () => {
    const pKey = patient.id || patient.patient_id;
    try {
      if (recall6M) localStorage.setItem(`endoai_recall6_${pKey}`, recall6M);
      else localStorage.removeItem(`endoai_recall6_${pKey}`);
      
      if (recall12M) localStorage.setItem(`endoai_recall12_${pKey}`, recall12M);
      else localStorage.removeItem(`endoai_recall12_${pKey}`);
      
      if (recallNotes) localStorage.setItem(`endoai_recall_notes_${pKey}`, recallNotes);
      else localStorage.removeItem(`endoai_recall_notes_${pKey}`);
    } catch {}

    window.dispatchEvent(new Event("endoai_recalls_updated"));
    onSave({
      ...patient,
      recall6M,
      recall12M,
      recallNotes
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div className="card" style={{ width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", padding: "24px 26px", boxShadow: "var(--shadow-lg)" }}>
        
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary-light)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Patient Follow-up & Recall Scheduler
            </div>
            <h2 style={{ fontSize: "17px", fontWeight: "700", margin: "2px 0 0" }}>
              {patient.name} <span style={{ fontSize: "13px", fontWeight: "400", color: "var(--text-muted)" }}>({patient.patient_id || patient.id})</span>
            </h2>
          </div>
          <span style={{ cursor: "pointer", fontSize: "24px", color: "var(--text-muted)", lineHeight: 1 }} onClick={onClose}>×</span>
        </div>

        {/* 6 & 12 Month Recall Scheduler */}
        <div style={{ marginBottom: "20px", padding: "16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px" }}>
          <div style={{ fontSize: "12.5px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>📅</span>
            <span>Periapical Healing Recall Dates</span>
          </div>

          <div className="responsive-grid" style={{ marginBottom: "12px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--text-secondary)" }}>6-Month Recall</label>
                <button type="button" onClick={setAuto6M} style={{ background: "none", border: "none", color: "var(--primary-light)", fontSize: "11px", fontWeight: "600", cursor: "pointer", padding: 0 }}>
                  + Auto (+6M)
                </button>
              </div>
              <input type="date" value={recall6M} onChange={(e) => setRecall6M(e.target.value)} style={{ height: "36px", fontSize: "12.5px" }} />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--text-secondary)" }}>12-Month Recall</label>
                <button type="button" onClick={setAuto12M} style={{ background: "none", border: "none", color: "var(--primary-light)", fontSize: "11px", fontWeight: "600", cursor: "pointer", padding: 0 }}>
                  + Auto (+12M)
                </button>
              </div>
              <input type="date" value={recall12M} onChange={(e) => setRecall12M(e.target.value)} style={{ height: "36px", fontSize: "12.5px" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
              Clinical Follow-up & Recall Notes
            </label>
            <textarea
              value={recallNotes}
              onChange={(e) => setRecallNotes(e.target.value)}
              placeholder="e.g. Asymptomatic, evaluate apical healing radiolucency on follow-up CBCT..."
              rows={2}
              style={{ fontSize: "12px" }}
            />
          </div>
        </div>

        {/* Modal Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "9px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: "600", cursor: "pointer", color: "var(--text-secondary)" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="btn btn-primary" style={{ flex: 1, padding: "9px", fontSize: "13px" }}>
            Save Recall Schedule
          </button>
        </div>

      </div>
    </div>
  );
}

function Patients() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const [patients, setPatients]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [deleting, setDeleting]     = useState(null);
  const [selectedTrackerPatient, setSelectedTrackerPatient] = useState(null);

  useEffect(() => {
    async function loadPatients() {
      const serverPatients = (await apiGetPatients()) || [];
      setPatients(serverPatients);
      setLoading(false);
    }
    loadPatients();
  }, []);

  const handleCreate = async (form) => {
    const res = await apiCreatePatient(form);
    if (res && (res.id || res.name)) {
      setPatients(prev => [res, ...prev]);
      setShowModal(false);
      pushNotification({
        msg: `New patient registered — ${res.name} (${res.patient_id || res.id})`,
        type: "info"
      });
      toast("Patient added successfully", "success");
    } else {
      toast("Failed to add patient", "error");
    }
  };

  const handleDelete = async (id, name, patientId) => {
    if (!window.confirm(`Delete patient "${name}"? This cannot be undone.`)) return;
    const targetId = id || patientId || name;
    setDeleting(targetId);
    await apiDeletePatient(id, name, patientId);
    setPatients(prev => prev.filter(p => p.id !== id && p.patient_id !== patientId && p.name !== name));
    setDeleting(null);
    toast("Patient deleted", "info");
  };

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) ||
           p.phone?.includes(q) ||
           p.email?.toLowerCase().includes(q);
  });

  return (
    <div className="app-layout">
      {showModal && <Modal onClose={() => setShowModal(false)} onSave={handleCreate} />}
      {selectedTrackerPatient && (
        <TreatmentTrackerModal
          patient={selectedTrackerPatient}
          onClose={() => setSelectedTrackerPatient(null)}
          onSave={(updated) => {
            setPatients(prev => prev.map(p => (p.id === updated.id || p.patient_id === updated.patient_id) ? updated : p));
            toast("Treatment and Recall updated", "success");
          }}
        />
      )}
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="content-container">

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "2px" }}>Patient Directory</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                {patients.length} patient{patients.length !== 1 ? "s" : ""} registered
              </p>
            </div>
            <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontSize: "13px", padding: "9px 18px" }}>
              + New Patient
            </button>
          </div>

          {/* Stats Row */}
          <div className="stats-grid-3">
            {[
              { label: "Total Patients", value: patients.length, color: "var(--info)", bg: "var(--info-bg)" },
              { label: "Male Patients", value: patients.filter(p => p.gender === "Male").length, color: "var(--primary-light)", bg: "var(--info-bg)" },
              { label: "Female Patients", value: patients.filter(p => p.gender === "Female").length, color: "#9333ea", bg: "#f3e8ff" },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "700", color: s.color }}>
                  {s.value}
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "500" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Table Card */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "320px" }}>
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </span>
                <input type="text" placeholder="Search by name, phone, email…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: "32px", height: "34px", fontSize: "13px" }} />
              </div>
              <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>{filtered.length} of {patients.length}</span>
            </div>

            {loading ? <SkeletonTable rows={4} /> : patients.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 16px", color: "var(--text-muted)" }}>
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--border-strong)" strokeWidth="1.5" style={{ display: "block", margin: "0 auto 12px" }}>
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <p style={{ fontSize: "15px", fontWeight: "600", marginBottom: "4px", color: "var(--text-primary)" }}>No patients registered yet</p>
                <p style={{ fontSize: "13px", marginBottom: "16px" }}>Add your first patient to link them with CBCT scans.</p>
                <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontSize: "13px", padding: "8px 18px" }}>
                  Add First Patient
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                  <thead>
                    <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                      {["#", "Name", "Age", "Gender", "Phone", "Email", "Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                        No results found for "{search}"
                      </td></tr>
                    ) : filtered.map((p, i, arr) => {
                      const isLast = i === arr.length - 1;
                      const gc     = GENDER_COLORS[p.gender] || GENDER_COLORS.Other;
                      return (
                        <tr key={p.id || i} style={{ borderBottom: isLast ? "none" : "1px solid var(--border)", transition: "background 0.15s" }}>
                          <td style={{ padding: "12px 16px", fontSize: "12.5px", color: "var(--text-muted)" }}>{i + 1}</td>
                          <td style={{ padding: "12px 16px", fontWeight: "600" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0 }}>
                                {p.name?.charAt(0).toUpperCase()}
                              </div>
                              <span>{p.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "13px" }}>{p.age || "—"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px", background: gc.bg, color: gc.color }}>
                              {p.gender || "—"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "12.5px" }}>{p.phone || "—"}</td>
                          <td style={{ padding: "12px 16px", fontSize: "12.5px", color: "var(--text-muted)" }}>{p.email || "—"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button onClick={() => setSelectedTrackerPatient(p)}
                                style={{ padding: "5px 9px", background: "var(--surface)", color: "var(--primary-light)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: "11.5px", fontWeight: "600", cursor: "pointer" }}>
                                📋 Tracker & Recall
                              </button>
                              <button onClick={() => navigate(`/upload?patient=${p.name}`)}
                                className="btn btn-primary" style={{ padding: "5px 9px", fontSize: "11.5px" }}>
                                New Scan
                              </button>
                              <button onClick={() => handleDelete(p.id, p.name, p.patient_id)}
                                disabled={deleting === (p.id || p.patient_id || p.name)}
                                style={{ padding: "5px 10px", background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "11.5px", fontWeight: "600", cursor: "pointer", opacity: deleting === (p.id || p.patient_id || p.name) ? 0.5 : 1 }}>
                                {deleting === (p.id || p.patient_id || p.name) ? "…" : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

export default Patients;