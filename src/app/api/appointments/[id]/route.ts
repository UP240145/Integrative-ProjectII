/**
 * src/app/api/appointments/[id]/route.ts
 *
 * DELETE /api/appointments/:id  → cancelar cita
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

interface Params { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const [result] = await pool.query(
      "DELETE FROM appointments WHERE id_appointment = ?", [id]
    );
    if ((result as { affectedRows: number }).affectedRows === 0)
      return NextResponse.json({ ok: false, message: "Cita no encontrada" }, { status: 404 });

    return NextResponse.json({ ok: true, data: { deleted: true, id_appointment: Number(id) } });
  } catch (e) {
    console.error("[DELETE /api/appointments/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}