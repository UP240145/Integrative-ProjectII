/**
 * src/app/dashboard/page.tsx
 *
 * Página principal tras el login. Muestra los módulos disponibles.
 * Es un Server Component — lee la sesión sin JS en el cliente.
 */
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <DashboardClient email={session.email} />;
}
