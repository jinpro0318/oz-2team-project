"use client";

import type { CSSProperties } from "react";

// PPT 1번 슬라이드의 C.O.D.E. 로고를 그대로 가져온 그라데이션(핑크→퍼플→인디고)
const CODE_GRADIENT = "linear-gradient(90deg, #FB7185 0%, #E879F9 45%, #A855F7 65%, #6366F1 100%)";

type BrandLogoProps = {
  size?: number;
  tracking?: number;
  weight?: number | "black" | "bold" | "extrabold";
  withSubtitle?: boolean;
  subtitleSize?: number;
  className?: string;
  style?: CSSProperties;
  as?: "span" | "div" | "h1";
};

const WEIGHT_MAP: Record<string, number> = {
  black: 900,
  extrabold: 800,
  bold: 700,
};

export default function BrandLogo({
  size = 21,
  tracking = -1.5,
  weight = "bold",
  withSubtitle = false,
  subtitleSize,
  className,
  style,
  as: Tag = "span",
}: BrandLogoProps) {
  const fontWeight = typeof weight === "number" ? weight : WEIGHT_MAP[weight] ?? 700;
  const subSize = subtitleSize ?? Math.max(9, Math.round(size * 0.22));

  const textStyle: CSSProperties = {
    fontSize: `${size}px`,
    fontWeight,
    letterSpacing: `${tracking}px`,
    lineHeight: 1,
    backgroundImage: CODE_GRADIENT,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
    display: "inline-block",
  };

  if (!withSubtitle) {
    return (
      <Tag className={className} style={{ ...textStyle, ...style }}>
        C.O.D.E.
      </Tag>
    );
  }

  return (
    <span className={className} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", ...style }}>
      <span style={textStyle}>C.O.D.E.</span>
      <span
        style={{
          marginTop: 6,
          fontSize: `${subSize}px`,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: "var(--color-text-muted, #8e8e93)",
          fontWeight: 500,
        }}
      >
        Celebrity Outfit Daily Edition
      </span>
    </span>
  );
}
