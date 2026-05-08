
import { db } from "../src/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

async function checkSpecificOrder(orderId: string) {
  console.log(`\n--- 🔍 [정밀 진단] 주문번호: ${orderId} ---`);

  // 1. Orders 컬렉션 확인
  const orderRef = doc(db, "orders", orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) {
    console.log("❌ [Orders] 문서가 존재하지 않습니다.");
    return;
  }

  const orderData = orderSnap.data();
  console.log("✅ [Orders] 문서 발견:");
  console.log(`   - 상태(status): ${orderData.status}`);
  console.log(`   - 송장(trackingNumber): ${orderData.trackingNumber}`);
  console.log(`   - 택배사(carrierCode): ${orderData.carrierCode}`);

  // 2. Shipments 컬렉션 확인
  if (orderData.trackingNumber) {
    const shipmentRef = doc(db, "shipments", orderData.trackingNumber);
    const shipmentSnap = await getDoc(shipmentRef);

    if (shipmentSnap.exists()) {
      const shipmentData = shipmentSnap.data();
      console.log("✅ [Shipments] 시뮬레이터 문서 발견:");
      console.log(`   - 현재 단계(currentStep): ${shipmentData.currentStep}`);
      console.log(`   - 상태(status): ${shipmentData.status}`);
      console.log(`   - 단계 수(path length): ${shipmentData.path?.length}`);
    } else {
      console.log("⚠️ [Shipments] 아직 시뮬레이터 문서가 생성되지 않았습니다. (자가 치유 대기 중)");
    }
  }

  console.log("------------------------------------------\n");
}

const targetId = "vhqezdDosr09CO6B3phi"; // ORD-MOWC8HLR의 실제 문서 ID (URL에서 추출)
checkSpecificOrder(targetId).catch(console.error);
