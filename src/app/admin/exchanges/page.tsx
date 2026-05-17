"use client";

import { useState } from "react";
import { Card, Table, Tag, Button, Space, Spin, App } from "antd";
import { RetweetOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useAllExchanges, useUpdateExchangeStatus, useExecuteOrderAction, useAllOrders } from "@/hooks/useOrders";
import { useCelebrities } from "@/hooks/useCelebrities";
import { useAllProducts } from "@/hooks/useProducts";
import type { Exchange } from "@/types";
import dayjs from "dayjs";


export default function AdminExchangesPage() {
  return (
    <App>
      <AdminExchanges />
    </App>
  );
}

function AdminExchanges() {
  const { message } = App.useApp();
  const [selectedCelebId, setSelectedCelebId] = useState<string>("");
  
  const { data: exchanges = [], isLoading: isLoadingExchanges } = useAllExchanges();
  const { data: orders = [], isLoading: isLoadingOrders } = useAllOrders();
  const { data: products = [], isLoading: isLoadingProducts } = useAllProducts();
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  
  const updateExchangeStatus = useUpdateExchangeStatus();
  const executeAction = useExecuteOrderAction();

  const handleApprove = async (exchange: Exchange) => {
    try {
      // 1. 교환/반품 상태를 '처리중'으로 변경
      await updateExchangeStatus.mutateAsync({ id: exchange.id, status: "processing" });
      
      // 2. 엔진을 통해 수거 지시 및 물류 상태 동기화
      await executeAction.mutateAsync({
        id: exchange.orderId,
        action: "RETURN_PICKUP",
      });

      message.success("요청이 승인되었습니다.");
    } catch (err) {
      message.error("처리 중 오류가 발생했습니다.");
    }
  };

  const handleComplete = async (exchange: Exchange) => {
    try {
      // 1. 교환/반품 상태를 '완료됨'으로 변경
      await updateExchangeStatus.mutateAsync({ id: exchange.id, status: "completed" });
      
      // 2. 엔진을 통해 물류 및 재고 상태 최종 업데이트
      await executeAction.mutateAsync({
        id: exchange.orderId,
        action: exchange.type === "exchange" ? "EXCHANGE_DONE" : "DELIVER",
      });

      message.success("처리가 완료되었습니다.");
    } catch (err) {
      message.error("처리 중 오류가 발생했습니다.");
    }
  };

  const columns = [
    {
      title: "접수번호",
      dataIndex: "ticketNumber",
      key: "ticket",
      render: (v: string) => <span className="text-xs font-bold">{v}</span>,
    },
    {
      title: "유형",
      dataIndex: "type",
      key: "type",
      render: (v: string) => (
        <Tag color={v === "exchange" ? "blue" : "magenta"}>
          {v === "exchange" ? "교환" : "반품"}
        </Tag>
      ),
    },
    {
      title: "사유",
      key: "reason",
      render: (_: unknown, r: Exchange) => (
        <div>
          <p className="text-xs font-semibold">{r.reason}</p>
          {r.reasonDetail && <p className="text-[10px] text-gray-500">{r.reasonDetail}</p>}
        </div>
      ),
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (v: string) => {
        const colors: Record<string, string> = {
          requested: "orange",
          processing: "blue",
          completed: "green",
        };
        const labels: Record<string, string> = {
          requested: "접수됨",
          processing: "처리중",
          completed: "완료됨",
        };
        return <Tag color={colors[v]}>{labels[v]}</Tag>;
      },
    },
    {
      title: "접수일",
      dataIndex: "createdAt",
      key: "date",
      render: (v: string) => (
        <span className="text-xs text-gray-500">
          {dayjs(v).format("YYYY-MM-DD HH:mm")}
        </span>
      ),
    },
    {
      title: "관리",
      key: "actions",
      render: (_: unknown, r: Exchange) => (
        <Space>
          {r.status === "requested" && (
            <Button 
              size="small" 
              type="primary" 
              loading={updateExchangeStatus.isPending || executeAction.isPending}
              onClick={() => handleApprove(r)}
            >
              승인
            </Button>
          )}
          {r.status === "processing" && (
            <Button 
              size="small" 
              icon={<CheckCircleOutlined />} 
              loading={updateExchangeStatus.isPending || executeAction.isPending}
              onClick={() => handleComplete(r)}
            >
              완료 처리
            </Button>
          )}
        </Space>
      ),
    },
  ];


  const isLoadingAll = isLoadingExchanges || isLoadingOrders || isLoadingProducts;

  if (isLoadingAll) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const filteredExchanges = exchanges.filter((exc) => {
    if (!selectedCelebId) return true;
    const relatedOrder = orders.find((o) => o.id === exc.orderId);
    const item = relatedOrder?.items?.[exc.orderItemIndex]; // 🛡️ 이중 안전 가드
    const prod = products.find((p) => p.id === item?.productId);
    const celebId = prod?.celebrityId || item?.product?.celebrityId;
    return celebId === selectedCelebId;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#181C32]">교환/반품 관리</h1>
          <p className="mt-0.5 text-xs text-[#7E8299]">총 {filteredExchanges.length}건의 요청이 있습니다.</p>
        </div>
      </div>

      {/* 셀럽 아바타 필터 스트립 */}
      <div className="mb-6 overflow-x-auto pb-4 hide-scrollbar">
        <div className="flex gap-4 min-w-max px-1">
          <button
            onClick={() => setSelectedCelebId("")}
            className={`flex flex-col items-center gap-2 group outline-none`}
          >
            <div
              className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all duration-300
                ${
                  !selectedCelebId
                    ? "bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md ring-4 ring-indigo-100"
                    : "bg-gray-100 group-hover:bg-gray-200 border-2 border-dashed border-gray-300"
                }
              `}
            >
              <span
                className={`text-sm font-bold ${!selectedCelebId ? "text-white" : "text-gray-500"}`}
              >
                ALL
              </span>
            </div>
            <span className={`text-[11px] font-semibold ${!selectedCelebId ? "text-gray-900" : "text-gray-500"}`}>
              전체
            </span>
          </button>
          
          {celebLoading && <Spin size="small" className="mt-5 ml-4" />}

          {celebrities.map((celeb) => {
            const isSelected = selectedCelebId === celeb.id;
            return (
              <button
                key={celeb.id}
                onClick={() => setSelectedCelebId(celeb.id)}
                className={`flex flex-col items-center gap-2 group outline-none transition-transform duration-200 ${
                  isSelected ? "scale-105" : "hover:scale-105"
                }`}
              >
                <div
                  className={`w-[60px] h-[60px] rounded-full p-[2.5px] transition-all duration-300 ${
                    isSelected
                      ? "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 shadow-md"
                      : "bg-gray-200 group-hover:bg-gradient-to-tr group-hover:from-gray-300 group-hover:to-gray-400"
                  }`}
                >
                  <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src={celeb.avatarUrl || "/images/default-avatar.png"}
                      alt={celeb.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallbackDiv = document.createElement("div");
                        fallbackDiv.className = "w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 font-bold text-lg";
                        fallbackDiv.innerText = celeb.name.charAt(0);
                        target.parentElement?.appendChild(fallbackDiv);
                      }}
                    />
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    isSelected ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {celeb.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Card size="small" className="border-[#E4E6EF]">
        <Table
          dataSource={filteredExchanges}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
