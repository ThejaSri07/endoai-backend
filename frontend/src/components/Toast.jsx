// src/components/Toast.jsx
import { useState, useEffect, createContext, useContext, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const COLORS = {
    success: { bg: "var(--success-bg)", color: "var(--success)",       border: "var(--success)" },
    error:   { bg: "var(--danger-bg)",  color: "var(--danger)",        border: "var(--danger)"  },
    warning: { bg: "var(--warning-bg)", color: "var(--warning)",       border: "var(--warning)" },
    info:    { bg: "var(--info-bg)",    color: "var(--primary-light)", border: "var(--info)"    },
  };

  const ICONS = {
    success: "✓",
    error:   "✕",
    warning: "⚠",
    info:    "ℹ",
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px" }}>
        {toasts.map(t => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div key={t.id} style={{
              background:   c.bg,
              color:        c.color,
              border:       `1px solid ${c.border}`,
              borderRadius: "var(--radius)",
              padding:      "12px 16px",
              fontSize:     "14px",
              fontWeight:   "500",
              display:      "flex",
              alignItems:   "center",
              gap:          "10px",
              boxShadow:    "var(--shadow-lg)",
              minWidth:     "280px",
              maxWidth:     "380px",
              animation:    "slideIn 0.2s ease",
            }}>
              <span style={{ fontSize: "16px", fontWeight: "700" }}>{ICONS[t.type]}</span>
              <span style={{ flex: 1 }}>{t.message}</span>
              <span style={{ cursor: "pointer", opacity: 0.6, fontSize: "16px" }} onClick={() => removeToast(t.id)}>×</span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100px); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.addToast;
}
