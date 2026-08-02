/**
 * src/app/reportes/page.tsx
 */
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ReportesClient from "./ReportesClient";

export default async function ReportesPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <ReportesClient />;
}