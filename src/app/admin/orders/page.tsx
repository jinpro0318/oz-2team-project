"use client";

import { useState } from "react";
import { Card, Table, Tag, Button, Space, Spin } from "antd";
import { DownloadOutlined, EyeOutlined, SendOutlined, CheckOutlined } from "@ant-design/icons";
import { useAllOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import type { Order, OrderStatus } from "@/types";

const statusTabs = [
  { key: "all", label: "전체" },
  { key: "payment_complete", label: "결제완료" },
  { key: "preparing", label: "준비중" },
  { key: "shipping", label: "배송중" },
  { key: "delivered", label: "배송완료" },
  { key: "purchase_confirmed", label: "구매확정" },
];

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  payment_complete: { label: "결제완료", color: "blue" },
  preparing: { label: "준비중", color: "orange" },
  shipping: { label: "배송중", color: "green" },
  delivered: { label: "배송완료", color: "default" },
  cancelled: { label: "주문취소", color: "red" },
  exchange_requested: { label: "교환요청", color: "purple" },
  return_requested: { label: "반품요청", color: "purple" },
  purchase_confirmed: { label: "구매확정", color: "black" },
  payment_pending: { label: "결제대기", color: "gray" },
};

export default function AdminOrders() {
  const [activeTab, setActiveTab] = useState("all");
  const { data: orders = [], isLoading } = useAllOrders();
  const updateStatus = useUpdateOrderStatus();

  const filteredOrders = orders.filter(
    (o) => activeTab === "all" || o.status === activeTab
  );

  const handleShip = (order: Order) => {
    updateStatus.mutate({
      id: order.id,
      status: "shipping",
      timelineEntry: {
        status: "shipping",
        label: "배송 시작",
        date: new Date().toISOString(),
        description: "상품이 배송 시작되었습니다",
      },
    });
  };

  const handleDeliver = (order: Order) => {
    updateStatus.mutate({
      id: order.id,
      status: "delivered",
      timelineEntry: {
        status: "delivered",
        label: "배송 완료",
        date: new Date().toISOString(),
        description: "상품이 배송 완료되었습니다",
      },
    });
  };

  const columns = [
    { title: "주문번호", dataIndex: "orderNumber", key: "orderNumber", width: 160 },
    {
      title: "상품",
      key: "product",
      render: (_: unknown, r: Order) =>
        r.items.map((i) => `${i.product.name} (${i.quantity})`).join(", "),
    },
    {
      title: "고객",
      key: "customer",
      width: 100,
      render: (_: unknown, r: Order) => r.shippingAddress.recipient,
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
      render: (v: OrderStatus) => {
        const c = statusConfig[v];
        return <Tag color={c.color}>{c.label}</Tag>;
      },
    },
    {
      title: "관리",
      key: "actions",
      width: 160,
      render: (_: unknown, r: Order) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />}>상세</Button>
          {r.status === "payment_complete" && (
            <Button size="small" icon={<SendOutlined />} type="primary" onClick={() => handleShip(r)}>출고</Button>
          )}
          {r.status === "shipping" && (
            <Button size="small" icon={<CheckOutlined />} onClick={() => handleDeliver(r)}>완료</Button>
          )}
        </Space>
      ),
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#181C32]">주문 관리</h1>
        <Button icon={<DownloadOutlined />}>엑셀 다운로드</Button>
      </div>

      <Card size="small" className="border-[#E4E6EF]">
        <div className="mb-4 flex gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-[#3699FF] text-white"
                  : "bg-[#F5F6FA] text-[#7E8299] hover:bg-[#E4E6EF]"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Table
          dataSource={filteredOrders}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
