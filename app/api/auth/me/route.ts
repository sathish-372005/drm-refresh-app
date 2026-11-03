import { getUser } from "@/app/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({
    name: user.name ?? null,
    email: user.email ?? null,
    tenantId: user.tid,
    userId: user.oid,
  });
}
