/**
 * src/app/api/appointments/availability/route.ts
 *
 * GET /api/appointments/availability?date=2024-06-13&type=instalar
 * Devuelve los slots disponibles para una fecha y tipo de cita.
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

const DURATIONS: Record<string, number> = {
  entregar: 30,
  medir:    45,
  instalar: 60,
};
const BUFFER   = 30;
const START    = 10 * 60; // 10:00 en minutos
const END      = 16 * 60; // 16:00 en minutos
const INTERVAL = 15;      // slots cada 15 minutos

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  return `${Math.floor(mins / 60).toString().padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date");
    const type = req.nextUrl.searchParams.get("type");

    if (!date || !type)
      return NextResponse.json({ ok: false, message: "date y type son obligatorios" }, { status: 400 });

    const duration = DURATIONS[type];
    if (!duration)
      return NextResponse.json({ ok: false, message: "Tipo inválido" }, { status: 400 });

    // Citas existentes del día
    const [existing] = await pool.query(
      `SELECT appointment_time, appointment_type FROM appointments
       WHERE appointment_date = ? ORDER BY appointment_time ASC`,
      [date]
    );
    const booked = existing as { appointment_time: string; appointment_type: string }[];

    // Generar todos los slots posibles
    const slots: { time: string; available: boolean }[] = [];

    for (let start = START; start + duration <= END; start += INTERVAL) {
      const slotEnd = start + duration;
      let available = true;

      for (const appt of booked) {
        const existStart = timeToMinutes(appt.appointment_time);
        const existEnd   = existStart + DURATIONS[appt.appointment_type];

        if (start < existEnd + BUFFER && slotEnd + BUFFER > existStart) {
          available = false;
          break;
        }
      }

      slots.push({ time: minutesToTime(start), available });
    }

    return NextResponse.json({ ok: true, data: slots });
  } catch (e) {
    console.error("[GET /api/appointments/availability]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}