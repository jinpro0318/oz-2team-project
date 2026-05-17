"use client";

import { useMemo, useState } from "react";
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
  DatePicker,
  App,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  useAllEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from "@/hooks/useEvents";
import { useAllProducts } from "@/hooks/useProducts";
import type { AppEvent, EventFormData } from "@/types";
import ImageUpload from "@/components/admin/ImageUpload";

const { RangePicker } = DatePicker;

type EventStatus = "upcoming" | "ongoing" | "ended";

const STATUS_META: Record<EventStatus, { label: string; color: string }> = {
  upcoming: { label: "예정", color: "blue" },
  ongoing: { label: "진행중", color: "green" },
  ended: { label: "종료", color: "default" },
};

function getEventStatus(event: AppEvent, now: string): EventStatus {
  if (event.startAt && event.startAt > now) return "upcoming";
  if (event.endAt && event.endAt < now) return "ended";
  return "ongoing";
}

// Form 내부에서 다루는 값 — RangePicker 가 [Dayjs, Dayjs] 형태라
// EventFormData 와 살짝 다른 형태로 관리
interface EventFormValues {
  title: string;
  content: string;
  thumbnail: string;     // 프로필 이미지
  bannerImage: string;   // 홍보 이미지
  range: [Dayjs, Dayjs];
  productIds: string[];
  isActive: boolean;
  priority: number;
}

const defaultFormValues: EventFormValues = {
  title: "",
  content: "",
  thumbnail: "",
  bannerImage: "",
  range: [dayjs(), dayjs().add(7, "day")],
  productIds: [],
  isActive: true,
  priority: 0,
};


export default function AdminEventsPage() {
  return (
    <App>
      <AdminEvents />
    </App>
  );
}

function AdminEvents() {
  const { message } = App.useApp();
  const { data: events = [], isLoading: eventsLoading } = useAllEvents();
  const { data: products = [], isLoading: prodLoading } = useAllProducts();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<EventStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AppEvent | null>(null);
  const [form] = Form.useForm<EventFormValues>();

  const isLoading = eventsLoading || prodLoading;
  const nowIso = useMemo(() => new Date().toISOString(), [events]);

  const filtered = events.filter((e) => {
    const matchSearch =
      !search || e.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      !filterStatus || getEventStatus(e, nowIso) === filterStatus;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditTarget(null);
    form.setFieldsValue(defaultFormValues);
    setModalOpen(true);
  };

  const openEdit = (event: AppEvent) => {
    setEditTarget(event);
    form.setFieldsValue({
      title: event.title,
      content: event.content,
      thumbnail: event.thumbnail,
      bannerImage: event.bannerImage ?? "",
      range: [
        event.startAt ? dayjs(event.startAt) : dayjs(),
        event.endAt ? dayjs(event.endAt) : dayjs().add(7, "day"),
      ],
      productIds: event.productIds ?? [],
      isActive: event.isActive,
      priority: event.priority ?? 0,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [start, end] = values.range;
      const submitData: EventFormData = {
        title: values.title,
        content: values.content,
        thumbnail: values.thumbnail,
        bannerImage: values.bannerImage,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        productIds: values.productIds ?? [],
        isActive: values.isActive,
        priority: values.priority ?? 0,
      };

      if (editTarget) {
        await updateEvent.mutateAsync({ id: editTarget.id, data: submitData });
        message.success("이벤트가 성공적으로 수정되었습니다");
      } else {
        await createEvent.mutateAsync(submitData);
        message.success("이벤트가 성공적으로 등록되었습니다");
      }
      setModalOpen(false);
    } catch (err) {
      // Form.validateFields() 실패 시에도 여기로 떨어짐 — 이때는 antd가 자체 표시
      const hasErrorFields = (err as { errorFields?: unknown[] })?.errorFields;
      if (!hasErrorFields) {
        console.error("이벤트 저장 실패:", err);
        message.error("이벤트 저장 중 오류가 발생했습니다.");
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent.mutateAsync(id);
      message.success("이벤트가 삭제되었습니다");
    } catch (err) {
      message.error("삭제 실패: " + (err as Error).message);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updateEvent.mutateAsync({ id, data: { isActive: !isActive } });
      message.success(isActive ? "이벤트를 숨겼습니다" : "이벤트를 노출했습니다");
    } catch {
      message.error("상태 변경 실패");
    }
  };

  const columns = [
    {
      title: "이벤트",
      key: "event",
      render: (_: unknown, r: AppEvent) => (
        <div className="flex items-center gap-3">
          {r.thumbnail ? (
            <img
              src={r.thumbnail}
              alt={r.title}
              className="h-12 w-16 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="h-12 w-16 shrink-0 rounded-md bg-gradient-to-br from-gray-200 to-gray-300" />
          )}
          <div>
            <p className="text-xs font-bold text-[#181C32]">{r.title}</p>
            <p className="line-clamp-1 text-[10px] text-[#A8A8A8]">
              {r.content}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "상태",
      key: "status",
      width: 80,
      render: (_: unknown, r: AppEvent) => {
        const s = getEventStatus(r, nowIso);
        return <Tag color={STATUS_META[s].color}>{STATUS_META[s].label}</Tag>;
      },
    },
    {
      title: "기간",
      key: "range",
      width: 180,
      render: (_: unknown, r: AppEvent) => (
        <span className="text-xs">
          {r.startAt ? dayjs(r.startAt).format("YYYY.MM.DD") : "-"}
          {" ~ "}
          {r.endAt ? dayjs(r.endAt).format("YYYY.MM.DD") : "-"}
        </span>
      ),
    },
    {
      title: "연결 상품",
      key: "products",
      width: 90,
      render: (_: unknown, r: AppEvent) => (
        <span className="text-xs font-bold text-blue-600">
          {(r.productIds ?? []).length}개
        </span>
      ),
    },
    {
      title: "우선순위",
      dataIndex: "priority",
      key: "priority",
      width: 90,
      sorter: (a: AppEvent, b: AppEvent) => (a.priority ?? 0) - (b.priority ?? 0),
      defaultSortOrder: "descend" as const,
      render: (v: number) => <span className="text-xs">{v ?? 0}</span>,
    },
    {
      title: "노출",
      dataIndex: "isActive",
      key: "active",
      width: 70,
      render: (v: boolean, r: AppEvent) => (
        <Switch
          size="small"
          checked={v}
          onChange={() => handleToggle(r.id, v)}
          loading={updateEvent.isPending}
        />
      ),
    },
    {
      title: "관리",
      key: "actions",
      width: 100,
      render: (_: unknown, r: AppEvent) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm
            title="이벤트를 삭제하시겠습니까?"
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
          <h1 className="text-xl font-bold text-[#181C32]">이벤트 관리</h1>
          <p className="mt-0.5 text-xs text-[#7E8299]">총 {events.length}개 이벤트</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          이벤트 등록
        </Button>
      </div>

      <Card size="small" className="border-[#E4E6EF]">
        <div className="mb-4 flex items-center gap-3">
          <Input
            prefix={<SearchOutlined className="text-[#7E8299]" />}
            placeholder="이벤트 제목 검색..."
            className="w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="게시 상태"
            className="w-32"
            allowClear
            value={filterStatus}
            onChange={(v) => setFilterStatus((v as EventStatus) ?? null)}
          >
            <Select.Option value="upcoming">예정</Select.Option>
            <Select.Option value="ongoing">진행중</Select.Option>
            <Select.Option value="ended">종료</Select.Option>
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

      <Modal
        title={editTarget ? "이벤트 수정" : "이벤트 등록"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editTarget ? "수정" : "등록"}
        cancelText="취소"
        confirmLoading={createEvent.isPending || updateEvent.isPending}
        width={640}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <span className="text-sm font-bold text-[#181C32]">노출 상태</span>
            <Form.Item name="isActive" valuePropName="checked" noStyle>
              <Switch checkedChildren="노출" unCheckedChildren="숨김" />
            </Form.Item>
          </div>

          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: "제목을 입력하세요" }]}
          >
            <Input placeholder="예: [단독] 여름 맞이 바캉스 특별전!" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="thumbnail"
              label={
                <span>
                  프로필 이미지{" "}
                  <span className="text-[11px] font-normal text-[#A8A8A8]">
                    (메인 피드 카드)
                  </span>
                </span>
              }
              rules={[{ required: true, message: "프로필 이미지를 업로드하세요" }]}
            >
              <ImageUpload folder="events" />
            </Form.Item>
            <Form.Item
              name="bannerImage"
              label={
                <span>
                  홍보 이미지{" "}
                  <span className="text-[11px] font-normal text-[#A8A8A8]">
                    (이벤트 상세 상단)
                  </span>
                </span>
              }
              rules={[{ required: true, message: "홍보 이미지를 업로드하세요" }]}
            >
              <ImageUpload folder="events" />
            </Form.Item>
          </div>

          <Form.Item
            name="content"
            label="본문"
            rules={[{ required: true, message: "본문을 입력하세요" }]}
          >
            <Input.TextArea
              rows={8}
              placeholder="이벤트 본문을 입력하세요. 줄바꿈은 그대로 노출됩니다."
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="range"
              label="게시 기간"
              rules={[{ required: true, message: "기간을 선택하세요" }]}
            >
              <RangePicker className="w-full" />
            </Form.Item>
            <Form.Item
              name="priority"
              label="우선순위 (높을수록 상단)"
              rules={[{ required: true, message: "우선순위를 입력하세요" }]}
            >
              <InputNumber className="w-full" min={0} step={1} />
            </Form.Item>
          </div>

          <Form.Item name="productIds" label="연결 상품 (다중 선택)">
            <Select
              mode="multiple"
              placeholder="이벤트와 연결할 상품을 선택하세요"
              optionFilterProp="label"
              options={products.map((p) => ({
                label: `${p.brand} · ${p.name}`,
                value: p.id,
              }))}
              maxTagCount="responsive"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
