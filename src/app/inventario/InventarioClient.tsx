"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WoodItem {
  id_wood: number;
  name: string;
  stock_quantity: number;
  price: number;
  min_stock_alert: number;
}

type Tab = "ver" | "agregar";

const inputStyle: React.CSSProperties = {
  padding: "10px 12px", border: "1px solid #e0dbd4", borderRadius: 8,
  fontSize: 14, color: "#1a1a18", background: "#faf9f7", outline: "none",
  width: "100%", fontFamily: "inherit",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function InventarioClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ver");

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
            Escencia Madera &nbsp;<span style={{ color: "#555", fontWeight: 400 }}>/ Inventario</span>
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
          <div style={{ fontSize: 22, fontWeight: 600, color: "#1c1c1a" }}>Inventario</div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>Stock de materiales · placas de 1m² × 4cm</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {([
            { value: "ver",     label: "📦  Ver inventario" },
            { value: "agregar", label: "➕  Agregar material" },
          ] as { value: Tab; label: string }[]).map(t => (
            <button key={t.value} onClick={() => setTab(t.value)}
              style={{ padding: "9px 22px", borderRadius: 10, border: `1px solid ${tab === t.value ? "#1c1c1a" : "#e0dbd4"}`, background: tab === t.value ? "#1c1c1a" : "transparent", color: tab === t.value ? "#e8e4dc" : "#888", fontSize: 13, fontWeight: tab === t.value ? 500 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "ver"
          ? <VerInventario />
          : <AgregarMaterial onSuccess={() => setTab("ver")} />
        }
      </div>
    </div>
  );
}

// ── Ver inventario ────────────────────────────────────────────────────────────

function VerInventario() {
  const [items, setItems]         = useState<WoodItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editId, setEditId]       = useState<number | null>(null);
  const [editForm, setEditForm]   = useState<Partial<WoodItem>>({});
  const [addId, setAddId]         = useState<number | null>(null);
  const [addQty, setAddQty]       = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      const json = await res.json();
      // MySQL devuelve decimales como strings — convertirlos a number
      const parsed = (json.data ?? []).map((item: WoodItem) => ({
        ...item,
        stock_quantity:  parseFloat(String(item.stock_quantity)),
        price:           parseFloat(String(item.price)),
        min_stock_alert: parseFloat(String(item.min_stock_alert)),
      }));
      setItems(parsed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function stockColor(item: WoodItem): string {
    if (item.stock_quantity < 0) return "#c0392b";
    if (item.stock_quantity <= item.min_stock_alert) return "#e67e22";
    return "#2d6a2d";
  }
  function stockBg(item: WoodItem): string {
    if (item.stock_quantity < 0) return "#fdf0f0";
    if (item.stock_quantity <= item.min_stock_alert) return "#fffcf5";
    return "#f0f9f0";
  }
  function stockBorder(item: WoodItem): string {
    if (item.stock_quantity < 0) return "#e9a0a0";
    if (item.stock_quantity <= item.min_stock_alert) return "#c8b89a";
    return "#7bbf7b";
  }
  function stockLabel(item: WoodItem): string {
    if (item.stock_quantity < 0) return "Stock negativo";
    if (item.stock_quantity <= item.min_stock_alert) return "Stock bajo";
    return "En stock";
  }

  async function handleSaveEdit() {
    if (!editForm.name?.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/inventory/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      setSuccess("Material actualizado");
      setEditId(null);
      load();
    } finally { setSaving(false); }
  }

  async function handleAddStock() {
    const qty = parseFloat(addQty);
    if (!qty || qty <= 0) { setError("Ingresa una cantidad válida mayor a 0"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/inventory/${addId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      setSuccess(`Stock actualizado para ${items.find(i => i.id_wood === addId)?.name}`);
      setAddId(null);
      setAddQty("");
      load();
    } finally { setSaving(false); }
  }

  if (loading) return <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 14 }}>Cargando inventario...</div>;

  return (
    <div>
      {success && (
        <div style={{ background: "#f0f9f0", border: "1px solid #7bbf7b", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#2d6a2d", marginBottom: 16 }}>✓ {success}</div>
      )}

      {/* Summary bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total materiales", value: items.length, color: "#444" },
          { label: "Stock negativo", value: items.filter(i => i.stock_quantity < 0).length, color: "#c0392b" },
          { label: "Stock bajo", value: items.filter(i => i.stock_quantity >= 0 && i.stock_quantity <= i.min_stock_alert).length, color: "#e67e22" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 10, padding: "12px 18px", flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(item => (
          <div key={item.id_wood} style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 12, overflow: "visible" }}>

            {/* Main row */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f5f3ef", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                🪵
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1c1c1a" }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                  ${item.price.toFixed(2)} / placa · Alerta mínima: {item.min_stock_alert} m²
                </div>
              </div>

              {/* Stock badge */}
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: stockColor(item) }}>
                  {item.stock_quantity.toFixed(2)}
                </div>
                <div style={{ fontSize: 10, color: "#aaa" }}>m²</div>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: stockBg(item), color: stockColor(item), border: `1px solid ${stockBorder(item)}`, fontWeight: 500 }}>
                  {stockLabel(item)}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => { setAddId(addId === item.id_wood ? null : item.id_wood); setAddQty(""); setError(null); }}
                  style={{ padding: "6px 14px", border: "1px solid #89b4e8", borderRadius: 7, background: "transparent", fontSize: 12, color: "#2d4a8a", cursor: "pointer", fontFamily: "inherit" }}>
                  {addId === item.id_wood ? "Cancelar" : "+ Agregar stock"}
                </button>
                <button
                  onClick={() => { setEditId(editId === item.id_wood ? null : item.id_wood); setEditForm({ name: item.name, price: isNaN(item.price) ? 0 : item.price, min_stock_alert: isNaN(item.min_stock_alert) ? 0 : item.min_stock_alert }); setError(null); }}
                  style={{ padding: "6px 14px", border: "1px solid #e0dbd4", borderRadius: 7, background: "transparent", fontSize: 12, color: "#666", cursor: "pointer", fontFamily: "inherit" }}>
                  {editId === item.id_wood ? "Cancelar" : "Editar"}
                </button>
              </div>
            </div>

            {/* Add stock panel */}
            {addId === item.id_wood && (
              <div style={{ borderTop: "1px solid #f0ece6", background: "#f0f4ff", padding: "14px 20px", display: "flex", alignItems: "flex-end", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, maxWidth: 280 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#2d4a8a" }}>
                    Cantidad a agregar (m²)
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: "#89b4e8", background: "#fff" }}
                    type="number"
                    min={0.01}
                    step={0.01}
                    placeholder="Ej: 10.50"
                    value={addQty}
                    onChange={(e) => { setAddQty(e.target.value); setError(null); }}
                    autoFocus
                  />
                  {addQty && parseFloat(addQty) > 0 && item.stock_quantity < 0 && (
                    <span style={{ fontSize: 11, color: "#2d4a8a" }}>
                      Stock actual: {item.stock_quantity.toFixed(2)} m² → después: {(item.stock_quantity + parseFloat(addQty)).toFixed(2)} m²
                    </span>
                  )}
                </div>
                {error && addId === item.id_wood && (
                  <div style={{ fontSize: 12, color: "#8a2020" }}>⚠ {error}</div>
                )}
                <button onClick={handleAddStock} disabled={saving}
                  style={{ padding: "10px 20px", border: "none", borderRadius: 8, background: saving ? "#ccc" : "#1c1c1a", color: "#e8e4dc", fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                  {saving ? "Guardando..." : "Confirmar"}
                </button>
              </div>
            )}

            {/* Edit panel */}
            {editId === item.id_wood && (
              <div style={{ borderTop: "1px solid #f0ece6", background: "#fffcf5", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#8a6f3e" }}>✦ Editar material</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 16px" }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#aaa", fontWeight: 500, display: "block", marginBottom: 4 }}>Nombre *</label>
                    <input style={inputStyle} type="text" value={editForm.name ?? ""} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#aaa", fontWeight: 500, display: "block", marginBottom: 4 }}>Precio por placa ($)</label>
                    <input style={inputStyle} type="number" min={0} step={0.01}
                      value={editForm.price !== undefined && !isNaN(editForm.price) ? editForm.price : ""}
                      onChange={(e) => setEditForm(p => ({ ...p, price: e.target.value === "" ? 0 : parseFloat(e.target.value) }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#aaa", fontWeight: 500, display: "block", marginBottom: 4 }}>Alerta mínima (m²)</label>
                    <input style={inputStyle} type="number" min={0} step={0.1}
                      value={editForm.min_stock_alert !== undefined && !isNaN(editForm.min_stock_alert) ? editForm.min_stock_alert : ""}
                      onChange={(e) => setEditForm(p => ({ ...p, min_stock_alert: e.target.value === "" ? 0 : parseFloat(e.target.value) }))} />
                  </div>
                </div>
                {error && editId === item.id_wood && (
                  <div style={{ fontSize: 12, color: "#8a2020" }}>⚠ {error}</div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={handleSaveEdit} disabled={saving}
                    style={{ padding: "8px 20px", border: "none", borderRadius: 8, background: saving ? "#ccc" : "#1c1c1a", color: "#e8e4dc", fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 14 }}>No hay materiales registrados.</div>
        )}
      </div>
    </div>
  );
}

// ── Agregar material ──────────────────────────────────────────────────────────

function AgregarMaterial({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm]       = useState({ name: "", stock_quantity: "", price: "", min_stock_alert: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim())         { setError("El nombre es obligatorio"); return; }
    if (!form.price)               { setError("El precio es obligatorio"); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:            form.name.trim(),
          stock_quantity:  parseFloat(form.stock_quantity) || 0,
          price:           parseFloat(form.price) || 0,
          min_stock_alert: parseFloat(form.min_stock_alert) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      setSuccess(true);
      setTimeout(onSuccess, 1200);
    } finally { setLoading(false); }
  }

  if (success) {
    return (
      <div style={{ background: "#f0f9f0", border: "1px solid #7bbf7b", borderRadius: 12, padding: "32px", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#2d6a2d" }}>Material registrado correctamente</div>
        <div style={{ fontSize: 13, color: "#5a9a5a", marginTop: 4 }}>Redirigiendo al inventario...</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid #f0ece6", fontSize: 13, fontWeight: 500, color: "#444" }}>
        🪵 Nuevo material
      </div>
      <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <FieldInline label="Nombre del material *">
            <input style={inputStyle} type="text" placeholder="Ej. MDF, Roble, Cedro" value={form.name} onChange={(e) => { setForm(p => ({ ...p, name: e.target.value })); setError(null); }} required />
          </FieldInline>
          <FieldInline label="Precio por placa ($) *">
            <input style={inputStyle} type="number" min={0} step={0.01} placeholder="0.00" value={form.price} onChange={(e) => { setForm(p => ({ ...p, price: e.target.value })); setError(null); }} required />
          </FieldInline>
          <FieldInline label="Stock inicial (m²)">
            <input style={inputStyle} type="number" min={0} step={0.01} placeholder="0.00" value={form.stock_quantity} onChange={(e) => setForm(p => ({ ...p, stock_quantity: e.target.value }))} />
          </FieldInline>
          <FieldInline label="Alerta stock mínimo (m²)">
            <input style={inputStyle} type="number" min={0} step={0.1} placeholder="0" value={form.min_stock_alert} onChange={(e) => setForm(p => ({ ...p, min_stock_alert: e.target.value }))} />
          </FieldInline>
        </div>

        {error && (
          <div style={{ background: "#fdf0f0", border: "1px solid #e9a0a0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8a2020" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={loading}
            style={{ padding: "10px 28px", border: "none", borderRadius: 10, background: loading ? "#ccc" : "#1c1c1a", color: "#e8e4dc", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {loading ? "Guardando..." : "Registrar material"}
          </button>
        </div>
      </form>
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