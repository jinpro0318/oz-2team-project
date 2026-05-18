"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LeftOutlined } from "@ant-design/icons";
import AdminLinkButtons from "./AdminLinkButtons";
import BrandLogo from "./BrandLogo";


interface BackTopBarProps {
  title: string;
  rightAction?: React.ReactNode;
  backUrl?: string; // [추가] 특정 경로로 뒤로가기 지정
}

export default function BackTopBar({ title, rightAction, backUrl }: BackTopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-11 items-center gap-2 border-b border-border bg-surface px-3">
      <LeftOutlined className="cursor-pointer text-base shrink-0" onClick={handleBack} />
      <Link
        href="/feed"
        className="no-underline hover:opacity-80 transition-opacity shrink-0"
      >
        <BrandLogo size={21} tracking={-1.5} weight="bold" />
      </Link>
      <span className="h-3.5 w-px shrink-0 bg-border" aria-hidden="true" />
      <h2 className="flex-1 truncate text-[13px] font-semibold text-text">{title}</h2>
      <AdminLinkButtons variant="mall" />
      {rightAction}
    </header>

  );
}
