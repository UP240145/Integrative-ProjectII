/**
 * src/app/api/work-orders/[id]/complete/route.ts
 *
 * POST /api/work-orders/:id/complete
 *
 * Marca la orden como "completada" Y agenda automáticamente la cita
 * de entrega en la misma operación.
 *
 * Body: { appointment_date: "YYYY-MM-DD", appointment_time: "HH:MM", address?: string, notes?: string }
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

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { appointment_date, appointment_time, address, notes } = body as Record<string, string>;

    if (!appointment_date) return NextResponse.json({ ok: false, message: "Fecha de entrega obligatoria" }, { status: 400 });
    if (!appointment_time) return NextResponse.json({ ok: false, message: "Horario de entrega obligatorio" }, { status: 400 });

    // Buscar la orden y su cliente vía Quote
    const [woRows] = await pool.query(
      `SELECT wo.id_work_order, wo.status, q.id_client, c.address AS client_address
       FROM work_orders wo
       JOIN Quote  q ON q.id_quote  = wo.id_quote
       JOIN Client c ON c.id_client = q.id_client
       WHERE wo.id_work_order = ?`,
      [id]
    );
    const woList = woRows as { id_work_order: number; status: string; id_client: number; client_address: string | null }[];

    if (woList.length === 0)
      return NextResponse.json({ ok: false, message: "Orden de trabajo no encontrada" }, { status: 404 });

    if (woList[0].status === "completada")
      return NextResponse.json({ ok: false, message: "Esta orden ya fue marcada como completada" }, { status: 400 });

    const idClient = woList[0].id_client;
    const duration = DURATIONS["entregar"]; // la cita de entrega siempre es tipo "entregar"

    // Validar horario permitido
    const newStart = timeToMinutes(appointment_time);
    const newEnd   = newStart + duration;
    if (newStart < START) return NextResponse.json({ ok: false, message: "Las citas inician a partir de las 10:00am" }, { status: 400 });
    if (newEnd > END)     return NextResponse.json({ ok: false, message: "La cita terminaría después de las 4:00pm" }, { status: 400 });

    const today = new Date().toISOString().split("T")[0];
    if (appointment_date < today)
      return NextResponse.json({ ok: false, message: "No se pueden agendar citas en fechas pasadas" }, { status: 400 });

    // Verificar conflictos del día con buffer de 30 min
    const [existing] = await pool.query(
      `SELECT appointment_time, appointment_type FROM appointments WHERE appointment_date = ? ORDER BY appointment_time ASC`,
      [appointment_date]
    );
    const dayAppts = existing as { appointment_time: string; appointment_type: string }[];

    for (const appt of dayAppts) {
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

    const finalAddress = address?.trim() || woList[0].client_address || null;

    // Transacción: crear la cita + actualizar la orden
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [apptResult] = await conn.query(
        `INSERT INTO appointments (id_client, appointment_type, appointment_date, appointment_time, address, notes)
         VALUES (?, 'entregar', ?, ?, ?, ?)`,
        [idClient, appointment_date, appointment_time, finalAddress, notes || "Entrega de orden de trabajo"]
      );
      const appointmentId = (apptResult as { insertId: number }).insertId;

      await conn.query(
        `UPDATE work_orders SET status = 'completada' WHERE id_work_order = ?`,
        [id]
      );

      await conn.commit();

      return NextResponse.json({
        ok: true,
        data: { id_work_order: Number(id), id_appointment: appointmentId, status: "completada" },
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error("[POST /api/work-orders/:id/complete]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}