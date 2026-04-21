"use client";

import { Home, Search, PlusSquare, Film } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <nav 
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t z-50 flex items-center h-[49px]" 
      style={{ borderColor: "#DBDBDB" }}
    >
      <Link
        href="/feed"
        className="flex-1 flex items-center justify-center h-full hover:opacity-60 transition-opacity"
      >
        <Home
          className="w-[23px] h-[23px] text-text"
          strokeWidth={isActive("/feed") ? 2.5 : 1.8}
        />
      </Link>
      <button className="flex-1 flex items-center justify-center h-full hover:opacity-60 transition-opacity">
        <Search className="w-[23px] h-[23px] text-text" strokeWidth={1.8} />
      </button>
      <button className="flex-1 flex items-center justify-center h-full hover:opacity-60 transition-opacity">
        <PlusSquare className="w-[23px] h-[23px] text-text" strokeWidth={1.8} />
      </button>
      <button className="flex-1 flex items-center justify-center h-full hover:opacity-60 transition-opacity">
        <Film className="w-[23px] h-[23px] text-text" strokeWidth={1.8} />
      </button>
      <button className="flex-1 flex items-center justify-center h-full hover:opacity-60 transition-opacity">
        <div 
          className="w-6 h-6 rounded-full instagram-gradient" 
          style={{ padding: "1.5px" }}
        >
          <div className="w-full h-full rounded-full bg-white p-[1px]">
             <div className="w-full h-full rounded-full bg-gray-200" />
          </div>
        </div>
      </button>
    </nav>
  );
}
