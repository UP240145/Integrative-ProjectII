/**
 * src/app/api/clients/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
    if (search.length < 2)
      return NextResponse.json({ ok: true, data: [] });

    const [rows] = await pool.query(
      `SELECT id_client, full_name, email, phone, address, created_at
       FROM Client WHERE full_name LIKE ?
       ORDER BY full_name ASC LIMIT 20`,
      [`%${search}%`]
    );
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error("[GET /api/clients]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { full_name, email, phone, address } = body as Record<string, string>;
    if (!full_name?.trim())
      return NextResponse.json({ ok: false, message: "El nombre completo es obligatorio" }, { status: 400 });

    const [result] = await pool.query(
      `INSERT INTO Client (full_name, email, phone, address) VALUES (?, ?, ?, ?)`,
      [full_name.trim(), email || null, phone || null, address || null]
    );
    const insertId = (result as { insertId: number }).insertId;
    const [rows] = await pool.query(
      `SELECT id_client, full_name, email, phone, address, created_at FROM Client WHERE id_client = ?`,
      [insertId]
    );
    return NextResponse.json({ ok: true, data: (rows as unknown[])[0] }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/clients]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}