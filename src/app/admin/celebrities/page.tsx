"use client";

import { Card, Tag, Button, Spin } from "antd";
import { PlusOutlined, RightOutlined, DollarOutlined } from "@ant-design/icons";
import { useCelebrities } from "@/hooks/useCelebrities";
import { useAllProducts } from "@/hooks/useProducts";

export default function AdminCelebrities() {
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: products = [], isLoading: prodLoading } = useAllProducts();

  const isLoading = celebLoading || prodLoading;

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
        <h1 className="text-xl font-bold text-[#181C32]">셀럽 관리</h1>
        <Button type="primary" icon={<PlusOutlined />}>
          셀럽 추가
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {celebrities.map((celeb) => {
          const celebProducts = products.filter((p) => p.celebrityId === celeb.id);
          const totalSales = celebProducts.reduce(
            (sum, p) => sum + p.price * p.salesCount,
            0
          );

          return (
            <Card key={celeb.id} size="small" className="border-[#E4E6EF]">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ background: celeb.gradient }}
                >
                  {celeb.name[0]}
                </div>
                <div>
                  <p className="font-bold text-[#181C32]">{celeb.name}</p>
                  <p className="text-xs text-[#7E8299]">{celeb.handle}</p>
                </div>
                <Tag
                  color={celeb.isActive ? "green" : "default"}
                  className="ml-auto"
                >
                  {celeb.isActive ? "활성" : "비활성"}
                </Tag>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7E8299]">이달 판매액</span>
                  <span className="font-bold text-[#181C32]">
                    ₩{totalSales.toLocaleString("ko-KR")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E8299]">커미션율</span>
                  <span className="font-bold text-[#181C32]">{celeb.commissionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7E8299]">연결 상품</span>
                  <span className="font-bold text-[#181C32]">{celebProducts.length}개</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button size="small" block icon={<RightOutlined />}>
                  상세
                </Button>
                <Button size="small" block icon={<DollarOutlined />}>
                  정산
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
