"use client";

import { Card, Table, Tag, Button, Spin } from "antd";
import {
  DollarOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  TeamOutlined,
  DownloadOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";
import { useAllOrders } from "@/hooks/useOrders";
import { useCelebrities } from "@/hooks/useCelebrities";
import { useAllProducts } from "@/hooks/useProducts";
import type { Order } from "@/types";

const statusConfig: Record<string, { label: string; color: string }> = {
  payment_complete: { label: "결제완료", color: "blue" },
  payment_pending: { label: "결제대기", color: "default" },
  preparing: { label: "준비중", color: "orange" },
  shipping: { label: "배송중", color: "green" },
  delivered: { label: "배송완료", color: "cyan" },
  cancelled: { label: "주문취소", color: "red" },
  cancel_requested: { label: "취소요청", color: "orange" },
  exchange_requested: { label: "교환요청", color: "purple" },
  return_requested: { label: "반품요청", color: "purple" },
  returning: { label: "수거중", color: "volcano" },
  returned: { label: "수거완료", color: "magenta" },
  inspecting: { label: "검수중", color: "gold" },
  inspection_completed: { label: "검수완료", color: "geekblue" },
  exchange_preparing: { label: "상품준비", color: "orange" },
  exchange_completed: { label: "교환완료", color: "geekblue" },
  return_completed: { label: "반품완료", color: "gray" },
  purchase_confirmed: { label: "구매확정", color: "green" },
  claim_rejected: { label: "클레임반려", color: "red" },
  reshipping: { label: "교환재발송", color: "geekblue" },
};

export default function AdminDashboard() {
  const { data: orders = [], isLoading: ordersLoading } = useAllOrders();
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: products = [], isLoading: prodLoading } = useAllProducts();

  const isLoading = ordersLoading || celebLoading || prodLoading;

  const priceById = new Map(products.map((p) => [p.id, p.price] as const));
  const productCelebMap = new Map(products.map((p) => [p.id, p.celebrityId] as const));
  const orderLiveTotal = (o: Order) =>
    o.items.reduce(
      (sum, item) => sum + (priceById.get(item.productId) ?? item.product.price) * item.quantity,
      0
    );

  const validOrders = orders.filter((o) => o.status !== "cancelled");
  const totalRevenue = validOrders.reduce((sum, o) => sum + orderLiveTotal(o), 0);
  const todayOrders = validOrders.filter((o) => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const celebSales = celebrities
    .map((celeb) => {
      const sales = validOrders.reduce((acc, o) => {
        const lineTotal = o.items.reduce((s, item) => {
          if (productCelebMap.get(item.productId) !== celeb.id) return s;
          const unit = priceById.get(item.productId) ?? item.product.price;
          return s + unit * item.quantity;
        }, 0);
        return acc + lineTotal;
      }, 0);
      const commission = Math.floor(sales * (celeb.commissionRate / 100));
      return { name: celeb.name, sales, commission, gradient: celeb.gradient };
    })
    .sort((a, b) => b.sales - a.sales);

  const totalCelebSales = celebSales.reduce((sum, c) => sum + c.sales, 0);

  const dayMap: Record<number, string> = { 0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토" };
  const dailyTotals: Record<string, number> = {};
  validOrders.forEach((o) => {
    const day = dayMap[new Date(o.createdAt).getDay()] ?? "?";
    dailyTotals[day] = (dailyTotals[day] ?? 0) + orderLiveTotal(o);
  });
  const dailyData = ["월", "화", "수", "목", "금", "토", "일"].map((day) => ({
    day,
    amount: dailyTotals[day] ?? 0,
  }));
  const maxAmount = Math.max(...dailyData.map((d) => d.amount), 1);

  const kpiCards = [
    {
      title: "총 매출",
      value: `₩${totalRevenue.toLocaleString("ko-KR")}`,
      icon: <DollarOutlined />,
      color: "#3699FF",
      bg: "#EEF6FF",
      sub: `주문 ${orders.length}건`,
    },
    {
      title: "오늘 주문",
      value: `${todayOrders.length}건`,
      icon: <ShoppingCartOutlined />,
      color: "#00C851",
      bg: "#EAFAF1",
      sub: `₩${todayOrders.reduce((s, o) => s + orderLiveTotal(o), 0).toLocaleString("ko-KR")}`,
    },
    {
      title: "등록 상품",
      value: `${products.length}개`,
      icon: <AppstoreOutlined />,
      color: "#FF6B35",
      bg: "#FFF3EE",
      sub: `노출 ${products.filter((p) => p.isVisible).length}개`,
    },
    {
      title: "셀럽 수",
      value: `${celebrities.length}명`,
      icon: <TeamOutlined />,
      color: "#ED4956",
      bg: "#FEF0F1",
      sub: `활성 ${celebrities.filter((c) => c.isActive).length}명`,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#181C32]">대시보드</h1>
          <p className="mt-0.5 text-xs text-[#7E8299]">C.O.D.E. 운영 현황을 확인하세요</p>
        </div>
        <Button icon={<DownloadOutlined />} size="small">
          리포트 다운로드
        </Button>
      </div>

      
      <div className="mb-6 grid grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
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
            <p className="text-xl font-bold text-[#181C32]">{kpi.value}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-[#7E8299]">
              <ArrowUpOutlined className="text-[#00C851]" />
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* 차트 & 테이블 */}
      <div className="grid grid-cols-3 gap-4">
        
        <Card title="셀럽별 매출" size="small" className="border-[#E4E6EF]">
          <div className="space-y-4">
            {celebSales.map((cs) => {
              const percent =
                totalCelebSales > 0 ? Math.round((cs.sales / totalCelebSales) * 100) : 0;
              return (
                <div key={cs.name}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-semibold text-[#181C32]">{cs.name}</span>
                    <span className="text-[#7E8299]">₩{cs.sales.toLocaleString("ko-KR")}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#E4E6EF]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${percent}%`, background: cs.gradient || "#3699FF" }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-[#A8A8A8]">
                    <span>점유율 {percent}%</span>
                    <span>미지급 커미션 ₩{cs.commission.toLocaleString("ko-KR")}</span>
                  </div>
                </div>
              );
            })}
            {celebSales.length === 0 && (
              <p className="text-center text-xs text-[#A8A8A8]">데이터 없음</p>
            )}
          </div>
        </Card>

        
        <Card title="요일별 매출" size="small" className="border-[#E4E6EF]">
          <div className="flex h-44 items-end gap-1.5">
            {dailyData.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                {d.amount > 0 && (
                  <span className="text-[9px] text-[#7E8299]">
                    {(d.amount / 10000).toFixed(0)}만
                  </span>
                )}
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[#3699FF] to-[#00D4FF] transition-all duration-700"
                  style={{ height: `${Math.max((d.amount / maxAmount) * 120, d.amount > 0 ? 4 : 0)}px` }}
                />
                <span className="text-[11px] font-semibold text-[#7E8299]">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>

        
        <Card title="최근 주문" size="small" className="border-[#E4E6EF]">
          <div className="space-y-2">
            {orders.slice(0, 5).map((order: Order) => {
              const cfg = statusConfig[order.status] ?? { label: order.status, color: "default" };
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg bg-[#F5F6FA] px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#181C32]">{order.orderNumber}</p>
                    <p className="text-[10px] text-[#7E8299]">
                      {order.items.map((i) => i.product.name).join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <Tag color={cfg.color} className="mb-0.5 text-[10px]">
                      {cfg.label}
                    </Tag>
                    <p className="text-[10px] text-[#7E8299]">
                      ₩{orderLiveTotal(order).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              );
            })}
            {orders.length === 0 && (
              <p className="text-center text-xs text-[#A8A8A8]">주문 없음</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
