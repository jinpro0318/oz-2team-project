"use client";

import { useState } from "react";
import { Card, Table, Tag, Button, Spin, Popconfirm, App } from "antd"; // [효진] App 추가
import { DollarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useCelebrities } from "@/hooks/useCelebrities";
import { useAllProducts } from "@/hooks/useProducts";
import { useAllOrders } from "@/hooks/useOrders"; // [효진] 실시간 정산액 계산용 추가
import { useSettlements, useProcessSettlement, useCreateSettlement } from "@/hooks/useSettlements";
import type { Celebrity, Product, Settlement } from "@/types";
import dayjs from "dayjs";

/**
 * [효진] 정산 관리 페이지 래퍼
 * Ant Design 컨텍스트(message, modal) 안정성을 위해 App으로 감쌈
 */
export default function AdminSettlementsPage() {
  return (
    <App>
      <AdminSettlements />
    </App>
  );
}

function AdminSettlements() {
  const { message } = App.useApp(); // [효진] 컨텍스트 메시지 사용
  const [processing, setProcessing] = useState<string | null>(null);

  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: products = [], isLoading: prodLoading } = useAllProducts();
  const { data: orders = [], isLoading: orderLoading } = useAllOrders(); // [효진] 실시간 판매 데이터 로드
  const { data: settlements = [], isLoading: settlementLoading } = useSettlements();
  const processSettlement = useProcessSettlement();
  const createSettlement = useCreateSettlement();

  const isLoading = celebLoading || prodLoading || settlementLoading || orderLoading;

  // 셀럽별 미지급 커미션 계산 (정산 완료 건 제외)
  const currentPeriod = dayjs().format("YYYY-MM");

  const settlementRows = celebrities.map((celeb) => {
    // [효진] 실제 주문(취소 제외)에서 해당 셀럽의 상품 판매액 합산
    const totalSales = orders.reduce((sum, order) => {
      if (order.status === "cancelled") return sum;
      const celebItems = order.items.filter(item => {
        const prod = products.find(p => p.id === item.productId);
        return prod?.celebrityId === celeb.id;
      });
      const orderCelebTotal = celebItems.reduce((s, item) => s + (item.price * item.quantity), 0);
      return sum + orderCelebTotal;
    }, 0);

    const commissionAmount = Math.floor(totalSales * (celeb.commissionRate / 100));

    // 이번 달 정산 내역 조회
    const existingSettlement = settlements.find(
      (s) => s.celebrityId === celeb.id && s.period === currentPeriod
    );

    return {
      key: celeb.id,
      celebId: celeb.id,
      celebName: celeb.name,
      gradient: celeb.gradient,
      totalSales,
      commissionRate: celeb.commissionRate,
      commissionAmount,
      settlementId: existingSettlement?.id ?? null,
      status: existingSettlement?.status ?? ("unpaid" as const),
      paidAt: existingSettlement?.paidAt,
    };
  });

  const totalUnpaid = settlementRows
    .filter((r) => r.status === "unpaid")
    .reduce((sum, r) => sum + r.commissionAmount, 0);
  const totalPaid = settlementRows
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.commissionAmount, 0);
  const totalSalesAll = settlementRows.reduce((sum, r) => sum + r.totalSales, 0);

  const handleProcess = async (row: typeof settlementRows[0]) => {
    setProcessing(row.celebId);
    try {
      if (row.settlementId) {
        await processSettlement.mutateAsync(row.settlementId);
      } else {
        await createSettlement.mutateAsync({
          celebrityId: row.celebId,
          celebName: row.celebName,
          period: currentPeriod,
          totalSales: row.totalSales,
          commissionRate: row.commissionRate,
          commissionAmount: row.commissionAmount,
          status: "paid",
          paidAt: new Date().toISOString(),
        });
      }
      message.success(`${row.celebName} 정산 처리 완료`);
    } catch (err: any) {
      console.error("[효진] 정산 에러:", err);
      message.error("정산 처리에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkProcess = async () => {
    const unpaidRows = settlementRows.filter((r) => r.status === "unpaid");
    for (const row of unpaidRows) {
      await handleProcess(row);
    }
    message.success("일괄 정산 처리 완료");
  };

  const columns = [
    {
      title: "셀럽",
      key: "celeb",
      width: 120,
      render: (_: unknown, r: typeof settlementRows[0]) => (
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: r.gradient }}
          >
            {r.celebName[0]}
          </div>
          <span className="text-xs font-semibold text-[#181C32]">{r.celebName}</span>
        </div>
      ),
    },
    {
      title: "기간",
      key: "period",
      width: 100,
      render: () => (
        <span className="text-xs text-[#7E8299]">{currentPeriod}</span>
      ),
    },
    {
      title: "판매액",
      dataIndex: "totalSales",
      key: "sales",
      width: 150,
      render: (v: number) => (
        <span className="text-xs">₩{v.toLocaleString("ko-KR")}</span>
      ),
    },
    {
      title: "커미션율",
      dataIndex: "commissionRate",
      key: "rate",
      width: 90,
      render: (v: number) => (
        <span className="text-xs font-semibold text-[#3699FF]">{v}%</span>
      ),
    },
    {
      title: "커미션",
      dataIndex: "commissionAmount",
      key: "commission",
      width: 150,
      render: (v: number, r: typeof settlementRows[0]) => (
        <span
          className="text-xs font-bold"
          style={{ color: r.status === "paid" ? "#00C851" : "#ED4956" }}
        >
          ₩{v.toLocaleString("ko-KR")}
        </span>
      ),
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (v: string, r: typeof settlementRows[0]) => (
        <div>
          {v === "paid" ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>정산완료</Tag>
          ) : (
            <Tag color="orange">미정산</Tag>
          )}
          {v === "paid" && r.paidAt && (
            <p className="mt-0.5 text-[9px] text-[#A8A8A8]">
              {dayjs(r.paidAt).format("MM/DD HH:mm")}
            </p>
          )}
        </div>
      ),
    },
    {
      title: "처리",
      key: "actions",
      width: 110,
      render: (_: unknown, r: typeof settlementRows[0]) => (
        <Popconfirm
          title={`${r.celebName}에게 ₩${r.commissionAmount.toLocaleString("ko-KR")} 정산하시겠습니까?`}
          onConfirm={() => handleProcess(r)}
          okText="정산 처리"
          cancelText="취소"
          disabled={r.status === "paid"}
        >
          <Button
            size="small"
            type="primary"
            disabled={r.status === "paid"}
            loading={processing === r.celebId}
            icon={<DollarOutlined />}
          >
            정산 처리
          </Button>
        </Popconfirm>
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
          <h1 className="text-xl font-bold text-[#181C32]">정산 관리</h1>
          <p className="mt-0.5 text-xs text-[#7E8299]">셀럽 커미션 정산 — {currentPeriod}</p>
        </div>
        <Popconfirm
          title={`미정산 ${settlementRows.filter((r) => r.status === "unpaid").length}건을 일괄 정산 처리하시겠습니까?`}
          onConfirm={handleBulkProcess}
          okText="일괄 정산"
          cancelText="취소"
          disabled={settlementRows.every((r) => r.status === "paid")}
        >
          <Button
            type="primary"
            icon={<DollarOutlined />}
            disabled={settlementRows.every((r) => r.status === "paid")}
          >
            일괄 정산 처리
          </Button>
        </Popconfirm>
      </div>

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#E4E6EF] bg-white p-4 shadow-sm">
          <p className="text-xs text-[#7E8299]">총 판매액</p>
          <p className="mt-1 text-xl font-bold text-[#181C32]">
            ₩{totalSalesAll.toLocaleString("ko-KR")}
          </p>
          <p className="mt-1 text-[11px] text-[#7E8299]">셀럽 {celebrities.length}명 합산</p>
        </div>
        <div className="rounded-xl border border-[#FFA800]/30 bg-[#FFFBF0] p-4 shadow-sm">
          <p className="text-xs text-[#7E8299]">미지급 총액</p>
          <p className="mt-1 text-xl font-bold text-[#FFA800]">
            ₩{totalUnpaid.toLocaleString("ko-KR")}
          </p>
          <p className="mt-1 text-[11px] text-[#7E8299]">
            {settlementRows.filter((r) => r.status === "unpaid").length}건 미정산
          </p>
        </div>
        <div className="rounded-xl border border-[#00C851]/30 bg-[#EAFAF1] p-4 shadow-sm">
          <p className="text-xs text-[#7E8299]">정산 완료액</p>
          <p className="mt-1 text-xl font-bold text-[#00C851]">
            ₩{totalPaid.toLocaleString("ko-KR")}
          </p>
          <p className="mt-1 text-[11px] text-[#7E8299]">
            {settlementRows.filter((r) => r.status === "paid").length}건 완료
          </p>
        </div>
      </div>

      <Card size="small" className="border-[#E4E6EF]">
        <Table
          dataSource={settlementRows}
          columns={columns}
          size="small"
          pagination={false}
        />
      </Card>
    </div>
  );
}
