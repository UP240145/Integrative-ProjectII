/**
 * src/app/api/appointments/[id]/route.ts
 *
 * DELETE /api/appointments/:id  → cancelar cita
 *   - Bloquea citas tipo "entregar" (deben reagendarse)
 *   - Bloquea si la cita está ligada a una orden de trabajo activa
 * PUT    /api/appointments/:id  → reagendar cita (valida conflictos)
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

const DURATIONS: Record<string, number> = { entregar: 30, medir: 45, instalar: 60 };
const BUFFER = 30;
const START  = 10 * 60;
const END    = 16 * 60;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(mins: number): string {
  return `${Math.floor(mins/60).toString().padStart(2,"0")}:${(mins%60).toString().padStart(2,"0")}`;
}

interface Params { params: Promise<{ id: string }> }

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const [rows] = await pool.query(
      "SELECT id_appointment, appointment_type, id_client, appointment_date FROM appointments WHERE id_appointment = ?",
      [id]
    );
    const list = rows as { id_appointment: number; appointment_type: string; id_client: number; appointment_date: string }[];
    if (list.length === 0)
      return NextResponse.json({ ok: false, message: "Cita no encontrada" }, { status: 404 });

    const appt = list[0];

    // Las citas de entrega no se cancelan, se reagendan
    if (appt.appointment_type === "entregar")
      return NextResponse.json({
        ok: false,
        message: "Las citas de entrega no se pueden cancelar, deben reagendarse a otra fecha u horario.",
      }, { status: 400 });

    // No cancelar si el cliente tiene órdenes de trabajo activas
    const [activeOrders] = await pool.query(
      `SELECT wo.id_work_order FROM work_orders wo
       JOIN Quote q ON q.id_quote = wo.id_quote
       WHERE q.id_client = ? AND wo.status = 'pendiente'
       LIMIT 1`,
      [appt.id_client]
    );
    if ((activeOrders as unknown[]).length > 0)
      return NextResponse.json({
        ok: false,
        message: "No se puede cancelar esta cita porque el cliente tiene órdenes de trabajo activas.",
      }, { status: 409 });

    const [result] = await pool.query("DELETE FROM appointments WHERE id_appointment = ?", [id]);
    if ((result as { affectedRows: number }).affectedRows === 0)
      return NextResponse.json({ ok: false, message: "Cita no encontrada" }, { status: 404 });

    return NextResponse.json({ ok: true, data: { deleted: true, id_appointment: Number(id) } });
  } catch (e) {
    console.error("[DELETE /api/appointments/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

// ── PUT — reagendar ───────────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { appointment_date, appointment_time } = body as Record<string, string>;
    if (!appointment_date) return NextResponse.json({ ok: false, message: "Fecha es obligatoria" }, { status: 400 });
    if (!appointment_time) return NextResponse.json({ ok: false, message: "Hora es obligatoria" }, { status: 400 });

    const [current] = await pool.query(
      "SELECT id_appointment, appointment_type FROM appointments WHERE id_appointment = ?",
      [id]
    );
    const currentList = current as { id_appointment: number; appointment_type: string }[];
    if (currentList.length === 0)
      return NextResponse.json({ ok: false, message: "Cita no encontrada" }, { status: 404 });

    const apptType = currentList[0].appointment_type;
    const duration = DURATIONS[apptType] ?? 30;

    const newStart = timeToMinutes(appointment_time);
    const newEnd   = newStart + duration;

    if (newStart < START) return NextResponse.json({ ok: false, message: "Las citas inician a partir de las 10:00am" }, { status: 400 });
    if (newEnd > END)     return NextResponse.json({ ok: false, message: "La cita terminaría después de las 4:00pm" }, { status: 400 });

    const today = new Date().toISOString().split("T")[0];
    if (appointment_date < today)
      return NextResponse.json({ ok: false, message: "No se pueden agendar citas en fechas pasadas" }, { status: 400 });

    const [existing] = await pool.query(
      `SELECT id_appointment, appointment_time, appointment_type FROM appointments
       WHERE appointment_date = ? AND id_appointment <> ?
       ORDER BY appointment_time ASC`,
      [appointment_date, id]
    );
    const dayAppointments = existing as { id_appointment: number; appointment_time: string; appointment_type: string }[];

    for (const appt of dayAppointments) {
      const existStart = timeToMinutes(appt.appointment_time);
      const existEnd   = existStart + DURATIONS[appt.appointment_type];
      const tooEarly = newStart < existEnd + BUFFER;
      const tooLate  = newEnd + BUFFER > existStart;
      if (tooEarly && tooLate) {
        const conflictEnd = minutesToTime(existEnd + BUFFER);
        return NextResponse.json({
          ok: false,
          message: `Conflicto de horario. La próxima cita disponible es a las ${conflictEnd}.`,
        }, { status: 409 });
      }
    }

    await pool.query(
      "UPDATE appointments SET appointment_date = ?, appointment_time = ? WHERE id_appointment = ?",
      [appointment_date, appointment_time, id]
    );

    const [updatedRows] = await pool.query(
      `SELECT a.*, c.full_name, c.phone FROM appointments a
       JOIN Client c ON c.id_client = a.id_client
       WHERE a.id_appointment = ?`,
      [id]
    );

    return NextResponse.json({ ok: true, data: (updatedRows as unknown[])[0] });
  } catch (e) {
    console.error("[PUT /api/appointments/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}