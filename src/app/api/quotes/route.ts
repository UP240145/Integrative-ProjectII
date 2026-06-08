/**
 * src/app/api/quotes/route.ts
 *
 * GET  /api/quotes?status=pendiente&client=5  → listar cotizaciones
 * POST /api/quotes                            → crear cotización
 */
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/apiResponse";

// ── GET /api/quotes ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const client = req.nextUrl.searchParams.get("client");

  let sql = `
    SELECT
      q.id_quote, q.furniture_type, q.width, q.height, q.depth,
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
  return ok(rows);
}

// ── POST /api/quotes ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return err("Body inválido");

  const {
    id_client,
    furniture_type,
    width,
    height,
    depth,
    calculated_cost,
    final_price,
    status = "pendiente",
    notes,
  } = body as Record<string, unknown>;

  // Validaciones
  if (!id_client)                    return err("id_client es obligatorio");
  if (!furniture_type)               return err("furniture_type es obligatorio");
  if (!width || !height || !depth)   return err("Las medidas son obligatorias");
  if (final_price === undefined || final_price === null)
    return err("final_price es obligatorio");

  // Verificar que el cliente existe
  const [clients] = await pool.query(
    "SELECT id_client FROM Client WHERE id_client = ?",
    [id_client]
  );
  if ((clients as unknown[]).length === 0) return err("El cliente no existe", 404);

  const [result] = await pool.query(
    `INSERT INTO quote
       (id_client, furniture_type, width, height, depth, calculated_cost, final_price, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_client,
      furniture_type,
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

  return ok((rows as unknown[])[0], 201);
}
