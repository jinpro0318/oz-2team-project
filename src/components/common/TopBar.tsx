"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "antd";
import {
  HeartOutlined,
  ShoppingCartOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useCart } from "@/hooks/useCart";

export default function TopBar() {
  const router = useRouter();
  const { totalCount } = useCart();

  return (
    <header className="sticky top-0 z-30 flex h-11 items-center justify-between border-b border-border bg-surface px-3">
      <Link href="/feed" className="text-xl font-bold tracking-tighter text-text no-underline">
        C.O.D.E.
      </Link>
      <div className="flex items-center gap-4">
        <SearchOutlined
          className="text-lg cursor-pointer"
          onClick={() => router.push("/search")}
        />
        <HeartOutlined
          className="text-lg cursor-pointer"
          onClick={() => router.push("/wishlist")}
        />
        <Badge count={totalCount} size="small" offset={[-2, 2]}>
          <ShoppingCartOutlined
            className="text-lg cursor-pointer"
            onClick={() => router.push("/cart")}
          />
        </Badge>
      </div>
    </header>
  );
}
