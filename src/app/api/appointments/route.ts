/**
 * src/app/api/appointments/route.ts
 *
 * GET  /api/appointments?date=2024-06-13   → citas del día
 * GET  /api/appointments?month=2024-06     → citas del mes (para calendario)
 * POST /api/appointments                   → crear cita con validación de conflictos
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// Duración en minutos por tipo de cita
const DURATIONS: Record<string, number> = {
  entregar: 30,
  medir:    45,
  instalar: 60,
};

const BUFFER_MINUTES = 30; // tiempo mínimo entre citas
const START_HOUR     = 10; // 10:00am
const END_HOUR       = 16; // 4:00pm

// Convierte "HH:MM:SS" a minutos desde medianoche
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Convierte minutos desde medianoche a "HH:MM"
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ── GET /api/appointments ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const date  = req.nextUrl.searchParams.get("date");
    const month = req.nextUrl.searchParams.get("month");

    let sql = `
      SELECT
        a.id_appointment, a.appointment_type, a.appointment_date,
        a.appointment_time, a.address, a.notes,
        c.id_client, c.full_name, c.phone
      FROM appointments a
      JOIN Client c ON c.id_client = a.id_client
    `;
    const params: string[] = [];

    if (date) {
      sql += " WHERE a.appointment_date = ?";
      params.push(date);
    } else if (month) {
      sql += " WHERE DATE_FORMAT(a.appointment_date, '%Y-%m') = ?";
      params.push(month);
    }

    sql += " ORDER BY a.appointment_date ASC, a.appointment_time ASC";

    const [rows] = await pool.query(sql, params);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error("[GET /api/appointments]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

// ── POST /api/appointments ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { id_client, appointment_type, appointment_date, appointment_time, address, notes } =
      body as Record<string, string>;

    // Validaciones básicas
    if (!id_client)         return NextResponse.json({ ok: false, message: "Cliente es obligatorio" }, { status: 400 });
    if (!appointment_type)  return NextResponse.json({ ok: false, message: "Tipo de cita es obligatorio" }, { status: 400 });
    if (!appointment_date)  return NextResponse.json({ ok: false, message: "Fecha es obligatoria" }, { status: 400 });
    if (!appointment_time)  return NextResponse.json({ ok: false, message: "Hora es obligatoria" }, { status: 400 });

    const duration = DURATIONS[appointment_type];
    if (!duration) return NextResponse.json({ ok: false, message: "Tipo de cita inválido" }, { status: 400 });

    // Validar que esté dentro del horario permitido
    const newStart = timeToMinutes(appointment_time);
    const newEnd   = newStart + duration;

    if (newStart < START_HOUR * 60)
      return NextResponse.json({ ok: false, message: "Las citas inician a partir de las 10:00am" }, { status: 400 });
    if (newEnd > END_HOUR * 60)
      return NextResponse.json({ ok: false, message: "La cita terminaría después de las 4:00pm" }, { status: 400 });

    // Verificar que no sea día pasado
    const today = new Date().toISOString().split("T")[0];
    if (appointment_date < today)
      return NextResponse.json({ ok: false, message: "No se pueden agendar citas en fechas pasadas" }, { status: 400 });

    // Obtener citas del mismo día
    const [existing] = await pool.query(
      `SELECT appointment_time, appointment_type FROM appointments
       WHERE appointment_date = ?
       ORDER BY appointment_time ASC`,
      [appointment_date]
    );

    const dayAppointments = existing as { appointment_time: string; appointment_type: string }[];

    // Verificar conflictos con buffer de 30 min
    for (const appt of dayAppointments) {
      const existStart = timeToMinutes(appt.appointment_time);
      const existEnd   = existStart + DURATIONS[appt.appointment_type];

      // Nueva cita empieza antes de que termine la existente + buffer
      const tooEarly = newStart < existEnd + BUFFER_MINUTES;
      // Nueva cita termina + buffer después de que empiece la existente
      const tooLate  = newEnd + BUFFER_MINUTES > existStart;

      if (tooEarly && tooLate) {
        const conflictEnd = minutesToTime(existEnd + BUFFER_MINUTES);
        return NextResponse.json({
          ok: false,
          message: `Conflicto de horario. La próxima cita disponible después de las ${appt.appointment_time.slice(0,5)} es a las ${conflictEnd} (incluyendo 30 min de traslado).`
        }, { status: 409 });
      }
    }

    // Verificar cliente existe
    const [clients] = await pool.query("SELECT id_client FROM Client WHERE id_client = ?", [id_client]);
    if ((clients as unknown[]).length === 0)
      return NextResponse.json({ ok: false, message: "Cliente no encontrado" }, { status: 404 });

    // Insertar
    const [result] = await pool.query(
      `INSERT INTO appointments (id_client, appointment_type, appointment_date, appointment_time, address, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_client, appointment_type, appointment_date, appointment_time, address || null, notes || null]
    );

    const insertId = (result as { insertId: number }).insertId;
    const [rows] = await pool.query(
      `SELECT a.*, c.full_name, c.phone FROM appointments a
       JOIN Client c ON c.id_client = a.id_client
       WHERE a.id_appointment = ?`,
      [insertId]
    );

    return NextResponse.json({ ok: true, data: (rows as unknown[])[0] }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/appointments]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}