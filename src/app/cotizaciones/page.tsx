"use client"
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type FurnitureType =
  | "closet"
  | "cocina"
  | "comedor"
  | "cama"
  | "estanteria"
  | "bano"
  | "otro";

type Material = "mdf" | "melamina" | "pino" | "roble" | "cedro";

type QuoteStatus = "pendiente" | "aceptada" ;

interface Client {
  id_client: number;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

interface NewClientForm {
  full_name: string;
  email: string;
  phone: string;
  address: string;
}

interface QuoteForm {
  furnitureType: FurnitureType | "";
  material: Material | "";
  width: string;
  height: string;
  depth: string;
  calculatedCost: number;
  overridePrice: string;
  useOverride: boolean;
  status: QuoteStatus;
  notes: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const FURNITURE_LABELS: Record<FurnitureType, string> = {
  closet: "Clóset",
  cocina: "Cocina integral",
  comedor: "Comedor",
  cama: "Cama",
  estanteria: "Estantería",
  bano: "Mueble de baño",
  otro: "Otro",
};

const MATERIAL_LABELS: Record<Material, string> = {
  mdf: "MDF",
  melamina: "Melamina",
  pino: "Pino macizo",
  roble: "Roble",
  cedro: "Cedro",
};

const MATERIAL_PRICE_PER_CM3: Record<Material, number> = {
  mdf: 0.0018,
  melamina: 0.0022,
  pino: 0.0034,
  roble: 0.0052,
  cedro: 0.006,
};

const FURNITURE_COMPLEXITY: Record<FurnitureType, number> = {
  closet: 2.4,
  cocina: 3.2,
  comedor: 2.0,
  cama: 1.8,
  estanteria: 1.4,
  bano: 2.6,
  otro: 2.0,
};

const LABOR_FACTOR = 1.45;

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculatePrice(
  material: Material | "",
  furnitureType: FurnitureType | "",
  width: string,
  height: string,
  depth: string
): number {
  const w = parseFloat(width) || 0;
  const h = parseFloat(height) || 0;
  const d = parseFloat(depth) || 0;
  if (!material || !furnitureType || w === 0 || h === 0 || d === 0) return 0;
  const volume = w * h * d;
  const materialCost =
    volume * MATERIAL_PRICE_PER_CM3[material] * FURNITURE_COMPLEXITY[furnitureType];
  return Math.ceil((materialCost * LABOR_FACTOR) / 50) * 50;
}

function formatMXN(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function generateQuoteId(): string {
  return `COT-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ── API helpers ───────────────────────────────────────────────────────────────

const API_BASE = "/api";

async function searchClients(query: string): Promise<Client[]> {
  const res = await fetch(`${API_BASE}/clients?search=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const text = await res.text();
    console.error(text);
    throw new Error(text);
  }
  const json = await res.json();
  return json.data as Client[];
}

async function createClient(data: NewClientForm): Promise<Client> {
  const res = await fetch(`${API_BASE}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error creando cliente");
  const json = await res.json();
  return json.data as Client;
}

async function saveQuote(payload: {
  id_client: number;
  furniture_type: string;
  width: number;
  height: number;
  depth: number;
  calculated_cost: number;
  final_price: number;
  status: string;
  notes: string;
}): Promise<{ id_quote: number }> {
  const res = await fetch(`${API_BASE}/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    console.log("RESPUESTA BACKEND:", text);
    throw new Error(text);
  }
  const json = await res.json();
  return json.data;
}

async function createWorkOrderAPI(id_quote: number): Promise<void> {
  const res = await fetch(`${API_BASE}/work-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_quote }),
  });
  if (!res.ok) throw new Error("Error creando orden de trabajo");
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  border: "1px solid #e0dbd4",
  borderRadius: 8,
  fontSize: 14,
  color: "#1a1a18",
  background: "#faf9f7",
  outline: "none",
  width: "100%",
  fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
};

// ── TopBar ────────────────────────────────────────────────────────────────────

function TopBar({ quoteId, onBack }: { quoteId: string; onBack: () => void }) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 17l4-8 4 4 3-6 4 10" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 20h20" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ color: "#e8e4dc", fontWeight: 500, fontSize: 15, letterSpacing: "0.04em" }}>
          Escencia Madera &nbsp;<span style={{ color: "#555", fontWeight: 400 }}>/ Nueva cotización</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <a
          href="/cotizaciones-pendientes"
          style={{ fontSize: 12, color: "#c8b89a", textDecoration: "none", padding: "5px 12px", border: "1px solid #444", borderRadius: 7 }}
        >
          Ver pendientes
        </a>
        <div style={{
          background: "#2e2e2b",
          color: "#c8b89a",
          fontSize: 12,
          padding: "4px 12px",
          borderRadius: 20,
          letterSpacing: "0.05em",
          fontWeight: 500,
        }}>
          {quoteId}
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
    </div>
  );
}

// ── ClientSearch ──────────────────────────────────────────────────────────────

interface ClientSearchProps {
  selectedClient: Client | null;
  onSelect: (client: Client) => void;
  onClear: () => void;
}

function ClientSearch({ selectedClient, onSelect, onClear }: ClientSearchProps) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showDrop, setShowDrop]   = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [newForm, setNewForm]     = useState<NewClientForm>({ full_name: "", email: "", phone: "", address: "" });
  const wrapperRef                = useRef<HTMLDivElement>(null);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setShowDrop(false);
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setShowDrop(false); setNoResults(false); return; }
    setLoading(true);
    setShowDrop(true);
    try {
      const data = await searchClients(q);
      setResults(data);
      setNoResults(data.length === 0);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    setNoResults(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  function handleSelect(c: Client) {
    onSelect(c);
    setQuery(""); setShowDrop(false); setResults([]);
  }

  async function handleSaveNew() {
    if (!newForm.full_name.trim()) return;
    setSaving(true);
    try {
      const created = await createClient(newForm);
      onSelect(created);
      setShowNew(false);
      setNewForm({ full_name: "", email: "", phone: "", address: "" });
      setQuery(""); setShowDrop(false);
    } finally {
      setSaving(false);
    }
  }

  if (selectedClient) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#faf9f7", border: "1px solid #e0dbd4", borderRadius: 10 }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#2c2c2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#c8b89a", flexShrink: 0, letterSpacing: "0.04em" }}>
          {initials(selectedClient.full_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 15, color: "#1a1a18" }}>{selectedClient.full_name}</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
            {[selectedClient.phone, selectedClient.email].filter(Boolean).join(" · ")}
          </div>
          {selectedClient.address && (
            <div style={{ fontSize: 12, color: "#bbb", marginTop: 1 }}>{selectedClient.address}</div>
          )}
        </div>
        <button
          onClick={onClear}
          style={{ background: "transparent", border: "1px solid #e0dbd4", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "#888", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", zIndex: 100 }}>
      <div style={{ position: "relative" }}>
        <input
          style={{ ...inputStyle, paddingLeft: 34 }}
          type="text"
          placeholder="Buscar cliente por nombre..."
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDrop(true)}
          autoComplete="off"
        />
        {loading && (
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#bbb" }}>
            Buscando...
          </span>
        )}
      </div>

      {showDrop && !showNew && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e0dbd4", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", zIndex: 100, overflow: "hidden" }}>
          {results.map((c, i) => (
            <button
              key={c.id_client}
              onClick={() => handleSelect(c)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "transparent", border: "none", borderTop: i > 0 ? "1px solid #f5f3ef" : "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#faf9f7"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2c2c2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#c8b89a", flexShrink: 0 }}>
                {initials(c.full_name)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a18" }}>{c.full_name}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{[c.phone, c.email].filter(Boolean).join(" · ")}</div>
              </div>
            </button>
          ))}
          {noResults && (
            <div style={{ padding: "14px 14px" }}>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>
                No se encontró ningún cliente con ese nombre.
              </div>
              <button
                onClick={() => { setShowNew(true); setShowDrop(false); setNewForm((p) => ({ ...p, full_name: query })); }}
                style={{ background: "#1c1c1a", border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, color: "#e8e4dc", cursor: "pointer", fontFamily: "inherit" }}
              >
                + Registrar cliente nuevo
              </button>
            </div>
          )}
        </div>
      )}

      {showNew && (
        <div style={{ marginTop: 8, padding: 16, background: "#fffcf5", border: "1px solid #c8b89a", borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#8a6f3e", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <span>✦</span> Registrar nuevo cliente
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginBottom: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <MiniField label="Nombre completo *">
                <input style={inputStyle} type="text" placeholder="Nombre completo" value={newForm.full_name} onChange={(e) => setNewForm((p) => ({ ...p, full_name: e.target.value }))} autoFocus />
              </MiniField>
            </div>
            <MiniField label="Teléfono">
              <input style={inputStyle} type="tel" placeholder="449 000 0000" value={newForm.phone} onChange={(e) => setNewForm((p) => ({ ...p, phone: e.target.value }))} />
            </MiniField>
            <MiniField label="Correo">
              <input style={inputStyle} type="email" placeholder="correo@ejemplo.com" value={newForm.email} onChange={(e) => setNewForm((p) => ({ ...p, email: e.target.value }))} />
            </MiniField>
            <div style={{ gridColumn: "1 / -1" }}>
              <MiniField label="Dirección">
                <input style={inputStyle} type="text" placeholder="Calle, colonia" value={newForm.address} onChange={(e) => setNewForm((p) => ({ ...p, address: e.target.value }))} />
              </MiniField>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setShowNew(false); setQuery(""); }} style={{ background: "transparent", border: "1px solid #e0dbd4", borderRadius: 7, padding: "8px 16px", fontSize: 13, color: "#888", cursor: "pointer", fontFamily: "inherit" }}>
              Cancelar
            </button>
            <button
              onClick={handleSaveNew}
              disabled={!newForm.full_name.trim() || saving}
              style={{ background: newForm.full_name.trim() && !saving ? "#1c1c1a" : "#ccc", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13, color: "#e8e4dc", cursor: newForm.full_name.trim() && !saving ? "pointer" : "not-allowed", fontFamily: "inherit", fontWeight: 500 }}
            >
              {saving ? "Guardando..." : "Guardar y seleccionar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "#aaa", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e3db", borderRadius: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 20px", borderBottom: "1px solid #f0ece6", background: "#faf9f7" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#444", letterSpacing: "0.01em" }}>{title}</span>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_FORM: QuoteForm = {
  furnitureType: "",
  material: "",
  width: "",
  height: "",
  depth: "",
  calculatedCost: 0,
  overridePrice: "",
  useOverride: false,
  status: "pendiente",
  notes: "",
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function QuotePage() {
  const router = useRouter();
  const [form, setForm]                         = useState<QuoteForm>(INITIAL_FORM);
  const [selectedClient, setSelectedClient]     = useState<Client | null>(null);
  const [quoteId, setQuoteId]                   = useState("");
  const [saved, setSaved]                       = useState(false);
  const [workOrderCreated, setWorkOrderCreated] = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [saveError, setSaveError]               = useState<string | null>(null);
  const [savedQuoteId, setSavedQuoteId]         = useState<number | null>(null);

  useEffect(() => { setQuoteId(generateQuoteId()); }, []);

  useEffect(() => {
    const price = calculatePrice(form.material, form.furnitureType, form.width, form.height, form.depth);
    setForm((prev) => ({ ...prev, calculatedCost: price }));
  }, [form.material, form.furnitureType, form.width, form.height, form.depth]);

  function update<K extends keyof QuoteForm>(key: K, value: QuoteForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setWorkOrderCreated(false);
  }

  const finalPrice = form.useOverride ? parseFloat(form.overridePrice) || 0 : form.calculatedCost;

  const isComplete =
    selectedClient !== null &&
    form.furnitureType !== "" &&
    form.material !== "" &&
    form.width !== "" &&
    form.height !== "" &&
    form.depth !== "" &&
    finalPrice > 0;

  async function handleSave() {
    if (!selectedClient || !isComplete) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveQuote({
        id_client:       selectedClient.id_client,
        furniture_type:  form.furnitureType,
        width:           parseFloat(form.width),
        height:          parseFloat(form.height),
        depth:           parseFloat(form.depth),
        calculated_cost: form.calculatedCost,
        final_price:     finalPrice,
        status:          form.status,
        notes:           form.notes,
      });
      setSavedQuoteId(result.id_quote);
      setSaved(true);

      // Si la cotización se guarda como "aceptada", crear la orden de trabajo automáticamente
      if (form.status === "aceptada") {
        try {
          await createWorkOrderAPI(result.id_quote);
          setWorkOrderCreated(true);
        } catch (woErr: unknown) {
          setSaveError(woErr instanceof Error ? woErr.message : "Cotización guardada, pero hubo un error al crear la orden de trabajo");
        }
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3ef", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: "0 0 80px" }}>

      {/* Top bar */}
      <TopBar quoteId={quoteId} onBack={() => router.push("/dashboard")} />

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 0" }}>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 24 }}>{today}</div>

        <SectionCard title="Cliente">
          <ClientSearch
            selectedClient={selectedClient}
            onSelect={(c) => { setSelectedClient(c); setSaved(false); }}
            onClear={() => { setSelectedClient(null); setSaved(false); }}
          />
        </SectionCard>

        <SectionCard title="Especificaciones del mueble">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px", marginBottom: 20 }}>
            <Field label="Tipo de mueble">
              <select style={selectStyle} value={form.furnitureType} onChange={(e) => update("furnitureType", e.target.value as FurnitureType | "")}>
                <option value="">Seleccionar...</option>
                {Object.entries(FURNITURE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Material">
              <select style={selectStyle} value={form.material} onChange={(e) => update("material", e.target.value as Material | "")}>
                <option value="">Seleccionar...</option>
                {Object.entries(MATERIAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 20px" }}>
            <Field label="Ancho (cm)">
              <input style={inputStyle} type="number" min={0} placeholder="0" value={form.width} onChange={(e) => update("width", e.target.value)} />
            </Field>
            <Field label="Alto (cm)">
              <input style={inputStyle} type="number" min={0} placeholder="0" value={form.height} onChange={(e) => update("height", e.target.value)} />
            </Field>
            <Field label="Fondo (cm)">
              <input style={inputStyle} type="number" min={0} placeholder="0" value={form.depth} onChange={(e) => update("depth", e.target.value)} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Precio">
          <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160, background: "#f5f3ef", border: "1px solid #e0dbd4", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", fontWeight: 500, marginBottom: 6 }}>Precio sugerido</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: form.calculatedCost > 0 ? "#1c1c1a" : "#ccc", letterSpacing: "-0.01em" }}>
                {form.calculatedCost > 0 ? formatMXN(form.calculatedCost) : "—"}
              </div>
              {form.calculatedCost === 0 && <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>Completa medidas y material</div>}
            </div>

            <div style={{ display: "flex", alignItems: "center", color: "#ccc", fontSize: 18, padding: "0 4px" }}>→</div>

            <div style={{ flex: 1, minWidth: 160, background: "#1c1c1a", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", fontWeight: 500, marginBottom: 6 }}>Precio final</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: finalPrice > 0 ? "#e8e4dc" : "#555", letterSpacing: "-0.01em" }}>
                {finalPrice > 0 ? formatMXN(finalPrice) : "—"}
              </div>
              {form.useOverride && <div style={{ fontSize: 11, color: "#c8b89a", marginTop: 4 }}>Precio personalizado</div>}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            {!form.useOverride ? (
              <button
                onClick={() => update("useOverride", true)}
                style={{ background: "transparent", border: "1px solid #e0dbd4", borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "#666", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
              >
                Cambiar precio
              </button>
            ) : (
              <div style={{ background: "#fffcf5", border: "1px solid #c8b89a", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, color: "#8a6f3e", fontWeight: 500 }}>Precio personalizado</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ position: "relative", flex: 1, maxWidth: 220 }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#aaa" }}>$</span>
                    <input
                      style={{ ...inputStyle, paddingLeft: 24, fontSize: 16, fontWeight: 500, borderColor: "#c8b89a", background: "#fff" }}
                      type="number" min={0} placeholder="0" value={form.overridePrice}
                      onChange={(e) => update("overridePrice", e.target.value)} autoFocus
                    />
                  </div>
                  <button onClick={() => { update("useOverride", false); update("overridePrice", ""); }} style={{ background: "transparent", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontFamily: "inherit" }}>
                    Cancelar
                  </button>
                </div>
                {form.calculatedCost > 0 && parseFloat(form.overridePrice) > 0 && (
                  <div style={{ fontSize: 11, color: "#aaa" }}>
                    {parseFloat(form.overridePrice) < form.calculatedCost
                      ? `Descuento: ${formatMXN(form.calculatedCost - parseFloat(form.overridePrice))} (${Math.round((1 - parseFloat(form.overridePrice) / form.calculatedCost) * 100)}%)`
                      : parseFloat(form.overridePrice) > form.calculatedCost
                      ? `Incremento: ${formatMXN(parseFloat(form.overridePrice) - form.calculatedCost)}`
                      : "Sin cambio respecto al precio sugerido"}
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Estado de la cotización">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {(
              [
                { value: "pendiente", label: "Pendiente", color: "#8a6f3e", bg: "#fffcf5", border: "#c8b89a" },
                { value: "aceptada",  label: "Aceptada",  color: "#2d6a2d", bg: "#f0f9f0", border: "#7bbf7b" },
              ] as const
            ).map((s) => (
              <button key={s.value} onClick={() => update("status", s.value)}
                style={{ padding: "8px 20px", borderRadius: 20, border: `1px solid ${form.status === s.value ? s.border : "#e0dbd4"}`, background: form.status === s.value ? s.bg : "transparent", color: form.status === s.value ? s.color : "#888", fontSize: 13, fontWeight: form.status === s.value ? 500 : 400, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}>
                {s.label}
              </button>
            ))}
          </div>
          <Field label="Notas internas">
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 80, lineHeight: 1.5 }} placeholder="Observaciones, detalles especiales, acuerdos con el cliente..." value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </Field>
        </SectionCard>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
          {workOrderCreated && (
            <span style={{ fontSize: 13, color: "#2d6a2d", background: "#f0f9f0", padding: "8px 16px", borderRadius: 8, border: "1px solid #7bbf7b" }}>✓ Orden de trabajo creada automáticamente</span>
          )}
          {saved && !workOrderCreated && (
            <span style={{ fontSize: 13, color: "#aaa" }}>✓ Cotización guardada</span>
          )}
          <button
            onClick={() => { setForm(INITIAL_FORM); setSelectedClient(null); setSaved(false); setWorkOrderCreated(false); setSavedQuoteId(null); }}
            style={{ padding: "11px 20px", border: "1px solid #e0dbd4", borderRadius: 10, background: "transparent", color: "#888", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            Limpiar
          </button>
          <button onClick={handleSave} disabled={!isComplete || saving}
            style={{ padding: "11px 28px", border: "none", borderRadius: 10, background: isComplete && !saving ? "#1c1c1a" : "#ccc", color: "#e8e4dc", fontSize: 14, fontWeight: 500, cursor: isComplete && !saving ? "pointer" : "not-allowed", letterSpacing: "0.02em", fontFamily: "inherit" }}>
            {saving ? "Guardando..." : "Guardar cotización"}
          </button>
        </div>

        {saveError && (
          <p style={{ textAlign: "right", fontSize: 12, color: "#c0392b", marginTop: 8 }}>⚠ {saveError}</p>
        )}
        {!isComplete && !saveError && (
          <p style={{ textAlign: "right", fontSize: 11, color: "#bbb", marginTop: 8 }}>
            {!selectedClient ? "Selecciona un cliente para continuar." : "Completa tipo de mueble, material y medidas para guardar."}
          </p>
        )}
      </div>
    </div>
  );
}