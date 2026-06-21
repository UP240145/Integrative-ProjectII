"use client";

import { useRouter } from "next/navigation";

interface Props { email: string }

const MODULES = [
  {
    href: "/cotizaciones-pendientes",
    title: "Cotizaciones",
    description: "Ver pendientes y crear nuevas cotizaciones",
    color: "#c8b89a",
  },
  {
    href: "/ordenes-trabajo",
    title: "Órdenes de trabajo",
    description: "Seguimiento de fabricación y entregas",
    color: "#d49a5a",
  },
  {
    href: "/clientes",
    title: "Clientes",
    description: "Registrar y administrar el directorio de clientes",
    color: "#89b4e8",
  },
  {
    href: "/citas",
    title: "Citas",
    description: "Agendar citas y consultar el calendario de visitas",
    color: "#b89ac8",
  },
  {
    href: "/configuracion",
    title: "Configuración",
    description: "Administrar usuarios y ajustes del sistema",
    color: "#7bbf7b",
  },
];

export default function DashboardClient({ email }: Props) {
  const router = useRouter();

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
        background: "#1c1c1a",
        padding: "0 32px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 17l4-8 4 4 3-6 4 10" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 20h20" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ color: "#e8e4dc", fontWeight: 500, fontSize: 15, letterSpacing: "0.04em" }}>
            Escencia Madera
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: "#888" }}>{email}</span>
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
              transition: "all 0.15s",
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
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: "#1c1c1a", letterSpacing: "-0.01em" }}>
            Panel principal
          </div>
          <div style={{ fontSize: 14, color: "#aaa", marginTop: 6 }}>
            ¿Qué deseas hacer hoy?
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {MODULES.map((mod) => (
            <ModuleCard key={mod.href} {...mod} onClick={() => router.push(mod.href)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({
  title, description, color, onClick,
}: {
  title: string; description: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#fff",
        border: "1px solid #e8e3db",
        borderRadius: 16,
        padding: "28px 24px",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = color;
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = `0 6px 24px rgba(0,0,0,0.07)`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "#e8e3db";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#1c1c1a", marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "#999", lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
      <div style={{ fontSize: 12, color: color, fontWeight: 500, marginTop: "auto" }}>
        Abrir →
      </div>
    </button>
  );
}