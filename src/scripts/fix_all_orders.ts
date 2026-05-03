import { db } from "../lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

async function fixAllOrders() {
  console.log("🚀 모든 주문 데이터 업데이트를 시작합니다...");
  
  try {
    const ordersRef = collection(db, "orders");
    const snapshot = await getDocs(ordersRef);
    
    if (snapshot.empty) {
      console.log("❌ 업데이트할 주문이 없습니다.");
      return;
    }

    let count = 0;
    const promises = snapshot.docs.map(async (orderDoc) => {
      await updateDoc(doc(db, "orders", orderDoc.id), {
        carrierCode: "04",      // CJ대한통운 (MOCK용)
        trackingNumber: "2222"   // 배송중 시나리오 (MOCK용)
      });
      count++;
    });

    await Promise.all(promises);
    console.log(`✅ 총 ${count}개의 주문 데이터에 배송 정보를 성공적으로 추가했습니다.`);
    console.log("이제 주문 상세 페이지를 새로고침하여 확인해 보세요!");
    
  } catch (error) {
    console.error("❌ 업데이트 중 오류 발생:", error);
  }
}

fixAllOrders();
