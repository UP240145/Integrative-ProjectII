"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorkOrder {
  id_work_order: number;
  status: string;
  updated_at: string;
  id_quote: number;
  furniture_type: string;
  material: string | null;
  final_price: number;
  width: number;
  height: number;
  depth: number;
  notes: string | null;
  id_client: number;
  full_name: string;
  phone: string | null;
  address: string | null;
}

interface Slot {
  time: string;
  available: boolean;
}

const FURNITURE_LABELS: Record<string, string> = {
  closet: "Clóset", cocina: "Cocina integral", comedor: "Comedor",
  cama: "Cama", estanteria: "Estantería", bano: "Mueble de baño", otro: "Otro",
};

const MATERIAL_LABELS: Record<string, string> = {
  mdf: "MDF", melamina: "Melamina", pino: "Pino macizo", roble: "Roble", cedro: "Cedro",
};

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pendiente:   { label: "Pendiente",   bg: "#fffcf5", color: "#8a6f3e", border: "#c8b89a" },
  completada:  { label: "Completada",  bg: "#f0f9f0", color: "#2d6a2d", border: "#7bbf7b" },
  cancelada:   { label: "Cancelada",   bg: "#fdf0f0", color: "#8a2020", border: "#e9a0a0" },
};

function formatMXN(value: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px", border: "1px solid #e0dbd4", borderRadius: 8, fontSize: 14,
  color: "#1a1a18", background: "#faf9f7", outline: "none", width: "100%", fontFamily: "inherit",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function OrdenesTrabajoClient() {
  const router = useRouter();
  const [orders, setOrders]   = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pendiente");
  const [completingOrder, setCompletingOrder] = useState<WorkOrder | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim().length >= 2) params.set("search", search.trim());
      if (statusFilter !== "todas") params.set("status", statusFilter);
      const res = await fetch(`/api/work-orders?${params.toString()}`);
      const json = await res.json();
      setOrders(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  function handleCompleted(orderId: number) {
    setSuccess("Orden completada y cita de entrega agendada correctamente");
    setOrders(prev => prev.filter(o => o.id_work_order !== orderId));
    setCompletingOrder(null);
  }

  async function handleCancel(order: WorkOrder) {
    if (!confirm(`¿Cancelar la orden de trabajo de ${order.full_name}? La cotización volverá a estado pendiente.`)) return;
    setCancellingId(order.id_work_order);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/work-orders/${order.id_work_order}/cancel`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      setSuccess(`Orden cancelada. La cotización de ${order.full_name} volvió a estado pendiente.`);
      setOrders(prev => prev.filter(o => o.id_work_order !== order.id_work_order));
    } finally {
      setCancellingId(null);
    }
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
            Escencia Madera &nbsp;<span style={{ color: "#555", fontWeight: 400 }}>/ Órdenes de trabajo</span>
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
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#1c1c1a" }}>Órdenes de trabajo</div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>Seguimiento de fabricación e instalación</div>
        </div>

        {/* Search + filter */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#bbb", pointerEvents: "none" }}>🔍</span>
            <input
              style={{ ...inputStyle, paddingLeft: 36, background: "#fff" }}
              type="text"
              placeholder="Buscar por nombre de cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { value: "pendiente", label: "Pendientes" },
              { value: "completada", label: "Completadas" },
              { value: "cancelada", label: "Canceladas" },
              { value: "todas", label: "Todas" },
            ].map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${statusFilter === f.value ? "#1c1c1a" : "#e0dbd4"}`, background: statusFilter === f.value ? "#1c1c1a" : "#fff", color: statusFilter === f.value ? "#e8e4dc" : "#888", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {success && (
          <div style={{ background: "#f0f9f0", border: "1px solid #7bbf7b", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#2d6a2d", marginBottom: 16 }}>
            ✓ {success}
          </div>
        )}
        {error && (
          <div style={{ background: "#fdf0f0", border: "1px solid #e9a0a0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8a2020", marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 14 }}>Cargando órdenes...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 14 }}>
            No hay órdenes de trabajo {statusFilter !== "todas" ? `en estado "${statusFilter}"` : ""}.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {orders.map((o) => {
              const st = STATUS_LABELS[o.status] ?? STATUS_LABELS.pendiente;
              return (
                <div key={o.id_work_order} style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>

                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2c2c2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#c8b89a" }}>
                          {o.full_name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#1c1c1a" }}>{o.full_name}</div>
                          {o.phone && <div style={{ fontSize: 12, color: "#999" }}>📞 {o.phone}</div>}
                        </div>
                        <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 12, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontWeight: 500 }}>
                          {st.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#666", marginLeft: 44 }}>
                        {FURNITURE_LABELS[o.furniture_type] ?? o.furniture_type}
                        {o.material && <> · {MATERIAL_LABELS[o.material] ?? o.material}</>}
                        {" "}· {o.width}×{o.height}×{o.depth} cm
                      </div>
                      <div style={{ fontSize: 11, color: "#bbb", marginLeft: 44, marginTop: 2 }}>
                        Orden #{o.id_work_order} · Cotización #{o.id_quote} · Actualizada el {new Date(o.updated_at).toLocaleDateString("es-MX")}
                      </div>
                      {o.notes && (
                        <div style={{ fontSize: 12, color: "#aaa", marginLeft: 44, marginTop: 6, fontStyle: "italic" }}>
                          "{o.notes}"
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 600, color: "#1c1c1a", marginBottom: 10 }}>
                        {formatMXN(o.final_price)}
                      </div>
                      {o.status === "pendiente" && (
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleCancel(o)}
                            disabled={cancellingId === o.id_work_order}
                            style={{ padding: "8px 14px", border: "1px solid #e9a0a0", borderRadius: 8, background: "transparent", fontSize: 12, color: "#c0392b", cursor: cancellingId === o.id_work_order ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: cancellingId === o.id_work_order ? 0.5 : 1 }}
                          >
                            {cancellingId === o.id_work_order ? "Cancelando..." : "Cancelar"}
                          </button>
                          <button
                            onClick={() => setCompletingOrder(o)}
                            style={{ padding: "8px 18px", border: "none", borderRadius: 8, background: "#1c1c1a", fontSize: 12, color: "#e8e4dc", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}
                          >
                            ✓ Terminado
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Complete + schedule delivery modal */}
      {completingOrder && (
        <CompleteOrderModal
          order={completingOrder}
          onClose={() => setCompletingOrder(null)}
          onSuccess={() => handleCompleted(completingOrder.id_work_order)}
        />
      )}
    </div>
  );
}

// ── Complete order modal with calendar ────────────────────────────────────────

function CompleteOrderModal({ order, onClose, onSuccess }: {
  order: WorkOrder; onClose: () => void; onSuccess: () => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [address, setAddress] = useState(order.address ?? "");
  const [notes, setNotes] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DAYS_ES = ["D","L","M","M","J","V","S"];

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function selectDay(day: number) {
    const ds = dateStr(day);
    if (ds < todayStr) return;
    setSelectedDate(ds);
    setSelectedTime(null);
    setLoadingSlots(true);
    fetch(`/api/appointments/availability?date=${ds}&type=entregar`)
      .then(r => r.json())
      .then(j => setSlots(j.data ?? []))
      .finally(() => setLoadingSlots(false));
  }

  async function handleConfirm() {
    if (!selectedDate) { setError("Selecciona una fecha de entrega"); return; }
    if (!selectedTime) { setError("Selecciona un horario"); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/work-orders/${order.id_work_order}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          address: address.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(28,28,26,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0ece6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1c1c1a" }}>Agendar entrega</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{order.full_name} · Orden #{order.id_work_order}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 20, color: "#aaa", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* Calendar */}
          <div style={{ border: "1px solid #e8e3db", borderRadius: 12, overflow: "hidden", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#faf9f7", borderBottom: "1px solid #f0ece6" }}>
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: "transparent", border: "none", fontSize: 16, cursor: "pointer", color: "#666" }}>‹</button>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1c1a" }}>{MONTHS_ES[month]} {year}</div>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: "transparent", border: "none", fontSize: 16, cursor: "pointer", color: "#666" }}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "8px 8px 0" }}>
              {DAYS_ES.map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#aaa", fontWeight: 500, padding: "4px 0" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 8px 8px" }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const ds = dateStr(day);
                const isPast = ds < todayStr;
                const isSelected = ds === selectedDate;
                const isToday = ds === todayStr;
                return (
                  <button key={day} onClick={() => selectDay(day)} disabled={isPast}
                    style={{
                      aspectRatio: "1", margin: 2, border: "none", borderRadius: 8,
                      background: isSelected ? "#1c1c1a" : isToday ? "#f5f3ef" : "transparent",
                      color: isPast ? "#ddd" : isSelected ? "#e8e4dc" : "#444",
                      fontSize: 13, fontWeight: isSelected || isToday ? 600 : 400,
                      cursor: isPast ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888", marginBottom: 10 }}>
                Horario de entrega (10:00am – 4:00pm)
              </div>
              {loadingSlots ? (
                <div style={{ fontSize: 13, color: "#bbb" }}>Cargando horarios...</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {slots.map(slot => (
                    <button key={slot.time} disabled={!slot.available}
                      onClick={() => { setSelectedTime(slot.time); setError(null); }}
                      style={{
                        padding: "7px 14px", borderRadius: 8,
                        border: selectedTime === slot.time ? "1px solid #1c1c1a" : slot.available ? "1px solid #e0dbd4" : "1px solid #f0ece6",
                        background: selectedTime === slot.time ? "#1c1c1a" : slot.available ? "#fff" : "#f5f3ef",
                        color: selectedTime === slot.time ? "#e8e4dc" : slot.available ? "#444" : "#ccc",
                        fontSize: 13, cursor: slot.available ? "pointer" : "not-allowed",
                        fontFamily: "inherit", textDecoration: slot.available ? "none" : "line-through",
                      }}>
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Address + notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888", display: "block", marginBottom: 5 }}>
                Dirección de entrega
              </label>
              <input style={inputStyle} type="text" placeholder="Calle, colonia, ciudad" value={address} onChange={(e) => setAddress(e.target.value)} />
              {!address.trim() && order.address && (
                <span style={{ fontSize: 11, color: "#bbb" }}>Si se deja vacío se usará: {order.address}</span>
              )}
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888", display: "block", marginBottom: 5 }}>
                Notas
              </label>
              <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} placeholder="Instrucciones para la entrega..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {error && (
            <div style={{ background: "#fdf0f0", border: "1px solid #e9a0a0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8a2020", marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #e0dbd4", borderRadius: 10, background: "transparent", color: "#888", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={saving || !selectedDate || !selectedTime}
              style={{ padding: "10px 28px", border: "none", borderRadius: 10, background: (saving || !selectedDate || !selectedTime) ? "#ccc" : "#1c1c1a", color: "#e8e4dc", fontSize: 14, fontWeight: 500, cursor: (saving || !selectedDate || !selectedTime) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saving ? "Agendando..." : "Confirmar entrega"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}