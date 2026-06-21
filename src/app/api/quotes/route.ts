/**
 * src/app/api/quotes/route.ts
 *
 * GET  /api/quotes?status=pendiente&client=5
 * POST /api/quotes
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const client = req.nextUrl.searchParams.get("client");

    let sql = `
      SELECT
        q.id_quote, q.furniture_type, q.material, q.width, q.height, q.depth,
        q.calculated_cost, q.final_price, q.status, q.notes, q.created_at,
        c.id_client, c.full_name, c.email, c.phone,
        wo.id_work_order, wo.status AS work_order_status
      FROM Quote q
      JOIN Client c ON c.id_client = q.id_client
      LEFT JOIN work_orders wo ON wo.id_quote = q.id_quote
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status) { sql += " AND q.status = ?";    params.push(status); }
    if (client) { sql += " AND q.id_client = ?"; params.push(client); }

    sql += " ORDER BY q.created_at DESC";

    const [rows] = await pool.query(sql, params);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error("[GET /api/quotes]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const {
      id_client, furniture_type, material, width, height, depth,
      calculated_cost, final_price, status = "pendiente", notes,
    } = body as Record<string, unknown>;

    if (!id_client)                  return NextResponse.json({ ok: false, message: "id_client es obligatorio" }, { status: 400 });
    if (!furniture_type)             return NextResponse.json({ ok: false, message: "furniture_type es obligatorio" }, { status: 400 });
    if (!width || !height || !depth) return NextResponse.json({ ok: false, message: "Las medidas son obligatorias" }, { status: 400 });
    if (final_price === undefined || final_price === null)
      return NextResponse.json({ ok: false, message: "final_price es obligatorio" }, { status: 400 });

    const [clients] = await pool.query("SELECT id_client FROM Client WHERE id_client = ?", [id_client]);
    if ((clients as unknown[]).length === 0)
      return NextResponse.json({ ok: false, message: "El cliente no existe" }, { status: 404 });

    const [result] = await pool.query(
      `INSERT INTO Quote
         (id_client, furniture_type, material, width, height, depth, calculated_cost, final_price, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_client,
        furniture_type,
        material ?? null,
        parseFloat(String(width)),
        parseFloat(String(height)),
        parseFloat(String(depth)),
        parseFloat(String(calculated_cost ?? 0)),
        parseFloat(String(final_price)),
        status,
        notes ?? null,
      ]
    );

    const insertId = (result as { insertId: number }).insertId;
    const [rows] = await pool.query(
      `SELECT q.*, c.full_name, c.email, c.phone
       FROM Quote q JOIN Client c ON c.id_client = q.id_client
       WHERE q.id_quote = ?`,
      [insertId]
    );

    return NextResponse.json({ ok: true, data: (rows as unknown[])[0] }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/quotes]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}