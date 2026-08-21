// src/components/Sidebar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, logoutUser } from "../auth";

const NAV = [
  {
    label: "Dashboard", path: "/dashboard",
    icon: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>
  },
  {
    label: "New Case", path: "/upload",
    icon: <path d="M12 5v14M5 12h14"/>
  },
  {
    label: "Patients", path: "/patients",
    icon: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>
  },
  {
    label: "Case History", path: "/history",
    icon: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></>
  },
  {
    label: "Reports", path: "/reports",
    icon: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></>
  },
  {
    label: "Settings", path: "/settings",
    icon: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>
  },
];

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user     = getCurrentUser();
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "DR";

  return (
    <aside className="app-sidebar">
      {/* Brand */}
      <div style={{ padding: "24px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#fff", letterSpacing: "-0.3px" }}>EndoAI</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)" }}>Canal Planning</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "14px 10px", flex: 1 }}>
        {NAV.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 12px", borderRadius: "var(--radius-sm)",
                  marginBottom: "2px", fontSize: "14px",
                  fontWeight: active ? "600" : "400",
                  color: active ? "#fff" : "rgba(255,255,255,0.7)",
                  background: active ? "rgba(255,255,255,0.15)" : "transparent",
                  transition: "background var(--transition),color var(--transition)",
                  cursor: "pointer"
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ opacity: active ? 1 : 0.7, display: "flex", flexShrink: 0 }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{item.icon}</svg>
                </span>
                {item.label}
                {active && <div style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: "14px 10px 22px", borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", marginBottom: "8px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: "#fff", flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.designation}</div>
            </div>
          </div>
        )}
        <button
          style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}
          onClick={() => { logoutUser(); navigate("/"); }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
