/**
 * src/app/api/work-orders/[id]/cancel/route.ts
 *
 * POST /api/work-orders/:id/cancel
 *
 * Cancela la orden de trabajo (no se borra, status pasa a "cancelada")
 * y revierte el estado de la cotización asociada a "pendiente"
 * para que vuelva a aparecer en la pantalla de cotizaciones pendientes.
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const [woRows] = await pool.query(
      "SELECT id_work_order, id_quote, status FROM work_orders WHERE id_work_order = ?",
      [id]
    );
    const woList = woRows as { id_work_order: number; id_quote: number; status: string }[];

    if (woList.length === 0)
      return NextResponse.json({ ok: false, message: "Orden de trabajo no encontrada" }, { status: 404 });

    if (woList[0].status === "cancelada")
      return NextResponse.json({ ok: false, message: "Esta orden ya está cancelada" }, { status: 400 });

    if (woList[0].status === "completada")
      return NextResponse.json({ ok: false, message: "No se puede cancelar una orden ya completada" }, { status: 400 });

    const idQuote = woList[0].id_quote;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query("UPDATE work_orders SET status = 'cancelada' WHERE id_work_order = ?", [id]);
      await conn.query("UPDATE Quote SET status = 'pendiente' WHERE id_quote = ?", [idQuote]);

      await conn.commit();

      return NextResponse.json({
        ok: true,
        data: { id_work_order: Number(id), status: "cancelada", id_quote: idQuote, quote_status: "pendiente" },
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error("[POST /api/work-orders/:id/cancel]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}