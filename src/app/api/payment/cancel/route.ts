import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { CodeFulfillmentEngine } from "@/lib/services/CodeFulfillmentEngine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, reason, userId, cancelAmount } = body;

    if (!orderId || !userId) {
      return NextResponse.json({ error: "필수 데이터(orderId, userId)가 누락되었습니다." }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "서버 DB가 초기화되지 않았습니다." }, { status: 500 });
    }

    // 1. 주문 데이터 조회
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "존재하지 않는 주문입니다." }, { status: 404 });
    }

    const orderData = orderSnap.data();

    // 2. 권한 검증 (IDOR 방지)
    // 실제 운영 환경에서는 세션 쿠키 토큰을 검증해야 하지만, 현재 구조에서는 전달받은 ID로 최소한의 소유자 확인을 거칩니다.
    if (orderData?.userId !== userId && userId !== "admin") {
      console.warn(`[Security Alert] IDOR 시도 감지: 요청자(${userId})가 주문(${orderId}) 취소 시도`);
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const paymentKey = orderData?.paymentKey;
    if (!paymentKey) {
      return NextResponse.json({ error: "결제 키(paymentKey)를 찾을 수 없어 환불할 수 없습니다." }, { status: 400 });
    }

    const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "토스 결제 API 키가 서버에 설정되지 않았습니다." }, { status: 500 });
    }

    // 3. 토스페이먼츠 환불 API 호출
    const tossPayload: any = { cancelReason: reason || "고객 요청에 의한 결제 취소" };
    if (cancelAmount) {
      tossPayload.cancelAmount = cancelAmount; // 향후 부분 취소 대비용 파라미터
    }

    const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tossPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Toss Cancel Error]", data);
      return NextResponse.json({ error: data.message || "PG사 환불 처리에 실패했습니다." }, { status: response.status });
    }

    // 4. [엔진 연동] 성공 시 DB 상태 변경 및 재고 복구를 위해 물류 엔진 호출
    try {
      // [v15.1] 환불 금액 및 토스 응답 원본을 엔진에 넘겨 영구 보존(Schema)
      const exactRefundAmount = cancelAmount || orderData?.totalAmount;
      
      await CodeFulfillmentEngine.executeAction(orderId, "APPROVE_CANCEL", { 
        reason,
        refundAmount: exactRefundAmount,
        cancelMetadata: data // 토스페이먼츠 환불 응답 전문 (사후 추적용)
      });
    } catch (engineError) {
      console.error("[Engine Error during Cancel]", engineError);
      // 환불은 성공했지만 DB 동기화가 실패한 '심각한 예외 상황(Partial Failure)'
      return NextResponse.json({ 
        message: "환불은 성공했으나, DB 동기화에 실패했습니다. 관리자 확인이 필요합니다.", 
        data 
      }, { status: 207 });
    }

    return NextResponse.json({ message: "결제 취소 및 환불 처리가 완료되었습니다.", data });
  } catch (error) {
    console.error("[Payment Cancel Route Error]", error);
    return NextResponse.json({ error: "서버 내부 오류가 발생했습니다." }, { status: 500 });
  }
}
