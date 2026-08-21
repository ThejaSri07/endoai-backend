// src/components/Skeleton.jsx
const pulse = `
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
`;

const base = {
  background:         "linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)",
  backgroundSize:     "600px 100%",
  animation:          "shimmer 1.4s infinite linear",
  borderRadius:       "var(--radius-sm)",
};

export function SkeletonBox({ w = "100%", h = "16px", mb = "0", radius }) {
  return (
    <>
      <style>{pulse}</style>
      <div style={{ ...base, width: w, height: h, marginBottom: mb, borderRadius: radius || "var(--radius-sm)" }} />
    </>
  );
}

export function SkeletonCard() {
  return (
    <div style={{ background: "var(--surface-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "22px 24px", marginBottom: "16px" }}>
      <style>{pulse}</style>
      <SkeletonBox h="14px" w="40%" mb="12px" />
      <SkeletonBox h="28px" w="60%" mb="8px" />
      <SkeletonBox h="12px" w="80%" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div style={{ padding: "0 20px" }}>
      <style>{pulse}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: "16px", padding: "14px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
          <SkeletonBox w="60px"  h="12px" />
          <SkeletonBox w="100px" h="12px" />
          <SkeletonBox w="80px"  h="12px" />
          <SkeletonBox w="50px"  h="20px" radius="20px" />
          <SkeletonBox w="60px"  h="28px" radius="6px" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div>
      <style>{pulse}</style>
      <SkeletonBox h="140px" mb="24px" radius="var(--radius-lg)" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "24px" }}>
        <SkeletonBox h="100px" radius="var(--radius-lg)" />
        <SkeletonBox h="100px" radius="var(--radius-lg)" />
        <SkeletonBox h="100px" radius="var(--radius-lg)" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <SkeletonBox h="300px" radius="var(--radius-lg)" />
        <SkeletonBox h="300px" radius="var(--radius-lg)" />
      </div>
    </div>
  );
}
