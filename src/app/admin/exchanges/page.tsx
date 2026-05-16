"use client";

import { useState } from "react";
import { Card, Table, Tag, Button, Space, Spin, App } from "antd";
import { RetweetOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useAllExchanges, useUpdateExchangeStatus, useExecuteOrderAction } from "@/hooks/useOrders";
import type { Exchange } from "@/types";
import dayjs from "dayjs";

/**
 * [효진] 어드민 교환/반품 관리 페이지
 */
export default function AdminExchangesPage() {
  return (
    <App>
      <AdminExchanges />
    </App>
  );
}

function AdminExchanges() {
  const { message } = App.useApp();
  const { data: exchanges = [], isLoading } = useAllExchanges();
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
          <h1 className="text-xl font-bold text-[#181C32]">교환/반품 관리</h1>
          <p className="mt-0.5 text-xs text-[#7E8299]">총 {exchanges.length}건의 요청이 있습니다.</p>
        </div>
      </div>

      <Card size="small" className="border-[#E4E6EF]">
        <Table
          dataSource={exchanges}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
