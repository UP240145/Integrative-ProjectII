/**
 * src/app/api/auth/login/route.ts
 *
 * POST /api/auth/login
 * Body: { email: string; password: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { ok, err } from "@/lib/apiResponse";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return err("Body inválido");

  const { email, password } = body as { email: string; password: string };

  if (!email?.trim() || !password?.trim()) {
    return err("Correo y contraseña son obligatorios");
  }

  const [rows] = await pool.query(
    "SELECT id_admin, email, password FROM Admin WHERE email = ?",
    [email.trim().toLowerCase()]
  );

  const admins = rows as { id_admin: number; email: string; password: string }[];

  if (admins.length === 0) {
    return err("Correo o contraseña incorrectos", 401);
  }

  const admin = admins[0];
  const passwordMatch = await bcrypt.compare(password, admin.password);

  if (!passwordMatch) {
    return err("Correo o contraseña incorrectos", 401);
  }

  await createSession({ id_admin: admin.id_admin, email: admin.email });

  return ok({ email: admin.email });
}
