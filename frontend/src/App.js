import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Results from "./pages/Results";
import CaseHistory from "./pages/CaseHistory";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Patients from "./pages/Patients";
import "./index.css";

const BACKEND = "https://endoai-backend.onrender.com";

function App() {
  useEffect(() => {
    // 1. Initialize and maintain theme globally across all pages
    const applyTheme = () => {
      const savedTheme = localStorage.getItem("endoai_theme") || "dark";
      document.documentElement.setAttribute("data-theme", savedTheme);
      if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
      } else {
        document.body.classList.remove("dark-theme");
      }
    };

    applyTheme();
    window.addEventListener("endoai_theme_changed", applyTheme);
    window.addEventListener("storage", applyTheme);

    // 2. Wake up Render backend silently on load
    fetch(`${BACKEND}/health`).catch(() => { });

    return () => {
      window.removeEventListener("endoai_theme_changed", applyTheme);
      window.removeEventListener("storage", applyTheme);
    };
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/results" element={<Results />} />
          <Route path="/history" element={<CaseHistory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/patients" element={<Patients />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;