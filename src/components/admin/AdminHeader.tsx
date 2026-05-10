"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, InputNumber, Typography, Space, Modal } from "antd";
import { EnvironmentOutlined, BellOutlined, LogoutOutlined, ShopOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/stores/authStore";
import { logoutUser } from "@/lib/auth";
import { useAllOrders } from "@/hooks/useOrders";
import AdminLinkButtons from "@/components/common/AdminLinkButtons";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { useDaumPostcode } from "@/hooks/useDaumPostcode";
import { getSystemSettings, updateSystemSettings } from "@/lib/services/settings";

// [효진] pathname → 한글 페이지명 매핑 (브레드크럼에 표시)
const pageLabels: Record<string, string> = {
  "/admin": "대시보드",
  "/admin/orders": "주문 관리",
  "/admin/products": "상품 관리",
  "/admin/celebrities": "셀럽 관리",
  "/admin/analytics": "매출 분석",
  "/admin/settlements": "정산 관리",
  "/admin/exchanges": "교환/반품 관리",
};

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { data: orders = [] } = useAllOrders();

  const pageTitle = pageLabels[pathname] ?? "어드민"; // [효진] 브레드크럼: "Admin / {페이지명}"
  // [효진] 결제완료·준비중 주문만 카운트 → 벨 배지에 표시 (기존: 하드코딩 3)
  const pendingCount = orders.filter(
    (o) => o.status === "payment_complete" || o.status === "preparing"
  ).length;

  const [syncInterval, setSyncInterval] = useState(60);
  
  // [v12.5] 쇼핑몰 주소 설정 상태
  const { embedPostcode } = useDaumPostcode();
  const [mallAddress, setMallAddress] = useState("설정 중...");
  const [showSearchLayer, setShowSearchLayer] = useState(false);

  useEffect(() => {
    getSystemSettings().then((res) => {
      if (res && res.mallAddress) setMallAddress(res.mallAddress);
    });
  }, []);

  useEffect(() => {
    if (showSearchLayer) {
      setTimeout(() => {
        embedPostcode("admin-header-postcode-container", async (data) => {
          setMallAddress(data.address);
          setShowSearchLayer(false);
          try {
            await updateSystemSettings({ mallAddress: data.address, mallZipCode: data.zonecode });
            // message는 App 래퍼 외부일 경우 경고가 있을 수 있으므로 window.alert로 대체 가능하지만 여기선 생략하거나 기본 message 사용
          } catch (e) {
            console.error("설정 저장 실패");
          }
        });
      }, 100);
    }
  }, [showSearchLayer, embedPostcode]);

  // [설정] DB에서 전역 캐싱 주기 로드 및 실시간 구독
  useEffect(() => {
    const settingsRef = doc(db, "settings", "logistics");
    
    // 1. 초기 로드 및 실시간 구독
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSyncInterval(data.sweetTrackerCacheInterval || 60);
      } else {
        // 데이터가 없으면 기본값으로 생성
        setDoc(settingsRef, { 
          sweetTrackerCacheInterval: 60,
          updatedAt: new Date().toISOString()
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // [설정] DB 저장 (디바운스 적용)
  const handleSyncIntervalChange = (val: number | null) => {
    if (!val) return;
    setSyncInterval(val);
    
    // 디바운스 타이머
    const timer = setTimeout(async () => {
      const settingsRef = doc(db, "settings", "logistics");
      try {
        await setDoc(settingsRef, { 
          sweetTrackerCacheInterval: val,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        console.error("Failed to update sync interval:", error);
      }
    }, 800); // 0.8초 멈춤 시 저장

    return () => clearTimeout(timer);
  };

  // [효진] 로그아웃 버튼 신규 추가: logoutUser() → authStore 초기화 → /login 이동
  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E4E6EF] bg-white px-6">
        {/* [효진] 브레드크럼 네비게이션 추가 (기존: 검색창만 있었음) */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-[#7E8299]">Admin</span>
          <span className="text-[#7E8299]">/</span>
          <span className="font-semibold text-[#181C32]">{pageTitle}</span>
        </div>

        <div className="flex items-center gap-4">
          
          {/* 쇼핑몰 발송지 설정 (우측 스윗트래커 영역과 50px 간격) */}
          <div className="flex items-center gap-2 border border-[#E4E6EF] bg-[#F5F8FA] px-3 py-1 rounded-lg" style={{ marginRight: '50px' }}>
            <EnvironmentOutlined className="text-[#7E8299]" />
            <span className="text-[11px] font-bold text-[#7E8299] uppercase tracking-wider">가상 쇼핑몰 주소 (발송지)</span>
            <span className="text-[11px] font-semibold text-[#181C32] max-w-[150px] truncate ml-1" title={mallAddress}>
              {mallAddress}
            </span>
            <button 
              className="ml-1 text-[11px] font-bold text-[#3699FF] hover:underline"
              onClick={() => setShowSearchLayer(true)}
            >
              변경
            </button>
          </div>

          <div className="mr-6 flex items-center gap-2">
            <Typography.Text className="text-[11px] font-medium text-[#7E8299]">스윗트래커 DB 캐싱</Typography.Text>
            <InputNumber
              size="small"
              min={1}
              max={1440}
              value={syncInterval}
              onChange={handleSyncIntervalChange}
              suffix="분"
              className="w-20"
            />
          </div>

          {/* [효진] 벨 클릭 시 /admin/orders로 이동 연결 */}
          <Badge count={pendingCount} size="small" color="#F64E60">
            <button
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#7E8299] transition-colors hover:bg-[#F5F6FA] hover:text-[#181C32]"
              onClick={() => router.push("/admin/orders")}
              title="주문 알림"
            >
              <BellOutlined className="text-lg" />
            </button>
          </Badge>

          <AdminLinkButtons variant="admin" />

          {/* [효진] 로그아웃 버튼 추가 */}
          <button
            className="flex items-center gap-1.5 text-xs text-[#7E8299] transition-colors hover:text-[#181C32]"
            onClick={handleLogout}
          >
            <LogoutOutlined />
            <span>로그아웃</span>
          </button>
        </div>
      </header>

      {/* 주소 검색 모달 */}
      <Modal
        title={
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <EnvironmentOutlined className="text-[#3699FF]" />
            <span>쇼핑몰 주소 검색</span>
          </div>
        }
        open={showSearchLayer}
        onCancel={() => setShowSearchLayer(false)}
        footer={null}
        destroyOnHidden
        width={500}
      >
        <div id="admin-header-postcode-container" style={{ width: '100%', height: '400px', marginTop: '10px' }} />
      </Modal>
    </>
  );
}
