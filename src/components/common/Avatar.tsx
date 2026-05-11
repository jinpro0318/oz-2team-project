"use client";

import React from "react";
import Image from "next/image";
import type { User } from "@/types";

interface AvatarProps {
  user: User;
  size?: number; // Size in pixels
  className?: string;
  onClick?: () => void;
}

export default function Avatar({ user, size = 60, className = "", onClick }: AvatarProps) {
  const initial = user.nickname ? user.nickname[0] : user.email[0].toUpperCase();

  return (
    <div 
      className={`relative flex items-center justify-center rounded-full overflow-hidden shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {user.photoUrl ? (
        <img
          src={user.photoUrl}
          alt={`${user.nickname} profile`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div 
          className="flex w-full h-full items-center justify-center bg-gradient-to-br from-[#D4C5B0] to-[#CCB8B8] font-bold text-white/90"
          style={{ fontSize: size * 0.4 }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
