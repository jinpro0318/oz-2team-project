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
  Drawer,
  App,
  Tabs,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  AimOutlined,
  DeleteOutlined,
  UserOutlined,
  PictureOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import {
  useCelebrities,
  useCreateCelebrity,
  useUpdateCelebrity,
  usePostsByCelebrity,
  useUpdatePostHotspots,
  useCreatePost,
  useDeletePost, // [효진] 추가
} from "@/hooks/useCelebrities";
import { useAllProducts } from "@/hooks/useProducts";
import type { Celebrity, CelebrityFormData, Hotspot, Post } from "@/types";
import ImageUpload from "@/components/admin/ImageUpload";

const GRADIENTS = [
  "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #b1f4cf 0%, #9890e3 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
];

/**
 * [효진] 핫스팟 상세 편집기 (통합 관리 UI 내에서 사용)
 */
function HotspotEditor({
  post,
  products,
  onSave,
  onBack,
}: {
  post: Post;
  products: { id: string; name: string; brand: string; price: number }[];
  onSave: (hotspots: Hotspot[]) => void;
  onBack: () => void;
}) {
  const { message } = App.useApp();
  const [hotspots, setHotspots] = useState<Hotspot[]>(post.hotspots ?? []);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

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
    setActiveIdx(newIdx);
  };

  const updateHotspot = (idx: number, field: keyof Hotspot, value: string | number) => {
    setHotspots((prev) => {
      const next = prev.map((hs, i) =>
        i === idx ? { ...hs, [field]: value } : hs
      );
      if (field === "productId") {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          next[idx] = { 
            ...next[idx], 
            label: prod.name, 
            price: `₩${prod.price.toLocaleString()}` 
          };
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
    <div className="flex flex-col h-full bg-[#F8F9FA] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-4 bg-white border-b">
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack}>뒤로가기</Button>
        <span className="font-bold text-[#181C32]">"{post.caption}" 핫스팟 편집</span>
      </div>

      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* 좌측: 이미지 */}
        <div className="flex-1 relative bg-black rounded-lg overflow-hidden flex items-center justify-center">
          <div className="relative cursor-crosshair max-h-full" onClick={handleImageClick}>
            <img src={post.imageUrl} alt="Preview" className="max-w-full max-h-full block object-contain" />
            {hotspots.map((hs, i) => (
              <div
                key={hs.id}
                className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-xl transition-all ${
                  activeIdx === i ? "scale-125 border-white bg-[#3699FF] text-white ring-4 ring-[#3699FF]/30" : "border-white/50 bg-white/80 text-[#181C32]"
                }`}
                style={{ top: `${hs.top}%`, left: `${hs.left}%` }}
                onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* 우측: 리스트 */}
        <div className="w-[300px] flex flex-col bg-white rounded-lg border border-[#E4E6EF] overflow-hidden">
          <div className="p-3 border-b flex justify-between items-center bg-[#F3F8FF]">
            <span className="text-xs font-bold text-[#3699FF]">핫스팟 리스트 ({hotspots.length})</span>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addHotspot}>추가</Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {hotspots.map((hs, i) => (
              <div 
                key={hs.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${activeIdx === i ? "border-[#3699FF] bg-[#F3F8FF]" : "border-[#E4E6EF]"}`}
                onClick={() => setActiveIdx(i)}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-[#7E8299]">#{i + 1} 상품 정보</span>
                  <DeleteOutlined className="text-[#ED4956] text-xs" onClick={() => removeHotspot(i)} />
                </div>
                <div className="space-y-2">
                  <select
                    className="w-full text-xs p-1.5 border rounded bg-white outline-none"
                    value={hs.productId}
                    onChange={(e) => updateHotspot(i, "productId", e.target.value)}
                  >
                    <option value="">상품 선택</option>
                    {products.map(p => <option key={p.id} value={p.id}>[{p.brand}] {p.name}</option>)}
                  </select>
                  <Input 
                    size="small" 
                    placeholder="라벨" 
                    value={hs.label} 
                    onChange={e => updateHotspot(i, "label", e.target.value)} 
                  />
                  <Input 
                    size="small" 
                    placeholder="가격 (예: ₩129,000)" 
                    value={hs.price} 
                    onChange={e => updateHotspot(i, "price", e.target.value)} 
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t">
            <Button type="primary" block onClick={() => onSave(hotspots)}>핫스팟 저장</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * [효진] 셀럽 통합 관리 드로어 (프로필 + 착장 + 핫스팟)
 */
function CelebrityManageDrawer({
  celeb,
  products,
  open,
  onClose,
}: {
  celeb: Celebrity | null;
  products: { id: string; name: string; brand: string; price: number }[];
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [form] = Form.useForm();
  const [postForm] = Form.useForm();

  const { data: posts = [], isLoading: postsLoading } = usePostsByCelebrity(celeb?.id ?? "");
  const updateCelebrity = useUpdateCelebrity();
  const createPost = useCreatePost();
  const deletePost = useDeletePost(); // [효진] 삭제 mutation 추가
  const updateHotspots = useUpdatePostHotspots();

  // 셀럽 프로필 폼 세팅
  useState(() => {
    if (celeb) {
      form.setFieldsValue({
        name: celeb.name,
        handle: celeb.handle,
        bio: celeb.bio,
        commissionRate: celeb.commissionRate,
        isActive: celeb.isActive,
        gradient: celeb.gradient,
        avatarUrl: celeb.avatarUrl,
      });
    }
  });

  const handleUpdateProfile = async () => {
    if (!celeb) return;
    try {
      const values = await form.validateFields();
      await updateCelebrity.mutateAsync({ id: celeb.id, data: values });
      message.success("프로필이 수정되었습니다.");
    } catch (err) {
      message.error("정보 수정 중 오류가 발생했습니다.");
    }
  };

  const handleAddPost = async () => {
    if (!celeb) return;
    try {
      const values = await postForm.validateFields();
      await createPost.mutateAsync({
        celebrityId: celeb.id,
        imageUrl: values.imageUrl,
        caption: values.caption,
        hotspots: [],
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
      });
      message.success("새로운 착장이 등록되었습니다.");
      setIsAddingPost(false);
      postForm.resetFields();
    } catch (err) {
      message.error("등록 실패");
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId);
      message.success("착장이 삭제되었습니다.");
    } catch (err) {
      message.error("삭제 실패");
    }
  };

  const handleSaveHotspots = async (hotspots: Hotspot[]) => {
    if (!selectedPost) return;
    await updateHotspots.mutateAsync({ postId: selectedPost.id, hotspots });
    message.success("핫스팟 정보가 저장되었습니다.");
    setSelectedPost(null);
  };

  return (
    <Drawer
      title={<span className="font-bold text-lg">{celeb?.name} 통합 관리</span>}
      open={open}
      onClose={onClose}
      width={selectedPost ? 800 : 500}
      destroyOnClose
    >
      {selectedPost ? (
        <HotspotEditor 
          post={selectedPost} 
          products={products} 
          onSave={handleSaveHotspots} 
          onBack={() => setSelectedPost(null)}
        />
      ) : (
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: "profile",
              label: <span className="px-4"><UserOutlined /> 프로필 정보</span>,
              children: (
                <div className="p-4 space-y-6">
                  <Form form={form} layout="vertical">
                    <Form.Item name="name" label="셀럽 이름" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="handle" label="핸들 (@username)" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="bio" label="소개글">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-4">
                      <Form.Item name="commissionRate" label="커미션율 (%)">
                        <InputNumber className="w-full" min={0} max={100} />
                      </Form.Item>
                      <Form.Item name="isActive" label="상태" valuePropName="checked">
                        <Switch checkedChildren="활성" unCheckedChildren="비활성" />
                      </Form.Item>
                    </div>
                    <Form.Item name="avatarUrl" label="프로필 이미지">
                      <ImageUpload folder="avatars" />
                    </Form.Item>
                    <Button type="primary" block size="large" onClick={handleUpdateProfile}>프로필 저장하기</Button>
                  </Form>
                </div>
              )
            },
            {
              key: "posts",
              label: <span className="px-4"><PictureOutlined /> 착장 및 핫스팟</span>,
              children: (
                <div className="p-4 space-y-6">
                  {isAddingPost ? (
                    <Card size="small" title="새 착장 등록" extra={<Button type="text" onClick={() => setIsAddingPost(false)}>취소</Button>}>
                      <Form form={postForm} layout="vertical">
                        <Form.Item name="imageUrl" label="사진 업로드" rules={[{ required: true }]}>
                          <ImageUpload folder="posts" />
                        </Form.Item>
                        <Form.Item name="caption" label="내용" rules={[{ required: true }]}>
                          <Input placeholder="예: 인스타그램 데일리룩" />
                        </Form.Item>
                        <Button type="primary" block onClick={handleAddPost} loading={createPost.isPending}>등록 완료</Button>
                      </Form>
                    </Card>
                  ) : (
                    <Button type="dashed" block icon={<PlusOutlined />} className="h-12" onClick={() => setIsAddingPost(true)}>새 착장 추가하기</Button>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#7E8299]">등록된 착장 ({posts.length})</h4>
                    {postsLoading ? <Spin /> : posts.map(post => (
                      <div key={post.id} className="flex items-center gap-3 p-2 rounded-xl border border-[#E4E6EF] hover:border-[#3699FF] transition-all group">
                        <img src={post.imageUrl} className="w-12 h-16 object-cover rounded-lg bg-gray-100" />
                        <div className="flex-1 min-w-0" onClick={() => setSelectedPost(post)}>
                          <p className="text-xs font-bold truncate cursor-pointer">{post.caption}</p>
                          <Tag color="blue" className="mt-1 text-[9px]">핫스팟 {post.hotspots?.length ?? 0}개</Tag>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="small" icon={<AimOutlined />} onClick={() => setSelectedPost(post)} />
                          <Popconfirm title="이 착장을 삭제하시겠습니까?" onConfirm={() => handleDeletePost(post.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          ]}
        />
      )}
    </Drawer>
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
  const { message } = App.useApp();
  const { data: celebrities = [], isLoading: celebLoading } = useCelebrities();
  const { data: products = [], isLoading: prodLoading } = useAllProducts();
  const createCelebrity = useCreateCelebrity();

  const [manageCeleb, setManageCeleb] = useState<Celebrity | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  const isLoading = celebLoading || prodLoading;
  const productList = products.map(p => ({ id: p.id, name: p.name, brand: p.brand, price: p.price }));

  const handleAddCeleb = async () => {
    try {
      const values = await form.validateFields();
      await createCelebrity.mutateAsync(values);
      message.success("새로운 셀럽이 추가되었습니다.");
      setCreateModalOpen(false);
      form.resetFields();
    } catch (err) {
      message.error("등록 실패");
    }
  };

  if (isLoading) return <div className="flex h-96 items-center justify-center"><Spin size="large" /></div>;

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[#181C32]">셀럽 관리</h1>
          <p className="text-xs text-[#7E8299]">총 {celebrities.length}명 관리 중</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>셀럽 추가</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {celebrities.map(celeb => (
          <Card key={celeb.id} size="small" className="hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm" style={{ background: celeb.gradient }}>
                {celeb.name[0]}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-[#181C32]">{celeb.name}</p>
                <p className="text-[11px] text-[#7E8299]">{celeb.handle}</p>
              </div>
              <Tag color={celeb.isActive ? "green" : "default"}>{celeb.isActive ? "활성" : "비활성"}</Tag>
            </div>
            <Button block type="primary" ghost icon={<EditOutlined />} onClick={() => setManageCeleb(celeb)}>셀럽 관리</Button>
          </Card>
        ))}
      </div>

      {manageCeleb && (
        <CelebrityManageDrawer
          celeb={manageCeleb}
          products={productList}
          open={!!manageCeleb}
          onClose={() => setManageCeleb(null)}
        />
      )}

      <Modal title="새로운 셀럽 추가" open={createModalOpen} onCancel={() => setCreateModalOpen(false)} onOk={handleAddCeleb} okText="추가하기">
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="이름" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="handle" label="핸들" rules={[{ required: true }]}><Input placeholder="@username" /></Form.Item>
          <Form.Item name="gradient" label="테마 색상" initialValue={GRADIENTS[0]}>
            <Select>
              {GRADIENTS.map((g, i) => <Select.Option key={i} value={g}><div className="h-4 w-full rounded" style={{ background: g }} /></Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
