"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { logoutUser } from "@/lib/auth";
import { useWishlist } from "@/hooks/useWishlist";
import { useOrders } from "@/hooks/useOrders";
import OrderStatusBoard from "@/components/mypage/OrderStatusBoard";
import EmailProtector from "@/components/mypage/EmailProtector";
import Avatar from "@/components/common/Avatar";
import AdminLinkButtons from "@/components/common/AdminLinkButtons";


export default function MyPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const { items: wishlistItems } = useWishlist();
  const { data: orders } = useOrders();

  const lastCheckedOrders = user?.lastCheckedOrders || "0";
  const lastCheckedWishlist = user?.lastCheckedWishlist || "0";

  const wishlistCount = wishlistItems.length;
  const ordersCount = orders?.length ?? 0;

  const newWishlistCount = wishlistItems.filter((i) => i.addedAt > lastCheckedWishlist).length;
  const newOrdersCount = orders?.filter((o) => o.createdAt > lastCheckedOrders).length ?? 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // pass
    }
    setUser(null);
    setShowLogout(false);
    router.push("/feed");
  };

  const username = user?.email ? user.email.split("@")[0] : "guest";

  return (
    <div className="flex flex-col bg-surface min-h-screen pb-[60px]">
      {/* Custom TopBar for MyPage */}
      <div className="sticky top-0 z-50 flex h-11 items-center justify-between border-b border-border bg-surface px-3">
        <div className="text-[15px] font-bold text-text">{username}</div>
        <div className="flex gap-[15px] items-center">
          <AdminLinkButtons variant="mall" />
          <div className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center">

            <svg
              viewBox="0 0 24 24"
              className="h-[22px] w-[22px] fill-none stroke-text stroke-[1.8px]"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>
        </div>
      </div>

      {/* Profile Header (ph2) */}
      <div className="flex items-center gap-[18px] border-b border-border px-3 pb-3.5 pt-[18px]">
        {/* Avatar (paw & pav2) */}
        <div
          className="shrink-0 rounded-full p-[2.5px] h-[72px] w-[72px]"
          style={{
            background:
              "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
          }}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full border-[2.5px] border-white bg-white overflow-hidden">
            {user ? <Avatar user={user} size={62} /> : null}
          </div>
        </div>

        {/* Stats (pst) */}
        <div className="flex flex-1">
          <div className="flex flex-1 flex-col items-center gap-0.5">
            <div className="text-[16px] font-bold text-text">{ordersCount}</div>
            <div className="text-[11px] text-text-secondary">주문</div>
          </div>
          <div className="flex flex-1 flex-col items-center gap-0.5">
            <div className="text-[16px] font-bold text-text">{wishlistCount}</div>
            <div className="text-[11px] text-text-secondary">찜</div>
          </div>
        </div>
      </div>

      {/* Bio (pbio) */}
      <div className="border-b border-border px-3 pb-3 pt-2.5">
        <div className="text-[14px] font-bold text-text">
          {user?.nickname || "게스트"}
        </div>
        <EmailProtector user={user} />
      </div>

      {/* Buttons (pbtns) */}
      <div className="flex gap-1.5 border-b border-border px-3 pb-3 pt-2">
        <button
          className="flex h-[30px] flex-1 cursor-pointer items-center justify-center rounded-lg border border-border bg-transparent px-2.5 text-[12px] font-semibold text-text"
          onClick={() => router.push(user ? "/mypage/profile" : "/login")}
        >
          {user ? "프로필 편집" : "로그인"}
        </button>
      </div>

      {/* Menu List (mlist) */}
      <div className="flex flex-col">
        {/* 주문 내역 */}
        <div
          className="flex cursor-pointer items-center gap-3 border-b border-border-light px-3 py-[13px]"
          onClick={() => router.push("/orders")}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[19px] w-[19px] shrink-0 fill-none stroke-text stroke-[1.8px]"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <div className="flex-1">
            <div className="text-[14px] font-medium text-text">주문 내역</div>
            <div className="mt-[1px] text-[11px] text-text-muted">
              {newOrdersCount > 0 ? `새로운 주문 ${newOrdersCount}건` : `최근 주문 ${ordersCount}건`}
            </div>
          </div>
          {user && newOrdersCount > 0 && (
            <div className="flex h-[17px] min-w-[17px] items-center justify-center rounded-[9px] bg-[#ED4956] px-1 text-[10px] font-bold text-white">
              {newOrdersCount}
            </div>
          )}
          <svg
            viewBox="0 0 24 24"
            className="h-[14px] w-[14px] fill-none stroke-text-muted stroke-[2px]"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* 찜 목록 */}
        <div
          className="flex cursor-pointer items-center gap-3 border-b border-border-light px-3 py-[13px]"
          onClick={() => router.push("/wishlist")}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[19px] w-[19px] shrink-0 fill-none stroke-text stroke-[1.8px]"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <div className="flex-1">
            <div className="text-[14px] font-medium text-text">찜 목록</div>
            <div className="mt-[1px] text-[11px] text-text-muted">
              {newWishlistCount > 0 ? `${newWishlistCount}개 새로 저장됨` : `${wishlistCount}개 저장됨`}
            </div>
          </div>
          {user && newWishlistCount > 0 && (
            <div className="flex h-[17px] min-w-[17px] items-center justify-center rounded-[9px] bg-[#ED4956] px-1 text-[10px] font-bold text-white">
              {newWishlistCount}
            </div>
          )}
          <svg
            viewBox="0 0 24 24"
            className="h-[14px] w-[14px] fill-none stroke-text-muted stroke-[2px]"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* 고객센터 구분선 */}
        <div className="m-0 h-2 border-y border-border bg-bg"></div>

        {/* 고객센터 */}
        <div
          className="flex cursor-pointer items-center gap-3 border-b border-border-light px-3 py-[13px]"
          onClick={() => router.push("/mypage/support")}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[19px] w-[19px] shrink-0 fill-none stroke-text stroke-[1.8px]"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9 19.79 19.79 0 0 1 1.61 3.27 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <div className="flex-1">
            <div className="text-[14px] font-medium text-text">고객센터</div>
            <div className="mt-[1px] text-[11px] text-text-muted">
              1588-1234 · 평일 09:00~18:00
            </div>
          </div>
          <svg
            viewBox="0 0 24 24"
            className="h-[14px] w-[14px] fill-none stroke-text-muted stroke-[2px]"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* 관리자 페이지 */}
        {mounted && user?.role === "admin" && (
          <div
            className="flex cursor-pointer items-center gap-3 border-b border-border-light bg-blue-50/50 px-3 py-[13px]"
            onClick={() => router.push("/admin")}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[19px] w-[19px] shrink-0 fill-none stroke-blue-500 stroke-[1.8px]"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-text">
                관리자 페이지
              </div>
              <div className="mt-[1px] text-[11px] text-text-muted">
                상품 및 주문 관리
              </div>
            </div>
            <svg
              viewBox="0 0 24 24"
              className="h-[14px] w-[14px] fill-none stroke-text-muted stroke-[2px]"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        )}

        {/* 로그아웃 */}
        {user && (
          <div
            className="flex cursor-pointer items-center gap-3 px-3 py-[13px]"
            onClick={() => setShowLogout(true)}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[19px] w-[19px] shrink-0 fill-none stroke-[#ED4956] stroke-[1.8px]"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-[#ED4956]">
                로그아웃
              </div>
            </div>
          </div>
        )}
      </div>

      {/* G5 로그아웃 확인 바텀시트 */}
      {showLogout && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/55 transition-opacity"
            onClick={() => setShowLogout(false)}
          ></div>
          <div className="fixed inset-x-0 bottom-0 z-[101] mx-auto max-w-[390px] rounded-t-2xl bg-surface pb-8 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.18)]">
            <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-border"></div>
            <div className="flex flex-col items-center px-5">
              <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF0F0]">
                <svg
                  className="h-[22px] w-[22px] fill-none stroke-[#ED4956] stroke-2"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <div className="mb-0.5 text-[17px] font-bold text-text">
                로그아웃
              </div>
              <div className="mb-4 text-center">
                <p className="text-[13px] text-text-secondary">정말 로그아웃 하시겠어요?</p>
                <p className="text-[13px] text-text-secondary">다시 로그인하면 계정에 접근할 수 있어요.</p>
              </div>
              <div className="flex w-full gap-2.5">
                <button
                  className="flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-border bg-white text-[15px] font-bold text-text"
                  onClick={() => setShowLogout(false)}
                >
                  아니요
                </button>
                <button
                  className="flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border-none bg-[#ED4956] text-[15px] font-bold text-white"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
