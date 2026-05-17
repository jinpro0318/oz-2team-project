"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input, Spin } from "antd";
import { SearchOutlined, CloseCircleFilled, RightOutlined } from "@ant-design/icons";
import BottomNav from "@/components/common/BottomNav";
import { useCelebrities } from "@/hooks/useCelebrities";
import { useProducts } from "@/hooks/useProducts";

export default function SearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: products = [], isLoading: prodLoading } = useProducts();

  const popularSearches = useMemo(() => {
    const tokens: string[] = [];
    const seen = new Set<string>();
    const sorted = [...products].sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0));
    for (const p of sorted) {
      const label = p.name.split(/\s+/).slice(-2).join(" ").trim() || p.name;
      const key = label.toLowerCase();
      if (label && !seen.has(key)) {
        seen.add(key);
        tokens.push(label);
      }
      if (tokens.length >= 5) break;
    }
    return tokens;
  }, [products]);

  const results = useMemo(() => {
    if (!keyword.trim()) return { celebs: [], prods: [] };
    const kw = keyword.toLowerCase();
    return {
      celebs: celebrities.filter(
        (c) => c.name.toLowerCase().includes(kw) || c.handle.toLowerCase().includes(kw)
      ),
      prods: products.filter(
        (p) =>
          p.name.toLowerCase().includes(kw) ||
          p.brand.toLowerCase().includes(kw) ||
          p.category.toLowerCase().includes(kw)
      ),
    };
  }, [keyword, celebrities, products]);

  const hasResults = results.celebs.length > 0 || results.prods.length > 0;

  const handleSearch = (kw: string) => {
    setKeyword(kw);
    if (kw && !recentSearches.includes(kw)) {
      setRecentSearches((prev) => [kw, ...prev].slice(0, 5));
    }
  };

  if (celebLoading || prodLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-[49px]">
      <div className="flex items-center gap-2 bg-surface px-3 py-2">
        <Input
          prefix={<SearchOutlined className="text-text-muted" />}
          placeholder="셀럽, 상품 검색"
          size="large"
          className="rounded-full"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => handleSearch(keyword)}
          allowClear
        />
      </div>

      {keyword.trim() && hasResults ? (
        <div className="flex-1">
          {results.celebs.length > 0 && (
            <div className="border-b border-border bg-surface px-3 py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">셀럽</p>
              {results.celebs.map((c) => (
                <button
                  key={c.id}
                  className="flex w-full items-center gap-3 py-2 text-left bg-transparent"
                  onClick={() => router.push("/feed")}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-xs font-bold text-white">
                    {c.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{c.name}</p>
                    <p className="text-xs text-text-secondary">{c.handle}</p>
                  </div>
                  <RightOutlined className="text-xs text-text-muted" />
                </button>
              ))}
            </div>
          )}
          {results.prods.length > 0 && (
            <div className="bg-surface px-3 py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">상품</p>
              {results.prods.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center gap-3 border-b border-border-light py-2 text-left bg-transparent last:border-b-0"
                  onClick={() => router.push(`/product/${p.id}`)}
                >
                  <div className="h-12 w-10 shrink-0 rounded bg-gradient-to-br from-gray-200 to-gray-300" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase text-text-muted">{p.brand}</p>
                    <p className="truncate text-[13px] font-bold">{p.name}</p>
                    <p className="text-xs font-bold">₩{p.price.toLocaleString("ko-KR")}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1">
          {recentSearches.length > 0 && (
            <div className="bg-surface px-3 py-3 border-b border-border">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">최근 검색</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary"
                    onClick={() => handleSearch(s)}
                  >
                    {s}
                    <CloseCircleFilled
                      className="text-text-muted text-[10px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecentSearches((prev) => prev.filter((r) => r !== s));
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface px-3 py-3 border-b border-border">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">인기 셀럽</p>
            {celebrities.map((c, i) => (
              <button
                key={c.id}
                className="flex w-full items-center gap-3 py-2.5 text-left bg-transparent"
                onClick={() => router.push("/feed")}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-text text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-[10px] font-bold text-white">
                  {c.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{c.name}</p>
                  <p className="text-[11px] text-text-secondary">{c.bio.split("·")[0].trim()}</p>
                </div>
                <RightOutlined className="text-xs text-text-muted" />
              </button>
            ))}
          </div>

          {popularSearches.length > 0 && (
            <div className="bg-surface px-3 py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">인기 검색어</p>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((s) => (
                  <button
                    key={s}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary"
                    onClick={() => handleSearch(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
