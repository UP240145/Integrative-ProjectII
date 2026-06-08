/**
 * src/app/api/admins/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

// ── GET /api/admins ───────────────────────────────────────────────────────────
export async function GET() {
  try {
    const [rows] = await pool.query(
      "SELECT id_admin, email, created_at FROM Admin ORDER BY created_at DESC"
    );
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error("[GET /api/admins]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}

// ── POST /api/admins ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "Body inválido" }, { status: 400 });

    const { email, password } = body as { email: string; password: string };

    if (!email?.trim())
      return NextResponse.json({ ok: false, message: "El correo es obligatorio" }, { status: 400 });
    if (!password?.trim())
      return NextResponse.json({ ok: false, message: "La contraseña es obligatoria" }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ ok: false, message: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });

    const [existing] = await pool.query(
      "SELECT id_admin FROM Admin WHERE email = ?",
      [email.trim().toLowerCase()]
    );
    if ((existing as unknown[]).length > 0)
      return NextResponse.json({ ok: false, message: "Este correo ya está registrado" }, { status: 409 });

    const hashed = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      "INSERT INTO Admin (email, password) VALUES (?, ?)",
      [email.trim().toLowerCase(), hashed]
    );

    const insertId = (result as { insertId: number }).insertId;
    const [rows] = await pool.query(
      "SELECT id_admin, email, created_at FROM Admin WHERE id_admin = ?",
      [insertId]
    );

    return NextResponse.json({ ok: true, data: (rows as unknown[])[0] }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admins]", e);
    return NextResponse.json({ ok: false, message: "Error interno" }, { status: 500 });
  }
}