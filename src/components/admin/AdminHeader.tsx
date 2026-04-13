"use client";

import { Input, Badge } from "antd";
import { SearchOutlined, BellOutlined } from "@ant-design/icons";

export default function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E4E6EF] bg-white px-6">
      <Input
        prefix={<SearchOutlined className="text-[#7E8299]" />}
        placeholder="검색..."
        className="w-64"
        size="middle"
      />
      <div className="flex items-center gap-4">
        <Badge count={3} size="small">
          <BellOutlined className="cursor-pointer text-lg text-[#7E8299]" />
        </Badge>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3699FF] text-xs font-bold text-white">
          A
        </div>
      </div>
    </header>
  );
}
