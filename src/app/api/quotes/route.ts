/**
 * src/app/api/quotes/route.ts
 *
 * GET  /api/quotes?status=pendiente&client=5
 * POST /api/quotes  → crea cotización, registra en quote_materials y descuenta inventario
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// ── Cálculo de material ───────────────────────────────────────────────────────
// Placa = 1m² × 4cm grosor
// Área total del mueble (6 caras, en m²):
//   2 × (W×H + W×D + H×D) / 10000  (cm² → m²)
function calculateMaterialM2(
  widthCm: number, heightCm: number, depthCm: number
): number {
  const areaCm2 = 2 * (widthCm * heightCm + widthCm * depthCm + heightCm * depthCm);
  return parseFloat((areaCm2 / 10000).toFixed(4));
}

// Nombre de material en la cotización → id_wood en Inventory
const MATERIAL_TO_WOOD_NAME: Record<string, string> = {
  mdf:      "MDF",
  melamina: "Melamina",
  pino:     "Pino macizo",
  roble:    "Roble",
  cedro:    "Cedro",
};

// ── GET /api/quotes ───────────────────────────────────────────────────────────
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

// ── POST /api/quotes ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const {
      id_client, furniture_type, material, width, height, depth,
      calculated_cost, final_price, status = "pendiente", notes,
    } = body as Record<string, unknown>;

    if (!id_client)
      return NextResponse.json({ ok: false, message: "id_client es obligatorio" }, { status: 400 });
    if (!furniture_type)
      return NextResponse.json({ ok: false, message: "furniture_type es obligatorio" }, { status: 400 });
    if (!width || !height || !depth)
      return NextResponse.json({ ok: false, message: "Las medidas son obligatorias" }, { status: 400 });
    if (final_price === undefined || final_price === null)
      return NextResponse.json({ ok: false, message: "final_price es obligatorio" }, { status: 400 });

    // Verificar cliente
    const [clients] = await conn.query("SELECT id_client FROM Client WHERE id_client = ?", [id_client]);
    if ((clients as unknown[]).length === 0)
      return NextResponse.json({ ok: false, message: "El cliente no existe" }, { status: 404 });

    const w = parseFloat(String(width));
    const h = parseFloat(String(height));
    const d = parseFloat(String(depth));
    const materialM2 = calculateMaterialM2(w, h, d);

    // Buscar el id_wood que corresponde al material de la cotización
    let idWood: number | null = null;
    const woodName = material ? MATERIAL_TO_WOOD_NAME[String(material)] : null;
    if (woodName) {
      const [woodRows] = await conn.query(
        "SELECT id_wood FROM Inventory WHERE name = ? LIMIT 1",
        [woodName]
      );
      const woodList = woodRows as { id_wood: number }[];
      if (woodList.length > 0) idWood = woodList[0].id_wood;
    }

    await conn.beginTransaction();

    // 1. Insertar cotización
    const [result] = await conn.query(
      `INSERT INTO Quote
         (id_client, furniture_type, material, width, height, depth, calculated_cost, final_price, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_client,
        furniture_type,
        material ?? null,
        w, h, d,
        parseFloat(String(calculated_cost ?? 0)),
        parseFloat(String(final_price)),
        status,
        notes ?? null,
      ]
    );
    const insertId = (result as { insertId: number }).insertId;

    // 2. Registrar en quote_materials y descontar inventario (si hay material identificado)
    if (idWood !== null) {
      await conn.query(
        `INSERT INTO quote_materials (id_quote, id_wood, calculated_quantity)
         VALUES (?, ?, ?)`,
        [insertId, idWood, materialM2]
      );

      // Descontar del inventario (puede quedar negativo — permitido)
      await conn.query(
        "UPDATE Inventory SET stock_quantity = stock_quantity - ? WHERE id_wood = ?",
        [materialM2, idWood]
      );
    }

    await conn.commit();

    const [rows] = await conn.query(
      `SELECT q.*, c.full_name, c.email, c.phone
       FROM Quote q JOIN Client c ON c.id_client = q.id_client
       WHERE q.id_quote = ?`,
      [insertId]
    );

    const quote = (rows as unknown[])[0] as Record<string, unknown>;

    return NextResponse.json({
      ok: true,
      data: {
        ...quote,
        material_used_m2: materialM2,
        id_wood: idWood,
        low_stock: idWood !== null
          ? await checkLowStock(idWood, conn)
          : false,
      },
    }, { status: 201 });
  } catch (e) {
    await conn.rollback();
    console.error("[POST /api/quotes]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  } finally {
    conn.release();
  }
}

async function checkLowStock(
  idWood: number,
  conn: Awaited<ReturnType<typeof pool.getConnection>>
): Promise<boolean> {
  const [rows] = await conn.query(
    "SELECT stock_quantity, min_stock_alert FROM Inventory WHERE id_wood = ?",
    [idWood]
  );
  const item = (rows as { stock_quantity: number; min_stock_alert: number }[])[0];
  return item ? item.stock_quantity <= item.min_stock_alert : false;
}