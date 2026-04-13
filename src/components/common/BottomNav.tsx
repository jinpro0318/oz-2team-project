"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeOutlined,
  HomeFilled,
  SearchOutlined,
  HeartOutlined,
  HeartFilled,
  UserOutlined,
} from "@ant-design/icons";

const tabs = [
  { key: "feed", href: "/feed", icon: HomeOutlined, activeIcon: HomeFilled, label: "홈" },
  { key: "search", href: "/search", icon: SearchOutlined, activeIcon: SearchOutlined, label: "검색" },
  { key: "wishlist", href: "/wishlist", icon: HeartOutlined, activeIcon: HeartFilled, label: "찜" },
  { key: "mypage", href: "/mypage", icon: UserOutlined, activeIcon: UserOutlined, label: "마이" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex h-[49px] max-w-[390px] items-center border-t border-border bg-surface">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(`/${tab.key}`);
        const Icon = isActive ? tab.activeIcon : tab.icon;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 no-underline"
          >
            <Icon className={`text-xl ${isActive ? "text-text" : "text-text-secondary"}`} />
            <span className={`text-[10px] ${isActive ? "font-semibold text-text" : "text-text-secondary"}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
