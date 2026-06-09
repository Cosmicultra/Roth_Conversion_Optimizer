import { Suspense } from "react";
import { AdvisorLoginForm } from "@/components/advisor/advisor-login-form";

export default function AdvisorLoginPage() {
  return (
    <div className="ap-app-bg flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={<p className="text-sm text-[#94a3b8]">Loading…</p>}>
        <AdvisorLoginForm />
      </Suspense>
    </div>
  );
}
