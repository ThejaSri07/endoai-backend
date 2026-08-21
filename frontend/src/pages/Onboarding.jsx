// src/pages/Onboarding.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../auth";

const STEPS = [
  {
    icon: "🦷",
    title: "Welcome to EndoAI",
    sub:   "AI-powered volumetric canal planning for endodontists",
    desc:  "EndoAI uses a deep learning model trained on 531 real CBCT cases to automatically segment root canals, measure curvature, volume, and dentin thickness — and generate a full clinical risk report in seconds.",
    img:   null,
  },
  {
    icon: "📤",
    title: "Upload CBCT Scans",
    sub:   "Support for DICOM, NIfTI, and more",
    desc:  "Upload a single file or an entire folder of DICOM slices. The AI engine automatically stacks axial slices, resamples to uniform spacing, and runs 3D canal segmentation. Works with any CBCT scanner output.",
    points: ["Drag & drop or folder select", "Supports .dcm, .nii, .nrrd, .zip", "Up to 16 axial slices per case"],
  },
  {
    icon: "📊",
    title: "Get Instant Analysis",
    sub:   "Full volumetric report in under 60 seconds",
    desc:  "The AI model produces clinical measurements including canal volume, length, curvature angle, dentin thickness, and number of canals — then computes a risk score and treatment recommendation automatically.",
    points: ["Canal volume in mm³", "Curvature in degrees", "Risk: Low / Moderate / High", "Taper, apical size, irrigation protocol"],
  },
  {
    icon: "👥",
    title: "Manage Patients & Cases",
    sub:   "Full patient database built in",
    desc:  "Add patients, link cases to them, track history across multiple visits, and download PDF reports to share with patients or keep in records. All data is securely stored in the cloud.",
    points: ["Patient profiles with medical history", "Multiple cases per patient", "Downloadable PDF reports", "Case history with search & filter"],
  },
];

function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate        = useNavigate();
  const user            = getCurrentUser();

  const isLast = step === STEPS.length - 1;
  const s      = STEPS[step];

  const finish = () => {
    localStorage.setItem("endoai_onboarded", "true");
    navigate("/dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0A3D62 0%, #1565A8 60%, #0A3D62 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden" }}>

      {/* Decorations */}
      <div style={{ position: "absolute", top: "-100px", right: "-100px", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(0,180,216,0.08)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-80px", left: "-80px", width: "300px", height: "300px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "580px", position: "relative", zIndex: 1 }}>

        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "32px" }}>
          {STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{ width: i === step ? "28px" : "8px", height: "8px", borderRadius: "4px", background: i === step ? "var(--accent)" : "rgba(255,255,255,0.3)", transition: "all 0.3s", cursor: "pointer" }} />
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: "20px", padding: "44px 40px", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>

          {/* Icon */}
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "var(--info-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", marginBottom: "20px" }}>
            {s.icon}
          </div>

          {/* Step label */}
          <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "8px" }}>
            Step {step + 1} of {STEPS.length}
          </div>

          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>
            {s.title}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--primary-light)", fontWeight: "500", marginBottom: "16px" }}>
            {s.sub}
          </p>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.7", marginBottom: s.points ? "20px" : "32px" }}>
            {s.desc}
          </p>

          {s.points && (
            <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "16px 20px", marginBottom: "32px" }}>
              {s.points.map((pt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", fontSize: "14px", color: "var(--text-primary)", fontWeight: "500" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                  {pt}
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{ padding: "12px 20px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", fontSize: "14px", fontWeight: "600", cursor: "pointer", color: "var(--text-secondary)" }}>
                ← Back
              </button>
            )}
            <button onClick={isLast ? finish : () => setStep(s => s + 1)}
              style={{ flex: 1, padding: "13px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
              {isLast ? `Start Using EndoAI →` : "Next →"}
            </button>
          </div>

          {/* Skip */}
          {!isLast && (
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <span onClick={finish} style={{ fontSize: "13px", color: "var(--text-muted)", cursor: "pointer", textDecoration: "underline" }}>
                Skip tour
              </span>
            </div>
          )}
        </div>

        {/* User greeting */}
        {user && (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "20px" }}>
            Signed in as <strong style={{ color: "#fff" }}>{user.name}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

export default Onboarding;
