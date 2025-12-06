import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "../../../src/AppLayout.jsx";
import Toast from "../../components/Toast.jsx";
import { CalendarPlus, ChevronLeft, ChevronRight, List, Grid, Clock, MapPin } from "lucide-react";
import { useRole } from "../../../src/lib/hooks/useRole.js";
import { supabase } from "../../../src/lib/supabaseClient.js";
 
export default function ManageEvents() {
  /* Role */
  const { roleId } = useRole();
 
  /* State */
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState([]);
  const [view, setView] = useState("month"); // "month" | "list"
  const [loading, setLoading] = useState(false);
 
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
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", ymd(start))
        .lte("event_date", ymd(endWindow))
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
      showToast("Failed to load events.", "error");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [start, endWindow]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("events-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);
 
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
    if (!name.trim()) return showToast("Event name is required.", "warning");
    if (!draftDate) return showToast("Please select a date.", "warning");
    if (toStartOfDay(new Date(draftDate)) < toStartOfDay(new Date())) return showToast("Date cannot be in the past.", "warning");
    const [sH, sM] = startTime.split(":").map(Number), [eH, eM] = endTime.split(":").map(Number);
    if (eH * 60 + eM <= sH * 60 + sM) return showToast("End time must be after start time.", "warning");

    setSaving(true);
    try {
      const basePayload = {
        event_date: draftDate,
        name: name.trim(),
        start_time: startTime,
        end_time: endTime,
        venue: venue.trim() || null,
        is_published: true,
        created_by: localStorage.getItem("profile_id") || null,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from("events")
          .update(basePayload)
          .eq("id", editingId);

        if (error) throw error;
        showToast("Event updated.", "success");
      } else {
        const { error } = await supabase
          .from("events")
          .insert([{ ...basePayload }]);

        if (error) throw error;
        showToast("Event created.", "success");
      }

      await load();
      setModalOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving event:", error);
      showToast("Save failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!editingId) return;
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", editingId);

      if (error) throw error;

      await load();
      showToast("Event deleted.", "success");
      setModalOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      showToast("Delete failed.", "error");
    }
  };
 
  /* Render */
  return (
    <AppLayout>
    {/* <Sidebar active="manage-events" role={roleId} /> */}
 
      <div className="bg-white min-h-screen p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-emerald-950 mb-2">Manage Events</h1>
            <p className="text-gray-600">Create and manage company events and meetings</p>
          </div>
          <button
            onClick={openBlankCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
          >
            <CalendarPlus className="w-5 h-5" />
            Add Event
          </button>
        </div>
 
        {/* Controls row */}
        <div className="sticky top-0 z-30 mb-4 bg-white py-3">
          <div className="flex items-center justify-between">
            {/* Left: month nav */}
            <div className="flex items-center gap-2">
              {view === "month" ? (
                <>
                  <button onClick={goToday} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition">Today</button>
                  <button onClick={goPrev} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"><ChevronLeft className="w-4 h-4"/></button>
                  <span className="font-semibold text-gray-900 min-w-[160px] text-center">{monthLabel}</span>
                  <button onClick={goNext} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"><ChevronRight className="w-4 h-4"/></button>
                </>
              ) : (
                <div className="h-9" />
              )}
            </div>
 
            {/* Right: view switch */}
            <div className="flex rounded-lg border border-gray-300 bg-white overflow-hidden">
              <button
                onClick={() => setView("month")}
                className={`px-3 py-2 text-sm flex items-center gap-1 transition ${
                  view==="month" ? "bg-emerald-600 text-white" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Grid className="w-4 h-4"/> Month
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-3 py-2 text-sm flex items-center gap-1 transition ${
                  view==="list" ? "bg-emerald-600 text-white" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <List className="w-4 h-4"/> List
              </button>
            </div>
          </div>
        </div>
 
        {/* Calendar (kept at 60% width feel via md:w-3/5) */}
        {view === "month" && (
          loading ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow w-full md:w-3/5 p-6 text-center text-gray-600">
              Loading events...
            </div>
          ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow w-full overflow-x-auto">
            <div className="grid grid-cols-7 bg-gray-100 text-gray-700 text-[11px] font-bold uppercase min-w-[600px]">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} className="px-2 py-2 text-center border-r border-gray-200 last:border-r-0">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-w-[600px]">
              {grid.map((d, i) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const dayKey = ymd(d);
                const items = mapByDay.get(dayKey) || [];
                const isTodayFlag = isSameDay(d, new Date());
                return (
                  <button
                    key={i}
                    onClick={() => onDayClick(d)}
                    className={`h-24 border border-gray-200 p-1 text-left transition ${
                      inMonth ? "bg-white hover:bg-emerald-50" : "bg-gray-50 hover:bg-gray-100"
                    }`}
                    title="Add event"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${
                        inMonth ? "text-gray-900" : "text-gray-400"
                      }`}>{d.getDate()}</span>
                      {isTodayFlag && (
                        <span className="text-[9px] px-1 border border-emerald-500 bg-emerald-100 text-emerald-700 rounded">Today</span>
                      )}
                    </div>
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {items.slice(0,2).map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                          className="border border-emerald-300 bg-emerald-50 px-1 py-0.5 text-[10px] hover:bg-emerald-100 rounded transition"
                          title={`${ev.name} • ${formatTimeRange(ev.start_time, ev.end_time)}${ev.venue ? ` • ${ev.venue}`: ""}`}
                        >
                          <div className="font-semibold truncate text-emerald-900">{ev.name}</div>
                          <div className="flex items-center gap-1 text-emerald-700">
                            <Clock className="w-3 h-3"/>{formatTimeRange(ev.start_time, ev.end_time)}
                          </div>
                          {ev.venue && (
                            <div className="flex items-center gap-1 text-emerald-700">
                              <MapPin className="w-3 h-3"/><span className="truncate">{ev.venue}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {items.length > 2 && (
                        <div className="text-[10px] text-gray-600">+{items.length - 2} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          )
        )}
 
        {/* List view: separate month cards with fixed styling */}
        {view === "list" && (
          loading ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow w-full md:w-3/5 p-6 text-center text-gray-600">
              Loading events...
            </div>
          ) : (
            <div className="w-full space-y-4">
              {monthGroups.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow p-4 text-sm text-gray-600">No upcoming events.</div>
              ) : (
                monthGroups.map((g, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow overflow-hidden">
                    <div className="px-4 py-2 bg-gray-100 text-gray-900 text-sm font-bold">
                      {g.label}
                    </div>
                    {g.items.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-600">No events.</div>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {g.items.map((ev) => (
                          <li key={ev.id} className="p-3 hover:bg-emerald-50 cursor-pointer transition-colors" onClick={() => openEdit(ev)}>
                            <div className="font-semibold text-gray-900 truncate">{ev.name}</div>
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
          )
        )}
      </div>
 
      {/* Modal: Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden">
            <div className="flex justify-between px-4 py-3 bg-DivuDarkGreen text-white">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <button onClick={deleteEvent} className="px-3 py-1 border text-red-700 border-red-300 hover:bg-red-700 hover:text-white rounded">Delete</button>
              ) : <span/>}
              <div className="flex gap-2">
                <button onClick={()=>setModalOpen(false)} className="px-3 py-1 border rounded bg-white hover:bg-DivuLightGreen hover:text-black">Cancel</button>
                <button onClick={saveEvent} disabled={saving} className="px-3 py-1 bg-DivuDarkGreen text-white rounded hover:bg-DivuLightGreen hover:text-black">
                  {saving ? "Saving..." : editingId ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </AppLayout>
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
 
 