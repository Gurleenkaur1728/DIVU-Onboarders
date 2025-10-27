import { useEffect, useMemo, useState } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import Toast from "../../components/Toast.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";
import { CalendarPlus, ChevronLeft, ChevronRight, List, Grid, Clock, MapPin } from "lucide-react";
 
export default function ManageEvents() {
  /* Role (condensed) */
  const [roleId, setRoleId] = useState(() => (+localStorage.getItem("role_id") || ROLES.ADMIN));
  useEffect(() => { const r = localStorage.getItem("role_id"); r && setRoleId(+r); }, []);
 
  /* State */
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState([]);
  const [view, setView] = useState("month"); // "month" | "list"
 
  // modal (create/edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draftDate, setDraftDate] = useState(null); // yyyy-mm-dd
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [venue, setVenue] = useState("");
  const [saving, setSaving] = useState(false);
 
  // toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => setToast({ msg, type });
 
  /* Dates / ranges */
  const { start } = useMemo(() => monthBounds(cursor), [cursor]);
  const monthLabel = useMemo(() => cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" }), [cursor]);
  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const endWindow = useMemo(() => endOfMonth(addMonths(start, 5)), [start]); // current month + next 5
 
  /* Data */
  const load = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("event_date", ymd(start))
      .lte("event_date", ymd(endWindow))
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (!error) setEvents(data || []);
  };
  useEffect(() => { load(); }, [cursor]);
  useEffect(() => {
    const ch = supabase
      .channel("events-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => load())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [cursor]);
 
  const mapByDay = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      const k = ev.event_date;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    });
    return map;
  }, [events]);
 
  /* Month-separated list groups for List view (timezone-safe parsing) */
  const monthGroups = useMemo(() => {
    const groups = new Map();
    for (const ev of events) {
      const [y, m, d] = (ev.event_date || "").split("-").map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1); // local date (no TZ shift)
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const label = dt.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      if (!groups.has(key)) groups.set(key, { label, sort: new Date(dt.getFullYear(), dt.getMonth(), 1).getTime(), items: [] });
      groups.get(key).items.push(ev);
    }
    return Array.from(groups.values())
      .sort((a, b) => a.sort - b.sort);
  }, [events]);
 
  /* Nav */
  const goPrev  = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext  = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
 
  /* Open modals */
  const onDayClick = (d) => {
    if (toStartOfDay(d) < toStartOfDay(new Date())) return showToast("You cannot add events in the past.", "warning");
    setEditingId(null); setDraftDate(ymd(d)); setName(""); setStartTime("09:00"); setEndTime("10:00"); setVenue(""); setModalOpen(true);
  };
  const openBlankCreate = () => {
    setEditingId(null); setDraftDate(""); setName(""); setStartTime("09:00"); setEndTime("10:00"); setVenue(""); setModalOpen(true);
  };
  const openEdit = (ev) => {
    setEditingId(ev.id); setDraftDate(ev.event_date); setName(ev.name || "");
    setStartTime(ev.start_time || "09:00"); setEndTime(ev.end_time || "10:00");
    setVenue(ev.venue || ""); setModalOpen(true);
  };
 
  /* Save / Update / Delete */
  const saveEvent = async () => {
    if (!name.trim()) return showToast("Event name is required.","warning");
    if (!draftDate) return showToast("Please select a date.","warning");
    if (toStartOfDay(new Date(draftDate)) < toStartOfDay(new Date())) return showToast("Date cannot be in the past.","warning");
    const [sH,sM] = startTime.split(":").map(Number), [eH,eM] = endTime.split(":").map(Number);
    if (eH*60+eM <= sH*60+sM) return showToast("End time must be after start time.","warning");
 
    setSaving(true);
    const payload = {
      event_date: draftDate, name: name.trim(), start_time: startTime, end_time: endTime,
      venue: venue.trim() || null, is_published: true, created_by: localStorage.getItem("profile_id") || null,
      updated_at: new Date().toISOString()
    };
    let error;
    if (editingId) ({ error } = await supabase.from("events").update(payload).eq("id", editingId));
    else ({ error } = await supabase.from("events").insert([payload]));
    setSaving(false);
 
    if (error) return showToast("Save failed.","error");
    await load(); showToast(editingId ? "Event updated." : "Event created.","success"); setModalOpen(false);
  };
 
  const deleteEvent = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("events").delete().eq("id", editingId);
    if (error) return showToast("Delete failed.","error");
    await load(); showToast("Event deleted.","success"); setModalOpen(false);
  };
 
  /* Render */
  return (
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar active="manage-events" role={roleId} />
 
      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon (like Manage Modules) */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">Admin Panel – Manage Events</span>
        </div>
 
        {/* Title banner */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl">
          MANAGE EVENTS
        </div>
 
        {/* Controls row (FULL WIDTH so the right-side controls sit at the far right) */}
        <div className="sticky top-0 z-30 mt-3 mb-4 w-full">
          <div className="flex items-center">
            {/* Left: month nav (reserve height in list view so right block never shifts) */}
            <div className="flex items-center gap-2">
              {view === "month" ? (
                <>
                  <button onClick={goToday} className="px-3 py-1.5 text-sm border rounded bg-white hover:bg-emerald-50">Today</button>
                  <button onClick={goPrev} className="p-2 border rounded hover:bg-emerald-50"><ChevronLeft className="w-4 h-4"/></button>
                  <span className="font-semibold text-emerald-900">{monthLabel}</span>
                  <button onClick={goNext} className="p-2 border rounded hover:bg-emerald-50"><ChevronRight className="w-4 h-4"/></button>
                </>
              ) : (
                <div className="h-9" />
              )}
            </div>
 
            {/* Right: view switch + add (fixed at far right) */}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex rounded-lg border bg-white overflow-hidden">
                <button
                  onClick={() => setView("month")}
                  className={`px-3 py-2 text-sm flex items-center gap-1 ${view==="month"?"bg-emerald-600 text-white":"hover:bg-emerald-50"}`}
                >
                  <Grid className="w-4 h-4"/> Month
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`px-3 py-2 text-sm flex items-center gap-1 ${view==="list"?"bg-emerald-600 text-white":"hover:bg-emerald-50"}`}
                >
                  <List className="w-4 h-4"/> List
                </button>
              </div>
              <button
                onClick={openBlankCreate}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500"
              >
                <CalendarPlus className="w-4 h-4" /> Add Event
              </button>
            </div>
          </div>
        </div>
 
        {/* Calendar (kept at 60% width feel via md:w-3/5) */}
        {view === "month" && (
          <div className="bg-white border rounded-xl shadow w-full md:w-3/5 overflow-hidden">
            <div className="grid grid-cols-7 bg-emerald-900/95 text-emerald-50 text-[11px] font-bold uppercase">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} className="px-2 py-2 text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((d, i) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const dayKey = ymd(d);
                const items = mapByDay.get(dayKey) || [];
                const isTodayFlag = isSameDay(d, new Date());
                return (
                  <button
                    key={i}
                    onClick={() => onDayClick(d)}
                    className={`h-24 border p-1 text-left ${inMonth ? "bg-white":"bg-gray-50"} hover:bg-emerald-50/70`}
                    title="Add event"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${inMonth ? "text-emerald-900":"text-gray-400"}`}>{d.getDate()}</span>
                      {isTodayFlag && (
                        <span className="text-[9px] px-1 border border-emerald-300 bg-emerald-50 text-emerald-800">Today</span>
                      )}
                    </div>
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {items.slice(0,2).map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                          className="border border-emerald-200 bg-emerald-50 px-1 py-0.5 text-[10px] hover:bg-emerald-100"
                          title={`${ev.name} • ${formatTimeRange(ev.start_time, ev.end_time)}${ev.venue ? ` • ${ev.venue}`: ""}`}
                        >
                          <div className="font-semibold truncate">{ev.name}</div>
                          <div className="flex items-center gap-1 text-emerald-800">
                            <Clock className="w-3 h-3"/>{formatTimeRange(ev.start_time, ev.end_time)}
                          </div>
                          {ev.venue && (
                            <div className="flex items-center gap-1 text-emerald-800">
                              <MapPin className="w-3 h-3"/><span className="truncate">{ev.venue}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {items.length > 2 && (
                        <div className="text-[10px] text-emerald-700/80">+{items.length - 2} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
 
        {/* List view: separate month cards with fixed styling */}
        {view === "list" && (
          <div className="w-full md:w-3/5 space-y-4">
            {monthGroups.length === 0 ? (
              <div className="bg-white rounded-xl border shadow p-4 text-sm text-emerald-800">No upcoming events.</div>
            ) : (
              monthGroups.map((g, idx) => (
                <div key={idx} className="bg-white rounded-xl border shadow overflow-hidden">
                  <div className="px-4 py-2 bg-emerald-900/95 text-emerald-50 text-sm font-bold">
                    {g.label}
                  </div>
                  {g.items.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-emerald-800">No events.</div>
                  ) : (
                    <ul className="divide-y">
                      {g.items.map((ev) => (
                        <li key={ev.id} className="p-3 hover:bg-emerald-50/70 cursor-pointer transition-colors" onClick={() => openEdit(ev)}>
                          <div className="font-semibold text-emerald-900 truncate">{ev.name}</div>
                          <div className="text-xs text-emerald-800">
                            {formatFriendlyDate(ev.event_date)}{" • "}{formatTimeRange(ev.start_time, ev.end_time)}
                            {ev.venue ? ` • ${ev.venue}` : ""}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
 
      {/* Modal: Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden">
            <div className="flex justify-between px-4 py-3 bg-emerald-900 text-white">
              <div className="font-bold">
                {editingId ? "Edit Event" : "Add Event"}{draftDate ? ` — ${new Date(draftDate).toLocaleDateString()}` : ""}
              </div>
              <button onClick={() => setModalOpen(false)} className="hover:opacity-80">✕</button>
            </div>
 
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm font-semibold text-emerald-900">Date</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={draftDate || ""} onChange={(e)=>setDraftDate(e.target.value)}/>
              </div>
              <div>
                <label className="text-sm font-semibold text-emerald-900">Name of the event</label>
                <input className="w-full border rounded px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Town Hall"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-emerald-900">Start time</label>
                  <input type="time" className="w-full border rounded px-3 py-2" value={startTime} onChange={(e)=>setStartTime(e.target.value)}/>
                </div>
                <div>
                  <label className="text-sm font-semibold text-emerald-900">End time</label>
                  <input type="time" className="w-full border rounded px-3 py-2" value={endTime} onChange={(e)=>setEndTime(e.target.value)}/>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-emerald-900">Venue</label>
                <input className="w-full border rounded px-3 py-2" value={venue} onChange={(e)=>setVenue(e.target.value)} placeholder="Room 2A or Zoom"/>
              </div>
              <div className="text-xs text-emerald-700">Past dates are blocked. End time must be after start time.</div>
            </div>
 
            <div className="px-4 py-3 bg-gray-50 flex justify-between">
              {editingId ? (
                <button onClick={deleteEvent} className="px-3 py-1 border text-red-700 border-red-300 rounded">Delete</button>
              ) : <span/>}
              <div className="flex gap-2">
                <button onClick={()=>setModalOpen(false)} className="px-3 py-1 border rounded bg-white">Cancel</button>
                <button onClick={saveEvent} disabled={saving} className="px-3 py-1 bg-emerald-600 text-white rounded">
                  {saving ? "Saving..." : editingId ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
 
/* ------- Helpers ------- */
function buildMonthGrid(anyDate){
  const y = anyDate.getFullYear(), m = anyDate.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(y, m, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  );
}
function monthBounds(date){ return { start: new Date(date.getFullYear(), date.getMonth(), 1), end: new Date(date.getFullYear(), date.getMonth()+1, 0) }; }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function addMonths(d, n){ return new Date(d.getFullYear(), d.getMonth()+n, 1); }
function ymd(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function toStartOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function formatTimeRange(st,et){
  const [sH,sM]=st.split(":").map(Number),[eH,eM]=et.split(":").map(Number);
  const s=new Date(); s.setHours(sH,sM||0,0,0);
  const e=new Date(); e.setHours(eH,eM||0,0,0);
  const fmt=(x)=>x.toLocaleTimeString([], { hour:"numeric", minute:"2-digit" });
  return `${fmt(s)}–${fmt(e)}`;
}
function formatFriendlyDate(ymdStr){
  const [y,m,d]=ymdStr.split("-").map(Number);
  const dt=new Date(y,(m||1)-1,d||1);
  return dt.toLocaleDateString(undefined,{ weekday:"short", month:"short", day:"numeric", year:"numeric" });
}
 
 