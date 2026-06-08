/**
 * src/app/api/work-orders/route.ts
 *
 * GET  /api/work-orders?status=pendiente  → listar órdenes de trabajo
 * POST /api/work-orders                   → crear orden (solo si cotización está aceptada)
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/apiResponse";

// ── GET /api/work-orders ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");

  let sql = `
    SELECT
      wo.id_work_order, wo.status, wo.created_at, wo.updated_at,
      q.id_quote, q.furniture_type, q.width, q.height, q.depth,
      q.final_price, q.notes,
      c.id_client, c.full_name, c.phone
    FROM work_orders wo
    JOIN Quote  q ON q.id_quote  = wo.id_quote
    JOIN Client c ON c.id_client = q.id_client
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (status) { sql += " AND wo.status = ?"; params.push(status); }
  sql += " ORDER BY wo.created_at DESC";

  const [rows] = await pool.query(sql, params);
  return ok(rows);
}

// ── POST /api/work-orders ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return err("Body inválido");

  const { id_quote } = body as { id_quote: number };

  if (!id_quote) return err("id_quote es obligatorio");

  // La cotización debe existir y estar aceptada
  const [quotes] = await pool.query(
    "SELECT id_quote, status FROM Quote WHERE id_quote = ?",
    [id_quote]
  );
  const quoteList = quotes as { id_quote: number; status: string }[];

  if (quoteList.length === 0) return err("Cotización no encontrada", 404);

  if (quoteList[0].status !== "aceptada") {
    return err("Solo se pueden crear órdenes para cotizaciones aceptadas");
  }

  // No duplicar
  const [existing] = await pool.query(
    "SELECT id_work_order FROM work_orders WHERE id_quote = ?",
    [id_quote]
  );
  const existingList = existing as { id_work_order: number }[];

  if (existingList.length > 0) {
    return NextResponse.json(
      { ok: false, message: "Esta cotización ya tiene una orden de trabajo", data: existingList[0] },
      { status: 409 }
    );
  }

  const [result] = await pool.query(
    "INSERT INTO work_orders (id_quote, status) VALUES (?, 'pendiente')",
    [id_quote]
  );
  const insertId = (result as { insertId: number }).insertId;

  const [rows] = await pool.query(
    `SELECT wo.*, q.furniture_type, q.final_price, c.full_name
     FROM work_orders wo
     JOIN Quote  q ON q.id_quote  = wo.id_quote
     JOIN Client c ON c.id_client = q.id_client
     WHERE wo.id_work_order = ?`,
    [insertId]
  );

  return ok((rows as unknown[])[0], 201);
}