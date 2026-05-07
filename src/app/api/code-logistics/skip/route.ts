import { NextRequest, NextResponse } from "next/server";
import { advanceLogisticsStep } from "@/lib/services/logistics";

/**
 * [v9.0 §15.3] 관리자 건너뛰기(Skip) API
 * POST /api/code-logistics/skip
 * Body: { shipmentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shipmentId } = body;

    if (!shipmentId || !shipmentId.startsWith("MOCK-")) {
      return NextResponse.json(
        { error: "유효하지 않은 송장 번호입니다." },
        { status: 400 }
      );
    }

    const updated = await advanceLogisticsStep(shipmentId);

    return NextResponse.json({
      success: true,
      shipment: updated,
      message: updated.status === 'DELIVERED'
        ? "배송이 완료되었습니다."
        : `단계 ${updated.currentStep + 1}로 이동했습니다.`,
    });
  } catch (error: any) {
    console.error("[Skip API] Error:", error);
    return NextResponse.json(
      { error: error.message || "건너뛰기 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
