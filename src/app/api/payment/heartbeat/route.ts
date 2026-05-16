import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    if (!adminDb) {
      console.error("[Heartbeat Error] adminDb is not initialized");
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    // [무결성] 브라우저에서 보낸 생존 신고(하트비트)를 기록합니다.
    await adminDb.collection("orders").doc(orderId).update({
      lastActive: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Heartbeat Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
