import { redirect } from "next/navigation";
import { AdvisorPortal } from "@/components/advisor/advisor-portal";
import { getAdvisorUser } from "@/lib/supabase/auth-server";

export default async function AdvisorPage() {
  const user = await getAdvisorUser();
  if (!user) {
    redirect("/advisor/login");
  }

  return <AdvisorPortal advisorEmail={user.email ?? "Advisor"} />;
}
