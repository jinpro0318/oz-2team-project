import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    if (!adminDb) {
      console.error("[Cleanup Error] adminDb is not initialized");
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ success: true, message: "이미 파기된 유령 주문입니다." });
    }

    const orderData = orderDoc.data();
    
    // [가드 로직] 결제가 성공하여 상태가 바뀐 '진짜 주문'은 절대로 지우면 안 됩니다.
    if (orderData?.status !== "payment_pending") {
      return NextResponse.json({ success: true, message: "정상 진행 중인 주문이므로 보호합니다." });
    }

    const batch = adminDb.batch();
    
    // [시스템 활동 로그] 파기 이력을 관리자용으로 남깁니다.
    const logRef = adminDb.collection("system_logs").doc();
    batch.set(logRef, {
      type: "INTEGRITY_CLEANUP",
      orderId,
      message: `결제 창 이탈(또는 취소)이 감지되어 유령 주문을 즉시 파기했습니다.`,
      createdAt: new Date()
    });

    // 최종 파기 처리
    batch.delete(orderRef);
    await batch.commit();

    return NextResponse.json({ success: true, message: "결제 무결성 엔진: 유령 주문 즉시 파기 완료" });
  } catch (error: any) {
    console.error("[Cleanup Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
