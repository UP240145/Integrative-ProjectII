/**
 * src/app/api/quotes/[id]/status/route.ts
 *
 * PATCH /api/quotes/:id/status
 * Body: { status: "pendiente" | "aceptada" | "rechazada" }
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

    const [existing] = await pool.query("SELECT id_quote FROM Quote WHERE id_quote = ?", [id]);
    if ((existing as unknown[]).length === 0)
      return NextResponse.json({ ok: false, message: "Cotización no encontrada" }, { status: 404 });

    await pool.query("UPDATE Quote SET status = ? WHERE id_quote = ?", [status, id]);

    return NextResponse.json({ ok: true, data: { id_quote: Number(id), status } });
  } catch (e) {
    console.error("[PATCH /api/quotes/:id/status]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}