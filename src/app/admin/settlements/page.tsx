"use client";

import { Card, Table, Tag, Button, Spin } from "antd";
import { DollarOutlined } from "@ant-design/icons";
import { useCelebrities } from "@/hooks/useCelebrities";
import { useAllProducts } from "@/hooks/useProducts";

interface SettlementRow {
  key: string;
  celebName: string;
  totalSales: number;
  commissionRate: number;
  unpaidCommission: number;
  status: "unpaid" | "paid";
}

export default function AdminSettlements() {
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: products = [], isLoading: prodLoading } = useAllProducts();

  const isLoading = celebLoading || prodLoading;

  const settlementData: SettlementRow[] = celebrities.map((celeb) => {
    const celebProducts = products.filter((p) => p.celebrityId === celeb.id);
    const totalSales = celebProducts.reduce(
      (sum, p) => sum + p.price * Math.floor(p.salesCount * 0.1),
      0
    );
    const unpaidCommission = Math.floor(totalSales * (celeb.commissionRate / 100));

    return {
      key: celeb.id,
      celebName: celeb.name,
      totalSales,
      commissionRate: celeb.commissionRate,
      unpaidCommission,
      status: "unpaid" as const,
    };
  });

  const totalUnpaid = settlementData.reduce((sum, r) => sum + r.unpaidCommission, 0);
  const totalSales = settlementData.reduce((sum, r) => sum + r.totalSales, 0);

  const columns = [
    { title: "셀럽", dataIndex: "celebName", key: "celeb", width: 100 },
    {
      title: "판매액",
      dataIndex: "totalSales",
      key: "sales",
      width: 150,
      render: (v: number) => `₩${v.toLocaleString("ko-KR")}`,
    },
    {
      title: "커미션율",
      dataIndex: "commissionRate",
      key: "rate",
      width: 100,
      render: (v: number) => `${v}%`,
    },
    {
      title: "미지급 커미션",
      dataIndex: "unpaidCommission",
      key: "unpaid",
      width: 150,
      render: (v: number) => (
        <span className="font-bold text-[#ED4956]">₩{v.toLocaleString("ko-KR")}</span>
      ),
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (v: string) =>
        v === "paid" ? <Tag color="green">정산완료</Tag> : <Tag color="orange">미정산</Tag>,
    },
    {
      title: "관리",
      key: "actions",
      width: 120,
      render: (_: unknown, r: SettlementRow) => (
        <Button size="small" type="primary" disabled={r.status === "paid"}>
          정산 처리
        </Button>
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
        <h1 className="text-xl font-bold text-[#181C32]">정산 관리</h1>
        <Button type="primary" icon={<DollarOutlined />}>
          일괄 정산 처리
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card size="small" className="border-[#E4E6EF]">
          <p className="text-xs text-[#7E8299]">총 판매액</p>
          <p className="mt-1 text-xl font-bold text-[#181C32]">₩{totalSales.toLocaleString("ko-KR")}</p>
        </Card>
        <Card size="small" className="border-[#E4E6EF]">
          <p className="text-xs text-[#7E8299]">미지급 총액</p>
          <p className="mt-1 text-xl font-bold text-[#ED4956]">₩{totalUnpaid.toLocaleString("ko-KR")}</p>
        </Card>
        <Card size="small" className="border-[#E4E6EF]">
          <p className="text-xs text-[#7E8299]">셀럽 수</p>
          <p className="mt-1 text-xl font-bold text-[#181C32]">{celebrities.length}명</p>
        </Card>
      </div>

      <Card size="small" className="border-[#E4E6EF]">
        <Table
          dataSource={settlementData}
          columns={columns}
          size="small"
          pagination={false}
        />
      </Card>
    </div>
  );
}
