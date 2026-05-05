"use client";

import { useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Spin,
  Modal,
  Form,
  InputNumber,
  Switch,
  Popconfirm,
  App, // [효진] App 추가
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { 
  useAllProducts, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct, 
  useToggleProductVisibility 
} from "@/hooks/useProducts";
import { useCelebrities } from "@/hooks/useCelebrities";
import { useAllOrders } from "@/hooks/useOrders"; // [효진] 실시간 판매량 계산용 추가
import type { Product, ProductFormData } from "@/types";
import ImageUpload from "@/components/admin/ImageUpload";

const defaultFormValues: ProductFormData = {
  brand: "",
  name: "",
  price: 0,
  originalPrice: 0,
  discount: 0,
  colors: [],
  sizes: [],
  description: "",
  specs: {},
  imageUrls: [],
  celebrityId: "",
  salesCount: 0,
  isVisible: true,
  category: "",
};

/**
 * [효진] 상품 관리 페이지 래퍼
 * Ant Design 컨텍스트(message, modal) 안정성을 위해 App으로 감쌈
 */
export default function AdminProductsPage() {
  return (
    <App>
      <AdminProducts />
    </App>
  );
}

function AdminProducts() {
  const { message } = App.useApp(); // [효진] 컨텍스트 메시지 사용
  const { data: products = [], isLoading: prodLoading } = useAllProducts();
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: orders = [] } = useAllOrders(); // [효진] 전체 주문 데이터 로드
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const toggleVisibility = useToggleProductVisibility();

  // [효진] 실제 판매된 데이터 기반으로 상품별 판매수 계산
  const salesMap = orders.reduce((acc, order) => {
    if (order.status === "cancelled") return acc;
    order.items.forEach((item) => {
      acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  const [search, setSearch] = useState("");
  const [filterCeleb, setFilterCeleb] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [form] = Form.useForm<ProductFormData>();

  const isLoading = prodLoading || celebLoading;

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchCeleb = !filterCeleb || p.celebrityId === filterCeleb;
    const matchStatus =
      !filterStatus ||
      (filterStatus === "visible" ? p.isVisible : !p.isVisible);
    return matchSearch && matchCeleb && matchStatus;
  });

  const openCreate = () => {
    setEditTarget(null);
    form.setFieldsValue(defaultFormValues);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditTarget(product);
    form.setFieldsValue({
      ...product,
    });
    setModalOpen(true);
  };


  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = { ...values };
      console.log("[효진] 상품 데이터 저장 시도:", submitData);

      
      if (editTarget) {
        await updateProduct.mutateAsync({ id: editTarget.id, data: submitData });
        message.success("상품이 성공적으로 수정되었습니다");
      } else {
        await createProduct.mutateAsync(submitData);
        message.success("상품이 성공적으로 등록되었습니다");
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error("[효진] 상품 저장 실패:", err);
      message.error("상품 저장 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      message.success("상품이 삭제되었습니다");
    } catch (err) {
      message.error("삭제 실패: " + (err as any).message);
    }
  };

  const handleToggle = async (id: string, isVisible: boolean) => {
    try {
      await toggleVisibility.mutateAsync({ id, isVisible: !isVisible });
      message.success(isVisible ? "상품을 숨겼습니다" : "상품을 노출했습니다");
    } catch (err) {
      message.error("상태 변경 실패");
    }
  };

  const columns = [
    {
      title: "상품",
      key: "product",
      render: (_: unknown, r: Product) => (
        <div className="flex items-center gap-3">
          <div className="h-12 w-10 shrink-0 rounded-md bg-gradient-to-br from-gray-200 to-gray-300" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7E8299]">
              {r.brand}
            </p>
            <p className="text-xs font-bold text-[#181C32]">{r.name}</p>
            <p className="text-[10px] text-[#A8A8A8]">{r.category}</p>
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
      render: (v: number) => (
        <span className="text-xs font-semibold">₩{v.toLocaleString("ko-KR")}</span>
      ),
    },
    {
      title: "판매수",
      key: "sales",
      width: 70,
      sorter: (a: Product, b: Product) => (salesMap[a.id] || 0) - (salesMap[b.id] || 0),
      render: (_: unknown, r: Product) => (
        <span className="text-xs font-bold text-blue-600">
          {(salesMap[r.id] || 0).toLocaleString("ko-KR")}
        </span>
      ),
    },
    {
      title: "노출",
      dataIndex: "isVisible",
      key: "visible",
      width: 70,
      render: (v: boolean, r: Product) => (
        <Switch
          size="small"
          checked={v}
          onChange={() => handleToggle(r.id, v)}
          loading={toggleVisibility.isPending}
        />
      ),
    },
    {
      title: "상태",
      dataIndex: "isVisible",
      key: "status",
      width: 80,
      render: (v: boolean) =>
        v ? <Tag color="green">판매중</Tag> : <Tag color="default">숨김</Tag>,
    },
    {
      title: "관리",
      key: "actions",
      width: 100,
      render: (_: unknown, r: Product) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm
            title="상품을 삭제하시겠습니까?"
            description="삭제 후 복구할 수 없습니다"
            onConfirm={() => handleDelete(r.id)}
            okText="삭제"
            cancelText="취소"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
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
          <h1 className="text-xl font-bold text-[#181C32]">상품 관리</h1>
          <p className="mt-0.5 text-xs text-[#7E8299]">총 {products.length}개 상품</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          상품 등록
        </Button>
      </div>

      <Card size="small" className="border-[#E4E6EF]">
        <div className="mb-4 flex items-center gap-3">
          <Input
            prefix={<SearchOutlined className="text-[#7E8299]" />}
            placeholder="상품명, 브랜드 검색..."
            className="w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="셀럽"
            className="w-32"
            allowClear
            value={filterCeleb}
            onChange={(v) => setFilterCeleb(v ?? null)}
          >
            {celebrities.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="상태"
            className="w-28"
            allowClear
            value={filterStatus}
            onChange={(v) => setFilterStatus(v ?? null)}
          >
            <Select.Option value="visible">판매중</Select.Option>
            <Select.Option value="hidden">숨김</Select.Option>
          </Select>
          <span className="ml-auto text-xs text-[#7E8299]">
            {filtered.length}개 표시
          </span>
        </div>

        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 상품 등록/수정 모달 */}
      <Modal
        title={editTarget ? "상품 수정" : "상품 등록"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editTarget ? "수정" : "등록"}
        cancelText="취소"
        confirmLoading={createProduct.isPending || updateProduct.isPending}
        width={600}
      >
        <Form 
          form={form} 
          layout="vertical" 
          className="mt-4"
          onValuesChange={(changed, all) => {
            // [효진] 정가나 할인율 변경 시 판매가 자동 계산
            if (changed.originalPrice !== undefined || changed.discount !== undefined) {
              const orig = all.originalPrice || 0;
              const disc = all.discount || 0;
              const calcPrice = Math.floor(orig * (1 - disc / 100));
              form.setFieldValue("price", calcPrice);
            }
          }}
        >
          {/* [효진] 노출 상태를 가장 상단으로 이동 */}
          <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-sm font-bold text-[#181C32]">상품 노출 상태</span>
            <Form.Item name="isVisible" valuePropName="checked" noStyle>
              <Switch checkedChildren="판매중" unCheckedChildren="숨김" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="brand"
              label="브랜드"
              rules={[{ required: true, message: "브랜드를 입력하세요" }]}
            >
              <Input placeholder="예: ADIDAS" />
            </Form.Item>
            <Form.Item
              name="name"
              label="상품명"
              rules={[{ required: true, message: "상품명을 입력하세요" }]}
            >
              <Input placeholder="예: 크롭 재킷" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-x-4">
            <Form.Item name="originalPrice" label="정가 (₩)">
              <InputNumber className="w-full" min={0} step={1000} />
            </Form.Item>
            <Form.Item name="discount" label="할인율 (%)">
              <InputNumber className="w-full" min={0} max={100} />
            </Form.Item>
            <Form.Item
              name="price"
              label="판매가 (₩)"
              rules={[{ required: true }]}
            >
              <InputNumber className="w-full" min={0} step={1000} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="celebrityId"
              label="연결 셀럽"
              rules={[{ required: true, message: "셀럽을 선택하세요" }]}
            >
              <Select placeholder="셀럽 선택">
                {celebrities.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="category" label="카테고리">
              <Select placeholder="카테고리 선택">
                <Select.Option value="top">상의</Select.Option>
                <Select.Option value="bottom">하의</Select.Option>
                <Select.Option value="dress">드레스</Select.Option>
                <Select.Option value="shoes">신발</Select.Option>
                <Select.Option value="bag">가방</Select.Option>
                <Select.Option value="accessory">액세서리</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item 
            name="imageUrls" 
            label="상품 이미지 (최대 8장)"
          >
            <ImageUpload folder="products" multiple maxCount={8} />
          </Form.Item>

          {/* [효진] 사이즈 선택형으로 변경 및 신발 사이즈 추가 */}
          <Form.Item name="sizes" label="사이즈 선택 (다중 선택 가능)">
            <Select mode="multiple" placeholder="사이즈를 선택하세요" allowClear>
              <Select.OptGroup label="의류">
                <Select.Option value="S">S</Select.Option>
                <Select.Option value="M">M</Select.Option>
                <Select.Option value="L">L</Select.Option>
                <Select.Option value="XL">XL</Select.Option>
                <Select.Option value="2XL">2XL</Select.Option>
                <Select.Option value="FREE">FREE</Select.Option>
              </Select.OptGroup>
              <Select.OptGroup label="신발">
                {["220", "225", "230", "235", "240", "245", "250", "255", "260", "265", "270", "275", "280"].map(s => (
                  <Select.Option key={s} value={s}>{s}</Select.Option>
                ))}
              </Select.OptGroup>
            </Select>
          </Form.Item>


          <div className="mb-4">
            <p className="mb-2 text-sm font-medium">색상 관리 (색상별 이미지 등록 가능)</p>
            <Form.List name="colors">
              {(fields, { add, remove }) => (
                <div className="space-y-4">
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="rounded-lg border border-gray-100 p-3 bg-gray-50/50">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <Form.Item
                            {...restField}
                            name={[name, "name"]}
                            rules={[{ required: true, message: "색상명" }]}
                            noStyle
                          >
                            <Input placeholder="색상명 (예: 블랙)" className="w-full" />
                          </Form.Item>
                          
                          <Form.Item
                            {...restField}
                            name={[name, "imageUrl"]}
                            label={<span className="text-[11px] text-gray-500">색상 연결 이미지</span>}
                            className="mb-0"
                          >
                            <ImageUpload folder="products" maxCount={1} />
                          </Form.Item>
                        </div>
                        <Button 
                          type="text" 
                          danger 
                          icon={<DeleteOutlined />} 
                          onClick={() => remove(name)} 
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="h-10">
                    색상 추가
                  </Button>
                </div>
              )}
            </Form.List>
          </div>


          <Form.Item name="specs" label="상품 상세 정보 (Specs)">
            <Input.TextArea rows={4} placeholder="예: 소재: 면 100%&#10;세탁: 손세탁 권장" />
          </Form.Item>


          <Form.Item name="description" label="상품 설명">
            <Input.TextArea rows={3} placeholder="상품 설명을 입력하세요" />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
}
