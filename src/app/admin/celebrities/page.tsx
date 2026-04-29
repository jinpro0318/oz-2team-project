"use client";

import { useState } from "react";
import {
  Card,
  Tag,
  Button,
  Spin,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Drawer,
  message as staticMessage,
  Popconfirm,
  App, // [효진] Ant Design App 컴포넌트 추가
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  AimOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  useCelebrities,
  useCreateCelebrity,
  useUpdateCelebrity,
  usePostsByCelebrity,
  useUpdatePostHotspots,
  useCreatePost, // [효진] 누락된 훅 추가
} from "@/hooks/useCelebrities";
import { useAllProducts } from "@/hooks/useProducts";
import type { Celebrity, CelebrityFormData, Post, Hotspot } from "@/types";
import ImageUpload from "@/components/admin/ImageUpload"; // [효진] 이미지 업로드 컴포넌트 추가

const GRADIENTS = [
  "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
  "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)",
  "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)",
  "linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)",
  "linear-gradient(135deg,#fa709a 0%,#fee140 100%)",
];

// 핫스팟 편집 컴포넌트
function HotspotEditor({
  post,
  products,
  onSave,
}: {
  post: Post;
  products: { id: string; name: string; brand: string; price: number }[]; // [효진] price 추가
  onSave: (hotspots: Hotspot[]) => void;
}) {
  const { message } = App.useApp(); // [효진] 컨텍스트 메시지 인스턴스 사용
  const [hotspots, setHotspots] = useState<Hotspot[]>(post.hotspots ?? []);
  const productList = products.map((p) => ({ id: p.id, name: p.name, brand: p.brand, price: p.price })); // [효진] price 추가
  const [activeIdx, setActiveIdx] = useState<number | null>(null); // [효진] 현재 편집 중인 핫스팟 인덱스

  // [효진] 이미지 클릭 시 현재 활성화된 핫스팟의 좌표(%) 업데이트
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeIdx === null) {
      message.info("편집할 핫스팟 항목을 먼저 선택하거나 추가해주세요.");
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const left = Math.round((x / rect.width) * 100);
    const top = Math.round((y / rect.height) * 100);
    
    updateHotspot(activeIdx, "top", top);
    updateHotspot(activeIdx, "left", left);
  };

  const addHotspot = () => {
    const newIdx = hotspots.length;
    setHotspots([
      ...hotspots,
      { id: `hs-${Date.now()}`, productId: "", label: "", price: "", top: 50, left: 50 },
    ]);
    setActiveIdx(newIdx); // [효진] 추가 시 자동으로 활성화
  };

  const updateHotspot = (idx: number, field: keyof Hotspot, value: string | number) => {
    setHotspots((prev) => {
      const next = prev.map((hs, i) =>
        i === idx ? { ...hs, [field]: value } : hs
      );
      if (field === "productId") {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          next[idx] = { ...next[idx], label: prod.name, price: `₩${prod.price.toLocaleString()}` };
        }
      }
      return next;
    });
  };

  const removeHotspot = (idx: number) => {
    setHotspots((prev) => prev.filter((_, i) => i !== idx));
    if (activeIdx === idx) setActiveIdx(null);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* [효진] 좌측: 커다란 인터랙티브 이미지 영역 */}
      <div className="flex-1 sticky top-0 h-fit">
        <div className="relative overflow-hidden rounded-xl border border-[#E4E6EF] bg-black/5 shadow-inner">
          <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
            <p className="rounded-full bg-black/60 px-3 py-1 text-[11px] text-white backdrop-blur-md">
              {activeIdx !== null ? "이미지 위를 클릭하여 위치를 지정하세요" : "우측 리스트에서 항목을 선택하세요"}
            </p>
            <p className="rounded-full bg-white/90 px-3 py-1 text-[10px] text-[#181C32] font-semibold shadow-sm">
              착장 이미지: {post.caption}
            </p>
          </div>
          <div 
            className="relative cursor-crosshair"
            onClick={handleImageClick}
          >
            <img 
              src={post.imageUrl} 
              alt="Post preview" 
              className="block w-full"
            />
            {/* [효진] 이미지 위 핫스팟 마커 렌더링 */}
            {hotspots.map((hs, i) => (
              <div
                key={hs.id}
                className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-xl transition-all cursor-move ${
                  activeIdx === i 
                    ? "scale-125 border-white bg-[#3699FF] text-white ring-4 ring-[#3699FF]/30" 
                    : "border-white/50 bg-white/80 text-[#181C32]"
                }`}
                style={{ top: `${hs.top}%`, left: `${hs.left}%` }}
                onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* [효진] 우측: 핫스팟 상세 편집 리스트 (수동 좌표 제어 포함) */}
      <div className="w-[320px] shrink-0 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#181C32]">착장 핫스팟 설정 ({hotspots.length})</h3>
          <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addHotspot}>
            추가
          </Button>
        </div>
        
        <div className="flex-1 space-y-4 overflow-y-auto pr-1 pb-24">
          {hotspots.map((hs, idx) => (
            <div 
              key={hs.id} 
              className={`rounded-xl border p-4 transition-all cursor-pointer ${
                activeIdx === idx ? "border-[#3699FF] bg-[#F3F8FF] shadow-sm" : "border-[#E4E6EF] bg-white hover:border-[#3699FF]/50"
              }`}
              onClick={() => setActiveIdx(idx)}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className={`text-[12px] font-bold ${activeIdx === idx ? "text-[#3699FF]" : "text-[#7E8299]"}`}>
                  #{idx + 1} 포인트 정보
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeHotspot(idx); }}
                  className="text-[#ED4956] hover:opacity-70"
                >
                  <DeleteOutlined />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold text-[#7E8299]">연결 상품</label>
                  <select
                    className="w-full rounded-md border border-[#DBDBDB] bg-white px-2 py-2 text-xs outline-none focus:border-[#3699FF]"
                    value={hs.productId}
                    onChange={(e) => updateHotspot(idx, "productId", e.target.value)}
                  >
                    <option value="">상품 선택</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.brand}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-[10px] font-bold text-[#7E8299]">라벨 (화면 표시 이름)</label>
                    <input
                      className="w-full rounded-md border border-[#DBDBDB] px-2 py-2 text-xs outline-none focus:border-[#3699FF]"
                      value={hs.label}
                      onChange={(e) => updateHotspot(idx, "label", e.target.value)}
                      placeholder="예: 블랙 트위드 자켓"
                    />
                  </div>
                  {/* [효진] 좌표 수동 제어 필드 복구 및 고도화 */}
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-[#7E8299]">좌표 Top (%)</label>
                    <InputNumber
                      className="w-full"
                      size="small"
                      min={0}
                      max={100}
                      value={hs.top}
                      onChange={(val) => updateHotspot(idx, "top", val || 0)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold text-[#7E8299]">좌표 Left (%)</label>
                    <InputNumber
                      className="w-full"
                      size="small"
                      min={0}
                      max={100}
                      value={hs.left}
                      onChange={(val) => updateHotspot(idx, "left", val || 0)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {hotspots.length === 0 && (
            <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[#E4E6EF] text-xs text-[#A8A8A8] bg-gray-50">
              이미지 위를 클릭하여 포인트를 생성하세요.
            </div>
          )}
        </div>

        <div className="absolute bottom-0 right-0 left-0 p-6 bg-white border-t border-[#E4E6EF] z-20">
          <Button
            type="primary"
            block
            size="large"
            className="bg-[#3699FF] font-bold h-12 rounded-xl shadow-lg"
            onClick={() => onSave(hotspots)}
          >
            착장 정보 저장하기
          </Button>
        </div>
      </div>
    </div>
  );
}

// [효진] 포스트별 핫스팟 관리 및 신규 포스트 등록 드로어
function HotspotDrawer({
  celeb,
  products,
  open,
  onClose,
}: {
  celeb: Celebrity | null;
  products: { id: string; name: string; brand: string; price: number }[]; // [효진] price 타입 추가하여 하위 에디터와 일치시킴
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp(); // [효진] 컨텍스트 메시지 인스턴스 사용
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false); // [효진] 포스트 생성 모달 상태
  const [newPostForm] = Form.useForm();
  
  const { data: posts = [], isLoading } = usePostsByCelebrity(celeb?.id ?? "");
  const updateHotspots = useUpdatePostHotspots();
  const createPost = useCreatePost(); // [효진] 신규 포스트 생성 mutation

  const handleSaveHotspots = async (hotspots: Hotspot[]) => {
    if (!selectedPost) return;
    await updateHotspots.mutateAsync({ postId: selectedPost.id, hotspots });
    message.success("핫스팟 정보가 저장되었습니다.");
    setSelectedPost(null);
  };

  const handleCreatePost = async () => {
    try {
      const values = await newPostForm.validateFields();
      if (!celeb) return;

      console.log("[효진] 신규 착장 데이터 전송:", {
        celebrityId: celeb.id,
        imageUrl: values.imageUrl,
        caption: values.caption,
      });

      // [효진] 신규 착장 Firestore 저장 로직 호출
      await createPost.mutateAsync({
        celebrityId: celeb.id,
        imageUrl: values.imageUrl,
        caption: values.caption,
        hotspots: [], // 초기 생성 시 빈 배열
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
      });

      message.success("신규 착장이 성공적으로 등록되었습니다.");
      setCreateModalOpen(false);
      newPostForm.resetFields();
    } catch (err: any) {
      console.error("[효진] 착장 등록 실패 에러 상세:", err);
      message.error(`등록에 실패했습니다: ${err.message || "데이터 형식을 확인해주세요."}`);
    }
  };

  return (
    <>
      <Drawer
        title={
          <div className="flex items-center justify-between pr-4">
            <span>착장 핫스팟 관리 — {celeb?.name ?? ""}</span>
            {!selectedPost && (
              <Button 
                type="primary" 
                size="small" 
                icon={<PlusOutlined />} 
                onClick={() => setCreateModalOpen(true)}
              >
                착장 추가
              </Button>
            )}
          </div>
        }
        open={open}
        onClose={() => { setSelectedPost(null); onClose(); }}
        width={selectedPost ? 960 : 600} // [효진] 에디터 활성화 시 너비 대폭 확장
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spin />
          </div>
        ) : selectedPost ? (
          <div>
            <div className="mb-6 flex items-center gap-2">
              <button
                className="text-xs font-bold text-[#3699FF] hover:underline"
                onClick={() => setSelectedPost(null)}
              >
                ← 착장 목록으로 돌아가기
              </button>
              <span className="text-xs text-[#7E8299] truncate flex-1">
                / {selectedPost.caption}
              </span>
            </div>
            {/* [효진] 선택된 착장의 핫스팟 편집기 호출 */}
            <HotspotEditor post={selectedPost} products={products} onSave={handleSaveHotspots} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* [효진] 가시성을 위해 최상단에 커다란 등록 버튼 배치 */}
            <button
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#3699FF] bg-[#F3F8FF] py-8 text-[#3699FF] transition-all hover:bg-[#E1F0FF] hover:border-solid"
              onClick={() => setCreateModalOpen(true)}
            >
              <PlusOutlined className="text-2xl" />
              <span className="font-bold">새로운 셀럽 착장 이미지 등록</span>
              <span className="text-[11px] opacity-70">클릭하여 사진을 업로드하고 핫스팟을 지정하세요</span>
            </button>

            <div className="flex items-center justify-between mt-8 mb-2">
              <h4 className="text-sm font-bold text-[#181C32]">등록된 착장 목록 ({posts.length})</h4>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {posts.map((post) => (
                <button
                  key={post.id}
                  className="group flex w-full items-center gap-4 rounded-xl border border-[#E4E6EF] bg-white p-3 text-left transition-all hover:border-[#3699FF] hover:shadow-md"
                  onClick={() => setSelectedPost(post)}
                >
                  <div className="relative h-20 w-16 overflow-hidden rounded-lg bg-gray-100">
                    <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-[#181C32]">{post.caption}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <Tag className="m-0 border-none bg-[#EEF6FF] text-[10px] font-bold text-[#3699FF]">
                        핫스팟 {post.hotspots?.length ?? 0}개
                      </Tag>
                      <span className="text-[10px] text-[#7E8299]">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <AimOutlined className="text-lg text-[#E4E6EF] transition-colors group-hover:text-[#3699FF]" />
                </button>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      {/* [효진] 착장 추가 모달 (실제 이미지 파일 업로드 지원) */}
      <Modal
        title="신규 셀럽 착장 등록"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreatePost}
        confirmLoading={createPost.isPending}
        okText="착장 등록"
        cancelText="취소"
        width={400}
      >
        <Form form={newPostForm} layout="vertical" className="mt-4">
          <Form.Item
            name="imageUrl"
            label="착장 사진 업로드"
            rules={[{ required: true, message: "이미지를 업로드하세요" }]}
          >
            <ImageUpload folder="posts" />
          </Form.Item>
          <Form.Item
            name="caption"
            label="착장 설명 (내용)"
            rules={[{ required: true, message: "내용을 입력하세요" }]}
          >
            <Input.TextArea rows={3} placeholder="예: 제니가 인스타그램에 올린 샤넬 착장" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default function AdminCelebritiesPage() {
  return (
    <App>
      <AdminCelebrities />
    </App>
  );
}

function AdminCelebrities() {
  const { message } = App.useApp(); // [효진] 컨텍스트 메시지 인스턴스 사용
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: products = [], isLoading: prodLoading } = useAllProducts();
  const createCelebrity = useCreateCelebrity();
  const updateCelebrity = useUpdateCelebrity();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Celebrity | null>(null);
  const [hotspotCeleb, setHotspotCeleb] = useState<Celebrity | null>(null);
  const [form] = Form.useForm<CelebrityFormData>();

  const isLoading = celebLoading || prodLoading;

  // [효진] 드로어 및 에디터에 전달할 정제된 상품 리스트 (price 포함하여 좌표 설정 시 자동 입력 가능케 함)
  const productList = products.map((p) => ({ id: p.id, name: p.name, brand: p.brand, price: p.price }));

  const openCreate = () => {
    setEditTarget(null);
    form.resetFields();
    form.setFieldsValue({
      commissionRate: 10,
      isActive: true,
      gradient: GRADIENTS[0],
    });
    setModalOpen(true);
  };

  const openEdit = (celeb: Celebrity) => {
    setEditTarget(celeb);
    form.setFieldsValue({
      name: celeb.name,
      handle: celeb.handle,
      bio: celeb.bio,
      commissionRate: celeb.commissionRate,
      isActive: celeb.isActive,
      gradient: celeb.gradient,
      avatarUrl: celeb.avatarUrl,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editTarget) {
        // [효진] 셀럽 정보 수정 처리 (mutation 호출)
        await updateCelebrity.mutateAsync({ id: editTarget.id, data: values });
        message.success("셀럽 정보가 수정되었습니다");
      } else {
        // [효진] 신규 셀럽 등록 처리 (mutation 호출)
        await createCelebrity.mutateAsync(values);
        message.success("셀럽이 추가되었습니다");
      }
      setModalOpen(false);
    } catch {
      // validation errors
    }
  };

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
          <h1 className="text-xl font-bold text-[#181C32]">셀럽 관리</h1>
          <p className="mt-0.5 text-xs text-[#7E8299]">총 {celebrities.length}명</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
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
              {/* 헤더 */}
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-md"
                  style={{ background: celeb.gradient }}
                >
                  {celeb.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#181C32]">{celeb.name}</p>
                  <p className="text-xs text-[#7E8299]">{celeb.handle}</p>
                </div>
                <Tag color={celeb.isActive ? "green" : "default"}>
                  {celeb.isActive ? "활성" : "비활성"}
                </Tag>
              </div>

              {/* 통계 */}
              <div className="mb-4 space-y-1.5 rounded-lg bg-[#F5F6FA] p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-[#7E8299]">누적 판매액</span>
                  <span className="font-bold text-[#181C32]">
                    ₩{totalSales.toLocaleString("ko-KR")}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7E8299]">커미션율</span>
                  <span className="font-bold text-[#3699FF]">{celeb.commissionRate}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#7E8299]">연결 상품</span>
                  <span className="font-bold text-[#181C32]">{celebProducts.length}개</span>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2">
                <Button
                  size="small"
                  block
                  icon={<EditOutlined />}
                  onClick={() => openEdit(celeb)}
                >
                  수정
                </Button>
                <Button
                  size="small"
                  block
                  icon={<AimOutlined />}
                  type="primary"
                  onClick={() => setHotspotCeleb(celeb)}
                >
                  핫스팟
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 셀럽 등록/수정 모달 */}
      <Modal
        title={editTarget ? "셀럽 수정" : "셀럽 추가"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editTarget ? "수정" : "추가"}
        cancelText="취소"
        confirmLoading={createCelebrity.isPending || updateCelebrity.isPending}
        width={480}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <div className="mb-4 flex justify-center">
            <Form.Item name="avatarUrl" label="프로필 이미지">
              <ImageUpload folder="celebrities" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="name"
              label="이름"
              rules={[{ required: true, message: "이름을 입력하세요" }]}
            >
              <Input placeholder="예: 제니" />
            </Form.Item>
            <Form.Item
              name="handle"
              label="인스타그램 핸들"
              rules={[{ required: true, message: "핸들을 입력하세요" }]}
            >
              <Input placeholder="예: @jennierubyjane" />
            </Form.Item>
          </div>

          <Form.Item name="bio" label="소개">
            <Input.TextArea rows={2} placeholder="간단한 소개" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="commissionRate"
              label="커미션율 (%)"
              rules={[{ required: true }]}
            >
              <InputNumber className="w-full" min={0} max={100} />
            </Form.Item>
            <Form.Item name="isActive" label="활성 상태" valuePropName="checked">
              <Switch checkedChildren="활성" unCheckedChildren="비활성" />
            </Form.Item>
          </div>

          <Form.Item label="프로필 그라데이션" shouldUpdate={(prev, curr) => prev.gradient !== curr.gradient}>
            {({ getFieldValue }) => (
              <div className="flex gap-2">
                {GRADIENTS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                      getFieldValue("gradient") === g ? "ring-2 ring-[#3699FF] ring-offset-2" : ""
                    }`}
                    style={{ background: g }}
                    onClick={() => form.setFieldValue("gradient", g)}
                  />
                ))}
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>

      {/* [효진] 핫스팟 관리 드로어 (포스트 리스트 및 선택 시 에디터 노출) */}
      <HotspotDrawer
        celeb={hotspotCeleb}
        products={productList}
        open={!!hotspotCeleb}
        onClose={() => setHotspotCeleb(null)}
      />
    </div>
  );
}
