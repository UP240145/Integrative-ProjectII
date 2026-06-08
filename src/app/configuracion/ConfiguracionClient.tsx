"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Admin {
  id_admin: number;
  email: string;
  created_at: string;
}

type Tab = "ver" | "agregar";

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

export default function ConfiguracionClient({ currentAdminId }: { currentAdminId: number }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ver");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f3ef",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      {/* Top bar */}
      <TopBar onBack={() => router.push("/dashboard")} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#1c1c1a" }}>Configuración</div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>Gestión de administradores del sistema</div>
        </div>

        {/* Tab buttons */}
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
              {t === "ver" ? "Ver administradores" : "Agregar administrador"}
            </button>
          ))}
        </div>

        {tab === "ver"
          ? <VerAdmins currentAdminId={currentAdminId} />
          : <AgregarAdmin onSuccess={() => setTab("ver")} />
        }
      </div>
    </div>
  );
}

// ── Ver admins ────────────────────────────────────────────────────────────────

function VerAdmins({ currentAdminId }: { currentAdminId: number }) {
  const [admins, setAdmins]       = useState<Admin[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editId, setEditId]       = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPass, setEditPass]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admins");
      const json = await res.json();
      setAdmins(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(a: Admin) {
    setEditId(a.id_admin);
    setEditEmail(a.email);
    setEditPass("");
    setError(null);
    setSuccess(null);
  }

  async function handleSaveEdit() {
    if (!editEmail.trim() && !editPass.trim()) {
      setError("Debes cambiar el correo o la contraseña");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (editEmail.trim()) body.email = editEmail.trim();
      if (editPass.trim())  body.password = editPass.trim();

      const res = await fetch(`/api/admins/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }

      setSuccess("Administrador actualizado correctamente");
      setEditId(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Seguro que deseas eliminar este administrador?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { setError(json.message); return; }
      setSuccess("Administrador eliminado");
      load();
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 14 }}>
        Cargando administradores...
      </div>
    );
  }

  return (
    <div>
      {success && (
        <div style={{ background: "#f0f9f0", border: "1px solid #7bbf7b", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#2d6a2d", marginBottom: 16 }}>
          ✓ {success}
        </div>
      )}
      {error && !editId && (
        <div style={{ background: "#fdf0f0", border: "1px solid #e9a0a0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8a2020", marginBottom: 16 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {admins.map((a) => (
          <div
            key={a.id_admin}
            style={{
              background: "#fff",
              border: "1px solid #e8e3db",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {/* Admin row */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 20px",
            }}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38,
                borderRadius: "50%",
                background: "#2c2c2a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 600, color: "#c8b89a",
                flexShrink: 0,
              }}>
                {a.email[0].toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1c1c1a" }}>
                  {a.email}
                  {a.id_admin === currentAdminId && (
                    <span style={{ marginLeft: 8, fontSize: 10, background: "#f5f3ef", border: "1px solid #e0dbd4", borderRadius: 4, padding: "2px 6px", color: "#888" }}>
                      Tú
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
                  ID #{a.id_admin} · Registrado el {new Date(a.created_at).toLocaleDateString("es-MX")}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => editId === a.id_admin ? setEditId(null) : startEdit(a)}
                  style={{
                    padding: "6px 14px",
                    border: "1px solid #e0dbd4",
                    borderRadius: 7,
                    background: "transparent",
                    fontSize: 12,
                    color: "#666",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {editId === a.id_admin ? "Cancelar" : "Editar"}
                </button>
                {a.id_admin !== currentAdminId && (
                  <button
                    onClick={() => handleDelete(a.id_admin)}
                    disabled={deletingId === a.id_admin}
                    style={{
                      padding: "6px 14px",
                      border: "1px solid #e9a0a0",
                      borderRadius: 7,
                      background: "transparent",
                      fontSize: 12,
                      color: "#c0392b",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      opacity: deletingId === a.id_admin ? 0.5 : 1,
                    }}
                  >
                    {deletingId === a.id_admin ? "Borrando..." : "Eliminar"}
                  </button>
                )}
              </div>
            </div>

            {/* Edit panel (inline) */}
            {editId === a.id_admin && (
              <div style={{
                borderTop: "1px solid #f0ece6",
                background: "#fffcf5",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#8a6f3e" }}>
                  ✦ Editar administrador #{a.id_admin}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>Nuevo correo</label>
                    <input
                      style={{ ...inputStyle, borderColor: "#c8b89a", background: "#fff" }}
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="nuevo@correo.com"
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>Nueva contraseña</label>
                    <input
                      style={{ ...inputStyle, borderColor: "#c8b89a", background: "#fff" }}
                      type="password"
                      value={editPass}
                      onChange={(e) => setEditPass(e.target.value)}
                      placeholder="Dejar vacío para no cambiar"
                    />
                  </div>
                </div>

                {error && editId === a.id_admin && (
                  <div style={{ fontSize: 12, color: "#8a2020" }}>⚠ {error}</div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    style={{
                      padding: "8px 20px",
                      border: "none",
                      borderRadius: 8,
                      background: saving ? "#ccc" : "#1c1c1a",
                      color: "#e8e4dc",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: saving ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {admins.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb", fontSize: 14 }}>
            No hay administradores registrados.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Agregar admin ─────────────────────────────────────────────────────────────

function AgregarAdmin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
      <div style={{
        background: "#f0f9f0",
        border: "1px solid #7bbf7b",
        borderRadius: 12,
        padding: "32px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#2d6a2d" }}>
          Administrador creado correctamente
        </div>
        <div style={{ fontSize: 13, color: "#5a9a5a", marginTop: 4 }}>
          Redirigiendo a la lista...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e8e3db",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      <div style={{ padding: "14px 20px", background: "#faf9f7", borderBottom: "1px solid #f0ece6", fontSize: 13, fontWeight: 500, color: "#444" }}>
        Nuevo administrador
      </div>
      <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
            Correo electrónico *
          </label>
          <input
            style={inputStyle}
            type="email"
            required
            placeholder="nuevo@admin.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
              Contraseña *
            </label>
            <input
              style={inputStyle}
              type="password"
              required
              placeholder="Mín. 6 caracteres"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
              Confirmar contraseña *
            </label>
            <input
              style={inputStyle}
              type="password"
              required
              placeholder="Repetir contraseña"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null); }}
            />
          </div>
        </div>

        {error && (
          <div style={{ background: "#fdf0f0", border: "1px solid #e9a0a0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#8a2020" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 28px",
              border: "none",
              borderRadius: 10,
              background: loading ? "#ccc" : "#1c1c1a",
              color: "#e8e4dc",
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {loading ? "Guardando..." : "Crear administrador"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────

function TopBar({ onBack }: { onBack: () => void }) {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div style={{
      background: "#1c1c1a",
      padding: "0 32px",
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: "#888",
            fontSize: 18,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 6,
            lineHeight: 1,
          }}
          title="Volver al dashboard"
        >
          ←
        </button>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 17l4-8 4 4 3-6 4 10" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 20h20" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ color: "#e8e4dc", fontWeight: 500, fontSize: 15, letterSpacing: "0.04em" }}>
          Escencia Madera &nbsp;<span style={{ color: "#555", fontWeight: 400 }}>/ Configuración</span>
        </span>
      </div>
      <button
        onClick={handleLogout}
        style={{
          background: "transparent",
          border: "1px solid #333",
          borderRadius: 7,
          padding: "5px 14px",
          fontSize: 12,
          color: "#aaa",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#666";
          (e.currentTarget as HTMLButtonElement).style.color = "#e8e4dc";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
          (e.currentTarget as HTMLButtonElement).style.color = "#aaa";
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}