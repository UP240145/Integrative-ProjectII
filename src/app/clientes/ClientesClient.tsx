"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id_client: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

type Tab = "ver" | "agregar";

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

export default function ClientesClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ver");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f3ef",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>

      {/* Top bar */}
      <div style={{
        background: "#1c1c1a", padding: "0 32px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{ background: "transparent", border: "none", color: "#888", fontSize: 18, cursor: "pointer", padding: "4px 8px", borderRadius: 6, lineHeight: 1 }}
            title="Volver al dashboard"
          >←</button>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 17l4-8 4 4 3-6 4 10" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 20h20" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ color: "#e8e4dc", fontWeight: 500, fontSize: 15, letterSpacing: "0.04em" }}>
            Escencia Madera &nbsp;<span style={{ color: "#555", fontWeight: 400 }}>/ Clientes</span>
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: "transparent", border: "1px solid #333", borderRadius: 7, padding: "5px 14px", fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: "inherit" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#666"; (e.currentTarget as HTMLButtonElement).style.color = "#e8e4dc"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#333"; (e.currentTarget as HTMLButtonElement).style.color = "#aaa"; }}
        >
          Cerrar sesión
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#1c1c1a" }}>Clientes</div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>Gestión del directorio de clientes</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["ver", "agregar"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "9px 22px",
                borderRadius: 10,
                border: `1px solid ${tab === t ? "#1c1c1a" : "#e0dbd4"}`,
                background: tab === t ? "#1c1c1a" : "transparent",
                color: tab === t ? "#e8e4dc" : "#888",
                fontSize: 13,
                fontWeight: tab === t ? 500 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {t === "ver" ? "Ver clientes" : "Agregar cliente"}
            </button>
          ))}
        </div>

        {tab === "ver"
          ? <VerClientes />
          : <AgregarCliente onSuccess={() => setTab("ver")} />
        }
      </div>
    </div>
  );
}

// ── Ver clientes ──────────────────────────────────────────────────────────────

function VerClientes() {
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [editId, setEditId]     = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q.trim().length >= 2
        ? `/api/clients?search=${encodeURIComponent(q)}`
        : `/api/clients/all`;
      const res = await fetch(url);
      const json = await res.json();
      setClients(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  function startEdit(c: Client) {
    setEditId(c.id_client);
    setEditForm({ full_name: c.full_name, email: c.email ?? "", phone: c.phone ?? "", address: c.address ?? "" });
    setError(null);
    setSuccess(null);
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Seguro que deseas eliminar este cliente? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      setSuccess("Cliente eliminado correctamente");
      load(search);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveEdit() {
    if (!editForm.full_name?.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      setSuccess("Cliente actualizado correctamente");
      setEditId(null);
      load(search);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#bbb", pointerEvents: "none" }}>🔍</span>
        <input
          style={{ ...inputStyle, paddingLeft: 36 }}
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {success && (
        <div style={{ background: "#f0f9f0", border: "1px solid #7bbf7b", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#2d6a2d", marginBottom: 16 }}>
          ✓ {success}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 14 }}>Cargando clientes...</div>
      ) : clients.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 14 }}>
          {search ? "No se encontraron clientes con ese nombre." : "No hay clientes registrados."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {clients.map((c) => (
            <div key={c.id_client} style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 12, overflow: "hidden" }}>

              {/* Client row */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" }}>
                {/* Avatar */}
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#2c2c2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#c8b89a", flexShrink: 0 }}>
                  {c.full_name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 15, color: "#1c1c1a" }}>{c.full_name}</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {c.phone    && <span>📞 {c.phone}</span>}
                    {c.email    && <span>✉ {c.email}</span>}
                    {c.address  && <span>📍 {c.address}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#ccc", marginTop: 3 }}>
                    ID #{c.id_client} · Registrado el {new Date(c.created_at).toLocaleDateString("es-MX")}
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => editId === c.id_client ? setEditId(null) : startEdit(c)}
                    style={{ padding: "6px 16px", border: "1px solid #e0dbd4", borderRadius: 7, background: "transparent", fontSize: 12, color: "#666", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {editId === c.id_client ? "Cancelar" : "Editar"}
                  </button>
                  <button
                    onClick={() => handleDelete(c.id_client)}
                    disabled={deletingId === c.id_client}
                    style={{ padding: "6px 16px", border: "1px solid #e9a0a0", borderRadius: 7, background: "transparent", fontSize: 12, color: "#c0392b", cursor: deletingId === c.id_client ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: deletingId === c.id_client ? 0.5 : 1 }}
                  >
                    {deletingId === c.id_client ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </div>

              {/* Edit panel */}
              {editId === c.id_client && (
                <div style={{ borderTop: "1px solid #f0ece6", background: "#fffcf5", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#8a6f3e" }}>✦ Editar cliente #{c.id_client}</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <FieldInline label="Nombre completo *">
                        <input style={inputStyle} type="text" value={editForm.full_name ?? ""} onChange={(e) => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
                      </FieldInline>
                    </div>
                    <FieldInline label="Teléfono">
                      <input style={inputStyle} type="tel" placeholder="449 000 0000" value={editForm.phone ?? ""} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                    </FieldInline>
                    <FieldInline label="Correo electrónico *">
                      <input style={inputStyle} type="email" placeholder="correo@ejemplo.com" value={editForm.email ?? ""} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))} />
                    </FieldInline>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <FieldInline label="Dirección *">
                        <input style={inputStyle} type="text" placeholder="Calle, colonia" value={editForm.address ?? ""} onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))} />
                      </FieldInline>
                    </div>
                  </div>

                  {error && <div style={{ fontSize: 12, color: "#8a2020" }}>⚠ {error}</div>}

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      style={{ padding: "8px 20px", border: "none", borderRadius: 8, background: saving ? "#ccc" : "#1c1c1a", color: "#e8e4dc", fontSize: 13, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Agregar cliente ───────────────────────────────────────────────────────────

function AgregarCliente({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm]       = useState({ full_name: "", email: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) { setError("El nombre completo es obligatorio"); return; }
    if (!form.phone.trim())     { setError("El teléfono es obligatorio"); return; }
    if (!/^\d+$/.test(form.phone.trim())) { setError("El teléfono solo debe contener números"); return; }
    if (form.phone.trim().length !== 10)  { setError("El teléfono debe tener exactamente 10 dígitos"); return; }
    if (!form.email.trim())     { setError("El correo electrónico es obligatorio"); return; }
    if (!form.address.trim())   { setError("La dirección es obligatoria"); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      setSuccess(true);
      setTimeout(onSuccess, 1200);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ background: "#f0f9f0", border: "1px solid #7bbf7b", borderRadius: 12, padding: "32px", textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#2d6a2d" }}>Cliente registrado correctamente</div>
        <div style={{ fontSize: 13, color: "#5a9a5a", marginTop: 4 }}>Redirigiendo a la lista...</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid #f0ece6", fontSize: 13, fontWeight: 500, color: "#444" }}>
        Nuevo cliente
      </div>
      <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <FieldInline label="Nombre completo *">
          <input
            style={inputStyle}
            type="text"
            required
            placeholder="Nombre completo"
            value={form.full_name}
            onChange={(e) => { setForm(p => ({ ...p, full_name: e.target.value })); setError(null); }}
          />
        </FieldInline>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInline label="Teléfono">
            <input
              style={inputStyle}
              type="tel"
              placeholder="449 000 0000"
              maxLength={10}
              value={form.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setForm(p => ({ ...p, phone: val }));
              }}
            />
          </FieldInline>
          <FieldInline label="Correo electrónico">
            <input
              style={inputStyle}
              type="email"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
            />
          </FieldInline>
        </div>

        <FieldInline label="Dirección">
          <input
            style={inputStyle}
            type="text"
            placeholder="Calle, número, colonia"
            value={form.address}
            onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
          />
        </FieldInline>

        {error && (
          <div style={{ background: "#fdf0f0", border: "1px solid #e9a0a0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8a2020" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: "10px 28px", border: "none", borderRadius: 10, background: loading ? "#ccc" : "#1c1c1a", color: "#e8e4dc", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {loading ? "Guardando..." : "Registrar cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function FieldInline({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
        {label}
      </label>
      {children}
    </div>
  );
}