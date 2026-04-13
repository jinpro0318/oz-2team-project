"use client";

import { useRouter } from "next/navigation";
import { LeftOutlined } from "@ant-design/icons";

interface BackTopBarProps {
  title: string;
  rightAction?: React.ReactNode;
}

export default function BackTopBar({ title, rightAction }: BackTopBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex h-11 items-center gap-2.5 border-b border-border bg-surface px-3">
      <LeftOutlined className="cursor-pointer text-base" onClick={() => router.back()} />
      <h2 className="flex-1 text-[15px] font-bold">{title}</h2>
      {rightAction}
    </header>
  );
}
