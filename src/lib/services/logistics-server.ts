import { adminDb } from "@/lib/firebase-admin";
import { Shipment, SHIPMENTS_COL } from "./logistics";

/** [Server Only] 관리자 권한으로 배송 단계 건너뛰기 */
export async function advanceLogisticsStepServer(shipmentId: string): Promise<any> {
  if (!adminDb) throw new Error("Admin SDK not initialized");

  const docRef = adminDb.collection("shipments").doc(shipmentId);
  
  return await adminDb.runTransaction(async (t) => {
    const snap = await t.get(docRef);
    if (!snap.exists) throw new Error("Shipment not found");
    
    const data = snap.data() as any;
    const nextStep = (data.currentStep || 0) + 1;
    
    if (nextStep >= data.path.length) return data;

    const now = new Date();
    const updatedPath = [...data.path];
    updatedPath[nextStep].estimatedTime = now.toISOString();

    const isLastStep = nextStep === data.path.length - 1;
    const updatePayload: any = {
      currentStep: nextStep,
      status: isLastStep ? "delivered" : "shipping",
      path: updatedPath,
      updatedAt: now.toISOString(),
    };
    
    if (isLastStep) updatePayload.deliveredAt = now.toISOString();

    t.update(docRef, updatePayload);

    // [하이브리드 동기화] logs 서브컬렉션에도 기록
    const logRef = docRef.collection("logs").doc(`step-${nextStep}-${Date.now()}`);
    t.set(logRef, {
      logId: `step-${nextStep}`,
      status: updatePayload.status,
      location: "어드민 강제 조작",
      message: updatedPath[nextStep].message || "배송 단계가 관리자에 의해 강제 변경되었습니다.",
      timestamp: new Date(),
      isSystem: true
    });

    // 주문 상태 동기화
    if (isLastStep && data.orderId) {
      t.update(adminDb.collection("orders").doc(data.orderId), {
        status: "delivered",
        updatedAt: now.toISOString()
      });
    }

    return { ...data, ...updatePayload };
  });
}
