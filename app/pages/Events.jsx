import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../src/AppLayout.jsx";
import { supabase } from "../../src/lib/supabaseClient.js";
import { ChevronLeft, ChevronRight, List, Grid, Clock, MapPin } from "lucide-react";
import { useRole } from "../../src/lib/hooks/useRole.js";

export default function Events() {
  /* Role */
  const { roleId } = useRole();
 
  /* State */
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState("month"); // "month" | "list"
  const [events, setEvents] = useState([]);
 
  /* Dates / ranges */
  const { start } = useMemo(() => monthBounds(cursor), [cursor]);
  const monthLabel = useMemo(() => cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" }), [cursor]);
  const grid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const endWindow = useMemo(() => endOfMonth(addMonths(start, 5)), [start]); // current + next 5 months
 
  /* Data */
  const load = useMemo(() => async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("is_published", true)
      .gte("event_date", ymd(start))
      .lte("event_date", ymd(endWindow))
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (!error) setEvents(data || []);
  }, [start, endWindow]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const ch = supabase
      .channel("events-user")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => load())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);
 
  const mapByDay = useMemo(() => {
    const m = new Map();
    events.forEach((ev) => {
      const k = ev.event_date;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(ev);
    });
    return m;
  }, [events]);
 
  /* Month-separated list groups (timezone-safe) */
  const monthGroups = useMemo(() => {
    const groups = new Map();
    for (const ev of events) {
      const [y, m, d] = (ev.event_date || "").split("-").map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1); // local (avoid TZ shifts)
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const label = dt.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      if (!groups.has(key)) groups.set(key, { label, sort: new Date(dt.getFullYear(), dt.getMonth(), 1).getTime(), items: [] });
      groups.get(key).items.push(ev);
    }
    return Array.from(groups.values()).sort((a, b) => a.sort - b.sort);
  }, [events]);
 
  /* Nav */
  const goPrev  = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext  = () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
 
  /* Render */
  return (
    <AppLayout>
      <div className="p-6 bg-white min-h-screen">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Events Calendar</h1>
          <p className="text-gray-600 mt-2">
            Stay updated with upcoming events and activities
          </p>
        </div>
 
        {/* Controls row (right controls fixed; left shows month nav in month view) */}
        <div className="sticky top-0 z-30 mt-3 mb-4 w-full">
          <div className="flex items-center">
            {/* Left: month nav (reserve height when in list view to prevent shift) */}
            <div className="flex items-center gap-2">
              {view === "month" ? (
                <>
                  <button onClick={goToday} className="px-3 py-1.5 text-sm border rounded bg-white hover:bg-DivuBlue">Today</button>
                  <button onClick={goPrev} className="p-2 border rounded hover:bg-emerald-50"><ChevronLeft className="w-4 h-4"/></button>
                  <span className="font-semibold text-emerald-900">{monthLabel}</span>
                  <button onClick={goNext} className="p-2 border rounded hover:bg-emerald-50"><ChevronRight className="w-4 h-4"/></button>
                </>
              ) : (
                <div className="h-9" />
              )}
            </div>
 
            {/* Right: view switch (fixed at far right) */}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex rounded-lg border bg-white overflow-hidden">
                <button
                  onClick={() => setView("month")}
                  className={`px-3 py-2 text-sm flex items-center gap-1 ${view==="month"?"bg-DivuLightGreen text-black":"hover:bg-DivuBlue"}`}
                >
                  <Grid className="w-4 h-4"/> Month
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`px-3 py-2 text-sm flex items-center gap-1 ${view==="list"?"bg-DivuLightGreen text-black":"hover:bg-DivuBlue"}`}
                >
                  <List className="w-4 h-4"/> List
                </button>
              </div>
            </div>
          </div>
        </div>
 
        {/* Month calendar (compact rectangular; day cells square) */}
        {view === "month" && (
          <div className="bg-white border-DivuDarkGreen border-2 rounded-xl shadow w-full overflow-x-auto">
            <div className="grid grid-cols-7 bg-DivuLightGreen text-black text-[11px] font-bold uppercase min-w-[600px]">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} className="px-2 py-2 text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-w-[600px]">
              {grid.map((d, i) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const dayKey = ymd(d);
                const items = mapByDay.get(dayKey) || [];
                const isTodayFlag = isSameDay(d, new Date());
                return (
                  <div
                    key={i}
                    className={`h-24 border p-1 text-left ${inMonth ? "bg-white":"bg-gray-50"} hover:bg-DivuBlue`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${inMonth ? "text-emerald-900":"text-gray-400"}`}>{d.getDate()}</span>
                      {isTodayFlag && (
                        <span className="text-[9px] px-1 border border-emerald-300 bg-emerald-50 text-emerald-800">Today</span>
                      )}
                    </div>
 
                    {/* Peek: up to 2 events with Title • Time • Venue */}
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {items.slice(0,2).map((ev) => (
                        <div
                          key={ev.id}
                          className="border border-emerald-200 bg-emerald-50 px-1 py-0.5 text-[10px]"
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
 
        {/* List view: separate month cards (not connected) */}
        {view === "list" && (
          <div className="w-full md:w-3/5 space-y-4">
            {monthGroups.length === 0 ? (
              <div className="bg-white rounded-xl border shadow p-4 text-sm text-emerald-800">No upcoming events.</div>
            ) : (
              monthGroups.map((g, idx) => (
                <div key={idx} className="bg-white rounded-xl border shadow overflow-hidden">
                  <div className="px-4 py-2 bg-DivuLightGreen text-black text-sm font-bold">
                    {g.label}
                  </div>
                  {g.items.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-emerald-800">No events.</div>
                  ) : (
                    <ul className="divide-y">
                      {g.items.map((ev) => (
                        <li key={ev.id} className="p-3">
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
      </div>
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
 