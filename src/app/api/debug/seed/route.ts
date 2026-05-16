import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const batch = adminDb.batch();

    // 1. 셀럽 데이터 (Celebrities)
    const celebs = [
      {
        id: "celeb_minji",
        name: "민지 (Minji)",
        handle: "@minji_official",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=minji",
        bio: "NewJeans의 맏언니, 클래식한 무드의 아이콘",
        commissionRate: 10,
        isActive: true,
        gradient: "from-blue-400 to-indigo-500",
        order: 1,
      },
      {
        id: "celeb_hanni",
        name: "하니 (Hanni)",
        handle: "@hanni_gucci",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=hanni",
        bio: "러블리하고 힙한 스타일의 정석",
        commissionRate: 12,
        isActive: true,
        gradient: "from-pink-400 to-rose-500",
        order: 2,
      },
      {
        id: "celeb_danielle",
        name: "다니엘 (Danielle)",
        handle: "@danielle_marsh",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=danielle",
        bio: "에너제틱하고 유니크한 감성",
        commissionRate: 10,
        isActive: true,
        gradient: "from-yellow-400 to-orange-500",
        order: 3,
      },
    ];

    celebs.forEach((c) => {
      const ref = adminDb.collection("celebrities").doc(c.id);
      batch.set(ref, c);
    });

    // 2. 상품 데이터 (Products)
    const products = [
      {
        id: "prod_001",
        celebrityId: "celeb_minji",
        brand: "CODE_BLUE",
        name: "클래식 오버핏 셔츠 (Sky Blue)",
        price: 89000,
        originalPrice: 129000,
        discount: 31,
        colors: [{ name: "Sky Blue" }, { name: "White" }],
        sizes: ["S", "M", "L"],
        description: "민지가 즐겨 입는 정석적인 오버핏 셔츠입니다. 탄탄한 코튼 소재로 제작되었습니다.",
        specs: "Cotton 100% / 드라이클리닝 권장",
        imageUrls: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800"],
        salesCount: 150,
        stock: 50,
        isVisible: true,
        category: "Top",
      },
      {
        id: "prod_002",
        celebrityId: "celeb_minji",
        brand: "CODE_BLUE",
        name: "빈티지 스트레이트 데님",
        price: 119000,
        originalPrice: 159000,
        discount: 25,
        colors: [{ name: "Vintage Blue" }],
        sizes: ["26", "28", "30"],
        description: "자연스러운 워싱이 돋보이는 스트레이트 핏 데님 팬츠입니다.",
        specs: "Denim 100%",
        imageUrls: ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=800"],
        salesCount: 89,
        stock: 30,
        isVisible: true,
        category: "Bottom",
      },
      {
        id: "prod_003",
        celebrityId: "celeb_hanni",
        brand: "HIP_PINK",
        name: "크롭 그래픽 후드티",
        price: 75000,
        originalPrice: 95000,
        discount: 21,
        colors: [{ name: "Pink" }, { name: "Gray" }],
        sizes: ["Free"],
        description: "하니의 발랄함을 담은 크롭 기장의 그래픽 후드입니다.",
        specs: "Cotton 80%, Poly 20%",
        imageUrls: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800"],
        salesCount: 230,
        stock: 10,
        isVisible: true,
        category: "Top",
      },
      {
        id: "prod_004",
        celebrityId: "celeb_hanni",
        brand: "HIP_PINK",
        name: "카고 조거 팬츠 (Black)",
        price: 98000,
        originalPrice: 120000,
        discount: 18,
        colors: [{ name: "Black" }],
        sizes: ["S", "M"],
        description: "활동성이 뛰어난 힙한 감성의 카고 조거 팬츠입니다.",
        specs: "Nylon 100%",
        imageUrls: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800"],
        salesCount: 112,
        stock: 25,
        isVisible: true,
        category: "Bottom",
      },
      {
        id: "prod_005",
        celebrityId: "celeb_danielle",
        brand: "UNIQ_YELLOW",
        name: "패턴 니트 베스트",
        price: 64000,
        originalPrice: 89000,
        discount: 28,
        colors: [{ name: "Yellow Multi" }],
        sizes: ["M", "L"],
        description: "다니엘처럼 톡톡 튀는 컬러감의 유니크한 패턴 니트 베스트입니다.",
        specs: "Acrylic 100%",
        imageUrls: ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800"],
        salesCount: 45,
        stock: 15,
        isVisible: true,
        category: "Top",
      },
      {
        id: "prod_006",
        celebrityId: "celeb_danielle",
        brand: "UNIQ_YELLOW",
        name: "실버 체인 목걸이",
        price: 45000,
        originalPrice: 55000,
        discount: 18,
        colors: [{ name: "Silver" }],
        sizes: ["One Size"],
        description: "어떤 룩에도 포인트가 되는 볼드한 실버 체인 목걸이입니다.",
        specs: "925 Silver",
        imageUrls: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800"],
        salesCount: 310,
        stock: 100,
        isVisible: true,
        category: "Accessory",
      },
    ];

    products.forEach((p) => {
      const ref = adminDb.collection("products").doc(p.id);
      batch.set(ref, p);
    });

    // 3. 시스템 설정 (Settings)
    const settingsRef = adminDb.collection("settings").doc("system");
    batch.set(settingsRef, {
      mallAddress: "서울특별시 강남구 테헤란로 123 CODE 빌딩",
      mallZipCode: "06236",
    });

    // 4. 이벤트 데이터 (Events)
    const events = [
      {
        id: "event_001",
        title: "2024 S/S 시즌 오프 세일",
        content: "뉴진스가 선택한 올 여름 핫 아이템을 최대 50% 할인된 가격에 만나보세요!",
        thumbnail: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800",
        bannerImage: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200",
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        productIds: ["prod_001", "prod_003"],
        isActive: true,
        priority: 10,
      }
    ];

    events.forEach(e => {
      batch.set(adminDb.collection("events").doc(e.id), e);
    });

    // 5. 장바구니 및 찜 목록 (Carts & Wishlists - 샘플 유저용)
    const sampleUserId = "sample_user_001";
    
    batch.set(adminDb.collection("carts").doc(`${sampleUserId}_item1`), {
      userId: sampleUserId,
      productId: "prod_001",
      quantity: 1,
      color: "Sky Blue",
      size: "M",
      createdAt: new Date().toISOString(),
    });

    batch.set(adminDb.collection("wishlists").doc(`${sampleUserId}_item1`), {
      userId: sampleUserId,
      productId: "prod_005",
      addedAt: new Date().toISOString(),
    });

    // 6. 사용자 데이터 (Users)
    const users = [
      {
        id: "admin_user",
        uid: "admin_user",
        email: "admin@code.com",
        name: "관리자",
        role: "admin",
        points: 1000000,
        createdAt: new Date().toISOString(),
      },
      {
        id: "sample_user_001",
        uid: "sample_user_001",
        email: "user1@example.com",
        name: "김태스터",
        role: "user",
        points: 5000,
        addresses: [{
          recipient: "김태스터",
          address: "서울특별시 강남구 테헤란로 123",
          detailAddress: "101호",
          zipCode: "06236",
          isDefault: true
        }],
        createdAt: new Date().toISOString(),
      }
    ];

    users.forEach(u => batch.set(adminDb.collection("users").doc(u.id), u));

    // 7. 주문 및 배송 상세 (Orders & Shipments with Full Fields)
    const sampleOrderId = "ORD-2024-FULL";
    const sampleTracking = "MOCK-S-FULL";

    batch.set(adminDb.collection("orders").doc(sampleOrderId), {
      orderNumber: sampleOrderId,
      userId: "sample_user_001",
      status: "delivered", // 배송 완료 상태로 생성
      totalAmount: 89000,
      shippingFee: 3000,
      items: [{
        productId: "prod_001",
        quantity: 1,
        color: "Sky Blue",
        size: "M",
        product: { // [Fix] 대시보드 코드가 기대하는 중첩 객체 구조로 변경
          id: "prod_001",
          name: "클래식 오버핏 셔츠 (Sky Blue)",
          price: 89000,
          brand: "CODE_BLUE",
          imageUrls: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800"]
        }
      }],
      shippingAddress: {
        recipient: "김태스터",
        address: "서울특별시 강남구 테헤란로 123",
        zipCode: "06236"
      },
      paymentKey: "toss_sample_key_123", // 환불 테스트용 키
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [{ status: "delivered", label: "배송 완료", date: new Date().toISOString() }]
    });

    batch.set(adminDb.collection("shipments").doc(sampleTracking), {
      orderId: sampleOrderId,
      trackingNumber: sampleTracking,
      carrierCode: "MOCK",
      status: "delivered",
      currentStep: 4,
      deliveredAt: new Date().toISOString(), // 배송 완료일 필수
      claimType: "", // 정상 배송
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      path: []
    });

    // 8. 정산 데이터 (Settlements)
    batch.set(adminDb.collection("settlements").doc("set_001"), {
      celebrityId: "celeb_minji",
      totalSales: 5000000,
      commissionAmount: 500000,
      status: "pending",
      period: "2024-05",
      createdAt: new Date().toISOString(),
    });

    // 9. 교환 요청 샘플 (Exchanges)
    batch.set(adminDb.collection("exchanges").doc("ex_001"), {
      orderId: sampleOrderId,
      userId: "sample_user_001",
      reason: "사이즈가 너무 큽니다.",
      status: "requested",
      type: "size_exchange",
      createdAt: new Date().toISOString(),
    });

    // 10. 피드 포스트 샘플 (Posts)
    batch.set(adminDb.collection("posts").doc("post_001"), {
      celebrityId: "celeb_minji",
      content: "오늘 입은 셔츠 너무 마음에 들어요! 💙",
      imageUrls: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800"],
      linkedProductIds: ["prod_001"],
      likesCount: 1250,
      createdAt: new Date().toISOString(),
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "설계도(Master Map)의 모든 컬렉션과 상세 필드가 100% 구축되었습니다.",
      summary: {
        collections: ["users", "products", "celebrities", "posts", "orders", "shipments", "settlements", "events", "settings", "carts", "wishlists", "exchanges"],
        status: "Full Synchronization Complete"
      }
    });
  } catch (error: any) {
    console.error("Seed Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
