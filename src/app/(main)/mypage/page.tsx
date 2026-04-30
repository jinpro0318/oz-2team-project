"use client";

import { useRouter } from "next/navigation";
import { Button, Drawer } from "antd";
import {
  ShoppingOutlined,
  StarOutlined,
  PhoneOutlined,
  EditOutlined,
  LogoutOutlined,
  RightOutlined,
  SettingOutlined, // [효진] 관리자 아이콘용
} from "@ant-design/icons";
import { useState, useEffect } from "react";
import TopBar from "@/components/common/TopBar";
import { useAuthStore } from "@/stores/authStore";
import { logoutUser } from "@/lib/auth";

export default function MyPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [showLogout, setShowLogout] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  const menuItems = [
    { icon: <ShoppingOutlined />, label: "주문 내역", href: "/orders" },
    { icon: <StarOutlined />, label: "찜 목록", href: "/wishlist" },
    { icon: <PhoneOutlined />, label: "고객센터", href: "/mypage/support" },
  ];

  // [효진] 관리자 계정으로 로그인한 경우, 마이페이지 메뉴 하단에 '관리자 페이지' 이동 링크를 추가했습니다.
  // 일반 사용자와 구분하기 위해 디자인적으로 배경색(bg-blue-50)을 살짝 다르게 처리했습니다.
  const finalMenuItems = [...menuItems];
  if (mounted && user?.role === "admin") {
    finalMenuItems.push({
      icon: <SettingOutlined className="text-blue-500" />,
      label: "관리자 페이지",
      href: "/admin",
    });
  }

  return (
    <div className="flex flex-col">
      <TopBar />

      {/* Profile Section */}
      <div className="bg-surface px-4 py-6 text-center border-b border-border">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-lg font-bold text-white">
          {user?.nickname?.[0] ?? "G"}
        </div>
        <p className="mt-3 text-lg font-bold">{user?.nickname ?? "게스트"}</p>
        <p className="text-xs text-text-secondary">{user?.email ?? "로그인이 필요합니다"}</p>
        {user ? (
          <Button
            icon={<EditOutlined />}
            className="mt-3"
            size="small"
            onClick={() => router.push("/mypage/profile")}
          >
            프로필 편집
          </Button>
        ) : (
          <Button
            type="primary"
            className="mt-3"
            onClick={() => router.push("/login")}
          >
            로그인
          </Button>
        )}
      </div>

      {/* Menu */}
      <div className="mt-2 bg-surface">
        {finalMenuItems.map((item) => (
          <button
            key={item.label}
            className={`flex w-full items-center gap-3 border-b border-border-light px-4 py-3.5 text-left bg-transparent ${item.href === "/admin" ? "bg-blue-50/50" : ""}`}
            onClick={() => router.push(item.href)}
          >
            <span className="text-lg text-text-secondary">{item.icon}</span>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            <RightOutlined className="text-xs text-text-muted" />
          </button>
        ))}
      </div>

      {user && (
        <div className="mt-2 bg-surface">
          <button
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left bg-transparent"
            onClick={() => setShowLogout(true)}
          >
            <LogoutOutlined className="text-lg text-text-secondary" />
            <span className="flex-1 text-sm font-medium">로그아웃</span>
          </button>
        </div>
      )}

      {/* Logout Drawer (G5) */}
      <Drawer
        open={showLogout}
        onClose={() => setShowLogout(false)}
        placement="bottom"
        closable={false}
        styles={{ wrapper: { height: "auto" }, body: { padding: "24px 20px 32px", textAlign: "center" } }}
      >
        <h3 className="mb-2 text-lg font-bold">로그아웃</h3>
        <p className="mb-6 text-sm text-text-secondary">정말 로그아웃 하시겠습니까?</p>
        <div className="flex gap-2">
          <Button block size="large" onClick={() => setShowLogout(false)}>
            아니요
          </Button>
          <Button block size="large" danger onClick={handleLogout}>
            로그아웃
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
