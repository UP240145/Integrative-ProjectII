/**
 * src/app/api/quotes/[id]/status/route.ts
 *
 * PATCH /api/quotes/:id/status
 * Body: { status: "pendiente" | "aceptada" | "rechazada" }
 *
 * Validaciones:
 * - No se puede rechazar una cotización que ya tiene una work order activa
 * - No se puede cambiar el estado de una cotización rechazada
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

const VALID_STATUSES = ["pendiente", "aceptada", "rechazada"] as const;
type QuoteStatus = (typeof VALID_STATUSES)[number];

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body)
      return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { status } = body as { status: QuoteStatus };
    if (!status || !VALID_STATUSES.includes(status))
      return NextResponse.json(
        { ok: false, message: `status debe ser uno de: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );

    const [existing] = await pool.query(
      "SELECT id_quote, status FROM Quote WHERE id_quote = ?",
      [id]
    );
    const quoteList = existing as { id_quote: number; status: string }[];
    if (quoteList.length === 0)
      return NextResponse.json({ ok: false, message: "Cotización no encontrada" }, { status: 404 });

    const currentStatus = quoteList[0].status;

    // No se puede modificar una cotización ya rechazada
    if (currentStatus === "rechazada")
      return NextResponse.json({
        ok: false,
        message: "No se puede modificar una cotización que ya fue rechazada.",
      }, { status: 409 });

    // No se puede rechazar si tiene una work order activa
    if (status === "rechazada") {
      const [activeOrders] = await pool.query(
        "SELECT id_work_order FROM work_orders WHERE id_quote = ? AND status = 'pendiente' LIMIT 1",
        [id]
      );
      if ((activeOrders as unknown[]).length > 0)
        return NextResponse.json({
          ok: false,
          message: "No se puede rechazar esta cotización porque tiene una orden de trabajo activa. Cancela la orden primero.",
        }, { status: 409 });
    }

    await pool.query("UPDATE Quote SET status = ? WHERE id_quote = ?", [status, id]);

    return NextResponse.json({ ok: true, data: { id_quote: Number(id), status } });
  } catch (e) {
    console.error("[PATCH /api/quotes/:id/status]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}