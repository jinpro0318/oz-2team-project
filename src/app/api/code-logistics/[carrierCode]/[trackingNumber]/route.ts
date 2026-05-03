import { NextRequest, NextResponse } from "next/server";
import { deliveryService } from "@/lib/services/delivery";
import { getDocument, getDocuments, setDocument, where } from "@/lib/firestore";

/**
 * 실무형 배송 조회 API 라우트 (Native Date 기반 초안정 버전)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ carrierCode: string; trackingNumber: string }> }
) {
  const resolvedParams = await params;
  const { carrierCode, trackingNumber } = resolvedParams;

  try {
    if (!carrierCode || carrierCode === "undefined" || !trackingNumber || trackingNumber === "undefined") {
      return NextResponse.json({ error: "유효하지 않은 요청 파라미터입니다." }, { status: 400 });
    }

    const cacheId = `${carrierCode}_${trackingNumber}`;
    const isMock = carrierCode === "MOCK";
    const nowTs = Date.now();

    // 1. 캐시 체크 (메이저 택배사인 경우)
    if (!isMock) {
      try {
        const cacheDoc: any = await getDocument("delivery_cache", cacheId);
        if (cacheDoc && cacheDoc.updatedAt) {
          const lastUpdateTs = new Date(cacheDoc.updatedAt).getTime();
          const diffMs = nowTs - lastUpdateTs;
          
          // 60분(3600000ms) 이내라면 캐시 반환
          if (diffMs < 3600000) {
            console.log(`[Delivery API] Cache Hit! for ${cacheId}`);
            return NextResponse.json(cacheDoc.result);
          }
        }
      } catch (cacheErr) {
        console.warn("[Delivery API] Cache Lookup Warning:", cacheErr);
      }
    }

    // 2. 주문 생성 시간 파악 (목업용 시나리오 결정용)
    let createdAt: string | undefined = undefined;
    try {
      const orders = await getDocuments("orders", [where("trackingNumber", "==", trackingNumber)]);
      if (orders && orders.length > 0) {
        createdAt = (orders[0] as any).createdAt;
      }
    } catch (dbErr: any) {
      console.warn("[Delivery API] Order DB Lookup Warning:", dbErr.message);
    }

    // 3. 실시간 배송 조회 수행
    console.log(`[Delivery API] Calling real-time for ${carrierCode}/${trackingNumber}`);
    const result = await deliveryService.track(carrierCode, trackingNumber, createdAt);
    
    if (!result) {
      throw new Error("배송사로부터 응답을 받지 못했습니다.");
    }

    // 4. 성공 결과 캐싱 (메이저 택배사인 경우)
    if (!isMock) {
      try {
        await setDocument("delivery_cache", cacheId, {
          result,
          updatedAt: new Date().toISOString(),
        });
      } catch (saveErr: any) {
        console.warn("[Delivery API] Cache Save Warning:", saveErr.message);
      }
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[Delivery API FATAL] ${carrierCode}/${trackingNumber}:`, error);
    
    let status = 500;
    if (error.code === "NOT_FOUND") status = 404;
    else if (error.code === "MISSING_CONFIG" || error.code === "UNAUTHORIZED") status = 401;

    return NextResponse.json(
      { 
        error: error.message || "배송 정보를 조회할 수 없습니다.",
        code: error.code || "UNKNOWN_ERROR" 
      },
      { status } 
    );
  }
}
