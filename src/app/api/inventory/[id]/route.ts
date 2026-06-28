/**
 * src/app/api/inventory/[id]/route.ts
 *
 * GET   /api/inventory/:id           → detalle de un material
 * PUT   /api/inventory/:id           → actualizar datos del material
 * PATCH /api/inventory/:id           → agregar stock (suma a lo existente)
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const [rows] = await pool.query(
      "SELECT * FROM Inventory WHERE id_wood = ?", [id]
    );
    const list = rows as unknown[];
    if (list.length === 0)
      return NextResponse.json({ ok: false, message: "Material no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, data: list[0] });
  } catch (e) {
    console.error("[GET /api/inventory/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { name, price, min_stock_alert } = body as Record<string, string | number>;

    if (!name || String(name).trim() === "")
      return NextResponse.json({ ok: false, message: "El nombre es obligatorio" }, { status: 400 });

    await pool.query(
      `UPDATE Inventory SET name = ?, price = ?, min_stock_alert = ?
       WHERE id_wood = ?`,
      [
        String(name).trim(),
        parseFloat(String(price ?? 0)),
        parseFloat(String(min_stock_alert ?? 0)),
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

// PATCH: sumar stock al inventario (al recibir un nuevo envío de material)
// Body: { quantity: number }
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { quantity } = body as { quantity: number };
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0)
      return NextResponse.json({ ok: false, message: "Cantidad debe ser mayor a 0" }, { status: 400 });

    const [existing] = await pool.query(
      "SELECT id_wood, stock_quantity FROM Inventory WHERE id_wood = ?", [id]
    );
    if ((existing as unknown[]).length === 0)
      return NextResponse.json({ ok: false, message: "Material no encontrado" }, { status: 404 });

    await pool.query(
      "UPDATE Inventory SET stock_quantity = stock_quantity + ? WHERE id_wood = ?",
      [Number(quantity), id]
    );

    const [rows] = await pool.query("SELECT * FROM Inventory WHERE id_wood = ?", [id]);
    return NextResponse.json({ ok: true, data: (rows as unknown[])[0] });
  } catch (e) {
    console.error("[PATCH /api/inventory/:id]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}