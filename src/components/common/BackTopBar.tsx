"use client";

import { useRouter } from "next/navigation";
import { LeftOutlined } from "@ant-design/icons";

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
    <header className="sticky top-0 z-30 flex h-11 items-center gap-2.5 border-b border-border bg-surface px-3">
      <LeftOutlined className="cursor-pointer text-base" onClick={handleBack} />
      <h2 className="flex-1 text-[15px] font-bold">{title}</h2>
      {rightAction}
    </header>
  );
}
