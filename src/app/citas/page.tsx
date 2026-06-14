/**
 * src/app/citas/page.tsx
 */
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import CitasClient from "./CitasClient";

export default async function CitasPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <CitasClient />;
}