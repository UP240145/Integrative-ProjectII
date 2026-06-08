/**
 * src/app/api/clients/all/route.ts
 *
 * GET /api/clients/all  → devuelve todos los clientes ordenados por nombre
 */
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT id_client, full_name, email, phone, address, created_at
       FROM Client ORDER BY full_name ASC`
    );
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error("[GET /api/clients/all]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}