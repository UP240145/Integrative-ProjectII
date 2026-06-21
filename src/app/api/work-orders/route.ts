/**
 * src/app/api/work-orders/route.ts
 *
 * GET  /api/work-orders?search=nombre&status=pendiente
 *      → lista de órdenes con nombre del cliente (vía FK de Quote)
 * POST /api/work-orders
 *      → crea una orden de trabajo (usado automáticamente al aceptar una cotización)
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// ── GET /api/work-orders ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
    const status = req.nextUrl.searchParams.get("status");

    let sql = `
      SELECT
        wo.id_work_order, wo.status, wo.updated_at,
        q.id_quote, q.furniture_type, q.final_price, q.width, q.height, q.depth,
        c.id_client, c.full_name, c.phone, c.address
      FROM work_orders wo
      JOIN Quote  q ON q.id_quote  = wo.id_quote
      JOIN Client c ON c.id_client = q.id_client
      WHERE 1=1
    `;
    const params: string[] = [];

    if (search.length >= 2) {
      sql += " AND c.full_name LIKE ?";
      params.push(`%${search}%`);
    }
    if (status) {
      sql += " AND wo.status = ?";
      params.push(status);
    }

    sql += " ORDER BY wo.updated_at DESC";

    const [rows] = await pool.query(sql, params);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error("[GET /api/work-orders]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

// ── POST /api/work-orders ─────────────────────────────────────────────────────
// Crea la orden cuando una cotización es aceptada. status inicia en "pendiente".
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { id_quote } = body as { id_quote: number };
    if (!id_quote) return NextResponse.json({ ok: false, message: "id_quote es obligatorio" }, { status: 400 });

    // La cotización debe existir y estar aceptada
    const [quotes] = await pool.query("SELECT id_quote, status FROM Quote WHERE id_quote = ?", [id_quote]);
    const quoteList = quotes as { id_quote: number; status: string }[];

    if (quoteList.length === 0)
      return NextResponse.json({ ok: false, message: "Cotización no encontrada" }, { status: 404 });

    if (quoteList[0].status !== "aceptada")
      return NextResponse.json({ ok: false, message: "Solo se pueden crear órdenes para cotizaciones aceptadas" }, { status: 400 });

    // Evitar duplicados
    const [existing] = await pool.query("SELECT id_work_order FROM work_orders WHERE id_quote = ?", [id_quote]);
    const existingList = existing as { id_work_order: number }[];

    if (existingList.length > 0) {
      return NextResponse.json({ ok: true, data: { id_work_order: existingList[0].id_work_order, alreadyExists: true } });
    }

    const [result] = await pool.query(
      "INSERT INTO work_orders (id_quote, status) VALUES (?, 'pendiente')",
      [id_quote]
    );
    const insertId = (result as { insertId: number }).insertId;

    const [rows] = await pool.query(
      `SELECT wo.id_work_order, wo.status, wo.updated_at, q.furniture_type, q.final_price, c.full_name
       FROM work_orders wo
       JOIN Quote  q ON q.id_quote  = wo.id_quote
       JOIN Client c ON c.id_client = q.id_client
       WHERE wo.id_work_order = ?`,
      [insertId]
    );

    return NextResponse.json({ ok: true, data: (rows as unknown[])[0] }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/work-orders]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}