/**
 * src/app/clientes/page.tsx
 */
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ClientesClient from "./ClientesClient";

export default async function ClientesPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <ClientesClient />;
}
