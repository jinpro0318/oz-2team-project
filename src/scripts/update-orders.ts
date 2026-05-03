import { db } from "../lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

async function updateExistingOrders() {
  console.log("주문 데이터 업데이트 시작...");
  const ordersRef = collection(db, "orders");
  const snapshot = await getDocs(ordersRef);
  
  let count = 0;
  for (const orderDoc of snapshot.docs) {
    await updateDoc(doc(db, "orders", orderDoc.id), {
      carrierCode: "04",
      trackingNumber: "2222"
    });
    count++;
  }
  
  console.log(`${count}개의 주문 데이터에 배송 정보를 추가했습니다.`);
}

updateExistingOrders().catch(console.error);
