import { db } from "../lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

async function generateUniqueTracking() {
  try {
    const ordersCol = collection(db, "orders");
    const snapshot = await getDocs(ordersCol);
    
    console.log(`Starting to update ${snapshot.size} orders with unique tracking numbers...`);

    const promises = snapshot.docs.map(async (orderDoc, index) => {
      const order = orderDoc.data();
      const orderId = orderDoc.id;
      
      // 상태에 맞는 끝자리 결정
      let lastDigit = 4; // 기본 배송중
      if (order.status === "payment_complete") lastDigit = 1;
      else if (order.status === "preparing") lastDigit = 2;
      else if (order.status === "shipping") lastDigit = index % 2 === 0 ? 3 : 4;
      else if (order.status === "delivered") lastDigit = 5;
      else if (order.status === "return_requested") lastDigit = 6;
      else if (order.status === "purchase_confirmed") lastDigit = 5;

      // 고유한 10자리 송장번호 생성 (인덱스 활용)
      const uniquePart = String(index + 1000).padStart(6, '0');
      const trackingNumber = `940${uniquePart}${lastDigit}`;
      
      const orderRef = doc(db, "orders", orderId);
      return updateDoc(orderRef, {
        trackingNumber: trackingNumber,
        carrierCode: "04"
      });
    });

    await Promise.all(promises);
    console.log("Successfully updated all orders with unique tracking numbers!");
    process.exit(0);
  } catch (err) {
    console.error("Error updating orders:", err);
    process.exit(1);
  }
}

generateUniqueTracking();
