"use client";

import { useState } from "react";
import BackTopBar from "@/components/common/BackTopBar";

const faqs = [
  { q: "배송은 얼마나 걸리나요?", a: "일반배송 기준 결제 완료 후 2~3 영업일 이내 배송됩니다. 주말 및 공휴일은 배송이 진행되지 않습니다." },
  { q: "교환/반품 신청 방법은?", a: "주문 상세 페이지에서 교환/반품 신청 버튼을 눌러 접수하실 수 있습니다. 상품 수령 후 7일 이내 가능합니다." },
  { q: "셀럽 착장 상품은 정품인가요?", a: "C.O.D.E.에서 판매하는 모든 브랜드 상품은 공식 판매처 또는 신뢰할 수 있는 리셀 업체를 통해 검수된 100% 정품입니다." },
  { q: "회원 탈퇴 후 재가입 가능한가요?", a: "탈퇴 후 즉시 재가입은 가능하나, 이전 계정의 데이터(주문 내역, 찜 목록, 포인트 등)는 복구되지 않습니다." },
  { q: "포인트 사용 방법은?", a: "결제 단계에서 보유하신 포인트를 10원 단위로 입력하여 사용하실 수 있습니다. 포인트 100P는 현금 100원과 동일한 가치를 가집니다." },
];

export default function SupportPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <BackTopBar title="고객센터" />

      <div className="flex-1 overflow-y-auto">
        {/* 전화 문의 - 와이어프레임 G6 스타일 */}
        <div className="bg-surface py-7 px-4 text-center border-b border-border">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]">
            <svg 
              style={{ width: '26px', height: '26px', fill: 'none', stroke: 'var(--color-blue)', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }} 
              viewBox="0 0 24 24"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9 19.79 19.79 0 0 1 1.61 3.27 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <p className="text-[13px] text-text-secondary mb-2">고객센터 운영시간 · 평일 09:00~18:00</p>
          <div className="text-[32px] font-extrabold text-text leading-tight tracking-[-1px]">
            1588-1234
          </div>
          <p className="mt-1.5 text-[12px] text-text-muted">토·일·공휴일 휴무</p>
        </div>

        {/* 구분선 */}
        <div className="h-2 bg-bg border-y border-border" />

        {/* FAQ - 와이어프레임 G6 스타일 */}
        <div className="bg-surface p-4 pb-20">
          <div className="text-[12px] font-bold text-text-secondary uppercase tracking-[0.06em] mb-3">
            ❓ 자주 묻는 질문
          </div>
          <div className="flex flex-col gap-[1px]">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-border-light last:border-0">
                <button
                  className="flex w-full items-center justify-between py-3.5 text-left bg-transparent"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                >
                  <span className="text-[13px] text-text font-medium">{faq.q}</span>
                  <svg 
                    style={{ 
                      width: '14px', height: '14px', fill: 'none', 
                      stroke: 'var(--color-text-muted)', strokeWidth: '2', 
                      strokeLinecap: 'round', transition: 'transform 0.2s',
                      transform: openIdx === i ? 'rotate(90deg)' : 'rotate(0deg)'
                    }} 
                    viewBox="0 0 24 24"
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
                {openIdx === i && (
                  <div className="pb-4 pt-1 text-[13px] leading-relaxed text-text-secondary whitespace-pre-line animate-in fade-in slide-in-from-top-1 duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
