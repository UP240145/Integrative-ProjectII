"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? "Error al iniciar sesión");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f3ef",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo / marca */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52,
            background: "#1c1c1a",
            borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l4-8 4 4 3-6 4 10" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 20h20" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#1c1c1a", letterSpacing: "0.02em" }}>
            Escencia Madera
          </div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>
            Sistema de gestión
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff",
          border: "1px solid #e8e3db",
          borderRadius: 16,
          padding: "32px 28px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
        }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#1c1c1a", marginBottom: 24 }}>
            Iniciar sesión
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
                Correo electrónico
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="admin@carpinteria.com"
                style={{
                  padding: "10px 12px",
                  border: `1px solid ${error ? "#e74c3c" : "#e0dbd4"}`,
                  borderRadius: 8,
                  fontSize: 14,
                  color: "#1a1a18",
                  background: "#faf9f7",
                  outline: "none",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#2c2c2a"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = error ? "#e74c3c" : "#e0dbd4"; }}
              />
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                style={{
                  padding: "10px 12px",
                  border: `1px solid ${error ? "#e74c3c" : "#e0dbd4"}`,
                  borderRadius: 8,
                  fontSize: 14,
                  color: "#1a1a18",
                  background: "#faf9f7",
                  outline: "none",
                  fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#2c2c2a"; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = error ? "#e74c3c" : "#e0dbd4"; }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "#fdf0f0",
                border: "1px solid #e9a0a0",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: "#8a2020",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ fontSize: 15 }}>⚠</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: "12px",
                border: "none",
                borderRadius: 10,
                background: loading ? "#888" : "#1c1c1a",
                color: "#e8e4dc",
                fontSize: 14,
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.02em",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.15s",
              }}
            >
              {loading ? (
                <>
                  <Spinner /> Verificando...
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="#c8b89a" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round"/>
    </svg>
  );
}
