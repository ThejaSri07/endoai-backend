// src/components/MobileNav.jsx
import { Link, useLocation } from "react-router-dom";

const MOBILE_NAV_ITEMS = [
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
    label: "History", path: "/history",
    icon: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><path d="M9 12h6M9 16h4"/></>
  },
  {
    label: "Reports", path: "/reports",
    icon: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></>
  },
  {
    label: "Settings", path: "/settings",
    icon: <circle cx="12" cy="12" r="3"/>
  }
];

function MobileNav() {
  const location = useLocation();

  return (
    <nav className="mobile-bottom-nav">
      {MOBILE_NAV_ITEMS.map(item => {
        const active = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path} className={`mobile-nav-tab ${active ? "active" : ""}`}>
            <div className="mobile-nav-icon">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                {item.icon}
              </svg>
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileNav;
