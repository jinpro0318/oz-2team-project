"use client";

import React, { useState, useEffect } from "react";
import { App, Input, Checkbox } from "antd";
import { useDaumPostcode } from "@/hooks/useDaumPostcode";
import { updateDocument } from "@/lib/firestore";
import { useAuthStore } from "@/stores/authStore";
import type { ShippingAddress } from "@/types";

interface Props {
  onClose: () => void;
}

export default function AddressAddSheet({ onClose }: Props) {
  const { user, setUser } = useAuthStore();
  const { message } = App.useApp();
  const { embedPostcode } = useDaumPostcode();

  const [label, setLabel] = useState("");
  const [recipient, setRecipient] = useState(user?.nickname || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 주소 검색 레이어 표시 여부
  const [showSearchLayer, setShowSearchLayer] = useState(false);

  useEffect(() => {
    if (showSearchLayer) {
      // 레이어가 DOM에 렌더링 된 직후 embedPostcode 호출
      embedPostcode("daum-postcode-container", (data) => {
        setZipCode(data.zonecode);
        setAddress(data.address);
        setAddressDetail("");
        setShowSearchLayer(false); // 선택 완료 시 레이어 닫기
      });
    }
  }, [showSearchLayer, embedPostcode]);

  const handleSave = async () => {
    if (!user) return;
    if (!label.trim() || !recipient.trim() || !phone.trim() || !zipCode || !address) {
      message.warning("필수 배송지 정보를 모두 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const newAddress: ShippingAddress = {
        id: `addr_${Date.now()}`,
        label,
        recipient,
        phone,
        zipCode,
        address,
        addressDetail,
        isDefault: user.addresses?.length === 0 ? true : isDefault,
      };

      let updatedAddresses = [...(user.addresses || [])];

      if (newAddress.isDefault) {
        updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
      }

      updatedAddresses.push(newAddress);

      await updateDocument("users", user.id, {
        addresses: updatedAddresses,
      });

      setUser({ ...user, addresses: updatedAddresses });
      message.success("배송지가 추가되었습니다.");
      onClose();
    } catch (error) {
      console.error(error);
      message.error("배송지 추가 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[390px] rounded-t-[20px] bg-surface shadow-[0_-8px_30px_rgb(0,0,0,0.12)] animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[90vh]">
        {/* Drag Handle */}
        <div className="flex justify-center py-3 shrink-0">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>
        
        <div className="px-5 pb-4 shrink-0 border-b border-border">
          <h2 className="text-[18px] font-bold text-text">배송지 추가</h2>
        </div>

        <div className="relative overflow-y-auto px-5 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-secondary">배송지명 <span className="text-[#ED4956]">*</span></label>
            <Input 
              placeholder="예) 집, 회사" 
              value={label} 
              onChange={(e) => setLabel(e.target.value)} 
              size="large"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-secondary">받는 사람 <span className="text-[#ED4956]">*</span></label>
            <Input 
              placeholder="이름" 
              value={recipient} 
              onChange={(e) => setRecipient(e.target.value)} 
              size="large"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-secondary">연락처 <span className="text-[#ED4956]">*</span></label>
            <Input 
              type="tel"
              placeholder="010-0000-0000" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              size="large"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-text-secondary">주소 <span className="text-[#ED4956]">*</span></label>
            <div className="flex gap-2 mb-2">
              <Input placeholder="우편번호" value={zipCode} readOnly size="large" className="bg-bg" />
              <button 
                onClick={() => setShowSearchLayer(true)}
                className="shrink-0 rounded-lg bg-text px-4 text-[13px] font-bold text-surface hover:bg-text/90 transition-colors"
              >
                주소 검색
              </button>
            </div>
            <Input 
              placeholder="기본 주소" 
              value={address} 
              readOnly 
              size="large" 
              className="bg-bg mb-2"
            />
            <Input 
              placeholder="상세 주소를 입력해주세요" 
              value={addressDetail} 
              onChange={(e) => setAddressDetail(e.target.value)} 
              size="large"
            />
          </div>

          {/* 기본 배송지 체크박스 */}
          {user?.addresses && user.addresses.length > 0 && (
            <div className="pt-2">
              <Checkbox 
                checked={isDefault} 
                onChange={(e) => setIsDefault(e.target.checked)}
                className="text-[13px] font-medium"
              >
                기본 배송지로 설정
              </Checkbox>
            </div>
          )}

          {/* 주소 검색 레이어 (Embed) */}
          {showSearchLayer && (
            <div className="absolute inset-0 z-10 flex flex-col bg-surface overflow-hidden rounded-t-[20px]">
              <div className="flex items-center justify-between border-b border-border p-4 shrink-0 bg-surface">
                <span className="font-bold text-text">주소 검색</span>
                <button 
                  onClick={() => setShowSearchLayer(false)}
                  className="text-[13px] font-bold text-text-muted hover:text-text"
                >
                  닫기
                </button>
              </div>
              <div id="daum-postcode-container" className="flex-1 w-full bg-bg" />
            </div>
          )}
        </div>

        <div className="px-5 pb-[80px] pt-4 shrink-0 border-t border-border">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 rounded-lg bg-text text-[15px] font-bold text-surface hover:bg-text/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
