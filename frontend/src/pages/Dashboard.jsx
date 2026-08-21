// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import Sidebar from "../components/Sidebar";
import Navbar  from "../components/Navbar";
import MobileNav from "../components/MobileNav";
import { getCurrentUser, getUserCases } from "../auth";
import { SkeletonDashboard } from "../components/Skeleton";

const RISK_COLOR = { Low: "var(--success)", Moderate: "var(--warning)", High: "var(--danger)" };
const RISK_BG    = { Low: "var(--success-bg)", Moderate: "var(--warning-bg)", High: "var(--danger-bg)" };
const PIE_COLORS = ["#0EA47B", "#D97706", "#DC2626"];

function StatCard({ label, value, sub, iconBg, iconColor, iconPath }) {
  return (
    <div className="card" style={{ padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
      <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={iconColor} strokeWidth="2">{iconPath}</svg>
      </div>
      <div>
        <div style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{label}</div>
        <div style={{ fontSize: "24px", fontWeight: "700", lineHeight: 1.1, marginBottom: "4px" }}>{value}</div>
        {sub && <div style={{ fontSize: "11.5px", color: "var(--success)", fontWeight: "500" }}>{sub}</div>}
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const user     = getCurrentUser();
  const [cases, setCases]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserCases().then(c => { setCases(c); setLoading(false); });
  }, []);

  const initials    = user?.name ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "DR";
  const displayName = user?.name || "Doctor";

  // Stats
  const avgCurv = cases.length
    ? (cases.reduce((s, c) => s + (c.curvature || c.result?.curvature || 0), 0) / cases.length).toFixed(1) + "°"
    : "—";

  const highRisk = cases.filter(c => (c.risk || c.result?.risk) === "High").length;

  // Pie chart data
  const riskGroups = ["Low", "Moderate", "High"].map(r => ({
    name:  r,
    value: cases.filter(c => (c.risk || c.result?.risk) === r).length,
  })).filter(r => r.value > 0);

  // Bar chart — cases per month
  const monthMap = {};
  cases.forEach(c => {
    const date  = new Date(c.upload_date || c.uploadDate || Date.now());
    const key   = date.toLocaleString("default", { month: "short" });
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const barData = Object.entries(monthMap).map(([month, count]) => ({ month, count }));

  // Line chart — curvature over time
  const lineData = cases.slice(-10).map((c, i) => ({
    name:      `Case ${i + 1}`,
    curvature: c.curvature || c.result?.curvature || 0,
  }));

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="content-container">
          {loading ? <SkeletonDashboard /> : (
            <>
              {/* Banner */}
              <div style={{ background: "linear-gradient(120deg, var(--primary) 0%, var(--primary-light) 100%)", borderRadius: "var(--radius-lg)", padding: "24px 28px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", boxShadow: "var(--shadow)" }}>
                <div>
                  <h1 style={{ color: "#fff", fontSize: "20px", marginBottom: "4px" }}>Welcome, {displayName}</h1>
                  <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13.5px", marginBottom: "16px" }}>
                    {cases.length === 0 ? "No cases yet. Start by uploading a CBCT scan." : `You have ${cases.length} analyzed case${cases.length !== 1 ? "s" : ""} in your workspace.`}
                  </p>
                  <button onClick={() => navigate("/upload")}
                    className="btn"
                    style={{ background: "#fff", color: "var(--primary)", fontWeight: "700", padding: "10px 20px" }}>
                    + Analyze New Case
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "700", color: "#fff" }}>
                    {initials}
                  </div>
                  {(user?.designation || user?.clinic) && (
                    <div>
                      {user?.designation && <div style={{ color: "#fff", fontSize: "13px", fontWeight: "600" }}>{user.designation}</div>}
                      {user?.clinic && <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "11.5px" }}>{user.clinic}</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="stats-grid-4">
                <StatCard label="Total Cases"    value={cases.length} sub={cases.length > 0 ? `Latest: ${cases[0]?.upload_date || cases[0]?.uploadDate || "Recent"}` : "Ready to scan"} iconBg="var(--info-bg)" iconColor="var(--info)"
                  iconPath={<><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></>}/>
                <StatCard label="High Risk"      value={highRisk} sub={highRisk > 0 ? "Require care" : "None detected"} iconBg="var(--danger-bg)" iconColor="var(--danger)"
                  iconPath={<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}/>
                <StatCard label="Avg Curvature"  value={avgCurv} sub={cases.length > 0 ? "Overall cases" : "No data"} iconBg="var(--warning-bg)" iconColor="var(--warning)"
                  iconPath={<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>}/>
                <StatCard label="Success Rate"   value={cases.length > 0 ? "100%" : "—"} sub="Analyses complete" iconBg="var(--success-bg)" iconColor="var(--success)"
                  iconPath={<><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}/>
              </div>

              {/* Charts Row */}
              {cases.length > 0 && (
                <div className="responsive-grid" style={{ marginBottom: "20px" }}>

                  {/* Pie — Risk Distribution */}
                  <div className="card">
                    <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "14px" }}>Risk Distribution</div>
                    {riskGroups.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie data={riskGroups} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                              {riskGroups.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v, n) => [v + " cases", n]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
                          {riskGroups.map((r, i) => (
                            <div key={r.name} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: PIE_COLORS[i] }} />
                              <span style={{ color: "var(--text-secondary)" }}>{r.name}: <strong>{r.value}</strong></span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ height: "160px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "13px" }}>No data yet</div>
                    )}
                  </div>

                  {/* Line — Curvature Trend */}
                  <div className="card">
                    <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "14px" }}>Curvature Trend</div>
                    {lineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={v => [v + "°", "Curvature"]} />
                          <Line type="monotone" dataKey="curvature" stroke="var(--warning)" strokeWidth={2} dot={{ fill: "var(--warning)", r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ height: "160px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "13px" }}>No data yet</div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom 2-col */}
              <div style={{ marginBottom: "24px" }}>
                {/* Recent Cases */}
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <span style={{ fontSize: "15px", fontWeight: "700" }}>Recent Cases</span>
                    {cases.length > 0 && (
                      <button onClick={() => navigate("/history")} style={{ fontSize: "12.5px", color: "var(--primary-light)", fontWeight: "600", background: "none", border: "none", cursor: "pointer" }}>
                        View all cases →
                      </button>
                    )}
                  </div>
                  {cases.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 16px", color: "var(--text-muted)", background: "var(--surface)", borderRadius: "var(--radius)", border: "1.5px dashed var(--border-strong)" }}>
                      <p style={{ fontSize: "13.5px", marginBottom: "10px" }}>No cases uploaded yet</p>
                      <button onClick={() => navigate("/upload")} className="btn btn-primary" style={{ fontSize: "12.5px", padding: "7px 16px" }}>
                        Upload First Case
                      </button>
                    </div>
                  ) : cases.slice(0, 2).map((c, i, arr) => {
                    const risk = c.risk || c.result?.risk;
                    return (
                      <div key={c.case_id || c.caseId || i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: "12.5px", fontWeight: "600", color: "var(--primary-light)", background: "var(--info-bg)", padding: "2px 7px", borderRadius: "4px", display: "inline-block", marginBottom: "2px" }}>
                            {c.case_id || c.caseId}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            {c.patient_id || c.patientId} · Tooth #{c.tooth}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: RISK_BG[risk] || "var(--warning-bg)", color: RISK_COLOR[risk] || "var(--warning)", fontWeight: "700" }}>
                            {risk || "—"} Risk
                          </span>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {c.upload_date || c.uploadDate}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

export default Dashboard;
