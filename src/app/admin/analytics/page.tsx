"use client";

import { useState } from "react";
import { Card, Select, Spin, App } from "antd"; // [효진] App 컴포넌트 추가
import { useCelebrities } from "@/hooks/useCelebrities";
import { useAllProducts } from "@/hooks/useProducts";
import { useAllOrders, useAnalyticsOrders } from "@/hooks/useOrders";
import {
  ArrowUpOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  RiseOutlined,
} from "@ant-design/icons";


const colors = ["#3699FF", "#00C851", "#FF6B35", "#ED4956", "#9B59B6"];

// [효진] SVG 기반 커스텀 도넛 차트 (점유율 시각화용)
function DonutChart({ data }: { data: { name: string; percent: number; color: string }[] }) {
  let cumulative = 0;
  const r = 50;
  const circumference = 2 * Math.PI * r;

  const segments = data
    .filter((d) => d.percent > 0)
    .map((d) => {
      const offset = circumference * (1 - cumulative / 100);
      const dashArray = circumference * (d.percent / 100);
      cumulative += d.percent;
      return { ...d, offset, dashArray };
    });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#E4E6EF" strokeWidth="20" />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="20"
            strokeDasharray={`${seg.dashArray} ${circumference - seg.dashArray}`}
            strokeDashoffset={seg.offset}
            className="transition-all duration-700"
          />
        ))}
      </svg>
      <div className="flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 text-xs font-semibold text-[#181C32]">{d.name}</span>
            <span className="text-xs text-[#7E8299]">{d.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <AdminAnalytics />
  );
}


function AdminAnalytics() {
  const [period, setPeriod] = useState("weekly");

  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: products = [], isLoading: prodLoading } = useAllProducts();
  const { data: orders = [], isLoading: ordersLoading } = useAnalyticsOrders();


  const isLoading = celebLoading || prodLoading || ordersLoading;

  const priceById = new Map(products.map((p) => [p.id, p.price] as const));
  const orderLiveTotal = (o: typeof orders[number]) =>
    o.items.reduce(
      (sum, item) => sum + (priceById.get(item.productId) ?? item.product.price) * item.quantity,
      0
    );
  const totalRevenue = orders.reduce((sum, o) => sum + orderLiveTotal(o), 0);
  const avgOrderAmount = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;
  const totalSalesCount = products.reduce((sum, p) => sum + p.salesCount, 0);

  // [효진] 셀럽별 매출은 실제 주문(취소 제외) 라인 합계 기준으로 산출
  const productCelebMap = new Map(products.map((p) => [p.id, p.celebrityId] as const));
  const celebSalesData = celebrities.map((celeb, i) => {
    const sales = orders.reduce((acc, o) => {
      if (o.status === "cancelled") return acc;
      const lineTotal = o.items.reduce((s, item) => {
        if (productCelebMap.get(item.productId) !== celeb.id) return s;
        const unit = priceById.get(item.productId) ?? item.product.price;
        return s + unit * item.quantity;
      }, 0);
      return acc + lineTotal;
    }, 0);
    return { name: celeb.name, sales, color: colors[i % colors.length] };
  });
  const totalCelebSales = celebSalesData.reduce((sum, c) => sum + c.sales, 0);
  const celebShare = celebSalesData
    .map((c) => ({
      ...c,
      percent: totalCelebSales > 0 ? Math.round((c.sales / totalCelebSales) * 100) : 0, // [효진] 점유율 % 계산
    }))
    .sort((a, b) => b.percent - a.percent); // [효진] 점유율 높은 순 정렬

  // 요일별 매출
  const dayMap: Record<number, string> = {
    0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토",
  };
  const dailyTotals: Record<string, number> = {};
  orders.forEach((o) => {
    const day = dayMap[new Date(o.createdAt).getDay()] ?? "?";
    dailyTotals[day] = (dailyTotals[day] ?? 0) + orderLiveTotal(o);
  });
  const dailyData = ["월", "화", "수", "목", "금", "토", "일"].map((day) => ({
    day,
    amount: dailyTotals[day] ?? 0,
  }));
  const maxAmount = Math.max(...dailyData.map((d) => d.amount), 1);

  const kpis = [
    {
      title: "총 매출",
      value: `₩${totalRevenue.toLocaleString("ko-KR")}`,
      icon: <DollarOutlined />,
      color: "#3699FF",
      bg: "#EEF6FF",
    },
    {
      title: "주문 건수",
      value: `${orders.length}건`,
      icon: <ShoppingCartOutlined />,
      color: "#00C851",
      bg: "#EAFAF1",
    },
    {
      title: "평균 주문금액",
      value: `₩${avgOrderAmount.toLocaleString("ko-KR")}`,
      icon: <RiseOutlined />,
      color: "#FF6B35",
      bg: "#FFF3EE",
    },
    {
      title: "총 판매수량",
      value: `${totalSalesCount.toLocaleString("ko-KR")}개`,
      icon: <ArrowUpOutlined />,
      color: "#ED4956",
      bg: "#FEF0F1",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#181C32]">매출 분석</h1>
          <p className="mt-0.5 text-xs text-[#7E8299]">셀럽별·일별 매출 현황</p>
        </div>
        <Select value={period} onChange={setPeriod} className="w-24">
          <Select.Option value="daily">일별</Select.Option>
          <Select.Option value="weekly">주별</Select.Option>
          <Select.Option value="monthly">월별</Select.Option>
        </Select>
      </div>

      {/* KPI 카드 */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.title}
            className="rounded-xl border border-[#E4E6EF] bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-[#7E8299]">{kpi.title}</p>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-base"
                style={{ background: kpi.bg, color: kpi.color }}
              >
                {kpi.icon}
              </div>
            </div>
            <p className="text-lg font-bold text-[#181C32]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 요일별 매출 막대 차트 */}
        <Card
          title="요일별 매출 추이"
          size="small"
          className="col-span-2 border-[#E4E6EF]"
        >
          <div className="flex h-52 items-end gap-2 px-2">
            {dailyData.map((d) => {
              const barH = Math.max((d.amount / maxAmount) * 160, d.amount > 0 ? 6 : 0);
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  {d.amount > 0 && (
                    <span className="text-[9px] font-medium text-[#7E8299]">
                      {d.amount >= 10000
                        ? `${(d.amount / 10000).toFixed(0)}만`
                        : `${d.amount.toLocaleString()}`}
                    </span>
                  )}
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#3699FF] to-[#5BC4FF] shadow-sm transition-all duration-700"
                    style={{ height: `${barH}px` }}
                  />
                  <span className="text-[11px] font-semibold text-[#7E8299]">{d.day}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 셀럽별 비중 도넛 차트 */}
        <Card title="셀럽별 매출 비중" size="small" className="border-[#E4E6EF]">
          {totalCelebSales > 0 ? (
            <DonutChart data={celebShare} />
          ) : (
            <p className="py-6 text-center text-xs text-[#A8A8A8]">데이터 없음</p>
          )}
        </Card>
      </div>

      {/* 셀럽별 상세 테이블 */}
      <div className="mt-4">
        <Card title="셀럽별 매출 상세" size="small" className="border-[#E4E6EF]">
          <div className="space-y-3">
            {celebSalesData
              .sort((a, b) => b.sales - a.sales)
              .map((cs, i) => {
                const percent =
                  totalCelebSales > 0
                    ? Math.round((cs.sales / totalCelebSales) * 100)
                    : 0;
                return (
                  <div key={cs.name}>
                    <div className="mb-1 flex justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: colors[i % colors.length] }}
                        />
                        <span className="font-semibold text-[#181C32]">{cs.name}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-[#7E8299]">
                          ₩{cs.sales.toLocaleString("ko-KR")}
                        </span>
                        <span className="w-8 text-right font-bold" style={{ color: colors[i % colors.length] }}>
                          {percent}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#E4E6EF]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${percent}%`, background: colors[i % colors.length] }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
}
