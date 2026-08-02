/**
 * src/app/api/clients/[id]/route.ts
 *
 * GET    /api/clients/:id  → obtener cliente
 * PUT    /api/clients/:id  → actualizar cliente
 * DELETE /api/clients/:id  → eliminar cliente (bloqueado si tiene registros activos)
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

interface Params { params: Promise<{ id: string }> }

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const [rows] = await pool.query(
      "SELECT id_client, full_name, email, phone, address, created_at FROM Client WHERE id_client = ?",
      [id]
    );
    const list = rows as unknown[];
    if (list.length === 0)
      return NextResponse.json({ ok: false, message: "Cliente no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, data: list[0] });
  } catch (e) {
    console.error("[GET /api/clients/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body)
      return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { full_name, email, phone, address } = body as Record<string, string>;
    if (!full_name?.trim())
      return NextResponse.json({ ok: false, message: "El nombre completo es obligatorio" }, { status: 400 });

    const [result] = await pool.query(
      "UPDATE Client SET full_name = ?, email = ?, phone = ?, address = ? WHERE id_client = ?",
      [full_name.trim(), email || null, phone || null, address || null, id]
    );
    if ((result as { affectedRows: number }).affectedRows === 0)
      return NextResponse.json({ ok: false, message: "Cliente no encontrado" }, { status: 404 });

    const [rows] = await pool.query(
      "SELECT id_client, full_name, email, phone, address, created_at FROM Client WHERE id_client = ?",
      [id]
    );
    return NextResponse.json({ ok: true, data: (rows as unknown[])[0] });
  } catch (e) {
    console.error("[PUT /api/clients/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const [existing] = await pool.query("SELECT id_client FROM Client WHERE id_client = ?", [id]);
    if ((existing as unknown[]).length === 0)
      return NextResponse.json({ ok: false, message: "Cliente no encontrado" }, { status: 404 });

    // 1. Órdenes de trabajo activas (pendiente) ligadas a cotizaciones del cliente
    const [activeOrders] = await pool.query(
      `SELECT wo.id_work_order FROM work_orders wo
       JOIN Quote q ON q.id_quote = wo.id_quote
       WHERE q.id_client = ? AND wo.status = 'pendiente'
       LIMIT 1`,
      [id]
    );
    if ((activeOrders as unknown[]).length > 0)
      return NextResponse.json({
        ok: false,
        message: "No se puede eliminar este cliente porque tiene órdenes de trabajo activas.",
      }, { status: 409 });

    // 2. Cotizaciones pendientes o aceptadas
    const [activeQuotes] = await pool.query(
      `SELECT id_quote FROM Quote
       WHERE id_client = ? AND status IN ('pendiente', 'aceptada')
       LIMIT 1`,
      [id]
    );
    if ((activeQuotes as unknown[]).length > 0)
      return NextResponse.json({
        ok: false,
        message: "No se puede eliminar este cliente porque tiene cotizaciones pendientes o aceptadas.",
      }, { status: 409 });

    // 3. Citas futuras
    const today = new Date().toISOString().split("T")[0];
    const [futurAppts] = await pool.query(
      `SELECT id_appointment FROM appointments
       WHERE id_client = ? AND appointment_date >= ?
       LIMIT 1`,
      [id, today]
    );
    if ((futurAppts as unknown[]).length > 0)
      return NextResponse.json({
        ok: false,
        message: "No se puede eliminar este cliente porque tiene citas próximas agendadas.",
      }, { status: 409 });

    await pool.query("DELETE FROM Client WHERE id_client = ?", [id]);
    return NextResponse.json({ ok: true, data: { deleted: true, id_client: Number(id) } });
  } catch (e) {
    console.error("[DELETE /api/clients/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}