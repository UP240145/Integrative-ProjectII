/**
 * src/app/api/inventory/[id]/route.ts
 *
 * GET    /api/inventory/:id  → detalle de un material
 * PUT    /api/inventory/:id  → actualizar nombre, precio y alerta mínima
 * PATCH  /api/inventory/:id  → agregar stock (suma a lo existente)
 * DELETE /api/inventory/:id  → eliminar material (bloqueado si tiene work order activa)
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

interface Params { params: Promise<{ id: string }> }

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const [rows] = await pool.query("SELECT * FROM Inventory WHERE id_wood = ?", [id]);
    const list = rows as unknown[];
    if (list.length === 0)
      return NextResponse.json({ ok: false, message: "Material no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, data: list[0] });
  } catch (e) {
    console.error("[GET /api/inventory/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { name, price, min_stock_alert } = body as Record<string, string | number>;
    if (!name || String(name).trim() === "")
      return NextResponse.json({ ok: false, message: "El nombre es obligatorio" }, { status: 400 });

    // Verificar que el nombre no esté en uso por otro material
    const [dup] = await pool.query(
      "SELECT id_wood FROM Inventory WHERE LOWER(name) = LOWER(?) AND id_wood <> ?",
      [String(name).trim(), id]
    );
    if ((dup as unknown[]).length > 0)
      return NextResponse.json({ ok: false, message: "Ya existe otro material con ese nombre." }, { status: 409 });

    await pool.query(
      `UPDATE Inventory SET name = ?, price = ?, min_stock_alert = ? WHERE id_wood = ?`,
      [
        String(name).trim(),
        parseFloat(String(price ?? 0)),
        Math.round(parseFloat(String(min_stock_alert ?? 0))),
        id,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM Inventory WHERE id_wood = ?", [id]);
    const list = rows as unknown[];
    if (list.length === 0)
      return NextResponse.json({ ok: false, message: "Material no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, data: list[0] });
  } catch (e) {
    console.error("[PUT /api/inventory/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

// ── PATCH — agregar stock ─────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { quantity } = body as { quantity: number };
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0)
      return NextResponse.json({ ok: false, message: "Cantidad debe ser mayor a 0" }, { status: 400 });

    const intQuantity = Math.round(Number(quantity));

    const [existing] = await pool.query("SELECT id_wood FROM Inventory WHERE id_wood = ?", [id]);
    if ((existing as unknown[]).length === 0)
      return NextResponse.json({ ok: false, message: "Material no encontrado" }, { status: 404 });

    await pool.query(
      "UPDATE Inventory SET stock_quantity = stock_quantity + ? WHERE id_wood = ?",
      [intQuantity, id]
    );

    const [rows] = await pool.query("SELECT * FROM Inventory WHERE id_wood = ?", [id]);
    return NextResponse.json({ ok: true, data: (rows as unknown[])[0] });
  } catch (e) {
    console.error("[PATCH /api/inventory/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const [existing] = await pool.query("SELECT id_wood FROM Inventory WHERE id_wood = ?", [id]);
    if ((existing as unknown[]).length === 0)
      return NextResponse.json({ ok: false, message: "Material no encontrado" }, { status: 404 });

    // Bloquear si está ligado a una orden de trabajo activa (pendiente)
    const [activeOrders] = await pool.query(
      `SELECT wo.id_work_order
       FROM quote_materials qm
       JOIN Quote q ON q.id_quote = qm.id_quote
       JOIN work_orders wo ON wo.id_quote = q.id_quote
       WHERE qm.id_wood = ?
         AND wo.status = 'pendiente'
       LIMIT 1`,
      [id]
    );

    if ((activeOrders as unknown[]).length > 0)
      return NextResponse.json({
        ok: false,
        message: "No se puede eliminar este material porque está ligado a una orden de trabajo activa.",
      }, { status: 409 });

    await pool.query("DELETE FROM Inventory WHERE id_wood = ?", [id]);
    return NextResponse.json({ ok: true, data: { deleted: true, id_wood: Number(id) } });
  } catch (e) {
    console.error("[DELETE /api/inventory/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}