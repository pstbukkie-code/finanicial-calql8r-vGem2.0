// --- Styling constants (inline styles) ---
export const S = {
  inp: {
    background: "#0a1520",
    border: "1px solid #1e3a5f",
    borderRadius: 8,
    color: "#e8f0fe",
    padding: "9px 12px",
    fontSize: 13,
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  },
  lbl: {
    fontSize: 10,
    color: "#8aa3be",
    letterSpacing: "0.08em",
    display: "block",
    marginBottom: 3,
    marginTop: 10,
    textTransform: "uppercase",
  },
  card: {
    background: "linear-gradient(135deg,#0f1923,#162030)",
    border: "1px solid #1e3a5f",
    borderRadius: 12,
    padding: 20,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "9px 12px",
    fontSize: 10,
    color: "#8aa3be",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    textAlign: "left",
    borderBottom: "1px solid #1a2d45",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "11px 12px",
    fontSize: 12,
    color: "#e8f0fe",
    borderBottom: "1px solid #0f1d2e",
  },
  sec: {
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#8aa3be",
    marginBottom: 14,
  },
};

export const mkbtn = (bg, color = "#fff", size = "md") => ({
  background: bg,
  border: "none",
  borderRadius: 7,
  padding: size === "sm" ? "5px 10px" : "9px 16px",
  color,
  fontSize: size === "sm" ? 11 : 12,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
});

// --- Reusable UI Components ---
export const KPI = ({ label, value, sub, accent = "#c9a84c", icon, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: "linear-gradient(135deg,#0f1923,#162030)",
      border: `1px solid ${accent}44`,
      borderRadius: 12,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
    }}
  >
    <div style={{ position: "absolute", right: 16, top: 14, fontSize: 24, opacity: 0.12 }}>
      {icon}
    </div>
    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8aa3be", marginBottom: 6 }}>
      {label}
    </div>
    <div style={{ fontSize: 22, fontWeight: 700, color: accent, fontFamily: "monospace" }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: "#5d7a96", marginTop: 4 }}>{sub}</div>}
  </div>
);

export const Badge = ({ status }) => {
  const m = {
    Active: { bg: "#052e16", c: "#4ade80", b: "#14532d" },
    Expired: { bg: "#2d1b00", c: "#f59e0b", b: "#713f12" },
    Pending: { bg: "#1e1b4b", c: "#818cf8", b: "#3730a3" },
    Suspended: { bg: "#1c1917", c: "#a8a29e", b: "#44403c" },
    Yes: { bg: "#052e16", c: "#4ade80", b: "#14532d" },
    No: { bg: "#2d1b00", c: "#f59e0b", b: "#713f12" },
  };
  const s = m[status] || m["Pending"];
  return (
    <span style={{ background: s.bg, color: s.c, border: `1px solid ${s.b}`, borderRadius: 99, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>
      {status}
    </span>
  );
};

export const UtilBar = ({ pct }) => {
  const color = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ width: "100%", background: "#1a2d45", borderRadius: 99, height: 7, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 99, boxShadow: `0 0 6px ${color}80` }} />
    </div>
  );
};

export const Modal = ({ title, onClose, children, width = 580 }) => (
  <div
    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
  >
    <div style={{ background: "#0d1822", border: "1px solid #1e3a5f", borderRadius: 16, width, maxWidth: "95vw", maxHeight: "92vh", overflowY: "auto", padding: "26px 30px", position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button onClick={onClose} style={{ position: "absolute", top: 14, right: 18, background: "none", border: "none", color: "#5d7a96", fontSize: 20, cursor: "pointer" }}>✕</button>
      <h3 style={{ color: "#c9a84c", fontFamily: "Georgia,serif", marginBottom: 18, fontSize: 16, marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  </div>
);

export const ConfirmModal = ({ message, onConfirm, onClose }) => (
  <Modal title="⚠️ Confirm Delete" onClose={onClose} width={400}>
    <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>{message}</p>
    <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
      <button onClick={onClose} style={{ ...mkbtn("#1e3a5f", "#8aa3be"), flex: 1 }}>CANCEL</button>
      <button onClick={() => { onConfirm(); onClose(); }} style={{ ...mkbtn("#7f1d1d", "#fca5a5"), flex: 1 }}>DELETE</button>
    </div>
  </Modal>
);