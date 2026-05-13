"use client";

import React, { useState, useEffect } from "react";
import { App, Input, Checkbox, Drawer } from "antd";
import { useDaumPostcode } from "@/hooks/useDaumPostcode";
import { updateUserProfile } from "@/lib/services/user";
import { useAuthStore } from "@/stores/authStore";
import type { ShippingAddress } from "@/types";

interface Props {
  onClose: () => void;
  editData?: ShippingAddress; // [v13.34] 수정 모드를 위한 프로필 데이터 추가
}

export default function AddressAddSheet({ onClose, editData }: Props) {
  const { user, setUser } = useAuthStore();
  const { message } = App.useApp();
  const { embedPostcode } = useDaumPostcode();

  const isEdit = !!editData;

  const [label, setLabel] = useState(editData?.label || "");
  const [recipient, setRecipient] = useState(editData?.recipient || user?.nickname || "");
  const [phone, setPhone] = useState(editData?.phone || user?.phone || "");
  const [zipCode, setZipCode] = useState(editData?.zipCode || "");
  const [address, setAddress] = useState(editData?.address || "");
  const [addressDetail, setAddressDetail] = useState(editData?.addressDetail || "");
  const [isDefault, setIsDefault] = useState(editData?.isDefault || false);
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
      const targetAddress: ShippingAddress = {
        id: editData?.id || `addr_${Date.now()}`,
        label,
        recipient,
        phone,
        zipCode,
        address,
        addressDetail,
        isDefault: user.addresses?.length === 0 ? true : isDefault,
      };

      let updatedAddresses = [...(user.addresses || [])];

      // 기본 배송지 설정 처리
      if (targetAddress.isDefault) {
        updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
      }

      if (isEdit) {
        // 수정 모드: ID가 같은 항목을 교체
        updatedAddresses = updatedAddresses.map(addr => 
          addr.id === targetAddress.id ? targetAddress : addr
        );
      } else {
        // 추가 모드: 배열 끝에 추가
        updatedAddresses.push(targetAddress);
      }

      // [v13.34] 기본 배송지를 항상 맨 앞으로 정렬
      const finalAddresses = [
        ...updatedAddresses.filter(a => a.isDefault),
        ...updatedAddresses.filter(a => !a.isDefault)
      ];

      await updateUserProfile(user.id, {
        addresses: finalAddresses,
      });

      setUser({ ...user, addresses: finalAddresses });
      message.success(isEdit ? "배송지가 수정되었습니다." : "배송지가 추가되었습니다.");
      onClose();
    } catch (error) {
      console.error(error);
      message.error("배송지 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      open={true}
      onClose={onClose}
      placement="bottom"
      closable={false}
      getContainer={false}
      styles={{
        wrapper: { 
          height: "90dvh",
          width: "calc(100% + 2px)",
          marginLeft: "-1px",
          position: "absolute",
          bottom: 0,
        },
        section: {
          borderRadius: "20px 20px 0 0",
          overflow: "hidden"
        },
        body: { padding: 0, display: 'flex', flexDirection: 'column' },
      }}
    >
      {/* Drag Handle */}
      <div className="flex justify-center py-3 shrink-0">
        <div className="h-1 w-9 rounded-full bg-border" />
      </div>
      
      <div className="px-5 pb-4 shrink-0 border-b border-border">
        <h2 className="text-[18px] font-bold text-text">배송지 {isEdit ? "수정" : "추가"}</h2>
      </div>

      <div className="relative flex-1 overflow-y-auto px-5 py-5 space-y-4">
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

      <div className="px-5 pb-10 pt-4 shrink-0 border-t border-border bg-surface">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-12 rounded-lg bg-text text-[15px] font-bold text-surface hover:bg-text/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </Drawer>
  );
}
