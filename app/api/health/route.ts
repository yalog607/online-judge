import { NextResponse } from "next/server";
import { execProc } from "@/db/exec";

export async function GET() {
  try {
    await execProc("usp_System_Ping");
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: (e as Error).message }, { status: 503 });
  }
}
