/**
 * src/app/configuracion/page.tsx
 */
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ConfiguracionClient from "./ConfiguracionClient";

export default async function ConfiguracionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ConfiguracionClient currentAdminId={session.id_admin} />;
}
