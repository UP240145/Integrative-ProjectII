/**
 * src/app/api/quotes/[id]/route.ts
 *
 * GET /api/quotes/:id  → obtener cotización con cliente y work order
 * PUT /api/quotes/:id  → actualizar cotización completa
 */
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/apiResponse";

interface Params {
  params: { id: string };
}

// ── GET /api/quotes/:id ───────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const [rows] = await pool.query(
    `SELECT
       q.id_quote, q.furniture_type, q.width, q.height, q.depth,
       q.calculated_cost, q.final_price, q.status, q.notes, q.created_at,
       c.id_client, c.full_name, c.email, c.phone, c.address,
       wo.id_work_order, wo.status AS work_order_status
     FROM Quote q
     JOIN Client c ON c.id_client = q.id_client
     LEFT JOIN work_orders wo ON wo.id_quote = q.id_quote
     WHERE q.id_quote = ?`,
    [params.id]
  );

  const list = rows as unknown[];
  if (list.length === 0) return err("Cotización no encontrada", 404);

  return ok(list[0]);
}

// ── PUT /api/quotes/:id ───────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  const body = await req.json().catch(() => null);
  if (!body) return err("Body inválido");

  const { furniture_type, width, height, depth, calculated_cost, final_price, status, notes } =
    body as Record<string, unknown>;

  const [existing] = await pool.query(
    "SELECT id_quote FROM Quote WHERE id_quote = ?",
    [params.id]
  );
  if ((existing as unknown[]).length === 0) return err("Cotización no encontrada", 404);

  await pool.query(
    `UPDATE Quote SET
       furniture_type  = COALESCE(?, furniture_type),
       width           = COALESCE(?, width),
       height          = COALESCE(?, height),
       depth           = COALESCE(?, depth),
       calculated_cost = COALESCE(?, calculated_cost),
       final_price     = COALESCE(?, final_price),
       status          = COALESCE(?, status),
       notes           = COALESCE(?, notes)
     WHERE id_quote = ?`,
    [
      furniture_type ?? null,
      width     !== undefined ? parseFloat(String(width))     : null,
      height    !== undefined ? parseFloat(String(height))    : null,
      depth     !== undefined ? parseFloat(String(depth))     : null,
      calculated_cost !== undefined ? parseFloat(String(calculated_cost)) : null,
      final_price     !== undefined ? parseFloat(String(final_price))     : null,
      status ?? null,
      notes  !== undefined ? notes : null,
      params.id,
    ]
  );

  const [rows] = await pool.query(
    `SELECT q.*, c.full_name, c.email, c.phone
     FROM Quote q JOIN Client c ON c.id_client = q.id_client
     WHERE q.id_quote = ?`,
    [params.id]
  );

  return ok((rows as unknown[])[0]);
}
