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
