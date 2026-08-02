"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InventoryReport {
  material_name: string;
  total_m2_used: number;
  quote_count: number;
  price_per_plate: number;
  current_stock: number;
  min_stock_alert: number;
}

interface SaleOrder {
  id_work_order: number;
  full_name: string;
  furniture_type: string;
  material: string | null;
  final_price: number;
  suggested_price: number;
  cost_base: number;
  profit: number;
  updated_at: string;
}

interface SalesReport {
  total_orders: number;
  total_revenue: number;
  total_profit: number;
  total_cost_base: number;
  orders: SaleOrder[];
}

interface ApptSummary {
  medir:    { count: number; dates: string[] };
  instalar: { count: number; dates: string[] };
}

interface ReportData {
  month: string;
  inventory: InventoryReport[];
  sales: SalesReport;
  appointments: ApptSummary;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMXN(v: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const FURNITURE_LABELS: Record<string, string> = {
  closet: "Clóset", cocina: "Cocina integral", comedor: "Comedor",
  cama: "Cama", estanteria: "Estantería", bano: "Mueble de baño", otro: "Otro",
};

const MATERIAL_LABELS: Record<string, string> = {
  mdf: "MDF", melamina: "Melamina", pino: "Pino macizo", roble: "Roble", cedro: "Cedro",
};

type Tab = "ventas" | "inventario" | "citas";

// ── Main component ────────────────────────────────────────────────────────────

export default function ReportesClient() {
  const router = useRouter();
  const [month, setMonth]     = useState(currentMonth());
  const [tab, setTab]         = useState<Tab>("ventas");
  const [data, setData]       = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const printRef              = useRef<HTMLDivElement>(null);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?month=${month}`);
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      // Parse numbers from MySQL strings
      const d = json.data as ReportData;
      d.inventory = d.inventory.map(i => ({
        ...i,
        total_m2_used:   parseFloat(String(i.total_m2_used)),
        price_per_plate: parseFloat(String(i.price_per_plate)),
        current_stock:   parseFloat(String(i.current_stock)),
        min_stock_alert: parseFloat(String(i.min_stock_alert)),
        quote_count:     Number(i.quote_count),
      }));
      d.sales.orders = d.sales.orders.map(o => ({
        ...o,
        final_price:     parseFloat(String(o.final_price)),
        suggested_price: parseFloat(String(o.suggested_price)),
        cost_base:       parseFloat(String(o.cost_base)),
        profit:          parseFloat(String(o.profit)),
      }));
      d.sales.total_revenue   = d.sales.orders.reduce((s, o) => s + o.final_price, 0);
      d.sales.total_profit    = d.sales.orders.reduce((s, o) => s + o.profit, 0);
      d.sales.total_cost_base = d.sales.orders.reduce((s, o) => s + o.cost_base, 0);
      setData(d);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3ef", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* Top bar — hidden on print */}
      <div className="no-print" style={{ background: "#1c1c1a", padding: "0 32px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => router.push("/dashboard")}
            style={{ background: "transparent", border: "none", color: "#888", fontSize: 18, cursor: "pointer", padding: "4px 8px", borderRadius: 6, lineHeight: 1 }}>←</button>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 17l4-8 4 4 3-6 4 10" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 20h20" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ color: "#e8e4dc", fontWeight: 500, fontSize: 15 }}>
            Escencia Madera &nbsp;<span style={{ color: "#555", fontWeight: 400 }}>/ Reportes</span>
          </span>
        </div>
        <button onClick={handleLogout}
          style={{ background: "transparent", border: "1px solid #333", borderRadius: 7, padding: "5px 14px", fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: "inherit" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor="#666"; (e.currentTarget as HTMLButtonElement).style.color="#e8e4dc"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor="#333"; (e.currentTarget as HTMLButtonElement).style.color="#aaa"; }}>
          Cerrar sesión
        </button>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-area { padding: 24px !important; }
        }
      `}</style>

      <div className="print-area" style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* Controls — hidden on print */}
        <div className="no-print" style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#1c1c1a", marginBottom: 20 }}>Reportes</div>

          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>Mes</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{ padding: "9px 12px", border: "1px solid #e0dbd4", borderRadius: 8, fontSize: 14, color: "#1a1a18", background: "#fff", outline: "none", fontFamily: "inherit" }}
              />
            </div>
            <button
              onClick={loadReport}
              disabled={loading}
              style={{ padding: "10px 24px", border: "none", borderRadius: 8, background: loading ? "#ccc" : "#1c1c1a", color: "#e8e4dc", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {loading ? "Generando..." : "Generar reporte"}
            </button>
            {data && (
              <button onClick={handlePrint}
                style={{ padding: "10px 20px", border: "1px solid #e0dbd4", borderRadius: 8, background: "#fff", color: "#444", fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                🖨 Exportar PDF
              </button>
            )}
          </div>

          {error && (
            <div style={{ background: "#fdf0f0", border: "1px solid #e9a0a0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8a2020", marginTop: 16 }}>⚠ {error}</div>
          )}
        </div>

        {/* Empty state */}
        {!data && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#bbb", fontSize: 14 }}>
            Selecciona un mes y da clic en "Generar reporte"
          </div>
        )}

        {/* Report content */}
        {data && (
          <div ref={printRef}>

            {/* Print header (only shows on print) */}
            <div style={{ display: "none" }} className="print-header">
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1c1c1a" }}>Escencia Madera — Reporte {monthLabel(data.month)}</h1>
            </div>

            {/* Tab navigation — hidden on print */}
            <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {([
                { value: "ventas",     label: "💰  Ventas" },
                { value: "inventario", label: "🪵  Inventario" },
                { value: "citas",      label: "📅  Citas" },
              ] as { value: Tab; label: string }[]).map(t => (
                <button key={t.value} onClick={() => setTab(t.value)}
                  style={{ padding: "9px 22px", borderRadius: 10, border: `1px solid ${tab === t.value ? "#1c1c1a" : "#e0dbd4"}`, background: tab === t.value ? "#1c1c1a" : "transparent", color: tab === t.value ? "#e8e4dc" : "#888", fontSize: 13, fontWeight: tab === t.value ? 500 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── VENTAS ── */}
            <div style={{ display: tab === "ventas" ? "block" : "none" }} className="report-section">
              <ReportHeader title="Reporte de ventas" month={monthLabel(data.month)} />

              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                <SummaryCard label="Órdenes completadas" value={String(data.sales.total_orders)} color="#1c1c1a" />
                <SummaryCard label="Ingresos totales" value={formatMXN(data.sales.total_revenue)} color="#2d6a2d" />
                <SummaryCard label="Ganancia estimada" value={formatMXN(data.sales.total_profit)} color={data.sales.total_profit >= 0 ? "#8a6f3e" : "#c0392b"} />
              </div>

              {/* Orders table */}
              {data.sales.orders.length === 0 ? (
                <EmptySection text="No hay órdenes completadas en este mes." />
              ) : (
                <div style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 12, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#faf9f7" }}>
                        {["#", "Cliente", "Mueble", "Material", "Costo base", "Precio final", "Ganancia"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", borderBottom: "1px solid #f0ece6" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.sales.orders.map((o, i) => (
                        <tr key={o.id_work_order} style={{ borderBottom: i < data.sales.orders.length - 1 ? "1px solid #f5f3ef" : "none" }}>
                          <td style={{ padding: "10px 14px", color: "#bbb" }}>#{o.id_work_order}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 500, color: "#1c1c1a" }}>{o.full_name}</td>
                          <td style={{ padding: "10px 14px", color: "#666" }}>{FURNITURE_LABELS[o.furniture_type] ?? o.furniture_type}</td>
                          <td style={{ padding: "10px 14px", color: "#666" }}>{o.material ? (MATERIAL_LABELS[o.material] ?? o.material) : "—"}</td>
                          <td style={{ padding: "10px 14px", color: "#666" }}>{formatMXN(o.cost_base)}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1c1c1a" }}>{formatMXN(o.final_price)}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: o.profit >= 0 ? "#2d6a2d" : "#c0392b" }}>
                            {o.profit >= 0 ? "+" : ""}{formatMXN(o.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#faf9f7", borderTop: "2px solid #e8e3db" }}>
                        <td colSpan={4} style={{ padding: "10px 14px", fontWeight: 600, color: "#444" }}>Total</td>
                        <td style={{ padding: "10px 14px", fontWeight: 600 }}>{formatMXN(data.sales.total_cost_base)}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1c1c1a" }}>{formatMXN(data.sales.total_revenue)}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: data.sales.total_profit >= 0 ? "#2d6a2d" : "#c0392b" }}>
                          {data.sales.total_profit >= 0 ? "+" : ""}{formatMXN(data.sales.total_profit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Profit explanation */}
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#fffcf5", border: "1px solid #c8b89a", borderRadius: 10, fontSize: 12, color: "#8a6f3e" }}>
                💡 La <strong>ganancia</strong> se calcula como: Precio final − Costo base (materiales + mano de obra, sin el 10% de margen). Un valor negativo indica que se aplicó un descuento mayor al margen.
              </div>
            </div>

            {/* ── INVENTARIO ── */}
            <div style={{ display: tab === "inventario" ? "block" : "none" }} className="report-section">
              <ReportHeader title="Reporte de inventario" month={monthLabel(data.month)} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
                <SummaryCard label="Materiales utilizados" value={String(data.inventory.length)} color="#1c1c1a" />
                <SummaryCard
                  label="Total m² consumidos"
                  value={`${data.inventory.reduce((s, i) => s + i.total_m2_used, 0).toFixed(2)} m²`}
                  color="#8a6f3e"
                />
              </div>

              {data.inventory.length === 0 ? (
                <EmptySection text="No se registró uso de materiales este mes." />
              ) : (
                <div style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 12, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#faf9f7" }}>
                        {["Material", "Cotizaciones", "M² usados", "Costo material", "Stock actual", "Estado"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", borderBottom: "1px solid #f0ece6" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.inventory.map((item, i) => {
                        const isLow = item.current_stock >= 0 && item.current_stock <= item.min_stock_alert;
                        const isNeg = item.current_stock < 0;
                        const stockColor = isNeg ? "#c0392b" : isLow ? "#e67e22" : "#2d6a2d";
                        const stockLabel = isNeg ? "Negativo" : isLow ? "Bajo" : "OK";
                        return (
                          <tr key={item.material_name} style={{ borderBottom: i < data.inventory.length - 1 ? "1px solid #f5f3ef" : "none" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1c1c1a" }}>🪵 {item.material_name}</td>
                            <td style={{ padding: "10px 14px", color: "#666" }}>{item.quote_count}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 500 }}>{item.total_m2_used.toFixed(3)} m²</td>
                            <td style={{ padding: "10px 14px", color: "#666" }}>{formatMXN(Math.round(item.total_m2_used * item.price_per_plate))}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 600, color: stockColor }}>{item.current_stock.toFixed(2)} m²</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, background: isNeg ? "#fdf0f0" : isLow ? "#fffcf5" : "#f0f9f0", color: stockColor, border: `1px solid ${isNeg ? "#e9a0a0" : isLow ? "#c8b89a" : "#7bbf7b"}`, fontWeight: 500 }}>
                                {stockLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── CITAS ── */}
            <div style={{ display: tab === "citas" ? "block" : "none" }} className="report-section">
              <ReportHeader title="Reporte de citas" month={monthLabel(data.month)} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
                {/* Mediciones */}
                <div style={{ background: "#fff", border: "1px solid #89b4e8", borderRadius: 14, padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 28 }}>📐</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#2d4a8a" }}>Mediciones</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>45 min c/u</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 40, fontWeight: 700, color: "#2d4a8a", marginBottom: 4 }}>
                    {data.appointments.medir.count}
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>citas realizadas</div>
                  {data.appointments.medir.count > 0 && (
                    <div style={{ marginTop: 14, fontSize: 12, color: "#666", lineHeight: 1.8 }}>
                      {[...new Set(data.appointments.medir.dates)].sort().map(d => (
                        <div key={d}>
                          · {new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                          {" "}({data.appointments.medir.dates.filter(x => x === d).length})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Instalaciones */}
                <div style={{ background: "#fff", border: "1px solid #7bbf7b", borderRadius: 14, padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 28 }}>🔧</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#2d6a2d" }}>Instalaciones</div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>1 hora c/u</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 40, fontWeight: 700, color: "#2d6a2d", marginBottom: 4 }}>
                    {data.appointments.instalar.count}
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>citas realizadas</div>
                  {data.appointments.instalar.count > 0 && (
                    <div style={{ marginTop: 14, fontSize: 12, color: "#666", lineHeight: 1.8 }}>
                      {[...new Set(data.appointments.instalar.dates)].sort().map(d => (
                        <div key={d}>
                          · {new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                          {" "}({data.appointments.instalar.dates.filter(x => x === d).length})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Total time */}
              <div style={{ background: "#faf9f7", border: "1px solid #e0dbd4", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, color: "#666" }}>
                  Tiempo total en visitas del mes:{" "}
                  <strong style={{ color: "#1c1c1a" }}>
                    {Math.floor((data.appointments.medir.count * 45 + data.appointments.instalar.count * 60) / 60)} h{" "}
                    {(data.appointments.medir.count * 45 + data.appointments.instalar.count * 60) % 60} min
                  </strong>
                  {" "}({data.appointments.medir.count} mediciones × 45 min + {data.appointments.instalar.count} instalaciones × 60 min)
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReportHeader({ title, month }: { title: string; month: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#1c1c1a" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#aaa" }}>{month}</div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px", background: "#fff", border: "1px solid #e8e3db", borderRadius: 12, color: "#bbb", fontSize: 14 }}>
      {text}
    </div>
  );
}