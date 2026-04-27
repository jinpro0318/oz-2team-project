"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";

interface HotspotDotProps {
  x: number;
  y: number;
  product: {
    id: string;
    name: string;
    price: string;
  };
}

export default function HotspotDot({ x, y, product }: HotspotDotProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/product/${product.id}`);
  };

  return (
    <div
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-[30px] h-[30px] rounded-full flex items-center justify-center animate-pulse-dot"
        style={{
          background: "rgba(255, 255, 255, 0.2)",
          border: "2px solid rgba(255, 255, 255, 0.85)",
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-white" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute top-9 left-1/2 -translate-x-1/2 bg-white rounded-md px-2 py-1 whitespace-nowrap z-20 cursor-pointer"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
            onClick={handleNavigate}
          >
            <p className="text-[11px] font-bold text-text">
              {product.name}
            </p>
            <p className="text-[10px] text-text-secondary">
              {product.price}
            </p>
            {/* Arrow */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
