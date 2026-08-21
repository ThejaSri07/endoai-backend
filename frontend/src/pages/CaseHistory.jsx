// src/pages/CaseHistory.jsx
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import MobileNav from "../components/MobileNav";
import { useNavigate } from "react-router-dom";
import { getUserCases } from "../auth";
import { SkeletonTable } from "../components/Skeleton";

const RISK_COLOR = { Low: "var(--success)", Moderate: "var(--warning)", High: "var(--danger)" };
const RISK_BG    = { Low: "var(--success-bg)", Moderate: "var(--warning-bg)", High: "var(--danger-bg)" };

function CaseHistory() {
  const navigate = useNavigate();
  const [search, setSearch]   = useState("");
  const [cases, setCases]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("All");

  useEffect(() => {
    getUserCases().then(c => { setCases(c || []); setLoading(false); });
  }, []);

  const filtered = cases.filter(c => {
    const q    = search.toLowerCase();
    const risk = c.risk || c.result?.risk || "";
    const matchSearch = (
      (c.case_id   || c.caseId   || "").toLowerCase().includes(q) ||
      (c.patient_id || c.patientId || "").toLowerCase().includes(q) ||
      (c.tooth     || "").toLowerCase().includes(q)
    );
    const matchFilter = filter === "All" || risk === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="content-container">

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "2px" }}>Case History</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                {cases.length} case{cases.length !== 1 ? "s" : ""} saved in workspace
              </p>
            </div>
            <button onClick={() => navigate("/upload")}
              className="btn btn-primary"
              style={{ fontSize: "13px", padding: "9px 18px" }}>
              + New Case
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  </span>
                  <input type="text" placeholder="Search cases…" value={search} onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: "32px", height: "34px", fontSize: "13px", width: "200px" }} />
                </div>
                {/* Risk filter pills */}
                <div style={{ display: "flex", gap: "4px" }}>
                  {["All", "Low", "Moderate", "High"].map(r => (
                    <button key={r} onClick={() => setFilter(r)}
                      style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "600", cursor: "pointer", border: "1.5px solid", borderColor: filter === r ? (RISK_COLOR[r] || "var(--primary)") : "var(--border)", background: filter === r ? (RISK_BG[r] || "var(--info-bg)") : "transparent", color: filter === r ? (RISK_COLOR[r] || "var(--primary)") : "var(--text-muted)", transition: "all 0.15s" }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>{filtered.length} of {cases.length} records</span>
            </div>

            {/* Table */}
            {loading ? <SkeletonTable rows={5} /> : cases.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 16px", color: "var(--text-muted)" }}>
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--border-strong)" strokeWidth="1.5" style={{ display: "block", margin: "0 auto 12px" }}>
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
                </svg>
                <p style={{ fontSize: "15px", fontWeight: "600", marginBottom: "4px", color: "var(--text-primary)" }}>No cases analyzed yet</p>
                <p style={{ fontSize: "13px", marginBottom: "16px" }}>Upload a CBCT scan to start tracking volumetric cases.</p>
                <button onClick={() => navigate("/upload")} className="btn btn-primary" style={{ fontSize: "13px", padding: "8px 18px" }}>
                  Upload First Case
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "640px" }}>
                  <thead>
                    <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                      {["#", "Case ID", "Patient ID", "Tooth", "Canals", "Risk", "Curvature", "Date", "Action"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                        No results found for "{search}"
                      </td></tr>
                    ) : filtered.map((c, i, arr) => {
                      const risk     = c.risk || c.result?.risk;
                      const canals   = c.n_canals || c.result?.n_canals;
                      const curv     = c.curvature || c.result?.curvature;
                      const caseId   = c.case_id || c.caseId;
                      const patId    = c.patient_id || c.patientId;
                      const date     = c.upload_date || c.uploadDate;
                      const isLast   = i === arr.length - 1;
                      return (
                        <tr key={caseId || i} style={{ borderBottom: isLast ? "none" : "1px solid var(--border)", transition: "background 0.15s" }}>
                          <td style={{ padding: "12px 16px", fontSize: "12.5px", color: "var(--text-muted)" }}>{i + 1}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12.5px", fontWeight: "600", color: "var(--primary-light)", background: "var(--info-bg)", padding: "2px 8px", borderRadius: "4px" }}>{caseId}</span>
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "13px" }}>{patId}</td>
                          <td style={{ padding: "12px 16px", fontSize: "13px" }}><strong>#{c.tooth}</strong></td>
                          <td style={{ padding: "12px 16px", fontSize: "13px" }}>{canals ?? "—"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", background: RISK_BG[risk] || "var(--warning-bg)", color: RISK_COLOR[risk] || "var(--warning)" }}>
                              {risk || "—"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "12.5px" }}>{curv ? `${curv}°` : "—"}</td>
                          <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "12px" }}>{date}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <button
                              onClick={() => { localStorage.setItem("endoai_last_result", JSON.stringify(c)); navigate("/results"); }}
                              className="btn btn-primary" style={{ padding: "5px 12px", fontSize: "11.5px" }}>
                              View
                            </button>
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

export default CaseHistory;
