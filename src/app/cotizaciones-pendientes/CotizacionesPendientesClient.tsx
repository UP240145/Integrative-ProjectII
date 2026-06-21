"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingQuote {
  id_quote: number;
  full_name: string;
  phone: string | null;
  furniture_type: string;
  material: string | null;
  width: number;
  height: number;
  depth: number;
  calculated_cost: number;
  final_price: number;
  status: string;
  notes: string | null;
  created_at: string;
}

const FURNITURE_LABELS: Record<string, string> = {
  closet: "Clóset",
  cocina: "Cocina integral",
  comedor: "Comedor",
  cama: "Cama",
  estanteria: "Estantería",
  bano: "Mueble de baño",
  otro: "Otro",
};

const MATERIAL_LABELS: Record<string, string> = {
  mdf: "MDF", melamina: "Melamina", pino: "Pino macizo", roble: "Roble", cedro: "Cedro",
};

function formatMXN(value: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CotizacionesPendientesClient() {
  const router = useRouter();
  const [statusTab, setStatusTab] = useState<"pendiente" | "aceptada">("pendiente");
  const [quotes, setQuotes]     = useState<PendingQuote[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes?status=${statusTab}`);
      const json = await res.json();
      setQuotes(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [statusTab]);

  useEffect(() => { load(); }, [load]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function handleAccept(quote: PendingQuote) {
    setUpdatingId(quote.id_quote);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id_quote}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "aceptada" }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }

      // Crear la orden de trabajo automáticamente
      const woRes = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_quote: quote.id_quote }),
      });
      const woJson = await woRes.json();
      if (!woRes.ok) {
        setError(`Cotización aceptada, pero hubo un error al crear la orden de trabajo: ${woJson.message}`);
      } else {
        setSuccess(`Cotización aceptada — orden de trabajo creada para ${quote.full_name}`);
      }

      setQuotes(prev => prev.filter(q => q.id_quote !== quote.id_quote));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleReject(quote: PendingQuote) {
    if (!confirm(`¿Rechazar la cotización de ${quote.full_name}?`)) return;
    setUpdatingId(quote.id_quote);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quote.id_quote}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rechazada" }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      setQuotes(prev => prev.filter(q => q.id_quote !== quote.id_quote));
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = quotes.filter(q =>
    search.trim().length < 2 || q.full_name.toLowerCase().includes(search.toLowerCase())
  );

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
            Escencia Madera &nbsp;<span style={{ color: "#555", fontWeight: 400 }}>/ Cotizaciones pendientes</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/cotizaciones" style={{ fontSize: 12, color: "#c8b89a", textDecoration: "none", padding: "5px 12px", border: "1px solid #444", borderRadius: 7 }}>
            + Nueva cotización
          </a>
          <button onClick={handleLogout}
            style={{ background: "transparent", border: "1px solid #333", borderRadius: 7, padding: "5px 14px", fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#666"; (e.currentTarget as HTMLButtonElement).style.color = "#e8e4dc"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#333"; (e.currentTarget as HTMLButtonElement).style.color = "#aaa"; }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#1c1c1a" }}>
            {statusTab === "pendiente" ? "Cotizaciones pendientes" : "Cotizaciones aceptadas"}
          </div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>
            {statusTab === "pendiente"
              ? `${quotes.length} ${quotes.length === 1 ? "cotización en espera" : "cotizaciones en espera"} de respuesta del cliente`
              : `${quotes.length} ${quotes.length === 1 ? "cotización aceptada" : "cotizaciones aceptadas"}`}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {([
            { value: "pendiente", label: "Pendientes" },
            { value: "aceptada",  label: "Aceptadas" },
          ] as const).map(t => (
            <button key={t.value} onClick={() => setStatusTab(t.value)}
              style={{ padding: "9px 22px", borderRadius: 10, border: `1px solid ${statusTab === t.value ? "#1c1c1a" : "#e0dbd4"}`, background: statusTab === t.value ? "#1c1c1a" : "transparent", color: statusTab === t.value ? "#e8e4dc" : "#888", fontSize: 13, fontWeight: statusTab === t.value ? 500 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#bbb", pointerEvents: "none" }}>🔍</span>
          <input
            style={{ padding: "10px 12px 10px 36px", border: "1px solid #e0dbd4", borderRadius: 8, fontSize: 14, color: "#1a1a18", background: "#fff", outline: "none", width: "100%", fontFamily: "inherit" }}
            type="text"
            placeholder="Buscar por nombre de cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 14 }}>Cargando cotizaciones...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 14 }}>
            {quotes.length === 0 ? "No hay cotizaciones pendientes." : "No se encontraron cotizaciones con ese nombre."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((q) => (
              <div key={q.id_quote} style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2c2c2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#c8b89a" }}>
                        {q.full_name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#1c1c1a" }}>{q.full_name}</div>
                        {q.phone && <div style={{ fontSize: 12, color: "#999" }}>📞 {q.phone}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#666", marginLeft: 44 }}>
                      {FURNITURE_LABELS[q.furniture_type] ?? q.furniture_type}
                      {q.material && <> · {MATERIAL_LABELS[q.material] ?? q.material}</>}
                      {" "}· {q.width}×{q.height}×{q.depth} cm
                    </div>
                    <div style={{ fontSize: 11, color: "#bbb", marginLeft: 44, marginTop: 2 }}>
                      Cotizado el {new Date(q.created_at).toLocaleDateString("es-MX")}
                    </div>
                    {q.notes && (
                      <div style={{ fontSize: 12, color: "#aaa", marginLeft: 44, marginTop: 6, fontStyle: "italic" }}>
                        "{q.notes}"
                      </div>
                    )}
                  </div>

                  {/* Price + actions */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "#1c1c1a", marginBottom: 10 }}>
                      {formatMXN(q.final_price)}
                    </div>
                    {statusTab === "pendiente" ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleReject(q)}
                          disabled={updatingId === q.id_quote}
                          style={{ padding: "7px 16px", border: "1px solid #e9a0a0", borderRadius: 8, background: "transparent", fontSize: 12, color: "#c0392b", cursor: updatingId === q.id_quote ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: updatingId === q.id_quote ? 0.5 : 1 }}
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => handleAccept(q)}
                          disabled={updatingId === q.id_quote}
                          style={{ padding: "7px 16px", border: "none", borderRadius: 8, background: updatingId === q.id_quote ? "#ccc" : "#1c1c1a", fontSize: 12, color: "#e8e4dc", cursor: updatingId === q.id_quote ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 500 }}
                        >
                          {updatingId === q.id_quote ? "Procesando..." : "✓ Aceptar"}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "#f0f9f0", color: "#2d6a2d", border: "1px solid #7bbf7b", fontWeight: 500 }}>
                        ✓ Aceptada
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}