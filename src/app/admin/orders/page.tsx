"use client";

import { useState } from "react";
import { Card, Table, Tag, Button, Space, Spin, Drawer, Popconfirm, message, Timeline } from "antd";
import {
  DownloadOutlined,
  EyeOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAllOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import type { Order, OrderStatus } from "@/types";

const statusTabs = [
  { key: "all", label: "전체" },
  { key: "payment_complete", label: "결제완료" },
  { key: "preparing", label: "준비중" },
  { key: "shipping", label: "배송중" },
  { key: "delivered", label: "배송완료" },
  { key: "exchange_requested", label: "교환요청" },
  { key: "return_requested", label: "반품요청" },
  { key: "purchase_confirmed", label: "구매확정" },
];

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  payment_complete: { label: "결제완료", color: "blue" },
  payment_pending: { label: "결제대기", color: "default" },
  preparing: { label: "준비중", color: "orange" },
  shipping: { label: "배송중", color: "green" },
  delivered: { label: "배송완료", color: "cyan" },
  cancelled: { label: "주문취소", color: "red" },
  exchange_requested: { label: "교환요청", color: "purple" },
  return_requested: { label: "반품요청", color: "purple" },
  purchase_confirmed: { label: "구매확정", color: "geekblue" },
};

export default function AdminOrders() {
  const [activeTab, setActiveTab] = useState("all");
  const [drawerOrder, setDrawerOrder] = useState<Order | null>(null);
  const { data: orders = [], isLoading } = useAllOrders();
  const updateStatus = useUpdateOrderStatus();

  const filteredOrders = orders.filter(
    (o) => activeTab === "all" || o.status === activeTab
  );

  const tabCounts = statusTabs.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.key] = tab.key === "all"
      ? orders.length
      : orders.filter((o) => o.status === tab.key).length;
    return acc;
  }, {});

  const handleShip = async (order: Order) => {
    // [효진] 배송 시작 처리: 상태 변경 + 타임라인 자동 추가
    await updateStatus.mutateAsync({
      id: order.id,
      status: "shipping",
      timelineEntry: {
        status: "shipping",
        label: "배송 시작",
        date: new Date().toISOString(),
        description: "상품이 배송 시작되었습니다",
      },
    });
    message.success("배송 처리 완료");
    if (drawerOrder?.id === order.id) setDrawerOrder({ ...order, status: "shipping" });
  };

  const handleDeliver = async (order: Order) => {
    await updateStatus.mutateAsync({
      id: order.id,
      status: "delivered",
      timelineEntry: {
        status: "delivered",
        label: "배송 완료",
        date: new Date().toISOString(),
        description: "상품이 배송 완료되었습니다",
      },
    });
    message.success("배송완료 처리");
    if (drawerOrder?.id === order.id) setDrawerOrder({ ...order, status: "delivered" });
  };

  const handleCancel = async (order: Order) => {
    // [효진] 주문 취소 처리
    await updateStatus.mutateAsync({
      id: order.id,
      status: "cancelled",
      timelineEntry: {
        status: "cancelled",
        label: "주문 취소",
        date: new Date().toISOString(),
        description: "주문이 취소 처리되었습니다",
      },
    });
    message.success("주문이 취소되었습니다");
    setDrawerOrder(null);
  };

  const columns = [
    {
      title: "주문번호",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 160,
      render: (v: string) => (
        <span className="font-mono text-xs font-semibold text-[#181C32]">{v}</span>
      ),
    },
    {
      title: "상품",
      key: "product",
      render: (_: unknown, r: Order) => (
        <span className="text-xs">
          {r.items.map((i) => `${i.product.name}(${i.quantity})`).join(", ")}
        </span>
      ),
    },
    {
      title: "고객",
      key: "customer",
      width: 80,
      render: (_: unknown, r: Order) => (
        <span className="text-xs">{r.shippingAddress.recipient}</span>
      ),
    },
    {
      title: "금액",
      dataIndex: "totalAmount",
      key: "amount",
      width: 110,
      render: (v: number) => (
        <span className="text-xs font-semibold">₩{v.toLocaleString("ko-KR")}</span>
      ),
    },
    {
      title: "주문일",
      dataIndex: "createdAt",
      key: "date",
      width: 100,
      render: (v: string) => (
        <span className="text-xs text-[#7E8299]">{dayjs(v).format("MM/DD HH:mm")}</span>
      ),
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (v: OrderStatus) => {
        const c = statusConfig[v] ?? { label: v, color: "default" };
        return <Tag color={c.color}>{c.label}</Tag>;
      },
    },
    {
      title: "관리",
      key: "actions",
      width: 170,
      render: (_: unknown, r: Order) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDrawerOrder(r)}>
            상세
          </Button>
          {r.status === "payment_complete" && (
            <Button
              size="small"
              type="primary"
              icon={<SendOutlined />}
              loading={updateStatus.isPending}
              onClick={() => handleShip(r)}
            >
              출고
            </Button>
          )}
          {r.status === "shipping" && (
            <Button
              size="small"
              icon={<CheckOutlined />}
              loading={updateStatus.isPending}
              onClick={() => handleDeliver(r)}
            >
              완료
            </Button>
          )}
          {(r.status === "payment_complete" || r.status === "preparing") && (
            <Popconfirm
              title="주문을 취소하시겠습니까?"
              onConfirm={() => handleCancel(r)}
              okText="취소 처리"
              cancelText="닫기"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger icon={<CloseOutlined />} />
            </Popconfirm>
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
        <div>
          <h1 className="text-xl font-bold text-[#181C32]">주문 관리</h1>
          <p className="mt-0.5 text-xs text-[#7E8299]">총 {orders.length}건</p>
        </div>
        <Button icon={<DownloadOutlined />} size="small">
          엑셀 다운로드
        </Button>
      </div>

      <Card size="small" className="border-[#E4E6EF]">
        {/* 상태 탭 */}
        <div className="mb-4 flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-[#3699FF] text-white"
                  : "bg-[#F5F6FA] text-[#7E8299] hover:bg-[#E4E6EF]"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${
                    activeTab === tab.key ? "bg-white/20 text-white" : "bg-[#E4E6EF] text-[#7E8299]"
                  }`}
                >
                  {tabCounts[tab.key]}
                </span>
              )}
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

      {/* 주문 상세 드로어 */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <span className="font-bold">주문 상세</span>
            {drawerOrder && (
              <Tag color={statusConfig[drawerOrder.status]?.color ?? "default"}>
                {statusConfig[drawerOrder.status]?.label ?? drawerOrder.status}
              </Tag>
            )}
          </div>
        }
        open={!!drawerOrder}
        onClose={() => setDrawerOrder(null)}
        width={480}
        extra={
          drawerOrder && (
            <Space>
              {drawerOrder.status === "payment_complete" && (
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined />}
                  loading={updateStatus.isPending}
                  onClick={() => handleShip(drawerOrder)}
                >
                  출고 처리
                </Button>
              )}
              {drawerOrder.status === "shipping" && (
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  loading={updateStatus.isPending}
                  onClick={() => handleDeliver(drawerOrder)}
                >
                  배송완료
                </Button>
              )}
            </Space>
          )
        }
      >
        {drawerOrder && (
          <div className="space-y-5">
            {/* 주문번호 */}
            <div className="rounded-lg bg-[#F5F6FA] px-4 py-3">
              <p className="text-[10px] text-[#7E8299]">주문번호</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-[#181C32]">
                {drawerOrder.orderNumber}
              </p>
              <p className="mt-0.5 text-[11px] text-[#7E8299]">
                {dayjs(drawerOrder.createdAt).format("YYYY-MM-DD HH:mm")}
              </p>
            </div>

            {/* 주문 상품 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[#181C32]">주문 상품</p>
              <div className="space-y-2">
                {drawerOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg border border-[#E4E6EF] p-3">
                    <div className="h-14 w-11 shrink-0 rounded-md bg-gradient-to-br from-gray-200 to-gray-300" />
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase text-[#7E8299]">
                        {item.product.brand}
                      </p>
                      <p className="text-xs font-bold text-[#181C32]">{item.product.name}</p>
                      <p className="text-[10px] text-[#A8A8A8]">
                        {item.color} / {item.size} / {item.quantity}개
                      </p>
                    </div>
                    <p className="text-xs font-semibold">₩{(item.price * item.quantity).toLocaleString("ko-KR")}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 배송지 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[#181C32]">배송지</p>
              <div className="rounded-lg border border-[#E4E6EF] p-3">
                <p className="text-xs font-bold text-[#181C32]">{drawerOrder.shippingAddress.recipient}</p>
                <p className="text-xs text-[#7E8299]">{drawerOrder.shippingAddress.phone}</p>
                <p className="text-xs text-[#7E8299]">
                  [{drawerOrder.shippingAddress.zipCode}]{" "}
                  {drawerOrder.shippingAddress.address} {drawerOrder.shippingAddress.addressDetail}
                </p>
              </div>
            </div>

            {/* 결제 정보 */}
            <div>
              <p className="mb-2 text-xs font-semibold text-[#181C32]">결제 정보</p>
              <div className="rounded-lg border border-[#E4E6EF] p-3 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-[#7E8299]">결제 수단</span>
                  <span>{drawerOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#7E8299]">배송비</span>
                  <span>₩{drawerOrder.shippingFee.toLocaleString("ko-KR")}</span>
                </div>
                <div className="flex justify-between border-t border-[#E4E6EF] pt-2 font-bold">
                  <span className="text-[#181C32]">총 결제금액</span>
                  <span className="text-[#3699FF]">₩{drawerOrder.totalAmount.toLocaleString("ko-KR")}</span>
                </div>
              </div>
            </div>

            {/* 타임라인 */}
            <div>
              <p className="mb-3 text-xs font-semibold text-[#181C32]">주문 이력</p>
              <Timeline
                items={drawerOrder.timeline?.map((t) => ({
                  children: (
                    <div>
                      <p className="text-xs font-semibold text-[#181C32]">{t.label}</p>
                      {t.description && (
                        <p className="text-[11px] text-[#7E8299]">{t.description}</p>
                      )}
                      <p className="text-[10px] text-[#A8A8A8]">
                        {dayjs(t.date).format("YYYY-MM-DD HH:mm")}
                      </p>
                    </div>
                  ),
                })) ?? []}
              />
            </div>

            {/* 취소 버튼 */}
            {(drawerOrder.status === "payment_complete" || drawerOrder.status === "preparing") && (
              <Popconfirm
                title="주문을 취소 처리하시겠습니까?"
                onConfirm={() => handleCancel(drawerOrder)}
                okText="취소 처리"
                cancelText="닫기"
                okButtonProps={{ danger: true }}
              >
                <Button danger block icon={<CloseOutlined />}>
                  주문 취소
                </Button>
              </Popconfirm>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
