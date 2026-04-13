"use client";

import { Card, Table, Tag, Button, Spin } from "antd";
import {
  DollarOutlined,
  ShoppingCartOutlined,
  UserAddOutlined,
  HeartOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useAllOrders } from "@/hooks/useOrders";
import { useCelebrities } from "@/hooks/useCelebrities";
import { useAllProducts } from "@/hooks/useProducts";
import type { Order } from "@/types";

export default function AdminDashboard() {
  const { data: orders = [], isLoading: ordersLoading } = useAllOrders();
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: products = [], isLoading: prodLoading } = useAllProducts();

  const isLoading = ordersLoading || celebLoading || prodLoading;

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  const celebSales = celebrities.map((celeb) => {
    const celebProducts = products.filter((p) => p.celebrityId === celeb.id);
    const sales = celebProducts.reduce((sum, p) => sum + p.price * p.salesCount, 0);
    const commission = Math.floor(sales * (celeb.commissionRate / 100));
    return { name: celeb.name, sales, commission };
  }).sort((a, b) => b.sales - a.sales);

  const totalCelebSales = celebSales.reduce((sum, c) => sum + c.sales, 0);

  const kpiCards = [
    { title: "총 매출", value: `₩${totalRevenue.toLocaleString("ko-KR")}`, icon: <DollarOutlined />, color: "#3699FF" },
    { title: "주문 수", value: `${orders.length}`, icon: <ShoppingCartOutlined />, color: "#00C851" },
    { title: "상품 수", value: `${products.length}`, icon: <UserAddOutlined />, color: "#FF6B35" },
    { title: "셀럽 수", value: `${celebrities.length}`, icon: <HeartOutlined />, color: "#ED4956" },
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
        <h1 className="text-xl font-bold text-[#181C32]">대시보드</h1>
        <Button icon={<DownloadOutlined />}>리포트 다운로드</Button>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} size="small" className="border-[#E4E6EF]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#7E8299]">{kpi.title}</p>
                <p className="mt-1 text-xl font-bold text-[#181C32]">{kpi.value}</p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-white"
                style={{ background: kpi.color }}
              >
                {kpi.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card title="셀럽별 매출" size="small" className="col-span-1 border-[#E4E6EF]">
          <div className="space-y-3">
            {celebSales.map((cs) => {
              const percent = totalCelebSales > 0 ? Math.round((cs.sales / totalCelebSales) * 100) : 0;
              return (
                <div key={cs.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-[#181C32]">{cs.name}</span>
                    <span className="text-[#7E8299]">₩{cs.sales.toLocaleString("ko-KR")}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E4E6EF]">
                    <div
                      className="h-full rounded-full bg-[#3699FF]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-[#7E8299]">
                    미지급 커미션: ₩{cs.commission.toLocaleString("ko-KR")}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="최근 주문" size="small" className="col-span-2 border-[#E4E6EF]">
          <Table
            dataSource={orders.slice(0, 5)}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: "주문번호", dataIndex: "orderNumber", key: "orderNumber", width: 160 },
              {
                title: "상품",
                key: "product",
                render: (_: unknown, r: Order) => r.items.map((i) => i.product.name).join(", "),
              },
              {
                title: "금액",
                dataIndex: "totalAmount",
                key: "amount",
                width: 120,
                render: (v: number) => `₩${v.toLocaleString("ko-KR")}`,
              },
              {
                title: "상태",
                dataIndex: "status",
                key: "status",
                width: 100,
                render: (v: string) => {
                  const map: Record<string, { label: string; color: string }> = {
                    payment_complete: { label: "결제완료", color: "blue" },
                    preparing: { label: "준비중", color: "orange" },
                    shipping: { label: "배송중", color: "green" },
                    delivered: { label: "배송완료", color: "default" },
                    cancelled: { label: "주문취소", color: "red" },
                  };
                  const c = map[v] ?? { label: v, color: "default" };
                  return <Tag color={c.color}>{c.label}</Tag>;
                },
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
