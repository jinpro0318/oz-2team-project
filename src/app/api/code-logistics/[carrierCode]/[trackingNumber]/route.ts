import { NextRequest, NextResponse } from "next/server";
import { deliveryService } from "@/lib/services/delivery";
import { adminDb } from "@/lib/firebase-admin";
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
    console.log(`[Delivery API] Request: carrier=${carrierCode}, tracking=${trackingNumber}`);

    if (!carrierCode || carrierCode === "undefined" || !trackingNumber || trackingNumber === "undefined" || trackingNumber.length < 5) {
      console.warn(`[Delivery API] Invalid parameters ignored: ${carrierCode}/${trackingNumber}`);
      return NextResponse.json({ error: "유효하지 않은 요청 파라미터입니다." }, { status: 400 });
    }

    const cacheId = `${carrierCode}_${trackingNumber}`;
    const isMock = carrierCode === "MOCK";
    const nowTs = Date.now();

    // 1. 캐시 체크 (메이저 택배사인 경우)
    if (!isMock && adminDb) {
      try {
        const cacheSnap = await adminDb.collection("delivery_cache").doc(cacheId).get();
        if (cacheSnap.exists) {
          const cacheDoc = cacheSnap.data() as any;
          if (cacheDoc && cacheDoc.updatedAt) {
            const lastUpdateTs = new Date(cacheDoc.updatedAt).getTime();
            const diffMs = nowTs - lastUpdateTs;
            
            // 60분(3600000ms) 이내라면 캐시 반환
            if (diffMs < 3600000) {
              console.log(`[Delivery API Admin] Cache Hit! for ${cacheId}`);
              return NextResponse.json(cacheDoc.result);
            }
          }
        }
      } catch (cacheErr) {
        console.warn("[Delivery API Admin] Cache Lookup Warning:", cacheErr);
      }
    }

    // 2. 주문 생성 시간 파악 (목업용 시나리오 결정용)
    let createdAt: string | undefined = undefined;
    if (adminDb) {
      try {
        const orderSnap = await adminDb.collection("orders")
          .where("trackingNumber", "==", trackingNumber)
          .limit(1)
          .get();
        
        if (!orderSnap.empty) {
          createdAt = (orderSnap.docs[0].data() as any).createdAt;
        }
      } catch (dbErr: any) {
        console.warn("[Delivery API Admin] Order DB Lookup Warning:", dbErr.message);
      }
    }

    // 3. 실시간 배송 조회 수행 (MOCK인 경우 Admin SDK로 미리 조회하여 전달)
    let preFetchedShipment = null;
    if (isMock && adminDb) {
      try {
        const shipSnap = await adminDb.collection("shipments").doc(trackingNumber).get();
        if (shipSnap.exists) {
          preFetchedShipment = { shipmentId: shipSnap.id, ...shipSnap.data() };
        }
      } catch (e) {
        console.warn("[Delivery API Admin] Shipment Lookup Warning:", e);
      }
    }

    console.log(`[Delivery API] Calling real-time for ${carrierCode}/${trackingNumber}`);
    const result = await (deliveryService as any).track(carrierCode, trackingNumber, createdAt, preFetchedShipment);
    
    if (!result) {
      throw new Error("배송사로부터 응답을 받지 못했습니다.");
    }

    // 4. 성공 결과 캐싱 (메이저 택배사인 경우)
    if (!isMock && adminDb) {
      try {
        await adminDb.collection("delivery_cache").doc(cacheId).set({
          result,
          updatedAt: new Date().toISOString(),
        });
      } catch (saveErr: any) {
        console.warn("[Delivery API Admin] Cache Save Warning:", saveErr.message);
      }
    }
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`[Delivery API FATAL] ${carrierCode}/${trackingNumber}:`, error);
    
    let status = 500;
    let message = error.message || "배송 정보를 조회할 수 없습니다.";

    if (error.code === "NOT_FOUND" || error.message?.includes("not found")) {
      status = 404;
    } else if (error.code === "unavailable" || error.message?.includes("offline")) {
      status = 503;
      message = "서비스를 일시적으로 사용할 수 없습니다. (DB 연결 오류)";
    } else if (error.code === "MISSING_CONFIG" || error.code === "UNAUTHORIZED") {
      status = 401;
    }

    return NextResponse.json(
      { 
        error: message,
        code: error.code || "UNKNOWN_ERROR" 
      },
      { status } 
    );
  }
}
