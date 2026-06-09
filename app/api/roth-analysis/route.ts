import { NextResponse } from "next/server";
import { runRothIllustrationTaxCheck } from "@/lib/roth-tax-illustration-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request) {
  try {
    const result = runRothIllustrationTaxCheck();
    return NextResponse.json({
      ok: true,
      proceed: result.proceed,
      updatesAppliedToMath: result.updatesAppliedToMath,
      messages: result.messages,
      taxIllustrationReference: result.taxIllustrationReference,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Roth analysis pre-check failed.";
    console.error("ROTH ANALYSIS PRECHECK:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
