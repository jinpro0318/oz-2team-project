"use client";

import { Card, Select, Spin } from "antd";
import { useCelebrities } from "@/hooks/useCelebrities";
import { useAllProducts } from "@/hooks/useProducts";
import { useAllOrders } from "@/hooks/useOrders";

export default function AdminAnalytics() {
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: products = [], isLoading: prodLoading } = useAllProducts();
  const { data: orders = [], isLoading: ordersLoading } = useAllOrders();

  const isLoading = celebLoading || prodLoading || ordersLoading;

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const avgOrderAmount = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

  const celebSalesData = celebrities.map((celeb) => {
    const celebProds = products.filter((p) => p.celebrityId === celeb.id);
    const sales = celebProds.reduce((sum, p) => sum + p.price * p.salesCount, 0);
    return { name: celeb.name, sales };
  });
  const totalCelebSales = celebSalesData.reduce((sum, c) => sum + c.sales, 0);
  const celebShare = celebSalesData
    .map((c) => ({
      ...c,
      percent: totalCelebSales > 0 ? Math.round((c.sales / totalCelebSales) * 100) : 0,
    }))
    .sort((a, b) => b.percent - a.percent);

  const colors = ["#3699FF", "#00C851", "#FF6B35", "#ED4956", "#9B59B6"];

  const dayMap: Record<number, string> = { 0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토" };
  const dailyTotals: Record<string, number> = {};
  orders.forEach((o) => {
    const day = dayMap[new Date(o.createdAt).getDay()] ?? "?";
    dailyTotals[day] = (dailyTotals[day] ?? 0) + o.totalAmount;
  });
  const dailyData = ["월", "화", "수", "목", "금", "토", "일"].map((day) => ({
    day,
    amount: dailyTotals[day] ?? 0,
  }));
  const maxAmount = Math.max(...dailyData.map((d) => d.amount), 1);

  const kpis = [
    { title: "총 매출", value: `₩${totalRevenue.toLocaleString("ko-KR")}` },
    { title: "주문 건수", value: `${orders.length}건` },
    { title: "평균 주문금액", value: `₩${avgOrderAmount.toLocaleString("ko-KR")}` },
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#181C32]">매출 분석</h1>
        <Select defaultValue="weekly" className="w-24">
          <Select.Option value="daily">일별</Select.Option>
          <Select.Option value="weekly">주별</Select.Option>
          <Select.Option value="monthly">월별</Select.Option>
        </Select>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} size="small" className="border-[#E4E6EF]">
            <p className="text-xs text-[#7E8299]">{kpi.title}</p>
            <p className="mt-1 text-xl font-bold text-[#181C32]">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card title="요일별 매출 추이" size="small" className="col-span-2 border-[#E4E6EF]">
          <div className="flex h-48 items-end gap-3">
            {dailyData.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-[#7E8299]">
                  {d.amount > 0 ? `${(d.amount / 10000).toFixed(0)}만` : "-"}
                </span>
                <div
                  className="w-full rounded-t-md bg-[#3699FF]"
                  style={{ height: `${(d.amount / maxAmount) * 140}px` }}
                />
                <span className="text-xs font-semibold text-[#7E8299]">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="셀럽별 비중" size="small" className="border-[#E4E6EF]">
          <div className="space-y-4">
            {celebShare.map((cs, i) => (
              <div key={cs.name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold text-[#181C32]">{cs.name}</span>
                  <span className="text-[#7E8299]">{cs.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#E4E6EF]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${cs.percent}%`, background: colors[i % colors.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
