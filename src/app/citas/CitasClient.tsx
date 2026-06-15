"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id_client: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface Appointment {
  id_appointment: number;
  id_client: number;
  full_name: string;
  phone: string | null;
  appointment_type: string;
  appointment_date: string;
  appointment_time: string;
  address: string | null;
  notes: string | null;
}

interface Slot {
  time: string;
  available: boolean;
}

type Tab = "agendar" | "calendario";

// ── Constants ─────────────────────────────────────────────────────────────────

const APPOINTMENT_TYPES = [
  { value: "entregar", label: "Entrega",      duration: "30 min", icon: "📦" },
  { value: "medir",    label: "Medición",     duration: "45 min", icon: "📐" },
  { value: "instalar", label: "Instalación",  duration: "1 hora", icon: "🔧" },
];

const TYPE_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  entregar: { bg: "#fffcf5", border: "#c8b89a", color: "#8a6f3e" },
  medir:    { bg: "#f0f4ff", border: "#89b4e8", color: "#2d4a8a" },
  instalar: { bg: "#f0f9f0", border: "#7bbf7b", color: "#2d6a2d" },
};

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #e0dbd4",
  borderRadius: 8,
  fontSize: 14,
  color: "#1a1a18",
  background: "#faf9f7",
  outline: "none",
  width: "100%",
  fontFamily: "inherit",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function CitasClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("agendar");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3ef", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* Top bar */}
      <div style={{ background: "#1c1c1a", padding: "0 32px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.push("/dashboard")}
            style={{ background: "transparent", border: "none", color: "#888", fontSize: 18, cursor: "pointer", padding: "4px 8px", borderRadius: 6, lineHeight: 1 }}>
            ←
          </button>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 17l4-8 4 4 3-6 4 10" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 20h20" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ color: "#e8e4dc", fontWeight: 500, fontSize: 15, letterSpacing: "0.04em" }}>
            Escencia Madera &nbsp;<span style={{ color: "#555", fontWeight: 400 }}>/ Citas</span>
          </span>
        </div>
        <button onClick={handleLogout}
          style={{ background: "transparent", border: "1px solid #333", borderRadius: 7, padding: "5px 14px", fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: "inherit" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#666"; (e.currentTarget as HTMLButtonElement).style.color = "#e8e4dc"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#333"; (e.currentTarget as HTMLButtonElement).style.color = "#aaa"; }}>
          Cerrar sesión
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#1c1c1a" }}>Citas</div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>Agenda y calendario de citas</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {([
            { value: "agendar",    label: "📅  Agendar cita" },
            { value: "calendario", label: "🗓  Calendario" },
          ] as { value: Tab; label: string }[]).map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              style={{ padding: "9px 22px", borderRadius: 10, border: `1px solid ${tab === t.value ? "#1c1c1a" : "#e0dbd4"}`, background: tab === t.value ? "#1c1c1a" : "transparent", color: tab === t.value ? "#e8e4dc" : "#888", fontSize: 13, fontWeight: tab === t.value ? 500 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "agendar" ? <AgendarCita /> : <CalendarioCitas />}
      </div>
    </div>
  );
}

// ── Agendar cita ──────────────────────────────────────────────────────────────

function AgendarCita() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [apptType, setApptType]             = useState("");
  const [apptDate, setApptDate]             = useState("");
  const [apptTime, setApptTime]             = useState("");
  const [address, setAddress]               = useState("");
  const [notes, setNotes]                   = useState("");
  const [slots, setSlots]                   = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots]     = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState(false);

  // Load available slots when date or type changes
  useEffect(() => {
    if (!apptDate || !apptType) { setSlots([]); setApptTime(""); return; }
    setLoadingSlots(true);
    setApptTime("");
    fetch(`/api/appointments/availability?date=${apptDate}&type=${apptType}`)
      .then(r => r.json())
      .then(j => setSlots(j.data ?? []))
      .finally(() => setLoadingSlots(false));
  }, [apptDate, apptType]);

  // Min date = today
  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) { setError("Selecciona un cliente"); return; }
    if (!apptType)        { setError("Selecciona el tipo de cita"); return; }
    if (!apptDate)        { setError("Selecciona una fecha"); return; }
    if (!apptTime)        { setError("Selecciona un horario"); return; }

    setSaving(true);
    setError(null);
    // Si no se proporcionó dirección, usar la del cliente
    const finalAddress = address.trim() || selectedClient.address || null;
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_client:        selectedClient.id_client,
          appointment_type: apptType,
          appointment_date: apptDate,
          appointment_time: apptTime,
          address:          finalAddress,
          notes:            notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSelectedClient(null);
    setApptType(""); setApptDate(""); setApptTime("");
    setAddress(""); setNotes(""); setSlots([]);
    setSuccess(false); setError(null);
  }

  if (success) {
    return (
      <div style={{ background: "#f0f9f0", border: "1px solid #7bbf7b", borderRadius: 14, padding: "40px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#2d6a2d", marginBottom: 6 }}>Cita agendada correctamente</div>
        <div style={{ fontSize: 13, color: "#5a9a5a", marginBottom: 24 }}>
          {selectedClient?.full_name} · {APPOINTMENT_TYPES.find(t => t.value === apptType)?.label} · {apptDate} a las {apptTime}
        </div>
        <button onClick={handleReset}
          style={{ padding: "10px 28px", border: "none", borderRadius: 10, background: "#1c1c1a", color: "#e8e4dc", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
          Agendar otra cita
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Cliente */}
      <SectionCard title="Cliente" icon="👤">
        <ClientSearch selectedClient={selectedClient} onSelect={setSelectedClient} onClear={() => setSelectedClient(null)} />
      </SectionCard>

      {/* Tipo de cita */}
      <SectionCard title="Tipo de cita" icon="📋">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {APPOINTMENT_TYPES.map((t) => {
            const selected = apptType === t.value;
            const col = TYPE_COLORS[t.value];
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => { setApptType(t.value); setApptTime(""); setError(null); }}
                style={{
                  padding: "16px 12px",
                  border: `1px solid ${selected ? col.border : "#e0dbd4"}`,
                  borderRadius: 10,
                  background: selected ? col.bg : "#faf9f7",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "center",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: selected ? col.color : "#444" }}>{t.label}</div>
                <div style={{ fontSize: 11, color: selected ? col.color : "#aaa", marginTop: 3 }}>{t.duration}</div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Fecha y horario */}
      <SectionCard title="Fecha y horario" icon="📅">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px", marginBottom: 20 }}>
          <FieldInline label="Fecha">
            <input
              style={inputStyle}
              type="date"
              min={today}
              value={apptDate}
              onChange={(e) => { setApptDate(e.target.value); setApptTime(""); setError(null); }}
            />
          </FieldInline>
          <FieldInline label="Tipo seleccionado">
            <div style={{ padding: "10px 12px", background: "#f5f3ef", border: "1px solid #e0dbd4", borderRadius: 8, fontSize: 14, color: apptType ? "#1a1a18" : "#bbb" }}>
              {apptType ? APPOINTMENT_TYPES.find(t => t.value === apptType)?.label + " — " + APPOINTMENT_TYPES.find(t => t.value === apptType)?.duration : "Selecciona un tipo arriba"}
            </div>
          </FieldInline>
        </div>

        {/* Slots */}
        {apptDate && apptType && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888", marginBottom: 10 }}>
              Horarios disponibles (10:00am – 4:00pm)
            </div>
            {loadingSlots ? (
              <div style={{ fontSize: 13, color: "#bbb", padding: "16px 0" }}>Cargando horarios...</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => { if (slot.available) { setApptTime(slot.time); setError(null); } }}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: apptTime === slot.time
                        ? "1px solid #1c1c1a"
                        : slot.available
                        ? "1px solid #e0dbd4"
                        : "1px solid #f0ece6",
                      background: apptTime === slot.time
                        ? "#1c1c1a"
                        : slot.available
                        ? "#fff"
                        : "#f5f3ef",
                      color: apptTime === slot.time
                        ? "#e8e4dc"
                        : slot.available
                        ? "#444"
                        : "#ccc",
                      fontSize: 13,
                      cursor: slot.available ? "pointer" : "not-allowed",
                      fontFamily: "inherit",
                      textDecoration: slot.available ? "none" : "line-through",
                      transition: "all 0.1s",
                    }}
                  >
                    {slot.time}
                  </button>
                ))}
                {slots.every(s => !s.available) && (
                  <div style={{ fontSize: 13, color: "#e74c3c", padding: "8px 0" }}>
                    No hay horarios disponibles para este día.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* Detalles */}
      <SectionCard title="Detalles" icon="📝">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FieldInline label="Dirección de la cita">
            <input style={inputStyle} type="text" placeholder="Calle, colonia, ciudad" value={address} onChange={(e) => setAddress(e.target.value)} />
            <span style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
              {address.trim()
                ? ""
                : selectedClient?.address
                ? `Si se deja vacío se usará: ${selectedClient.address}`
                : "Opcional — puedes ingresarla manualmente"}
            </span>
          </FieldInline>
          <FieldInline label="Notas">
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72, lineHeight: 1.5 }} placeholder="Instrucciones especiales, referencias..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FieldInline>
        </div>
      </SectionCard>

      {error && (
        <div style={{ background: "#fdf0f0", border: "1px solid #e9a0a0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8a2020" }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" disabled={saving}
          style={{ padding: "11px 32px", border: "none", borderRadius: 10, background: saving ? "#ccc" : "#1c1c1a", color: "#e8e4dc", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {saving ? "Agendando..." : "Agendar cita"}
        </button>
      </div>
    </form>
  );
}

// ── Calendario ────────────────────────────────────────────────────────────────

function CalendarioCitas() {
  const [currentDate, setCurrentDate]     = useState(new Date());
  const [appointments, setAppointments]   = useState<Appointment[]>([]);
  const [selectedDay, setSelectedDay]     = useState<string | null>(null);
  const [dayAppts, setDayAppts]           = useState<Appointment[]>([]);
  const [loadingDay, setLoadingDay]       = useState(false);
  const [deletingId, setDeletingId]       = useState<number | null>(null);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Load month appointments
  useEffect(() => {
    fetch(`/api/appointments?month=${monthKey}`)
      .then(r => r.json())
      .then(j => setAppointments(j.data ?? []));
  }, [monthKey]);

  // Days in month grid
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr    = new Date().toISOString().split("T")[0];

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function appointmentsForDay(day: number) {
    const d = dateStr(day);
    return appointments.filter(a => a.appointment_date.slice(0, 10) === d);
  }

  async function handleDayClick(day: number) {
    const d = dateStr(day);
    setSelectedDay(d);
    setLoadingDay(true);
    try {
      const res = await fetch(`/api/appointments?date=${d}`);
      const json = await res.json();
      setDayAppts(json.data ?? []);
    } finally {
      setLoadingDay(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Cancelar esta cita?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      setDayAppts(prev => prev.filter(a => a.id_appointment !== id));
      setAppointments(prev => prev.filter(a => a.id_appointment !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DAYS_ES   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

      {/* Calendar grid */}
      <div style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 14, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f0ece6", background: "#faf9f7" }}>
          <button onClick={prevMonth} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#666", padding: "4px 8px" }}>‹</button>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1c1c1a" }}>{MONTHS_ES[month]} {year}</div>
          <button onClick={nextMonth} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#666", padding: "4px 8px" }}>›</button>
        </div>

        {/* Day names */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #f0ece6" }}>
          {DAYS_ES.map(d => (
            <div key={d} style={{ padding: "8px 0", textAlign: "center", fontSize: 11, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {/* Empty cells */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} style={{ minHeight: 72, borderRight: "1px solid #f5f3ef", borderBottom: "1px solid #f5f3ef", background: "#faf9f7" }} />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day      = i + 1;
            const ds       = dateStr(day);
            const isToday  = ds === todayStr;
            const isSelect = ds === selectedDay;
            const dayApts  = appointmentsForDay(day);

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                style={{
                  minHeight: 72,
                  padding: "6px 8px",
                  borderRight: "1px solid #f5f3ef",
                  borderBottom: "1px solid #f5f3ef",
                  cursor: "pointer",
                  background: isSelect ? "#f0f4ff" : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (!isSelect) (e.currentTarget as HTMLDivElement).style.background = "#faf9f7"; }}
                onMouseLeave={(e) => { if (!isSelect) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: isToday ? "#1c1c1a" : "transparent",
                  color: isToday ? "#e8e4dc" : "#444",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: isToday ? 600 : 400, marginBottom: 4,
                }}>
                  {day}
                </div>
                {dayApts.slice(0, 2).map(a => (
                  <div key={a.id_appointment} style={{
                    fontSize: 10, padding: "2px 5px", borderRadius: 4, marginBottom: 2,
                    background: TYPE_COLORS[a.appointment_type]?.bg ?? "#f5f3ef",
                    color: TYPE_COLORS[a.appointment_type]?.color ?? "#666",
                    border: `1px solid ${TYPE_COLORS[a.appointment_type]?.border ?? "#e0dbd4"}`,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {a.appointment_time.slice(0,5)} {a.full_name.split(" ")[0]}
                  </div>
                ))}
                {dayApts.length > 2 && (
                  <div style={{ fontSize: 10, color: "#aaa" }}>+{dayApts.length - 2} más</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      <div style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 14, overflow: "hidden", position: "sticky", top: 24 }}>
        <div style={{ padding: "14px 18px", background: "#faf9f7", borderBottom: "1px solid #f0ece6", fontSize: 13, fontWeight: 500, color: "#444" }}>
          {selectedDay
            ? new Date(selectedDay + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
            : "Selecciona un día"}
        </div>
        <div style={{ padding: "16px" }}>
          {!selectedDay && (
            <div style={{ fontSize: 13, color: "#bbb", textAlign: "center", padding: "24px 0" }}>
              Da clic en un día del calendario para ver las citas
            </div>
          )}
          {selectedDay && loadingDay && (
            <div style={{ fontSize: 13, color: "#bbb", textAlign: "center", padding: "24px 0" }}>Cargando...</div>
          )}
          {selectedDay && !loadingDay && dayAppts.length === 0 && (
            <div style={{ fontSize: 13, color: "#bbb", textAlign: "center", padding: "24px 0" }}>Sin citas este día</div>
          )}
          {selectedDay && !loadingDay && dayAppts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {dayAppts.map(a => {
                const col  = TYPE_COLORS[a.appointment_type] ?? TYPE_COLORS.entregar;
                const type = APPOINTMENT_TYPES.find(t => t.value === a.appointment_type);
                return (
                  <div key={a.id_appointment} style={{ border: `1px solid ${col.border}`, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ background: col.bg, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: col.color }}>
                          {type?.icon} {type?.label}
                        </div>
                        <div style={{ fontSize: 12, color: col.color, opacity: 0.8, marginTop: 1 }}>
                          {a.appointment_time.slice(0,5)} · {type?.duration}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(a.id_appointment)}
                        disabled={deletingId === a.id_appointment}
                        style={{ background: "transparent", border: "none", color: "#c0392b", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", borderRadius: 6, opacity: deletingId === a.id_appointment ? 0.5 : 1 }}
                      >
                        {deletingId === a.id_appointment ? "..." : "Cancelar"}
                      </button>
                    </div>
                    <div style={{ padding: "10px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#1c1c1a" }}>{a.full_name}</div>
                      {a.phone   && <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>📞 {a.phone}</div>}
                      {a.address && <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>📍 {a.address}</div>}
                      {a.notes   && <div style={{ fontSize: 12, color: "#bbb", marginTop: 4, fontStyle: "italic" }}>{a.notes}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Client search (same as cotizaciones) ──────────────────────────────────────

function ClientSearch({ selectedClient, onSelect, onClear }: {
  selectedClient: Client | null;
  onSelect: (c: Client) => void;
  onClear: () => void;
}) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const wrapperRef              = useRef<HTMLDivElement>(null);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setNoResults(false); return; }
    setLoading(true);
    setNoResults(false);
    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}`);
      const json = await res.json();
      const data = json.data ?? [];
      setResults(data);
      setNoResults(data.length === 0);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    setNoResults(false);
    if (val.trim().length < 2) setResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  const showDrop = isFocused && query.trim().length >= 2;

  if (selectedClient) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#faf9f7", border: "1px solid #e0dbd4", borderRadius: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#2c2c2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#c8b89a", flexShrink: 0 }}>
          {selectedClient.full_name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 14, color: "#1a1a18" }}>{selectedClient.full_name}</div>
          {selectedClient.phone   && <div style={{ fontSize: 12, color: "#999" }}>📞 {selectedClient.phone}</div>}
          {selectedClient.address && <div style={{ fontSize: 12, color: "#bbb" }}>📍 {selectedClient.address}</div>}
        </div>
        <button onClick={onClear} style={{ background: "transparent", border: "1px solid #e0dbd4", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", zIndex: 100 }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#bbb", pointerEvents: "none" }}>🔍</span>
        <input
          style={{ ...inputStyle, paddingLeft: 32, borderColor: isFocused ? "#2c2c2a" : "#e0dbd4" }}
          type="text"
          placeholder="Escribe el nombre del cliente..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          autoComplete="off"
        />
        {loading && (
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#bbb" }}>
            Buscando...
          </span>
        )}
      </div>

      {/* Dropdown */}
      {showDrop && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.1)", zIndex: 9999, overflow: "hidden" }}>

          {/* Loading state */}
          {loading && (
            <div style={{ padding: "14px 16px", fontSize: 13, color: "#bbb" }}>Buscando clientes...</div>
          )}

          {/* Results */}
          {!loading && results.map((c, i) => (
            <button
              key={c.id_client}
              onMouseDown={(e) => e.preventDefault()} // prevents onBlur before onClick
              onClick={() => { onSelect(c); setQuery(""); setResults([]); setIsFocused(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "transparent", border: "none", borderTop: i > 0 ? "1px solid #f5f3ef" : "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#faf9f7"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2c2c2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#c8b89a", flexShrink: 0 }}>
                {c.full_name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a18" }}>{c.full_name}</div>
                {c.phone && <div style={{ fontSize: 12, color: "#aaa" }}>📞 {c.phone}</div>}
              </div>
            </button>
          ))}

          {/* No results */}
          {!loading && noResults && (
            <div style={{ padding: "14px 16px", fontSize: 13, color: "#aaa" }}>
              No se encontró ningún cliente con ese nombre.
            </div>
          )}
        </div>
      )}

      {/* Hint */}
      {!isFocused && query.length === 0 && (
        <div style={{ fontSize: 11, color: "#bbb", marginTop: 6 }}>
          Escribe al menos 2 letras para buscar
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 20px", borderBottom: "1px solid #f0ece6", background: "#faf9f7" }}>
        <span>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#444" }}>{title}</span>
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

function FieldInline({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>{label}</label>
      {children}
    </div>
  );
}