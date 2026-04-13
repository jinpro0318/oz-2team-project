"use client";

import { useState } from "react";
import { PhoneOutlined, RightOutlined, DownOutlined } from "@ant-design/icons";
import BackTopBar from "@/components/common/BackTopBar";

const faqs = [
  { q: "주문 후 배송까지 얼마나 걸리나요?", a: "일반배송 기준 결제 완료 후 2~3 영업일 이내 배송됩니다. 주말 및 공휴일은 배송이 진행되지 않습니다." },
  { q: "교환/반품은 어떻게 하나요?", a: "주문 상세 페이지에서 교환/반품 신청 버튼을 눌러 접수하실 수 있습니다. 상품 수령 후 7일 이내 가능합니다." },
  { q: "결제 수단은 어떤 것이 있나요?", a: "신용/체크카드, 카카오페이, 네이버페이를 지원합니다. TossPayments를 통해 안전하게 결제됩니다." },
  { q: "비회원으로 주문할 수 있나요?", a: "현재 MVP 버전에서는 회원 가입 후 주문이 가능합니다. 이메일로 간편하게 가입할 수 있습니다." },
  { q: "상품 탭(흰 점)은 무엇인가요?", a: "셀럽 피드 이미지 위에 표시되는 흰 점입니다. 탭하면 해당 위치의 착장 상품 정보를 확인하고 바로 구매할 수 있습니다." },
];

export default function SupportPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <BackTopBar title="고객센터" />

      {/* Phone Hero */}
      <div className="bg-surface px-4 py-6 text-center border-b border-border">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <PhoneOutlined className="text-2xl text-primary" />
        </div>
        <p className="text-sm text-text-secondary">전화 상담</p>
        <a href="tel:1588-1234" className="text-2xl font-bold text-text no-underline">
          1588-1234
        </a>
        <p className="mt-1 text-xs text-text-muted">평일 09:00 ~ 18:00 | 토·일·공휴일 휴무</p>
      </div>

      {/* FAQ */}
      <div className="mt-2 bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-[15px] font-bold">자주 묻는 질문</h3>
        </div>
        {faqs.map((faq, i) => (
          <div key={i} className="border-b border-border-light">
            <button
              className="flex w-full items-center justify-between px-4 py-3.5 text-left bg-transparent"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
            >
              <span className="text-sm font-medium">{faq.q}</span>
              {openIdx === i ? (
                <DownOutlined className="text-xs text-text-muted" />
              ) : (
                <RightOutlined className="text-xs text-text-muted" />
              )}
            </button>
            {openIdx === i && (
              <div className="px-4 pb-3 text-[13px] leading-relaxed text-text-secondary">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
