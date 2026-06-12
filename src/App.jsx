import { useState, useMemo, useRef, useCallback, useEffect, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

// ─── DB helpers ───────────────────────────────────────────────────────────────

// Map DB row → app task
function appTask(r) {
  return {
    id: r.id, summary: r.summary, assignee: r.assignee, customer: r.customer || "",
    status: r.status, priority: r.priority,
    manDays: r.man_days, efficiencyPct: r.efficiency_pct, bufferDays: r.buffer_days,
    startDate: r.start_date, jiraUrl: r.jira_url || "", deps: r.deps || [],
  };
}
// Map app task → DB row
function dbTask(t) {
  return {
    id: t.id, summary: t.summary, assignee: t.assignee, customer: t.customer || null,
    status: t.status, priority: t.priority,
    man_days: t.manDays, efficiency_pct: t.efficiencyPct, buffer_days: t.bufferDays,
    start_date: t.startDate, jira_url: t.jiraUrl || null, deps: t.deps || [],
  };
}

const db = {
  // Tasks
  async getTasks()        { const {data} = await supabase.from("tasks").select("*").order("created_at"); return (data||[]).map(appTask); },
  async upsertTask(t)     { await supabase.from("tasks").upsert(dbTask(t)); },
  async deleteTask(id)    { await supabase.from("tasks").delete().eq("id", id); },
  // Members
  async getMembers()      { const {data} = await supabase.from("members").select("*").order("sort_order"); return data||[]; },
  async upsertMember(m)   { await supabase.from("members").upsert(m); },
  async deleteMember(n)   { await supabase.from("members").delete().eq("name", n); },
  // Customers
  async getCustomers()    { const {data} = await supabase.from("customers").select("name").order("name"); return (data||[]).map(r=>r.name); },
  async upsertCustomer(n) { await supabase.from("customers").upsert({name:n}); },
  // Reports
  async getReports()      { const {data} = await supabase.from("reports").select("*").order("created_at",{ascending:false}); return (data||[]).map(r=>({id:r.id,date:r.date,isoDate:r.iso_date,notes:r.notes,snapshot:r.snapshot})); },
  async insertReport(r)   { await supabase.from("reports").insert({id:r.id,date:r.date,iso_date:r.isoDate,notes:r.notes,snapshot:r.snapshot}); },
  async deleteReport(id)  { await supabase.from("reports").delete().eq("id", id); },
  // Profiles
  async getProfile(uid)   { const {data} = await supabase.from("profiles").select("*").eq("id",uid).single(); return data; },
  async upsertProfile(p)  { await supabase.from("profiles").upsert(p); },
  async getProfiles()     { const {data} = await supabase.from("profiles").select("*"); return data||[]; },
};

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function signInWithGoogle() {
    setLoading(true); setError("");
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (e) { setError(e.message); setLoading(false); }
  }

  return (
    <div style={{ height:"100vh", width:"100vw", background:"#0b0f1c", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif" }}>
      <div style={{ width:"min(340px,92vw)", padding:"36px 32px", background:"#111827", border:"1px solid #2d3f55", borderRadius:16, boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:32 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:"linear-gradient(135deg,#5b9cf6,#e879f9)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚡</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"#f0f4ff", letterSpacing:"0.06em" }}>CDT PLANNER</div>
            <div style={{ fontSize:11, color:"#6b84a0", letterSpacing:"0.1em" }}>SIGN IN</div>
          </div>
        </div>
        {error && <div style={{ marginBottom:14, padding:"8px 12px", background:"#2a1010", border:"1px solid #f8717144", borderRadius:7, fontSize:12, color:"#f87171" }}>{error}</div>}
        <button onClick={signInWithGoogle} disabled={loading} style={{ width:"100%", padding:"13px", borderRadius:9, border:"1px solid #2d3f55", background:"#1a2235", color:"#f0f4ff", fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12, opacity:loading?0.6:1, transition:"all 0.15s" }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>
        <div style={{ marginTop:20, fontSize:11, color:"#6b84a0", textAlign:"center", lineHeight:1.6 }}>
          Sign in with your Google account. An admin must approve your access after first sign-in.
        </div>
      </div>
    </div>
  );
}

// ─── Account Management (admin only) ─────────────────────────────────────────

function AccountsView({ memberNames }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [success, setSuccess]   = useState("");

  useEffect(() => { db.getProfiles().then(p => { setProfiles(p); setLoading(false); }); }, []);

  async function updateProfile(id, patch) {
    await db.upsertProfile({ id, ...patch });
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    setSuccess("Saved"); setTimeout(() => setSuccess(""), 2500);
  }

  const iSt = { padding:"6px 10px", borderRadius:6, background:"#0d1a2e", border:"1px solid #2d3f55", color:"#f0f4ff", fontSize:13, fontFamily:"inherit", outline:"none" };

  if (loading) return <div style={{ color:"#b8cfe0", fontSize:14 }}>Loading…</div>;

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, color:"#e879f9", letterSpacing:"0.15em", marginBottom:3 }}>ADMIN</div>
        <div style={{ fontSize:"clamp(18px,3vw,24px)", fontWeight:700, color:"#f0f4ff" }}>User Accounts</div>
        <div style={{ fontSize:13, color:"#b8cfe0", marginTop:6 }}>Users appear after their first Google sign-in. Set their role and link to a team member.</div>
      </div>
      {success && <div style={{ marginBottom:14, padding:"8px 12px", background:"#0d3328", border:"1px solid #3dd68c44", borderRadius:7, fontSize:12, color:"#3dd68c" }}>{success}</div>}
      {profiles.length === 0 && (
        <div style={{ padding:"32px", textAlign:"center", color:"#b8cfe0", fontSize:13, background:"#111827", borderRadius:10, border:"1px dashed #2d3f55" }}>No users yet. Users appear here after their first Google sign-in.</div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {profiles.map(p => (
          <div key={p.id} style={{ background:"#111827", border:"1px solid #2d3f55", borderRadius:10, padding:"14px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0, background:p.role==="admin"?"#e879f9":"#5b9cf6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff" }}>{initials(p.full_name||p.email||"?")}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#f0f4ff" }}>{p.full_name||"—"}</div>
                <div style={{ fontSize:12, color:"#b8cfe0" }}>{p.email}</div>
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                <select value={p.role||""} onChange={e => updateProfile(p.id, {role:e.target.value})} style={{ ...iSt, width:120 }}>
                  <option value="">— pending —</option>
                  <option value="employee">employee</option>
                  <option value="admin">admin</option>
                </select>
                <select value={p.member_name||""} onChange={e => updateProfile(p.id, {member_name:e.target.value})} style={{ ...iSt, width:170 }}>
                  <option value="">— link member —</option>
                  {memberNames.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ["#5b9cf6","#f5854a","#3dd68c","#e056b8","#fbbf24","#38bdf8","#f07040","#a16ef5"];

const STATUS_CONFIG = {
  "To Do":       { color: "#9eb5cc", bg: "#1e2d42" },
  "In Progress": { color: "#6baaf8", bg: "#1e3a5f" },
  "Blocked":     { color: "#F7874F", bg: "#3d2010" },
  "Done":        { color: "#4FD4A0", bg: "#0d3328" },
};

const PRIORITY_CONFIG = {
  "Critical": { color: "#f87171", icon: "⬆⬆" },
  "High":     { color: "#fb923c", icon: "⬆" },
  "Medium":   { color: "#fbbf24", icon: "→" },
  "Low":      { color: "#a8bdd0", icon: "⬇" },
};

const DAY_PX = 32; // pixels per calendar day in Gantt
const BAR_H  = 32; // height of a single task bar
const BAR_GAP = 8;  // vertical gap between bars + padding
const ROW_PAD = 12; // top+bottom padding per row
// Row height is now dynamic: rowH(n) = n * (BAR_H + BAR_GAP) + ROW_PAD
function rowHeight(nTasks) { return Math.max(nTasks, 1) * (BAR_H + BAR_GAP) + ROW_PAD; }
const ROW_H = 52; // kept for legacy ghost preview fallback

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDate(str) {
  const d = new Date(str + "T00:00:00");
  return d;
}

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

// Returns up to 2 initials: "Constantinos Christofi" → "CC", "Alex" → "A"
function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Add N working days (Mon–Fri) to a date
function addWorkingDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  let added = 0;
  while (added < Math.max(n, 0)) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

// Count working days between two ISO strings (inclusive start, exclusive end)
function workingDaysBetween(startStr, endStr) {
  const s = toDate(startStr);
  const e = toDate(endStr);
  let count = 0;
  const cur = new Date(s);
  while (cur < e) {
    if (cur.getDay() !== 0 && cur.getDay() !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// Calendar days between two ISO strings
function calDaysBetween(startStr, endStr) {
  return Math.round((toDate(endStr) - toDate(startStr)) / 86400000);
}

// Next Friday on or after a date
function nextFriday(d) {
  const r = new Date(d);
  const dow = r.getDay();
  r.setDate(r.getDate() + (dow <= 5 ? 5 - dow : 6));
  return r;
}

// Formula: workingDays = ceil(MD × (2/FTE) × (100/Eff%)) — pure work days (no buffer)
// totalWorkingDays = workingDays + bufferDays
function calcWorkingDays(manDays, fte, effPct) {
  return Math.ceil(manDays * (2 / Math.max(fte, 0.01)) * (100 / Math.max(effPct, 1)));
}
function calcTotalWorkingDays(manDays, fte, effPct, bufferDays) {
  return calcWorkingDays(manDays, fte, effPct) + (bufferDays || 0);
}

function calcTaskEnd(startStr, manDays, fte, effPct, bufferDays) {
  if (!startStr) return null;
  const wdays = calcWorkingDays(manDays, fte, effPct) + (bufferDays || 0);
  return addWorkingDays(startStr, wdays);
}

function calcDueDate(startStr, manDays, fte, effPct, bufferDays) {
  const end = calcTaskEnd(startStr, manDays, fte, effPct, bufferDays);
  return end ? nextFriday(end) : null;
}

function isWeekend(d) { return d.getDay() === 0 || d.getDay() === 6; }

function fmtDate(d) {
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtShort(d) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISO(d);
}

// ─── Initial data ─────────────────────────────────────────────────────────────

const INITIAL_TASKS = [
  { id: "T-101", summary: "Design system architecture",  assignee: "Alex",   status: "In Progress", priority: "Critical", manDays: 8,  efficiencyPct: 100, bufferDays: 0, startDate: daysAgo(5),  deps: [], jiraUrl: "" },
  { id: "T-102", summary: "API endpoint specification",  assignee: "Maria",  status: "Done",        priority: "High",     manDays: 5,  efficiencyPct: 120, bufferDays: 0, startDate: daysAgo(14), deps: ["T-101"], jiraUrl: "" },
  { id: "T-103", summary: "Database schema migration",   assignee: "Alex",   status: "To Do",       priority: "High",     manDays: 6,  efficiencyPct: 100, bufferDays: 2, startDate: daysAgo(0),  deps: ["T-102"], jiraUrl: "" },
  { id: "T-104", summary: "Unit test coverage pass",     assignee: "Jordan", status: "To Do",       priority: "Medium",   manDays: 4,  efficiencyPct: 80,  bufferDays: 0, startDate: daysAgo(0),  deps: ["T-102"], jiraUrl: "" },
  { id: "T-105", summary: "CI/CD pipeline setup",        assignee: "Sam",    status: "In Progress", priority: "High",     manDays: 7,  efficiencyPct: 150, bufferDays: 1, startDate: daysAgo(3),  deps: [], jiraUrl: "" },
  { id: "T-106", summary: "Frontend auth integration",   assignee: "Maria",  status: "Blocked",     priority: "Critical", manDays: 6,  efficiencyPct: 100, bufferDays: 3, startDate: daysAgo(0),  deps: ["T-102","T-105"], jiraUrl: "" },
  { id: "T-107", summary: "Performance benchmarking",    assignee: "Jordan", status: "To Do",       priority: "Low",      manDays: 3,  efficiencyPct: 90,  bufferDays: 0, startDate: daysAgo(0),  deps: ["T-103"], jiraUrl: "" },
  { id: "T-108", summary: "Security audit prep",         assignee: "Sam",    status: "To Do",       priority: "Medium",   manDays: 5,  efficiencyPct: 100, bufferDays: 0, startDate: daysAgo(0),  deps: ["T-103"], jiraUrl: "" },
  { id: "T-109", summary: "Documentation update",        assignee: "Casey",  status: "In Progress", priority: "Low",      manDays: 3,  efficiencyPct: 200, bufferDays: 5, startDate: daysAgo(2),  deps: [], jiraUrl: "" },
  { id: "T-110", summary: "Load testing",                assignee: "Casey",  status: "To Do",       priority: "Medium",   manDays: 5,  efficiencyPct: 100, bufferDays: 0, startDate: daysAgo(0),  deps: ["T-105"], jiraUrl: "" },
];

const INITIAL_MEMBERS = {
  Alex:   { fte: 1.0  },
  Maria:  { fte: 0.5  },
  Jordan: { fte: 1.0  },
  Sam:    { fte: 0.75 },
  Casey:  { fte: 1.0  },
};

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
  return lines.slice(1).map((line, i) => {
    const vals = line.split(",").map(v => v.trim());
    const row = {};
    headers.forEach((h, j) => { row[h] = vals[j] || ""; });
    return {
      id: row["id"] || `T-${200 + i}`,
      summary: row["summary"] || row["title"] || "Untitled",
      assignee: row["assignee"] || "Unassigned",
      status: row["status"] || "To Do",
      priority: row["priority"] || "Medium",
      manDays: parseFloat(row["mandays"] || row["md"] || 1),
      efficiencyPct: parseFloat(row["efficiency"] || 100),
      bufferDays: parseInt(row["buffer"] || 0),
      startDate: row["startdate"] || row["start"] || toISO(new Date()),
      deps: row["deps"] ? row["deps"].split(";").map(d => d.trim()).filter(Boolean) : [],
      jiraUrl: row["jiraurl"] || row["jira"] || "",
    };
  });
}

const HORIZON_DAYS = 20; // planning window in working days

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%", padding: "9px 11px", borderRadius: 7,
  background: "#111827", border: "1px solid #2d3f55",
  color: "#eaf0f6", fontSize: 15, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  fontSize: 13, color: "#b8cfe0", letterSpacing: "0.12em",
  display: "block", marginBottom: 5,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ViewHeader({ label, accent, title }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, color: accent, letterSpacing: "0.15em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 700, color: "#f8fafc" }}>{title}</div>
    </div>
  );
}


// Stat chip: shows a dimmed label + bright value in a pill
function StatChip({ label, value, color, accent }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "baseline", gap: 4,
      background: (accent || "#2d3f55") + "44",
      border: `1px solid ${accent || "#2d3f55"}`,
      borderRadius: 5, padding: "2px 8px",
    }}>
      <span style={{ fontSize: 12, color: "#b8cfe0", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: color || "#d4e1ed" }}>{value}</span>
    </div>
  );
}

// StatRow: wraps multiple chips in a flex row
function StatRow({ children, gap = 5, mt = 0, mb = 0 }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap, marginTop: mt, marginBottom: mb }}>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG["To Do"];
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: s.bg, color: s.color }}>{status}</span>
  );
}

// ─── Gantt Chart ─────────────────────────────────────────────────────────────

function GanttChart({ enriched, members, memberColors, memberNames, onMoveTask, onDropTask, onAddTask, onEditTask }) {
  const ganttRef = useRef(null);

  // Determine date range: earliest start to latest end + some padding
  const { minDate, maxDate, totalDays } = useMemo(() => {
    let min = new Date();
    let max = new Date();
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 60);
    enriched.forEach(t => {
      if (t.startDate) {
        const s = toDate(t.startDate);
        if (s < min) min = s;
      }
      if (t.endDate) {
        const e = t.endDate;
        if (e > max) max = new Date(e);
      }
    });
    // snap min to Monday
    while (min.getDay() !== 1) min.setDate(min.getDate() - 1);
    // snap max to Sunday + 14 days padding
    max.setDate(max.getDate() + 14);
    while (max.getDay() !== 0) max.setDate(max.getDate() + 1);
    const total = Math.ceil((max - min) / 86400000) + 1;
    return { minDate: toISO(min), maxDate: toISO(max), totalDays: total };
  }, [enriched]);

  // Build day columns
  const days = useMemo(() => {
    const arr = [];
    const d = toDate(minDate);
    for (let i = 0; i < totalDays; i++) {
      arr.push(toISO(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, [minDate, totalDays]);

  // Month/week headers
  const monthGroups = useMemo(() => {
    const groups = [];
    let cur = null;
    days.forEach((d, i) => {
      const month = d.slice(0, 7);
      if (month !== cur) { cur = month; groups.push({ month, start: i, count: 0 }); }
      groups[groups.length - 1].count++;
    });
    return groups;
  }, [days]);

  // Today's offset
  const todayISO = toISO(new Date());
  const todayOffset = calDaysBetween(minDate, todayISO);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const dragRef = useRef(null); // { taskId, origStartDate, startClientX }
  const [dropTarget, setDropTarget]     = useState(null);
  const [ghostPreview, setGhostPreview] = useState(null);
  // ghostPreview: { taskId, member, startOff, calDays, color, label, isReassign }

  function computeGhost(clientX, memberName) {
    const ref = dragRef.current;
    if (!ref) return null;
    const task = enriched.find(t => t.id === ref.taskId);
    if (!task) return null;
    const dx = clientX - ref.startClientX;
    const daysDelta = Math.round(dx / DAY_PX);
    const origD = toDate(task.startDate);
    origD.setDate(origD.getDate() + daysDelta);
    const newStart = toISO(origD);
    const startOff = calDaysBetween(minDate, newStart);
    const targetMember = memberName || task.assignee;
    const targetFte = (members[targetMember] || { fte: 1 }).fte;
    const wdays = calcWorkingDays(task.manDays, targetFte, task.efficiencyPct) + (task.bufferDays || 0);  // working days incl. buffer
    const endD = addWorkingDays(newStart, wdays);
    const calDays = Math.max(calDaysBetween(newStart, toISO(endD)), 1);
    const dueDate = nextFriday(endD);
    return {
      taskId: task.id,
      member: targetMember,
      startOff,
      calDays,
      color: memberColors[targetMember] || memberColors[task.assignee],
      label: `${task.id}  ·  ${newStart}  →  due ${fmtDate(dueDate)}`,
      isReassign: targetMember !== task.assignee,
    };
  }

  function onBarDragStart(e, task, ti) {
    dragRef.current = { taskId: task.id, origStartDate: task.startDate, startClientX: e.clientX, ti };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
    try {
      const ghost = document.createElement("div");
      ghost.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      requestAnimationFrame(() => ghost.remove());
    } catch {}
  }

  function onBarDragEnd() {
    setDropTarget(null);
    setGhostPreview(null);
    dragRef.current = null;
  }

  function onRowDragOver(e, memberName) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(memberName);
    setGhostPreview(computeGhost(e.clientX, memberName));
  }

  function onRowDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null);
      setGhostPreview(null);
    }
  }

  function onRowDrop(e, memberName) {
    e.preventDefault();
    setDropTarget(null);
    setGhostPreview(null);
    const ref = dragRef.current;
    const taskId = ref?.taskId || e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const task = enriched.find(t => t.id === taskId);
    if (!task) return;
    const dx = e.clientX - (ref?.startClientX ?? e.clientX);
    const daysDelta = Math.round(dx / DAY_PX);
    const origD = toDate(task.startDate);
    origD.setDate(origD.getDate() + daysDelta);
    const newStartDate = toISO(origD);
    if (memberName !== task.assignee) {
      onDropTask(taskId, memberName, newStartDate);
    } else {
      onMoveTask(taskId, newStartDate, null);
    }
    dragRef.current = null;
  }


  const LABEL_W = typeof window !== "undefined" && window.innerWidth < 480 ? 88 : 130;
  const chartW = totalDays * DAY_PX;

  return (
    <div style={{ overflowX: "auto", overflowY: "visible", borderRadius: 10, border: "1px solid #2d3f55", background: "#0b0f1c" }}>
      <div style={{ minWidth: LABEL_W + chartW, position: "relative" }}>

        {/* ── Header rows ── */}
        <div style={{ display: "flex", borderBottom: "1px solid #2d3f55", position: "sticky", top: 0, zIndex: 20, background: "#0d1422" }}>
          {/* label spacer */}
          <div style={{ width: LABEL_W, flexShrink: 0, borderRight: "1px solid #2d3f55" }} />
          {/* month groups */}
          <div style={{ display: "flex", flex: 1 }}>
            {monthGroups.map(g => (
              <div key={g.month} style={{
                width: g.count * DAY_PX, flexShrink: 0,
                borderRight: "1px solid #2d3f55",
                padding: "4px 8px", fontSize: 13, fontWeight: 700,
                color: "#b8cfe0", letterSpacing: "0.1em",
                background: "#0b0f1c",
              }}>
                {new Date(g.month + "-15").toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        {/* Day number row */}
        <div style={{ display: "flex", borderBottom: "2px solid #2d3f55", position: "sticky", top: 25, zIndex: 20, background: "#0b0f1c" }}>
          <div style={{ width: LABEL_W, flexShrink: 0, borderRight: "1px solid #2d3f55" }} />
          <div style={{ display: "flex" }}>
            {days.map((d, i) => {
              const dt = toDate(d);
              const isWE = isWeekend(dt);
              const isToday = d === todayISO;
              const isMon = dt.getDay() === 1;
              return (
                <div key={d} style={{
                  width: DAY_PX, flexShrink: 0, textAlign: "center",
                  fontSize: 12, padding: "3px 0",
                  color: isToday ? "#4F8EF7" : isWE ? "#2d3f55" : "#3d5068",
                  background: isWE ? "#0d1422" : isToday ? "#0d1a33" : "transparent",
                  borderRight: isMon ? "1px solid #2d3f55" : "none",
                  fontWeight: isToday ? 700 : 400,
                }}>
                  {isMon || isToday ? dt.getDate() : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Per-member rows ── */}
        {memberNames.map((member, mi) => {
          const color = memberColors[member];
          const mTasks = enriched.filter(t => t.assignee === member);

          return (
            <div key={member}
              onDragOver={e => onRowDragOver(e, member)}
              onDragLeave={onRowDragLeave}
              onDrop={e => onRowDrop(e, member)}
              style={{
                display: "flex", alignItems: "stretch",
                borderBottom: "1px solid #2d3f55",
                minHeight: rowHeight(mTasks.length),
                background: dropTarget === member
                  ? color + "18"
                  : mi % 2 === 0 ? "transparent" : "#0d1117",
                outline: dropTarget === member ? `2px dashed ${color}` : "none",
                outlineOffset: -2,
                transition: "background 0.1s",
              }}>
              {/* Member label */}
              <div style={{
                width: LABEL_W, flexShrink: 0, borderRight: "1px solid #2d3f55",
                display: "flex", alignItems: "center", gap: 8, padding: "0 10px",
                position: "sticky", left: 0, zIndex: 10,
                background: mi % 2 === 0 ? "#0b0f1c" : "#0d1117",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: color + "22", border: `2px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 700, color, flexShrink: 0,
                }}>{initials(member)}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{member}</div>
                  <StatChip label="FTE" value={members[member]?.fte?.toFixed(1)} />
                </div>
              </div>

              {/* Chart area — click empty space to add a task */}
              <div
                style={{ position: "relative", flex: 1, minHeight: rowHeight(mTasks.length), cursor: "cell" }}
                onClick={e => {
                  // Only fire if we clicked the chart background (not a bar)
                  if (e.target === e.currentTarget || e.target.dataset.bg) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickOff = Math.round((e.clientX - rect.left) / DAY_PX);
                    const clickD = toDate(minDate);
                    clickD.setDate(clickD.getDate() + clickOff);
                    onAddTask(member, toISO(clickD));
                  }
                }}
              >
                {/* Weekend / today shading */}
                {days.map((d, i) => {
                  const dt = toDate(d);
                  const isWE = isWeekend(dt);
                  const isToday = d === todayISO;
                  const isMon = dt.getDay() === 1;
                  if (!isWE && !isToday && !isMon) return null;
                  return (
                    <div key={d} data-bg="1" style={{
                      position: "absolute", top: 0, bottom: 0,
                      left: i * DAY_PX, width: DAY_PX,
                      background: isWE ? "rgba(0,0,0,0.3)" : isToday ? "rgba(91,156,246,0.1)" : "transparent",
                      borderLeft: isToday ? "2px solid #4F8EF7" : isMon ? "1px solid #2d3f55" : "none",
                      pointerEvents: "none",
                    }} />
                  );
                })}

                {/* Ghost preview — shown while dragging over this row */}
                {ghostPreview && ghostPreview.member === member && (() => {
                  const gW    = Math.max(ghostPreview.calDays * DAY_PX - 4, 24);
                  const gLeft = ghostPreview.startOff * DAY_PX + 2;
                  const draggedTi = !ghostPreview.isReassign && dragRef.current ? (dragRef.current.ti ?? 0) : mTasks.length;
                  const gTop  = ROW_PAD / 2 + draggedTi * (BAR_H + BAR_GAP);
                  const gc    = ghostPreview.color;
                  return (
                    <div style={{
                      position: "absolute",
                      left: gLeft, top: gTop,
                      width: gW, height: BAR_H,
                      borderRadius: 6,
                      background: gc + "22",
                      border: `2px dashed ${gc}`,
                      pointerEvents: "none",
                      zIndex: 8,
                      display: "flex", alignItems: "center",
                      paddingLeft: 8, overflow: "hidden",
                      boxShadow: `0 0 12px 2px ${gc}44`,
                    }}>
                      <span style={{
                        fontSize: 12, color: gc, fontWeight: 700,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {ghostPreview.label}
                      </span>
                    </div>
                  );
                })()}

                {/* Task bars */}
                {mTasks.map((task, ti) => {
                  const startOff = calDaysBetween(minDate, task.startDate);
                  const endOff   = task.endDate ? calDaysBetween(minDate, toISO(task.endDate)) : startOff + task.totalDays;
                  const barW     = Math.max((endOff - startOff) * DAY_PX - 4, 24);
                  const barLeft  = startOff * DAY_PX + 2;
                  const barTop   = ROW_PAD / 2 + ti * (BAR_H + BAR_GAP);
                  const sc       = STATUS_CONFIG[task.status] || STATUS_CONFIG["To Do"];
                  const overdue  = isOverdue(task.dueDate) && task.status !== "Done";
                  const isDragging = dragRef.current?.taskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => onBarDragStart(e, task, ti)}
                      onDragEnd={onBarDragEnd}
                      onClick={e => { e.stopPropagation(); if (!dragRef.current) onEditTask && onEditTask(task); }}
                      title={`${task.id}: ${task.summary}\nStart: ${task.startDate}\nDue: ${fmtDate(task.dueDate)}\n${task.manDays}md · FTE ${members[task.assignee]?.fte} · ${task.efficiencyPct}% eff`}
                      style={{
                        position: "absolute",
                        left: barLeft, top: barTop,
                        width: barW, height: BAR_H,
                        borderRadius: 6,
                        background: task.status === "Done"
                          ? "linear-gradient(90deg,#0d3328,#1a4a3a)"
                          : `linear-gradient(90deg,${sc.bg},${color}44)`,
                        border: `1px solid ${overdue ? "#ef4444" : color}`,
                        cursor: "grab",
                        display: "flex", alignItems: "center",
                        paddingLeft: 7, overflow: "hidden",
                        userSelect: "none",
                        zIndex: 5,
                        opacity: isDragging ? 0.3 : 1,
                        transition: "box-shadow 0.1s, opacity 0.12s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 8px 1px ${color}66`}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                    >
                      {task.bufferDays > 0 && (() => {
                        const workW = Math.round(barW * ((task.calWork || task.workingDays) / Math.max(task.totalDays, 1)));
                        return (
                          <div style={{
                            position: "absolute", right: 0, top: 0,
                            width: barW - workW, height: "100%",
                            background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.3) 3px,rgba(0,0,0,0.3) 4px)",
                            borderRadius: "0 5px 5px 0",
                            pointerEvents: "none",
                          }} />
                        );
                      })()}
                      <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: barW - 14, position: "relative", zIndex: 1 }}>
                        {task.id}
                        {barW > 80 && <span style={{ color: "#a8bdd0", fontWeight: 400 }}> {task.summary}</span>}
                      </span>
                      {overdue && (
                        <span style={{ position: "absolute", right: 4, top: 2, fontSize: 12, color: "#ef4444", fontWeight: 700 }}>!</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Today line overlay label */}
        <div style={{
          position: "absolute",
          left: LABEL_W + todayOffset * DAY_PX,
          top: 0, bottom: 0,
          width: 0,
          borderLeft: "2px solid #4F8EF7",
          pointerEvents: "none", zIndex: 15,
        }}>
          <div style={{
            position: "absolute", top: 50, left: 3,
            fontSize: 12, color: "#6baaf8", fontWeight: 700,
            background: "#0b0f1c", padding: "1px 4px", borderRadius: 3,
            whiteSpace: "nowrap",
          }}>TODAY</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 18, padding: "10px 16px", borderTop: "1px solid #2d3f55", flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "#b8cfe0", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 16, height: 8, borderRadius: 2, background: "rgba(0,0,0,0.25)" }} /> Weekends
        </div>
        <div style={{ fontSize: 13, color: "#b8cfe0", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 16, height: 8, borderRadius: 2, background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.5) 3px,rgba(0,0,0,0.5) 4px)", border: "1px solid #8ba0b8" }} /> Buffer days
        </div>
        <div style={{ fontSize: 13, color: "#b8cfe0" }}>Drag bars to reschedule · Drop onto a member row to reassign</div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function PlannerApp({ initData, onLogout }) {
  const auth = useAuth();
  const isAdmin = auth?.role === "admin";
  const myName  = auth?.memberName;

  const [tasks, setTasksRaw]       = useState(initData.tasks);
  const [members, setMembersRaw]   = useState(initData.members);
  const [customers, setCustomersRaw] = useState(initData.customers);
  const [savedReports, setSavedReportsRaw] = useState(initData.reports);
  const [view, setView]            = useState("workload");
  const [selectedMember, setSelectedMember] = useState(null);

  // statusNotes: { [memberName]: { taskNotes: { [taskId]: string }, extraItems: [{id, text}] } }
  const [statusNotes, setStatusNotes] = useState({});
  const [addTaskModal, setAddTaskModal] = useState({ open: false, assignee: "", startDate: toISO(new Date()) });
  const [editTaskModal, setEditTaskModal] = useState({ open: false, task: null });

  // Supabase-backed setters
  function setTasks(v) {
    setTasksRaw(prev => {
      const next = typeof v === "function" ? v(prev) : v;

      return next;
    });
  }
  function setMembers(v) {
    setMembersRaw(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      Object.keys(next).forEach(n => {
        if (!prev[n] || prev[n].fte !== next[n].fte || prev[n].sort_order !== next[n].sort_order)
          db.upsertMember({ name: n, fte: next[n].fte, sort_order: next[n].sort_order ?? 0 });
      });
      Object.keys(prev).forEach(n => { if (!next[n]) db.deleteMember(n); });
      return next;
    });
  }
  function setCustomers(v) {
    setCustomersRaw(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      return next;
    });
  }
  function setSavedReports(v) {
    setSavedReportsRaw(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      return next;
    });
  }
  function addCustomer(name) {
    if (!customers.includes(name)) db.upsertCustomer(name);
    setCustomers(prev => prev.includes(name) ? prev : [...prev, name].sort());
  }

  const memberNames = useMemo(() => Object.keys(members), [members]);
  const memberColors = useMemo(() => {
    const map = {};
    memberNames.forEach((m, i) => { map[m] = COLORS[i % COLORS.length]; });
    return map;
  }, [memberNames]);

  // Enrich tasks with computed dates
  const enriched = useMemo(() => tasks.map(t => {
    const m          = members[t.assignee] || { fte: 1 };
    const pureWdays  = calcWorkingDays(t.manDays, m.fte, t.efficiencyPct);
    const workingDays = pureWdays + (t.bufferDays || 0);  // working days incl. buffer
    const endDate    = calcTaskEnd(t.startDate, t.manDays, m.fte, t.efficiencyPct, t.bufferDays);
    const dueDate    = endDate ? nextFriday(endDate) : null;
    // totalDays = calendar days from startDate to dueDate (incl. weekends)
    const totalDays  = (t.startDate && dueDate) ? calDaysBetween(t.startDate, toISO(dueDate)) : workingDays;
    // calWork = calendar span of pure work portion (for Gantt buffer shading ratio)
    const endNoBuffer = calcTaskEnd(t.startDate, t.manDays, m.fte, t.efficiencyPct, 0);
    const calWork    = (t.startDate && endNoBuffer) ? calDaysBetween(t.startDate, toISO(endNoBuffer)) : pureWdays;
    return { ...t, pureWdays, workingDays, totalDays, calWork, endDate, dueDate };
  }), [tasks, members]);

  const workload = useMemo(() => {
    const memberStats = memberNames.map(m => {
      const allTasks = enriched.filter(t => t.assignee === m);
      const activeTasks = allTasks.filter(t => t.status !== "Done");
      const totalMD = allTasks.reduce((s, t) => s + (t.manDays || 0), 0);
      const activeMD = activeTasks.reduce((s, t) => s + (t.manDays || 0), 0);
      const cfg = members[m] || { fte: 1 };
      // planned working days this person needs = activeMD * 2 (planning rule)
      const plannedDays = activeMD * 2;
      // available working days = FTE * horizon
      const availableDays = cfg.fte * HORIZON_DAYS;
      const utilization = availableDays > 0 ? (plannedDays / availableDays) * 100 : 0;
      return { member: m, tasks: allTasks, activeTasks, totalMD, activeMD, plannedDays, availableDays, utilization, cfg, color: memberColors[m] };
    });

    // Team-level utilization = total planned / total available
    const totalPlanned = memberStats.reduce((s, w) => s + w.plannedDays, 0);
    const totalAvailable = memberStats.reduce((s, w) => s + w.availableDays, 0);
    const teamUtilization = totalAvailable > 0 ? (totalPlanned / totalAvailable) * 100 : 0;

    return { members: memberStats, teamUtilization, totalPlanned, totalAvailable };
  }, [enriched, memberNames, members, memberColors]);

  function addMemberIfNew(name) {
    if (name && !members[name]) setMembers(p => ({ ...p, [name]: { fte: 1.0, sort_order: Object.keys(p).length } }));
  }
  function reorderMembers(newOrder) {
    setMembers(prev => {
      const next = {};
      newOrder.forEach((name, i) => { next[name] = { ...prev[name], sort_order: i }; });
      return next;
    });
  }
  function updateMember(name, field, val) { setMembers(p => ({ ...p, [name]: { ...p[name], [field]: val } })); }
  function updateStatus(id, status) {
    setTasks(p => p.map(t => t.id === id ? { ...t, status } : t));

  }
  function updateField(id, field, val) {
    setTasks(p => p.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, [field]: val };
      db.upsertTask(updated);
      return updated;
    }));
  }
  function deleteTask(id) {
    setTasks(p => p.filter(t => t.id !== id));
  }

  // Gantt: move task start date
  function handleMoveTask(taskId, newStartDate, newAssignee) {
    setTasks(p => p.map(t => {
      if (t.id !== taskId) return t;
      const updated = { ...t, startDate: newStartDate || t.startDate, assignee: newAssignee || t.assignee };
      return updated;
    }));
  }

  // Gantt: drop onto member row → reassign (and optionally shift start date)
  function handleDropTask(taskId, memberName, newStartDate) {
    setTasks(p => {
      const task = p.find(t => t.id === taskId);
      if (!task) return p;
      const updated = { ...task, assignee: memberName, ...(newStartDate ? { startDate: newStartDate } : {}) };
      db.upsertTask(updated); return [...p.filter(t => t.id !== taskId), updated];
    });
  }

  function saveReport() {
    const now = new Date();
    const isoDate = toISO(now);
    const label = now.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const report = {
      id: String(Date.now()),
      date: label,
      isoDate,
      notes: JSON.parse(JSON.stringify(statusNotes)),
      snapshot: enriched.map(t => ({ id: t.id, summary: t.summary, assignee: t.assignee, status: t.status, dueDate: t.dueDate ? toISO(t.dueDate) : null, jiraUrl: t.jiraUrl || "" })),
    };
    db.insertReport(report); setSavedReports(prev => [report, ...prev]);
    setStatusNotes({});
  }

  const navItems = [
    { id: "workload", label: "WORKLOAD" },
    { id: "schedule", label: "SCHEDULE" },
    { id: "standup",  label: "STATUS CALL" },
    { id: "reports",  label: "REPORTS" },
    ...(isAdmin ? [
      { id: "team",     label: "TEAM" },
      { id: "accounts", label: "ACCOUNTS" },
    ] : []),
  ];

  return (
    <div className="cdt-root">
      {/* ── Responsive styles ── */}
      <style>{`
        html, body, #root { height: 100%; margin: 0; padding: 0; }
        *, *::before, *::after { box-sizing: border-box; }

        /* Root: full-height flex column */
        .cdt-root {
          display: flex; flex-direction: column;
          height: 100vh; width: 100vw;
          background: #0b0f1c; color: #eaf0f6;
          font-family: 'DM Mono','Fira Mono','Courier New',monospace; font-size: 14px;
          overflow: hidden;
        }

        /* Header: fixed height, never shrinks */
        .cdt-header {
          flex-shrink: 0;
          border-bottom: 1px solid #2d3f55;
          background: rgba(11,15,28,0.98);
          display: flex; align-items: center;
          justify-content: space-between;
          flex-wrap: wrap; gap: 8px;
          padding: 10px 20px;
          z-index: 100;
        }

        /* Content: fills all remaining height, scrolls vertically */
        .cdt-content {
          flex: 1 1 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 20px 24px;
          min-height: 0;
        }
        .cdt-content > div { min-width: 0; width: 100%; }

        .cdt-nav { display: flex; gap: 3px; flex-wrap: wrap; align-items: center; }
        .cdt-nav-btn { padding: 6px 11px; border-radius: 5px; border: none; cursor: pointer; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
        .cdt-sign-out { padding: 6px 11px; border-radius: 5px; border: 1px solid #3d5068; background: transparent; color: #b8cfe0; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }

        /* Grids */
        .cdt-grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .cdt-grid-team  { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 13px; }
        .cdt-grid-add   { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .cdt-grid-add-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .cdt-standup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .cdt-person-grid  { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
        .cdt-util-row { display: flex; align-items: center; gap: 28px; margin-bottom: 32px; flex-wrap: wrap; }
        /* Add Task form: 2-column fluid grid */
        .cdt-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; }
        .cdt-form-full { grid-column: 1 / -1; }

        /* Tables */
        .cdt-table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid #2d3f55; background: #111827; width: 100%; }
        .cdt-table-wrap table { width: 100%; min-width: max-content; }

        /* Tablet ≤ 768px */
        @media (max-width: 768px) {
          .cdt-header  { padding: 8px 14px; }
          .cdt-content { padding: 14px; }
          .cdt-grid-cards { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 9px; }
          .cdt-grid-team  { grid-template-columns: 1fr; }
          .cdt-grid-add   { grid-template-columns: 1fr; }
          .cdt-grid-add-3 { grid-template-columns: 1fr 1fr; }
          .cdt-standup-grid { grid-template-columns: 1fr; }
          .cdt-person-grid  { grid-template-columns: 1fr 1fr; }
          .cdt-util-row { gap: 16px; }
          .cdt-form-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
        }

        /* Mobile ≤ 480px */
        @media (max-width: 480px) {
          .cdt-header  { padding: 7px 10px; gap: 6px; }
          .cdt-content { padding: 10px; }
          .cdt-nav-btn { padding: 5px 8px; font-size: 12px; }
          .cdt-grid-cards { grid-template-columns: 1fr; }
          .cdt-grid-add-3 { grid-template-columns: 1fr; }
          .cdt-person-grid { grid-template-columns: 1fr; }
          .cdt-standup-grid { grid-template-columns: 1fr; }
          .cdt-util-row { flex-direction: column; align-items: flex-start; gap: 12px; }
          .cdt-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>


      {/* Header */}
      <div className="cdt-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: "linear-gradient(135deg,#4F8EF7,#8E4FF7)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.06em", color: "#f8fafc" }}>CDT PLANNER</div>
            <div style={{ display: "flex", gap: 5, marginTop: 2, flexWrap: "wrap" }}>
              <StatChip label="tasks" value={tasks.length} />
              <StatChip label={auth?.role} value={auth?.memberName} color={auth?.role === "admin" ? "#a16ef5" : "#5b9cf6"} accent={auth?.role === "admin" ? "#a16ef5" : "#5b9cf6"} />
            </div>
          </div>
        </div>
        <div className="cdt-nav">
          {navItems.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} className="cdt-nav-btn"
              style={{ background: view === v.id ? "#4F8EF7" : "transparent", color: view === v.id ? "#fff" : "#b8cfe0" }}>
              {v.label}
            </button>
          ))}

        </div>
      </div>


      <div className="cdt-content">

        {/* ══ WORKLOAD ══ */}
        {view === "workload" && (
          <div>
            <ViewHeader label="WORKLOAD" accent="#4F8EF7" title="Team Workload & Utilization" />

            {/* Team utilization dial */}
            <div className="cdt-util-row">
              <UtilDial value={workload.teamUtilization} size={140} label="TEAM" sublabel={`${workload.members.length} members`} />
              <div style={{ lineHeight: 2 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: utilColor(workload.teamUtilization) }}>{Math.round(workload.teamUtilization)}% team utilization</div>
                <StatRow gap={5} mt={4}>
                  <StatChip label="planned" value={`${Math.round(workload.totalPlanned)}d`} />
                  <StatChip label="available" value={`${Math.round(workload.totalAvailable)}d`} />
                </StatRow>
                <StatRow gap={5} mt={5}>
                  <StatChip label="window" value={`${HORIZON_DAYS} days`} />
                  <StatChip label="rule" value="1 MD = 2 days" />
                </StatRow>
              </div>
            </div>

            {/* Member cards */}
            <div className="cdt-grid-cards">
              {workload.members.map(w => (
                <div key={w.member}
                  onClick={() => setSelectedMember(selectedMember === w.member ? null : w.member)}
                  style={{
                    background: selectedMember === w.member ? "#0f172a" : "#111827",
                    border: `1px solid ${selectedMember === w.member ? w.color : "#2d3f55"}`,
                    borderRadius: 11, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: w.color + "22", border: `2px solid ${w.color}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700, color: w.color,
                      }}>{initials(w.member)}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{w.member}</div>
                        <StatRow gap={4} mt={2}>
                          <StatChip label="FTE" value={w.cfg.fte.toFixed(1)} />
                          <StatChip label="tasks" value={w.tasks.length} />
                        </StatRow>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: utilColor(w.utilization) }}>{Math.round(w.utilization)}%</div>
                      <div style={{ fontSize: 12, color: "#b8cfe0", letterSpacing: "0.08em" }}>UTIL</div>
                    </div>
                  </div>
                  <StatRow gap={4} mt={4} mb={8}>
                    <StatChip label="active" value={`${w.activeMD} md`} color={w.color} accent={w.color} />
                    <StatChip label="planned" value={`${Math.round(w.plannedDays)}d`} />
                    <StatChip label="avail" value={`${Math.round(w.availableDays)}d`} />
                  </StatRow>
                  <div className="cdt-nav">
                    {Object.keys(STATUS_CONFIG).map(s => {
                      const c = w.tasks.filter(t => t.status === s).length;
                      if (!c) return null;
                      return <StatusBadge key={s} status={s} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#b8cfe0", letterSpacing: "0.1em", marginBottom: 10 }}>
              {selectedMember ? `${selectedMember.toUpperCase()}'S TASKS` : "ALL TASKS"}
            </div>
            <SimpleTaskTable
              tasks={selectedMember
                ? enriched.filter(t => t.assignee === selectedMember)
                : isAdmin ? enriched : enriched.filter(t => t.assignee === myName)}
              onStatusChange={isAdmin ? updateStatus : () => {}}
              onDelete={isAdmin ? deleteTask : () => {}}
              memberColors={memberColors}
              readOnly={!isAdmin}
            />
          </div>
        )}

        {/* ══ SCHEDULE (Gantt) ══ */}
        {view === "schedule" && (
          <div>
            <ViewHeader label="SCHEDULE" accent="#F7D44F" title="Timeline by Person" />
            <div style={{ marginBottom: 14, fontSize: 14, color: "#b8cfe0", lineHeight: 1.7 }}>
              <span style={{ color: "#F7D44F" }}>Formula: </span>
              working days = ⌈MD × (1/FTE) × (100/Eff%)⌉ + buffer (skipping weekends) · due = next Friday after last day
            </div>
            <GanttChart
              enriched={enriched}
              members={members}
              memberColors={memberColors}
              memberNames={memberNames}
              onMoveTask={handleMoveTask}
              onDropTask={handleDropTask}
              onAddTask={(memberName, startDate) => {
                setAddTaskModal({ open: true, assignee: memberName, startDate });
              }}
              onEditTask={(task) => setEditTaskModal({ open: true, task })}
            />

            {/* Add Task Modal */}
            {addTaskModal.open && (
              <AddTaskModal
                initialAssignee={addTaskModal.assignee}
                initialStartDate={addTaskModal.startDate}
                memberNames={memberNames}
                members={members}
                customers={customers}
                onAddCustomer={addCustomer}
                onSave={(task) => {
                  const id = task.id || `T-${Date.now()}`;
                  const newTask = { ...task, id,
                    manDays: parseFloat(task.manDays) || 1,
                    efficiencyPct: parseFloat(task.efficiencyPct) || 100,
                    bufferDays: parseInt(task.bufferDays) || 0,
                  };
                  addMemberIfNew(task.assignee);
                  db.upsertTask(newTask); setTasks(p => [...p, newTask]);
                  setAddTaskModal({ open: false, assignee: "", startDate: toISO(new Date()) });
                }}
                onClose={() => setAddTaskModal({ open: false, assignee: "", startDate: toISO(new Date()) })}
              />
            )}

            {/* Edit Task Modal */}
            {editTaskModal.open && editTaskModal.task && (
              <EditTaskModal
                task={editTaskModal.task}
                memberNames={memberNames}
                members={members}
                customers={customers}
                onAddCustomer={addCustomer}
                onSave={(updated) => {
                  const saved = { ...updated,
                    manDays: parseFloat(updated.manDays) || 1,
                    efficiencyPct: parseFloat(updated.efficiencyPct) || 100,
                    bufferDays: parseInt(updated.bufferDays) || 0,
                  };
                  db.upsertTask(saved); setTasks(p => p.map(t => t.id === saved.id ? { ...t, ...saved } : t));
                  setEditTaskModal({ open: false, task: null });
                }}
                onDelete={(id) => {
                  db.deleteTask(id); setTasks(p => p.filter(t => t.id !== id));
                  setEditTaskModal({ open: false, task: null });
                }}
                onClose={() => setEditTaskModal({ open: false, task: null })}
              />
            )}
          </div>
        )}

        {/* ══ STATUS CALL ══ */}
        {view === "standup" && (
          <StatusCallView
            memberNames={memberNames}
            memberColors={memberColors}
            members={members}
            enriched={enriched}
            statusNotes={statusNotes}
            onUpdateNotes={setStatusNotes}
            onSaveReport={saveReport}
          />
        )}


        {/* ══ TEAM ══ */}
        {view === "team" && (
          <TeamView
            members={members} memberNames={memberNames} memberColors={memberColors}
            enriched={enriched}
            onUpdateMember={updateMember}
            onReorderMembers={reorderMembers}
            onRenameMember={(oldName, newName) => {
              if (!newName.trim() || newName === oldName || members[newName]) return;
              setMembers(prev => {
                const next = { ...prev };
                next[newName] = next[oldName];
                delete next[oldName];
                return next;
              });
              setTasks(prev => prev.map(t => t.assignee === oldName ? { ...t, assignee: newName } : t));
            }}
            onRemoveMember={name => {
              setMembers(prev => { const next = { ...prev }; delete next[name]; return next; });
            }}
            onAddMember={(name, fte) => {
              if (!name.trim() || members[name]) return false;
              setMembers(prev => ({ ...prev, [name]: { fte, sort_order: Object.keys(prev).length } }));
              return true;
            }}
          />
        )}

        {/* ══ REPORTS ══ */}
        {view === "reports" && (
          <ReportsView
            reports={savedReports}
            onDeleteReport={id => { db.deleteReport(id); setSavedReports(prev => prev.filter(r => r.id !== id)); }}
          />
        )}

        {/* ══ ACCOUNTS ══ */}
        {view === "accounts" && isAdmin && (
          <AccountsView memberNames={memberNames} />
        )}


      </div>
    </div>
  );
}

// ─── Customer combobox ────────────────────────────────────────────────────────

function CustomerCombobox({ value, customers, onChange, onAddCustomer }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value);
  const ref = useRef();

  // keep input in sync when parent clears
  useEffect(() => { setInput(value); }, [value]);

  const filtered = useMemo(() => {
    if (!input.trim()) return customers;
    return customers.filter(c => c.toLowerCase().includes(input.toLowerCase()));
  }, [input, customers]);

  const showAdd = input.trim() && !customers.some(c => c.toLowerCase() === input.toLowerCase().trim());

  useEffect(() => {
    function onClickOut(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  function select(val) {
    onChange(val);
    setInput(val);
    setOpen(false);
  }

  function handleAdd() {
    const val = input.trim();
    onAddCustomer(val);
    select(val);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        value={input}
        onChange={e => { setInput(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Type or select customer…"
        style={inputStyle}
        autoComplete="off"
      />
      {open && (filtered.length > 0 || showAdd) && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "#111827", border: "1px solid #3d5068", borderRadius: 7,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)", maxHeight: 200, overflowY: "auto",
        }}>
          {filtered.map(c => (
            <div key={c} onMouseDown={() => select(c)} style={{
              padding: "8px 12px", cursor: "pointer", fontSize: 15,
              color: c === value ? "#4F8EF7" : "#d4e1ed",
              background: c === value ? "#1e3a5f" : "transparent",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#2d3f55"}
              onMouseLeave={e => e.currentTarget.style.background = c === value ? "#1e3a5f" : "transparent"}
            >{c}</div>
          ))}
          {showAdd && (
            <div onMouseDown={handleAdd} style={{
              padding: "8px 12px", cursor: "pointer", fontSize: 15,
              color: "#4FD4A0", borderTop: filtered.length ? "1px solid #2d3f55" : "none",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#0d3328"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >+ Add "{input.trim()}"</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Team management view ─────────────────────────────────────────────────────

function TeamView({ members, memberNames, memberColors, enriched, onUpdateMember, onReorderMembers, onRenameMember, onRemoveMember, onAddMember }) {
  const [editingName, setEditingName] = useState(null);   // which member is in rename mode
  const [editNameVal, setEditNameVal] = useState("");
  const [newName, setNewName] = useState("");
  const [newFte, setNewFte] = useState(1.0);
  const [addError, setAddError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  function handleDragStart(e, name) {
    setDragItem(name);
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e, name) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (name !== dragItem) setDragOver(name);
  }
  function handleDrop(e, targetName) {
    e.preventDefault();
    if (!dragItem || dragItem === targetName) { setDragItem(null); setDragOver(null); return; }
    const newOrder = [...memberNames];
    const fromIdx = newOrder.indexOf(dragItem);
    const toIdx   = newOrder.indexOf(targetName);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragItem);
    onReorderMembers(newOrder);
    setDragItem(null);
    setDragOver(null);
  }
  function handleDragEnd() { setDragItem(null); setDragOver(null); }

  function startRename(name) { setEditingName(name); setEditNameVal(name); }
  function commitRename(name) {
    onRenameMember(name, editNameVal.trim());
    setEditingName(null);
  }

  function handleAdd() {
    const n = newName.trim();
    if (!n) { setAddError("Name required"); return; }
    if (members[n]) { setAddError("Name already exists"); return; }
    onAddMember(n, newFte);
    setNewName(""); setNewFte(1.0); setAddError("");
  }

  return (
    <div>
      <ViewHeader label="TEAM" accent="#4FD4A0" title="Team Members" />
      <div style={{ fontSize: 14, color: "#b8cfe0", marginBottom: 20 }}>
        Manage your team. FTE (max 1.0) affects all task durations for that person.
      </div>

      {/* Member cards */}
      <div className="cdt-grid-team" style={{ marginBottom: 28 }}>
        {memberNames.map(m => {
          const cfg = members[m];
          const color = memberColors[m];
          const mTasks = enriched.filter(t => t.assignee === m);
          const activeTasks = mTasks.filter(t => t.status !== "Done");
          const latestDue = mTasks.filter(t => t.dueDate).reduce((lat, t) => !lat || t.dueDate > lat ? t.dueDate : lat, null);
          const isRenaming = editingName === m;
          const isConfirming = confirmRemove === m;

          return (
            <div
              key={m}
              draggable
              onDragStart={e => handleDragStart(e, m)}
              onDragOver={e => handleDragOver(e, m)}
              onDrop={e => handleDrop(e, m)}
              onDragEnd={handleDragEnd}
              style={{
                background: "#111827",
                border: dragOver === m ? `1px solid #4FD4A0` : `1px solid ${color}33`,
                borderRadius: 12, padding: "16px 18px",
                opacity: dragItem === m ? 0.45 : 1,
                transition: "border 0.15s, opacity 0.15s",
                cursor: "grab",
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                {/* Drag handle */}
                <div title="Drag to reorder" style={{ color: "#3d5068", fontSize: 16, cursor: "grab", userSelect: "none", flexShrink: 0 }}>⠿</div>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: color + "22", border: `2px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color, flexShrink: 0,
                }}>{initials(m)}</div>

                {isRenaming ? (
                  <div style={{ display: "flex", gap: 5, flex: 1 }}>
                    <input
                      autoFocus
                      value={editNameVal}
                      onChange={e => setEditNameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") commitRename(m); if (e.key === "Escape") setEditingName(null); }}
                      style={{ ...inputStyle, padding: "4px 8px", fontSize: 15, flex: 1 }}
                    />
                    <button onClick={() => commitRename(m)} style={iconBtn("#4FD4A0")}>✓</button>
                    <button onClick={() => setEditingName(null)} style={iconBtn("#b8cfe0")}>✕</button>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{m}</div>
                    <div style={{ fontSize: 13, color: "#b8cfe0" }}>
                      {mTasks.length} tasks · {activeTasks.length} active · latest due {fmtDate(latestDue)}
                    </div>
                  </div>
                )}

                {!isRenaming && !isConfirming && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => startRename(m)} title="Rename" style={iconBtn("#b8cfe0")}>✎</button>
                    <button onClick={() => setConfirmRemove(m)} title="Remove" style={iconBtn("#ef4444")}>🗑</button>
                  </div>
                )}
              </div>

              {/* Confirm remove */}
              {isConfirming && (
                <div style={{ marginBottom: 12, padding: "10px 12px", background: "#2a1010", border: "1px solid #ef444455", borderRadius: 7 }}>
                  <div style={{ fontSize: 14, color: "#fbb4b4", marginBottom: 8 }}>
                    Remove {m}? Their {activeTasks.length} active tasks will remain unassigned.
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { onRemoveMember(m); setConfirmRemove(null); }} style={{
                      padding: "5px 12px", borderRadius: 5, border: "none", background: "#ef4444",
                      color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}>Remove</button>
                    <button onClick={() => setConfirmRemove(null)} style={{
                      padding: "5px 12px", borderRadius: 5, border: "1px solid #3d5068",
                      background: "transparent", color: "#a8bdd0", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                    }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* FTE slider */}
              <div>
                <label style={labelStyle}>FTE (resource allocation, max 1.0)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                  <input type="range" min="0.1" max="1.0" step="0.05" value={cfg.fte}
                    onChange={e => onUpdateMember(m, "fte", parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: color, cursor: "pointer" }} />
                  <input type="number" min="0.1" max="1.0" step="0.05" value={cfg.fte}
                    onChange={e => onUpdateMember(m, "fte", Math.min(1, Math.max(0.1, parseFloat(e.target.value) || 1)))}
                    style={{ ...inputStyle, width: 58, padding: "4px 7px", fontWeight: 700, color, fontSize: 13 }} />
                </div>
                <div style={{ fontSize: 13, color: "#94b4cc" }}>
                  {Math.round(cfg.fte * 100)}% FTE → 10 MD takes {(10 / cfg.fte).toFixed(1)} working days
                </div>
              </div>

              {/* Active tasks mini-list */}
              {activeTasks.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #2d3f55" }}>
                  <div style={{ fontSize: 12, color: "#94b4cc", marginBottom: 6 }}>ACTIVE TASKS</div>
                  {activeTasks.slice(0, 3).map(t => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "baseline" }}>
                      <span style={{ fontSize: 14, color: "#b8cfe0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 155 }}>{t.summary}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 6, whiteSpace: "nowrap", color: isOverdue(t.dueDate) ? "#ef4444" : "#F7D44F" }}>{fmtDate(t.dueDate)}</span>
                    </div>
                  ))}
                  {activeTasks.length > 3 && <div style={{ fontSize: 13, color: "#94b4cc" }}>+{activeTasks.length - 3} more</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new member */}
      <div style={{ background: "#111827", border: "1px dashed #3d5068", borderRadius: 12, padding: "18px 20px", maxWidth: "min(420px, 100%)" }}>
        <div style={{ fontSize: 13, color: "#4FD4A0", letterSpacing: "0.12em", marginBottom: 14 }}>ADD TEAM MEMBER</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>NAME</label>
            <input value={newName} onChange={e => { setNewName(e.target.value); setAddError(""); }}
              placeholder="Full name" style={inputStyle}
              onKeyDown={e => e.key === "Enter" && handleAdd()} />
          </div>
          <div>
            <label style={labelStyle}>FTE</label>
            <input type="number" min="0.1" max="1.0" step="0.05" value={newFte}
              onChange={e => setNewFte(parseFloat(e.target.value) || 1)}
              style={{ ...inputStyle, width: 70 }} />
          </div>
        </div>
        {addError && <div style={{ fontSize: 14, color: "#ef4444", marginBottom: 8 }}>{addError}</div>}
        <button onClick={handleAdd} style={{
          padding: "8px 18px", borderRadius: 7, border: "none",
          background: "linear-gradient(135deg,#4FD4A0,#4F8EF7)", color: "#0b0f1c",
          fontFamily: "inherit", fontWeight: 700, fontSize: 14, letterSpacing: "0.08em", cursor: "pointer",
        }}>+ ADD MEMBER</button>
      </div>
    </div>
  );
}

function iconBtn(color) {
  return {
    background: "none", border: "none", cursor: "pointer",
    color, fontSize: 17, padding: "3px 5px", borderRadius: 4,
    fontFamily: "inherit", lineHeight: 1,
  };
}

// ─── Simple task table (workload view) ───────────────────────────────────────

function SimpleTaskTable({ tasks, onStatusChange, onDelete, memberColors, readOnly = false }) {
  return (
    <div style={{ background: "#111827", borderRadius: 10, border: "1px solid #2d3f55", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 600 }}>
        <thead>
          <tr style={{ background: "#0b0f1c" }}>
            {["ID","SUMMARY","ASSIGNEE","CUSTOMER","MD","EFF %","BUF","STATUS","PRIORITY","DUE",""].map(h => (
              <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 12, color: "#b8cfe0", letterSpacing: "0.08em", fontWeight: 700, borderBottom: "1px solid #2d3f55", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t, i) => {
            const overdue = isOverdue(t.dueDate) && t.status !== "Done";
            return (
              <tr key={t.id} style={{ borderBottom: i < tasks.length - 1 ? "1px solid #0d1220" : "none" }}>
                <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                  {t.jiraUrl
                    ? <a href={t.jiraUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#6baaf8", textDecoration: "none", fontSize: 11 }}>{t.id} ↗</a>
                    : <span style={{ color: "#b8cfe0" }}>{t.id}</span>}
                </td>
                <td style={{ padding: "8px 10px", color: "#d4e1ed", maxWidth: 180 }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.summary}</div></td>
                <td style={{ padding: "8px 10px", color: memberColors[t.assignee] || "#a8bdd0", fontWeight: 700, whiteSpace: "nowrap" }}>{t.assignee}</td>
                <td style={{ padding: "8px 10px", color: "#b8cfe0", whiteSpace: "nowrap" }}>{t.customer || "—"}</td>
                <td style={{ padding: "8px 10px", color: "#b8cfe0" }}>{t.manDays}</td>
                <td style={{ padding: "8px 10px", fontWeight: 700, color: t.efficiencyPct > 100 ? "#4FD4A0" : t.efficiencyPct < 100 ? "#F7874F" : "#b8cfe0" }}>{t.efficiencyPct}%</td>
                <td style={{ padding: "8px 10px", color: t.bufferDays > 0 ? "#F7D44F" : "#3d5068" }}>{t.bufferDays}d</td>
                <td style={{ padding: "8px 10px" }}>
                  {readOnly
                    ? <StatusBadge status={t.status} />
                    : <select value={t.status} onChange={e => onStatusChange(t.id, e.target.value)} style={{
                        background: STATUS_CONFIG[t.status]?.bg, color: STATUS_CONFIG[t.status]?.color,
                        border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                      }}>
                        {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
                      </select>}
                </td>
                <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                  <span style={{ color: PRIORITY_CONFIG[t.priority]?.color, fontSize: 13, fontWeight: 700 }}>{PRIORITY_CONFIG[t.priority]?.icon} {t.priority}</span>
                </td>
                <td style={{ padding: "8px 10px", fontWeight: 700, whiteSpace: "nowrap", color: overdue ? "#ef4444" : t.status === "Done" ? "#4FD4A0" : "#F7D44F" }}>{fmtDate(t.dueDate)}</td>
                {!readOnly && (
                  <td style={{ padding: "8px 10px" }}>
                    <button onClick={() => onDelete(t.id)} style={{ background: "none", border: "none", color: "#94b4cc", cursor: "pointer", fontSize: 17, fontFamily: "inherit" }}>×</button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Status Call View ─────────────────────────────────────────────────────────

function StatusCallView({ memberNames, memberColors, members, enriched, statusNotes, onUpdateNotes, onSaveReport }) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  function getMemberNotes(member) {
    return statusNotes[member] || { taskNotes: {}, extraItems: [] };
  }

  function setTaskNote(member, taskId, text) {
    onUpdateNotes(prev => ({
      ...prev,
      [member]: {
        ...getMemberNotes(member),
        taskNotes: { ...(getMemberNotes(member).taskNotes), [taskId]: text },
      }
    }));
  }

  function addExtraItem(member) {
    const notes = getMemberNotes(member);
    const id = `extra-${Date.now()}`;
    onUpdateNotes(prev => ({
      ...prev,
      [member]: { ...notes, extraItems: [...notes.extraItems, { id, text: "" }] }
    }));
  }

  function updateExtraItem(member, id, text) {
    const notes = getMemberNotes(member);
    onUpdateNotes(prev => ({
      ...prev,
      [member]: { ...notes, extraItems: notes.extraItems.map(x => x.id === id ? { ...x, text } : x) }
    }));
  }

  function removeExtraItem(member, id) {
    const notes = getMemberNotes(member);
    onUpdateNotes(prev => ({
      ...prev,
      [member]: { ...notes, extraItems: notes.extraItems.filter(x => x.id !== id) }
    }));
  }

  function clearAllNotes() {
    onUpdateNotes({});
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 13, color: "#4FD4A0", letterSpacing: "0.15em", marginBottom: 3 }}>WEEKLY STATUS CALL</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc" }}>Team Status</div>
          <div style={{ fontSize: 14, color: "#b8cfe0", marginTop: 3 }}>{today}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={clearAllNotes} style={{
            padding: "6px 12px", borderRadius: 6, border: "1px solid #3d5068",
            background: "transparent", color: "#b8cfe0", fontFamily: "inherit",
            fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em",
          }}>CLEAR NOTES</button>
          <button onClick={onSaveReport} style={{
            padding: "6px 14px", borderRadius: 6, border: "none",
            background: "linear-gradient(135deg,#4FD4A0,#4F8EF7)", color: "#0b0f1c",
            fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.08em",
          }}>SAVE REPORT ↗</button>
        </div>
      </div>

      {/* One card per member */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {memberNames.map(member => {
          const color = memberColors[member];
          const notes = getMemberNotes(member);
          const activeTasks = enriched.filter(t => t.assignee === member && t.status !== "Done");
          const fte = members[member]?.fte || 1;

          return (
            <div key={member} style={{
              background: "#111827",
              border: `1px solid ${color}44`,
              borderRadius: 12,
              overflow: "hidden",
            }}>
              {/* Member header bar */}
              <div style={{
                background: color + "18",
                borderBottom: `1px solid ${color}33`,
                padding: "12px 18px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: color + "22", border: `2px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, fontWeight: 700, color, flexShrink: 0,
                }}>{initials(member)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>{member}</div>
                  <StatRow gap={5} mt={2}>
                    <StatChip label="FTE" value={fte.toFixed(1)} />
                    <StatChip label="active" value={activeTasks.length} color={color} accent={color} />
                  </StatRow>
                </div>
                {/* Overdue flag */}
                {activeTasks.some(t => isOverdue(t.dueDate)) && (
                  <span style={{
                    fontSize: 13, fontWeight: 700, padding: "3px 9px", borderRadius: 5,
                    background: "#4a1212", color: "#f87171", border: "1px solid #ef444433",
                  }}>⚠ OVERDUE</span>
                )}
              </div>

              <div style={{ padding: "14px 18px" }}>

                {/* Active scheduled tasks */}
                {activeTasks.length === 0 && (
                  <div style={{ fontSize: 14, color: "#94b4cc", marginBottom: 12 }}>No active scheduled tasks</div>
                )}
                {activeTasks.map(t => {
                  const overdue = isOverdue(t.dueDate);
                  const note = notes.taskNotes[t.id] || "";
                  return (
                    <div key={t.id} style={{
                      marginBottom: 14,
                      paddingBottom: 14,
                      borderBottom: "1px solid #2d3f55",
                    }}>
                      {/* Task header */}
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, color: "#b8cfe0" }}>{t.id}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", flex: 1 }}>
                          {t.jiraUrl
                            ? <a href={t.jiraUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#f1f5f9", textDecoration: "none" }}>{t.summary} ↗</a>
                            : t.summary}
                        </span>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                          background: STATUS_CONFIG[t.status]?.bg, color: STATUS_CONFIG[t.status]?.color,
                        }}>{t.status}</span>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: overdue ? "#ef4444" : "#F7D44F",
                        }}>due {fmtDate(t.dueDate)}</span>
                        {overdue && <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>OVERDUE</span>}
                      </div>
                      {/* Note textarea */}
                      <div style={{ position: "relative" }}>
                        <textarea
                          value={note}
                          onChange={e => setTaskNote(member, t.id, e.target.value)}
                          placeholder="Add status comment, blockers, progress update…"
                          rows={note ? Math.max(2, note.split("\n").length + 1) : 2}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            background: note ? "#0a1628" : "#0d1117",
                            border: `1px solid ${note ? color + "44" : "#2d3f55"}`,
                            borderRadius: 6, padding: "8px 10px",
                            color: "#d4e1ed", fontSize: 14, fontFamily: "inherit",
                            resize: "vertical", outline: "none", lineHeight: 1.6,
                            transition: "border-color 0.15s",
                          }}
                          onFocus={e => e.target.style.borderColor = color + "88"}
                          onBlur={e => e.target.style.borderColor = note ? color + "44" : "#2d3f55"}
                        />
                        {note && (
                          <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 12, color: "#94b4cc" }}>
                            {note.length} chars
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Extra ad-hoc items */}
                {notes.extraItems.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: "#b8cfe0", letterSpacing: "0.1em", marginBottom: 8 }}>OTHER ITEMS</div>
                    {notes.extraItems.map((item, idx) => (
                      <div key={item.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%",
                          background: "#2d3f55", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 12, color: "#b8cfe0",
                          flexShrink: 0, marginTop: 8,
                        }}>{idx + 1}</div>
                        <textarea
                          value={item.text}
                          onChange={e => updateExtraItem(member, item.id, e.target.value)}
                          placeholder="Describe work done, meeting outcome, ad-hoc task…"
                          rows={item.text ? Math.max(2, item.text.split("\n").length + 1) : 2}
                          style={{
                            flex: 1, boxSizing: "border-box",
                            background: item.text ? "#0a1628" : "#0d1117",
                            border: `1px solid ${item.text ? "#3d5068" : "#2d3f55"}`,
                            borderRadius: 6, padding: "7px 10px",
                            color: "#d4e1ed", fontSize: 14, fontFamily: "inherit",
                            resize: "vertical", outline: "none", lineHeight: 1.6,
                          }}
                        />
                        <button onClick={() => removeExtraItem(member, item.id)} style={{
                          background: "none", border: "none", color: "#94b4cc",
                          cursor: "pointer", fontSize: 19, padding: "6px 4px",
                          fontFamily: "inherit", lineHeight: 1, flexShrink: 0,
                        }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add other item button */}
                <button onClick={() => addExtraItem(member)} style={{
                  background: "none", border: `1px dashed ${color}44`, borderRadius: 6,
                  color: color, fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                  padding: "6px 14px", cursor: "pointer", letterSpacing: "0.08em",
                  transition: "all 0.15s",
                }}>+ ADD OTHER ITEM</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reports View ─────────────────────────────────────────────────────────────

function ReportsView({ reports, onDeleteReport }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.trim().toLowerCase();
    return reports.filter(r =>
      r.date.toLowerCase().includes(q) || r.isoDate.includes(q)
    );
  }, [reports, search]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 13, color: "#e060c4", letterSpacing: "0.15em", marginBottom: 3 }}>HISTORY</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc" }}>Status Call Reports</div>
          <div style={{ fontSize: 14, color: "#b8cfe0", marginTop: 3 }}>{reports.length} report{reports.length !== 1 ? "s" : ""} saved</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, position: "relative", maxWidth: "min(360px, 100%)" }}>
        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#b8cfe0" }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by date, e.g. 'May', '2025-05-01', 'Monday'…"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "9px 12px 9px 32px", borderRadius: 7,
            background: "#111827", border: "1px solid #2d3f55",
            color: "#eaf0f6", fontSize: 15, fontFamily: "inherit", outline: "none",
          }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "#b8cfe0", cursor: "pointer", fontSize: 19,
          }}>×</button>
        )}
      </div>

      {/* No reports */}
      {reports.length === 0 && (
        <div style={{
          padding: "40px 24px", textAlign: "center",
          background: "#111827", borderRadius: 12, border: "1px dashed #2d3f55",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, color: "#b8cfe0" }}>No reports saved yet.</div>
          <div style={{ fontSize: 14, color: "#94b4cc", marginTop: 6 }}>Go to STATUS CALL, fill in your notes, then click SAVE REPORT.</div>
        </div>
      )}

      {/* No search results */}
      {reports.length > 0 && filtered.length === 0 && (
        <div style={{ fontSize: 15, color: "#b8cfe0", padding: "20px 0" }}>No reports match "{search}"</div>
      )}

      {/* Report list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((report, ri) => {
          const isExpanded = expanded === report.id;
          const isConfirming = confirmDelete === report.id;
          const hasAnyNotes = Object.values(report.notes).some(n =>
            Object.values(n.taskNotes || {}).some(v => v.trim()) || (n.extraItems || []).some(x => x.text.trim())
          );

          return (
            <div key={report.id} style={{
              background: "#111827",
              border: `1px solid ${isExpanded ? "#D44FB8" : "#2d3f55"}`,
              borderRadius: 10, overflow: "hidden",
              transition: "border-color 0.15s",
            }}>
              {/* Report row header */}
              <div
                onClick={() => setExpanded(isExpanded ? null : report.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                  cursor: "pointer",
                  background: isExpanded ? "#D44FB811" : "transparent",
                }}>
                {/* Index badge */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "#2d3f55", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: "#b8cfe0", flexShrink: 0,
                }}>{filtered.length - ri}</div>

                {/* Date */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{report.date}</div>
                  <div style={{ fontSize: 13, color: "#b8cfe0", marginTop: 2 }}>
                    {report.snapshot.length} tasks · {Object.keys(report.notes).length} members with notes
                    {!hasAnyNotes && <span style={{ color: "#94b4cc" }}> · no comments</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                  {isConfirming ? (
                    <>
                      <span style={{ fontSize: 13, color: "#fbb4b4" }}>Delete?</span>
                      <button onClick={() => { onDeleteReport(report.id); setConfirmDelete(null); }} style={smBtn("#ef4444")}>Yes</button>
                      <button onClick={() => setConfirmDelete(null)} style={smBtn("#b8cfe0")}>No</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(report.id)} style={smBtn("#3d5068")} title="Delete report">🗑</button>
                  )}
                  <span style={{ fontSize: 19, color: isExpanded ? "#D44FB8" : "#b8cfe0" }}>{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded report body */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #2d3f55", padding: "16px 18px" }}>
                  {Object.keys(report.notes).length === 0 && (
                    <div style={{ fontSize: 14, color: "#94b4cc" }}>No notes were recorded for this session.</div>
                  )}
                  {Object.entries(report.notes).map(([member, mNotes]) => {
                    const taskEntries = Object.entries(mNotes.taskNotes || {}).filter(([, v]) => v.trim());
                    const extras = (mNotes.extraItems || []).filter(x => x.text.trim());
                    if (!taskEntries.length && !extras.length) return null;
                    return (
                      <div key={member} style={{ marginBottom: 18 }}>
                        {/* Member name */}
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D44FB8", display: "inline-block" }} />
                          {member}
                        </div>
                        {/* Task notes */}
                        {taskEntries.map(([taskId, note]) => {
                          const snap = report.snapshot.find(t => t.id === taskId);
                          return (
                            <div key={taskId} style={{ marginBottom: 10, paddingLeft: 14, borderLeft: "2px solid #2d3f55" }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 13, color: "#b8cfe0" }}>{taskId}</span>
                                {snap && (
                                  <>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#d4e1ed" }}>
                                      {snap.jiraUrl
                                        ? <a href={snap.jiraUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#d4e1ed", textDecoration: "none" }}>{snap.summary} ↗</a>
                                        : snap.summary}
                                    </span>
                                    <span style={{
                                      fontSize: 12, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                                      background: STATUS_CONFIG[snap.status]?.bg || "#2d3f55",
                                      color: STATUS_CONFIG[snap.status]?.color || "#b8cfe0",
                                    }}>{snap.status}</span>
                                    {snap.dueDate && <span style={{ fontSize: 13, color: "#F7D44F" }}>due {snap.dueDate}</span>}
                                  </>
                                )}
                              </div>
                              <div style={{
                                fontSize: 15, color: "#a8bdd0", lineHeight: 1.7,
                                background: "#0d1422", borderRadius: 5, padding: "7px 10px",
                                whiteSpace: "pre-wrap",
                              }}>{note}</div>
                            </div>
                          );
                        })}
                        {/* Extra items */}
                        {extras.map((item, idx) => (
                          <div key={item.id} style={{ marginBottom: 8, paddingLeft: 14, borderLeft: "2px solid #2d3f55" }}>
                            <div style={{ fontSize: 13, color: "#94b4cc", marginBottom: 3 }}>OTHER ITEM {idx + 1}</div>
                            <div style={{
                              fontSize: 15, color: "#a8bdd0", lineHeight: 1.7,
                              background: "#0d1422", borderRadius: 5, padding: "7px 10px",
                              whiteSpace: "pre-wrap",
                            }}>{item.text}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function smBtn(color) {
  return {
    background: "none", border: `1px solid ${color}`, borderRadius: 4, cursor: "pointer",
    color, fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "3px 8px",
  };
}

// ─── Utilization dial ─────────────────────────────────────────────────────────

function utilColor(pct) {
  if (pct >= 110) return "#f87171"; // overloaded
  if (pct >= 85)  return "#3dd68c"; // healthy / full
  if (pct >= 50)  return "#fbbf24"; // moderate
  return "#5b9cf6";                  // underutilized
}

function UtilDial({ value, size = 120, color, label, sublabel }) {
  const pct  = Math.min(value, 200);   // cap visual at 200%
  const over = value > 100;
  const arc  = Math.min(pct / 100, 1); // 0–1 for the arc (full circle = 100%)
  const overArc = over ? Math.min((value - 100) / 100, 1) : 0;

  const R      = (size / 2) * 0.72;
  const cx     = size / 2;
  const cy     = size / 2;
  const strokeW = size * 0.085;

  // SVG arc helper
  function describeArc(fraction, radiusOffset = 0) {
    const r   = R + radiusOffset;
    const ang = fraction * 360;
    // start at top (−90°)
    const startX = cx + r * Math.cos((-90 * Math.PI) / 180);
    const startY = cy + r * Math.sin((-90 * Math.PI) / 180);
    const endAng = (-90 + ang) * (Math.PI / 180);
    const endX   = cx + r * Math.cos(endAng);
    const endY   = cy + r * Math.sin(endAng);
    const large  = ang > 180 ? 1 : 0;
    if (fraction >= 1) {
      // full circle: two arcs
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r}`;
    }
    return `M ${startX} ${startY} A ${r} ${r} 0 ${large} 1 ${endX} ${endY}`;
  }

  const resolvedColor = color || utilColor(value);
  const numSize  = size * 0.21;
  const lblSize  = size * 0.085;
  const subSize  = size * 0.072;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(0deg)" }}>
        {/* Background track */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#2d3f55" strokeWidth={strokeW} />

        {/* Main arc (0–100%) */}
        {arc > 0 && (
          <path
            d={describeArc(arc)}
            fill="none"
            stroke={over ? "#F7D44F" : resolvedColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}

        {/* Overload arc (100–200%), slightly thicker, red */}
        {overArc > 0 && (
          <path
            d={describeArc(overArc)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeW * 1.25}
            strokeLinecap="round"
            opacity={0.9}
          />
        )}

        {/* 100% tick mark */}
        <line
          x1={cx} y1={cy - R + strokeW / 2}
          x2={cx} y2={cy - R - strokeW / 2}
          stroke="#3d5068" strokeWidth={1.5}
        />
      </svg>

      {/* Center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        lineHeight: 1.2,
      }}>
        <div style={{ fontSize: numSize, fontWeight: 700, color: resolvedColor, fontFamily: "inherit" }}>
          {Math.round(value)}%
        </div>
        {label && <div style={{ fontSize: lblSize, color: "#f1f5f9", fontWeight: 700, marginTop: 2 }}>{label}</div>}
        {sublabel && <div style={{ fontSize: subSize, color: "#b8cfe0" }}>{sublabel}</div>}
      </div>
    </div>
  );
}


// ─── Root (session + storage bootstrap) ──────────────────────────────────────

export default function Root() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [appData, setAppData] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Auth: ONLY set session + authChecked here. Never await other supabase
  // calls inside onAuthStateChange — doing so deadlocks the client's internal
  // lock and the app hangs forever on "Loading…". Profile loading is deferred
  // to a separate effect below, keyed on the user id.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setAuthChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load/refresh profile whenever the signed-in user changes.
  useEffect(() => {
    const user = session?.user;
    if (!user) { setProfile(null); setAppData(null); return; }
    let cancelled = false;
    (async () => {
      try {
        // Upsert profile on every sign-in so name/email stay fresh
        await db.upsertProfile({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email,
        });
        const prof = await db.getProfile(user.id);
        if (!cancelled) setProfile(prof);
      } catch (err) {
        console.error("Profile load error:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Load app data once profile is known and has a role
  useEffect(() => {
    if (!session || !profile?.role) return;
    async function load() {
      const [tasks, memberRows, customers, reports] = await Promise.all([
        db.getTasks(), db.getMembers(), db.getCustomers(), db.getReports(),
      ]);
      const membersMap = {};
      memberRows.forEach(r => { membersMap[r.name] = { fte: r.fte, sort_order: r.sort_order ?? 0 }; });
      setAppData({
        tasks:     tasks.length     ? tasks     : INITIAL_TASKS,
        members:   Object.keys(membersMap).length ? membersMap : INITIAL_MEMBERS,
        customers: customers.length ? customers : ["Acme Corp","Globex","Initech"],
        reports,
      });
    }
    load();
  }, [session, profile]);

  // Real-time: tasks table
  useEffect(() => {
    if (!session) return;
    const ch = supabase.channel("tasks-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"tasks" }, payload => {
        setAppData(prev => {
          if (!prev) return prev;
          if (payload.eventType === "DELETE")
            return { ...prev, tasks: prev.tasks.filter(t => t.id !== payload.old.id) };
          const incoming = appTask(payload.new);
          const exists = prev.tasks.some(t => t.id === incoming.id);
          return { ...prev, tasks: exists
            ? prev.tasks.map(t => t.id === incoming.id ? incoming : t)
            : [...prev.tasks, incoming] };
        });
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [session]);

  const Loading = ({msg}) => (
    <div style={{ height:"100vh", width:"100vw", background:"#0b0f1c", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, fontFamily:"'Inter',sans-serif" }}>
      <div style={{ fontSize:34 }}>⚡</div>
      <div style={{ fontSize:15, fontWeight:700, color:"#f0f4ff" }}>CDT PLANNER</div>
      <div style={{ fontSize:13, color:"#6b84a0" }}>{msg}</div>
    </div>
  );

  if (!authChecked)        return <Loading msg="Loading…" />;
  if (!session)            return <LoginScreen />;
  if (!profile)            return <Loading msg="Setting up your account…" />;
  if (!profile.role)       return (
    <div style={{ height:"100vh", width:"100vw", background:"#0b0f1c", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, fontFamily:"'Inter',sans-serif" }}>
      <div style={{ fontSize:32 }}>⏳</div>
      <div style={{ fontSize:16, fontWeight:700, color:"#f0f4ff" }}>Waiting for approval</div>
      <div style={{ fontSize:13, color:"#b8cfe0", textAlign:"center", maxWidth:360 }}>Your account ({session.user.email}) needs to be approved by an admin.</div>
      <button onClick={() => supabase.auth.signOut()} style={{ marginTop:8, padding:"10px 22px", borderRadius:8, border:"1px solid #2d3f55", background:"transparent", color:"#b8cfe0", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer" }}>Sign out</button>
    </div>
  );
  if (!appData)            return <Loading msg="Loading data…" />;

  const authCtxValue = { role: profile.role, memberName: profile.member_name, email: session.user.email };

  return (
    <AuthCtx.Provider value={authCtxValue}>
      <PlannerApp
        initData={appData}
        onLogout={() => supabase.auth.signOut()}
      />
    </AuthCtx.Provider>
  );
}


// ─── Add Task Modal ────────────────────────────────────────────────────────────

function AddTaskModal({ initialAssignee, initialStartDate, memberNames, members, customers, onAddCustomer, onSave, onClose }) {
  const [task, setTask] = useState({
    id: "", summary: "", assignee: initialAssignee || "", customer: "",
    status: "To Do", priority: "Medium",
    manDays: 1, efficiencyPct: 100, bufferDays: 0,
    startDate: initialStartDate || toISO(new Date()),
    deps: [], jiraUrl: "",
  });
  const [depInput, setDepInput] = useState("");
  const f = (k, v) => setTask(p => ({ ...p, [k]: v }));

  const m     = members[task.assignee] || { fte: 1 };
  const md    = parseFloat(task.manDays) || 1;
  const eff   = parseFloat(task.efficiencyPct) || 100;
  const buf   = parseInt(task.bufferDays) || 0;
  const pureW = calcWorkingDays(md, m.fte, eff);
  const wdays = pureW + buf;  // working days incl. buffer
  const due   = task.assignee && task.startDate ? calcDueDate(task.startDate, md, m.fte, eff, buf) : null;
  const total = (task.startDate && due) ? calDaysBetween(task.startDate, toISO(due)) : wdays;  // calendar days start→due

  const iStyle = { width:"100%", padding:"9px 11px", borderRadius:7, background:"var(--bg-inset,#0f1a2e)", border:"1px solid var(--border,#2d3f55)", color:"var(--fg,#f0f4ff)", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" };
  const lStyle = { fontSize:10, color:"var(--fg-faint,#94b4cc)", letterSpacing:"0.12em", display:"block", marginBottom:5, fontWeight:600 };

  function onBackdrop(e) { if (e.target === e.currentTarget) onClose(); }

  return (
    <div onClick={onBackdrop} style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"var(--bg-card,#111827)", border:"1px solid var(--border,#2d3f55)", borderRadius:14, width:"min(780px,100%)", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:"1px solid var(--border,#2d3f55)", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:11, color:"var(--p5,#fbbf24)", letterSpacing:"0.15em", marginBottom:2 }}>SCHEDULE</div>
            <div style={{ fontSize:19, fontWeight:700, color:"var(--fg,#f0f4ff)" }}>Add Task</div>
            {initialAssignee && <div style={{ fontSize:13, color:"var(--fg-muted,#b8cfe0)", marginTop:3 }}>Assigned to <span style={{ color:"var(--p1,#5b9cf6)", fontWeight:700 }}>{initialAssignee}</span>{initialStartDate && ` · starting ${initialStartDate}`}</div>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"1px solid var(--border,#2d3f55)", borderRadius:7, color:"var(--fg-muted,#b8cfe0)", fontSize:18, cursor:"pointer", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY:"auto", padding:"20px 24px", flex:1 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={lStyle}>TASK ID</label><input value={task.id} onChange={e => f("id",e.target.value)} placeholder="e.g. T-111 (auto if blank)" style={iStyle} /></div>
            <div><label style={lStyle}>JIRA LINK</label><input value={task.jiraUrl} onChange={e => f("jiraUrl",e.target.value)} placeholder="https://yourorg.atlassian.net/browse/T-111" style={iStyle} /></div>
            <div style={{ gridColumn:"1/-1" }}><label style={lStyle}>SUMMARY</label><input value={task.summary} onChange={e => f("summary",e.target.value)} placeholder="Task description..." style={iStyle} autoFocus /></div>
            <div>
              <label style={lStyle}>ASSIGNEE</label>
              <select value={task.assignee} onChange={e => f("assignee",e.target.value)} style={{ ...iStyle, cursor:"pointer" }}>
                <option value="">— select member —</option>
                {memberNames.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div><label style={lStyle}>CUSTOMER</label><CustomerCombobox value={task.customer||""} customers={customers} onChange={val => f("customer",val)} onAddCustomer={onAddCustomer} /></div>
            <div><label style={lStyle}>START DATE</label><input type="date" value={task.startDate} onChange={e => f("startDate",e.target.value)} style={{ ...iStyle, colorScheme:"dark" }} /></div>
            <div>
              <label style={lStyle}>PRIORITY</label>
              <select value={task.priority} onChange={e => f("priority",e.target.value)} style={{ ...iStyle, cursor:"pointer" }}>
                {Object.keys(PRIORITY_CONFIG).map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                <div><label style={lStyle}>MAN-DAYS</label><input type="number" min="0.5" step="0.5" value={task.manDays} onChange={e => f("manDays",e.target.value)} style={iStyle} /></div>
                <div><label style={lStyle}>EFFICIENCY %</label><input type="number" min="10" max="500" step="10" value={task.efficiencyPct} onChange={e => f("efficiencyPct",e.target.value)} style={iStyle} /></div>
                <div><label style={lStyle}>BUFFER DAYS</label><input type="number" min="0" step="1" value={task.bufferDays} onChange={e => f("bufferDays",e.target.value)} style={iStyle} /></div>
              </div>
            </div>
            <div>
              <label style={lStyle}>STATUS</label>
              <select value={task.status} onChange={e => f("status",e.target.value)} style={{ ...iStyle, cursor:"pointer" }}>
                {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={lStyle}>DEPENDENCIES (semicolon-separated)</label><input value={depInput} onChange={e => { setDepInput(e.target.value); f("deps", e.target.value.split(";").map(d=>d.trim()).filter(Boolean)); }} placeholder="e.g. T-101; T-102" style={iStyle} /></div>

            {/* Preview */}
            {task.assignee && task.startDate && (
              <div style={{ gridColumn:"1/-1", padding:"13px 15px", background:"color-mix(in srgb, var(--status-done-bg,#0d3328) 60%, transparent)", border:"1px solid #3dd68c44", borderRadius:8 }}>
                <div style={{ fontSize:11, color:"#3dd68c", letterSpacing:"0.1em", marginBottom:8 }}>PREVIEW</div>
                <StatRow gap={6}><StatChip label="man-days" value={`${md} md`} /><StatChip label="FTE" value={m.fte} /><StatChip label="efficiency" value={`${eff}%`} color={eff>100?"#3dd68c":eff<100?"#f5854a":"var(--fg-muted)"} /><StatChip label="buffer" value={`${buf}d`} color={buf>0?"#fbbf24":"var(--fg-muted)"} /></StatRow>
                <StatRow gap={6} mt={8}><StatChip label="working days" value={`${wdays}d`} color="var(--p1,#5b9cf6)" accent="var(--p1,#5b9cf6)" /><StatChip label="total" value={`${total}d`} color="var(--p4,#e879f9)" accent="var(--p4,#e879f9)" />{due && <StatChip label="due" value={fmtDate(due)} color="#fbbf24" accent="#fbbf24" />}</StatRow>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", padding:"16px 24px", borderTop:"1px solid var(--border,#2d3f55)", flexShrink:0 }}>
          <button onClick={onClose} style={{ padding:"10px 22px", borderRadius:8, border:"1px solid var(--border,#2d3f55)", background:"transparent", color:"var(--fg-muted,#b8cfe0)", fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer" }}>CANCEL</button>
          <button onClick={() => { if (!task.summary || !task.assignee) return; onSave(task); }} disabled={!task.summary||!task.assignee} style={{ padding:"10px 26px", borderRadius:8, border:"none", background:(!task.summary||!task.assignee)?"var(--border,#2d3f55)":"var(--accent,#5b9cf6)", color:(!task.summary||!task.assignee)?"var(--fg-faint,#94b4cc)":"#fff", fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer", transition:"all 0.15s" }}>ADD TASK</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Task Modal ───────────────────────────────────────────────────────────

function EditTaskModal({ task: initialTask, memberNames, members, customers, onAddCustomer, onSave, onDelete, onClose }) {
  const [task, setTask] = useState({ ...initialTask });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const f = (k, v) => setTask(p => ({ ...p, [k]: v }));

  const m      = members[task.assignee] || { fte: 1 };
  const md     = parseFloat(task.manDays) || 1;
  const eff    = parseFloat(task.efficiencyPct) || 100;
  const buf    = parseInt(task.bufferDays) || 0;
  const pureW  = calcWorkingDays(md, m.fte, eff);
  const wdays  = pureW + buf;  // working days incl. buffer
  const due    = task.assignee && task.startDate ? calcDueDate(task.startDate, md, m.fte, eff, buf) : null;
  const total  = (task.startDate && due) ? calDaysBetween(task.startDate, toISO(due)) : wdays;  // calendar days start→due
  const overdue = due && isOverdue(due) && task.status !== "Done";

  const iStyle = { width:"100%", padding:"9px 11px", borderRadius:7, background:"var(--bg-inset,#0f1a2e)", border:"1px solid var(--border,#2d3f55)", color:"var(--fg,#f0f4ff)", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" };
  const lStyle = { fontSize:10, color:"var(--fg-faint,#94b4cc)", letterSpacing:"0.12em", display:"block", marginBottom:5, fontWeight:600 };

  function onBackdrop(e) { if (e.target === e.currentTarget) onClose(); }

  return (
    <div onClick={onBackdrop} style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"var(--bg-card,#111827)", border:"1px solid var(--border,#2d3f55)", borderRadius:14, width:"min(780px,100%)", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"18px 24px", borderBottom:"1px solid var(--border,#2d3f55)", flexShrink:0, gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:"var(--p1,#5b9cf6)", letterSpacing:"0.15em", marginBottom:2 }}>EDIT TASK</div>
            <div style={{ fontSize:19, fontWeight:700, color:"var(--fg,#f0f4ff)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{initialTask.id}</div>
            <div style={{ display:"flex", gap:8, marginTop:5, flexWrap:"wrap", alignItems:"center" }}>
              <StatusBadge status={task.status} />
              {overdue && <span style={{ fontSize:12, fontWeight:700, color:"#f87171" }}>OVERDUE</span>}
              {due && <span style={{ fontSize:13, color:"#fbbf24" }}>due {fmtDate(due)}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"1px solid var(--border,#2d3f55)", borderRadius:7, color:"var(--fg-muted,#b8cfe0)", fontSize:18, cursor:"pointer", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY:"auto", padding:"20px 24px", flex:1 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={lStyle}>TASK ID</label><input value={task.id} onChange={e => f("id",e.target.value)} style={iStyle} /></div>
            <div><label style={lStyle}>JIRA LINK</label><input value={task.jiraUrl||""} onChange={e => f("jiraUrl",e.target.value)} placeholder="https://yourorg.atlassian.net/browse/..." style={iStyle} /></div>
            <div style={{ gridColumn:"1/-1" }}><label style={lStyle}>SUMMARY</label><input value={task.summary} onChange={e => f("summary",e.target.value)} style={iStyle} autoFocus /></div>
            <div>
              <label style={lStyle}>ASSIGNEE</label>
              <select value={task.assignee} onChange={e => f("assignee",e.target.value)} style={{ ...iStyle, cursor:"pointer" }}>
                {memberNames.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div><label style={lStyle}>CUSTOMER</label><CustomerCombobox value={task.customer||""} customers={customers} onChange={val => f("customer",val)} onAddCustomer={onAddCustomer} /></div>
            <div><label style={lStyle}>START DATE</label><input type="date" value={task.startDate} onChange={e => f("startDate",e.target.value)} style={{ ...iStyle, colorScheme:"dark" }} /></div>
            <div>
              <label style={lStyle}>STATUS</label>
              <select value={task.status} onChange={e => f("status",e.target.value)} style={{ ...iStyle, cursor:"pointer" }}>
                {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={lStyle}>PRIORITY</label>
              <select value={task.priority} onChange={e => f("priority",e.target.value)} style={{ ...iStyle, cursor:"pointer" }}>
                {Object.keys(PRIORITY_CONFIG).map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                <div><label style={lStyle}>MAN-DAYS</label><input type="number" min="0.5" step="0.5" value={task.manDays} onChange={e => f("manDays",e.target.value)} style={iStyle} /></div>
                <div><label style={lStyle}>EFFICIENCY %</label><input type="number" min="10" max="500" step="10" value={task.efficiencyPct} onChange={e => f("efficiencyPct",e.target.value)} style={iStyle} /></div>
                <div><label style={lStyle}>BUFFER DAYS</label><input type="number" min="0" step="1" value={task.bufferDays} onChange={e => f("bufferDays",e.target.value)} style={iStyle} /></div>
              </div>
            </div>

            {/* Preview */}
            <div style={{ gridColumn:"1/-1", padding:"13px 15px", background: overdue ? "color-mix(in srgb,#f87171 8%,var(--bg-card,#111827))" : "color-mix(in srgb, var(--status-done-bg,#0d3328) 60%, transparent)", border:`1px solid ${overdue?"#f8717144":"#3dd68c44"}`, borderRadius:8 }}>
              <div style={{ fontSize:11, color: overdue?"#f87171":"#3dd68c", letterSpacing:"0.1em", marginBottom:8 }}>{overdue ? "⚠ OVERDUE" : "SCHEDULE"}</div>
              <StatRow gap={6}><StatChip label="man-days" value={`${md} md`} /><StatChip label="FTE" value={m.fte} /><StatChip label="efficiency" value={`${eff}%`} color={eff>100?"#3dd68c":eff<100?"#f5854a":"var(--fg-muted)"} /><StatChip label="buffer" value={`${buf}d`} color={buf>0?"#fbbf24":"var(--fg-muted)"} /></StatRow>
              <StatRow gap={6} mt={8}><StatChip label="working days" value={`${wdays}d`} color="var(--p1,#5b9cf6)" accent="var(--p1,#5b9cf6)" /><StatChip label="total" value={`${total}d`} color="var(--p4,#e879f9)" accent="var(--p4,#e879f9)" />{due && <StatChip label="due" value={fmtDate(due)} color={overdue?"#f87171":"#fbbf24"} accent={overdue?"#f87171":"#fbbf24"} />}</StatRow>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:"flex", gap:10, justifyContent:"space-between", alignItems:"center", padding:"16px 24px", borderTop:"1px solid var(--border,#2d3f55)", flexShrink:0 }}>
          <div>
            {confirmDelete ? (
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:13, color:"#f87171" }}>Delete this task?</span>
                <button onClick={() => onDelete(task.id)} style={{ padding:"8px 16px", borderRadius:7, border:"none", background:"#ef4444", color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:13, cursor:"pointer" }}>DELETE</button>
                <button onClick={() => setConfirmDelete(false)} style={{ padding:"8px 16px", borderRadius:7, border:"1px solid var(--border,#2d3f55)", background:"transparent", color:"var(--fg-muted,#b8cfe0)", fontFamily:"inherit", fontWeight:700, fontSize:13, cursor:"pointer" }}>CANCEL</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ padding:"10px 18px", borderRadius:8, border:"1px solid var(--border,#2d3f55)", background:"transparent", color:"#f87171", fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer" }}>🗑 DELETE</button>
            )}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} style={{ padding:"10px 22px", borderRadius:8, border:"1px solid var(--border,#2d3f55)", background:"transparent", color:"var(--fg-muted,#b8cfe0)", fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer" }}>CANCEL</button>
            <button onClick={() => onSave(task)} style={{ padding:"10px 26px", borderRadius:8, border:"none", background:"var(--accent,#5b9cf6)", color:"#fff", fontFamily:"inherit", fontWeight:700, fontSize:14, cursor:"pointer" }}>SAVE CHANGES</button>
          </div>
        </div>
      </div>
    </div>
  );
}
