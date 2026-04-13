"use client";

import { Card, Table, Tag, Button, Input, Select, Space, Spin } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, EyeInvisibleOutlined, DeleteOutlined } from "@ant-design/icons";
import { useAllProducts } from "@/hooks/useProducts";
import { useCelebrities } from "@/hooks/useCelebrities";
import type { Product } from "@/types";

export default function AdminProducts() {
  const { data: products = [], isLoading: prodLoading } = useAllProducts();
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();

  const isLoading = prodLoading || celebLoading;

  const columns = [
    {
      title: "상품",
      key: "product",
      width: 280,
      render: (_: unknown, r: Product) => (
        <div className="flex items-center gap-3">
          <div className="h-12 w-10 shrink-0 rounded bg-gradient-to-br from-gray-200 to-gray-300" />
          <div>
            <p className="text-[10px] font-semibold uppercase text-[#7E8299]">{r.brand}</p>
            <p className="text-xs font-bold text-[#181C32]">{r.name}</p>
          </div>
        </div>
      ),
    },
    {
      title: "셀럽",
      key: "celeb",
      width: 80,
      render: (_: unknown, r: Product) => {
        const celeb = celebrities.find((c) => c.id === r.celebrityId);
        return <span className="text-xs">{celeb?.name ?? "-"}</span>;
      },
    },
    {
      title: "가격",
      dataIndex: "price",
      key: "price",
      width: 120,
      render: (v: number) => `₩${v.toLocaleString("ko-KR")}`,
    },
    {
      title: "판매수",
      dataIndex: "salesCount",
      key: "sales",
      width: 80,
      sorter: (a: Product, b: Product) => a.salesCount - b.salesCount,
      render: (v: number) => v.toLocaleString("ko-KR"),
    },
    {
      title: "상태",
      dataIndex: "isVisible",
      key: "visible",
      width: 80,
      render: (v: boolean) =>
        v ? <Tag color="green">판매중</Tag> : <Tag color="default">숨김</Tag>,
    },
    {
      title: "관리",
      key: "actions",
      width: 140,
      render: () => (
        <Space>
          <Button size="small" icon={<EditOutlined />} />
          <Button size="small" icon={<EyeInvisibleOutlined />} />
          <Button size="small" danger icon={<DeleteOutlined />} />
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
        <h1 className="text-xl font-bold text-[#181C32]">상품 관리</h1>
        <Button type="primary" icon={<PlusOutlined />}>
          상품 등록
        </Button>
      </div>

      <Card size="small" className="border-[#E4E6EF]">
        <div className="mb-4 flex items-center gap-3">
          <Input prefix={<SearchOutlined />} placeholder="상품 검색..." className="w-64" />
          <Select placeholder="셀럽" className="w-32" allowClear>
            {celebrities.map((c) => (
              <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
            ))}
          </Select>
          <Select placeholder="상태" className="w-28" allowClear>
            <Select.Option value="visible">판매중</Select.Option>
            <Select.Option value="hidden">숨김</Select.Option>
          </Select>
        </div>

        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
