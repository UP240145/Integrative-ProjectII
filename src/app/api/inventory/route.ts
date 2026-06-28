/**
 * src/app/api/inventory/route.ts
 *
 * GET  /api/inventory              → lista todo el inventario
 * POST /api/inventory              → agrega nuevo material
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT id_wood, name, stock_quantity, price, min_stock_alert
       FROM Inventory ORDER BY name ASC`
    );
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error("[GET /api/inventory]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { name, stock_quantity, price, min_stock_alert } =
      body as Record<string, string | number>;

    if (!name || String(name).trim() === "")
      return NextResponse.json({ ok: false, message: "El nombre es obligatorio" }, { status: 400 });

    const [result] = await pool.query(
      `INSERT INTO Inventory (name, stock_quantity, price, min_stock_alert)
       VALUES (?, ?, ?, ?)`,
      [
        String(name).trim(),
        parseFloat(String(stock_quantity ?? 0)),
        parseFloat(String(price ?? 0)),
        parseFloat(String(min_stock_alert ?? 0)),
      ]
    );
    const insertId = (result as { insertId: number }).insertId;
    const [rows] = await pool.query(
      "SELECT * FROM Inventory WHERE id_wood = ?", [insertId]
    );
    return NextResponse.json({ ok: true, data: (rows as unknown[])[0] }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/inventory]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}