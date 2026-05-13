"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { App, Drawer } from "antd";
import { useAuthStore } from "@/stores/authStore";
import { updateUserProfile } from "@/lib/services/user";
import { deleteAccount } from "@/lib/auth";
import EmailProtector from "@/components/mypage/EmailProtector";
import EmailProtectionToggle from "@/components/mypage/EmailProtectionToggle";
import AddressAddSheet from "@/components/mypage/AddressAddSheet";
import Avatar from "@/components/common/Avatar";
import { useUIStore } from "@/stores/uiStore";
import { uploadImage } from "@/lib/services/upload";
import { useOrders } from "@/hooks/useOrders";
import { useWishlist } from "@/hooks/useWishlist";

export default function ProfileEditPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { user, setUser } = useAuthStore();
  const setBottomNavVisible = useUIStore((s) => s.setBottomNavVisible);

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [realName, setRealName] = useState(user?.name ?? user?.nickname ?? ""); // [v13.36] 실제 이름 상태 추가
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [mounted, setMounted] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // 계정 탈퇴 바텀시트 관련
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  
  // 배송지 추가/수정 바텀시트 관련
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null); // [v13.34] 수정할 주소 데이터 저장
  
  // 데이터 동기화 (주문, 찜)
  const { data: orders } = useOrders();
  const { items: wishlistItems } = useWishlist();
  
  const ordersCount = orders?.length ?? 0;
  const wishlistCount = wishlistItems.length;
  const userPoints = user?.points ?? 0;

  useEffect(() => {
    setMounted(true);
    // 언마운트 시 하단 내비 복구
    return () => setBottomNavVisible(true);
  }, [setBottomNavVisible]);

  // 탈퇴 팝업 상태에 따라 하단 내비 숨김/표시
  useEffect(() => {
    setBottomNavVisible(!showDeleteSheet);
  }, [showDeleteSheet, setBottomNavVisible]);

  // [v13.45 긴급 복구] 날아간 기본 정보(별명, 이름) 자동 복구
  useEffect(() => {
    if (user && !user.nickname && user.id === "GLq93WrA9fO5whdISv1HvQbUeKa2") {
      updateUserProfile(user.id, { nickname: "test", name: "테스트" }).then(() => {
        setUser({ ...user, nickname: "test", name: "테스트" });
        setNickname("test");
        setRealName("테스트");
      });
    }
  }, [user, setUser]);

  if (!mounted || !user) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      message.loading({ content: "사진 업로드 중...", key: "photoUpload" });
      
      const folderPath = `user_profiles/${user.id}`;
      const url = await uploadImage(file, folderPath);
      
      await updateUserProfile(user.id, { photoUrl: url });
      setUser({ ...user, photoUrl: url });
      
      message.success({ content: "프로필 사진이 변경되었습니다.", key: "photoUpload" });
    } catch (error) {
      console.error("Photo upload failed:", error);
      message.error({ content: "사진 업로드에 실패했습니다.", key: "photoUpload" });
    } finally {
      setIsUploadingPhoto(false);
      const fileInput = document.getElementById("profile-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  };

  const handlePhotoDelete = async () => {
    if (!user.photoUrl) return;
    
    try {
      setIsUploadingPhoto(true);
      message.loading({ content: "사진 삭제 중...", key: "photoUpload" });
      
      // DB에서 URL 제거 (실제 Storage 삭제는 배치 작업으로 처리 권장)
      await updateUserProfile(user.id, { photoUrl: "" });
      setUser({ ...user, photoUrl: undefined });
      
      message.success({ content: "기본 이미지로 변경되었습니다.", key: "photoUpload" });
    } catch (error) {
      console.error("Photo delete failed:", error);
      message.error({ content: "사진 삭제에 실패했습니다.", key: "photoUpload" });
    } finally {
      setIsUploadingPhoto(false);
      const fileInput = document.getElementById("profile-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      message.warning("별명을 입력해주세요");
      return;
    }
    
    try {
      await updateUserProfile(user.id, {
        nickname,
        name: realName, // [v13.36] 이름 필드 별도 저장
        phone,
      });
      setUser({ ...user, nickname, name: realName, phone });
      message.success("프로필이 저장되었습니다");
      router.back();
    } catch (error) {
      console.error(error);
      message.error("저장 중 오류가 발생했습니다");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      message.warning("비밀번호를 입력해주세요");
      return;
    }
    try {
      await deleteAccount(deletePassword);
      setUser(null);
      message.success("계정이 탈퇴 처리되었습니다");
      router.push("/feed");
    } catch (error) {
      message.error("비밀번호가 올바르지 않습니다");
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user || !user.addresses) return;

    try {
      const updatedAddresses = user.addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      }));

      // 기본 배송지를 배열의 맨 앞으로 이동
      const defaultAddr = updatedAddresses.find(a => a.isDefault);
      const otherAddrs = updatedAddresses.filter(a => !a.isDefault);
      const finalAddresses = defaultAddr ? [defaultAddr, ...otherAddrs] : updatedAddresses;

      await updateUserProfile(user.id, { addresses: finalAddresses });
      setUser({ ...user, addresses: finalAddresses });
      message.success("기본 배송지가 변경되었습니다.");
    } catch (error) {
      console.error(error);
      message.error("기본 배송지 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user || !user.addresses) return;

    if (!window.confirm("이 배송지를 삭제하시겠습니까?")) return;

    try {
      const deletedAddr = user.addresses.find(addr => addr.id === addressId);
      let updatedAddresses = user.addresses.filter(addr => addr.id !== addressId);
      
      // 만약 지워진게 기본 배송지였고 다른 배송지가 남아있다면 첫 번째 배송지를 기본으로 지정
      if (deletedAddr?.isDefault && updatedAddresses.length > 0) {
        updatedAddresses[0].isDefault = true;
      }

      await updateUserProfile(user.id, { addresses: updatedAddresses });
      setUser({ ...user, addresses: updatedAddresses });
      message.success("배송지가 삭제되었습니다.");
    } catch (error) {
      console.error(error);
      message.error("배송지 삭제 중 오류가 발생했습니다.");
    }
  };

  const username = user.email.split("@")[0];

  return (
    <div className="flex flex-col bg-surface flex-1 pb-[60px]">
      {/* Top Bar (G-3 Style) */}
      <div className="sticky top-0 z-10 flex h-[50px] items-center border-b border-border bg-surface px-3">
        <div 
          className="flex h-10 w-10 cursor-pointer items-center justify-center -ml-2"
          onClick={() => router.back()}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-text stroke-[2px]">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
        <h1 className="flex-1 text-[15px] font-bold text-text ml-1">프로필 편집</h1>
        <button 
          className="text-[14px] font-bold text-[#0095F6] hover:opacity-70 transition-opacity"
          onClick={handleSave}
        >
          저장
        </button>
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center border-b border-border bg-surface py-6 px-5">
        <div className="relative">
          <label 
            htmlFor="profile-upload" 
            className={`cursor-pointer block ${isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Avatar user={user} size={72} />
            <div className="absolute bottom-0 right-0 rounded-full bg-text border border-surface p-1 shadow-sm">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-white stroke-[2.5px]">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </label>
          <input 
            id="profile-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
            disabled={isUploadingPhoto}
          />
        </div>
        
        <div className="mt-2.5 text-[13px] font-bold text-text">{user.nickname}</div>
        
        {user.photoUrl ? (
          <button 
            className="mt-1.5 text-[11px] font-bold text-[#ED4956] hover:opacity-70 transition-opacity"
            onClick={handlePhotoDelete}
            disabled={isUploadingPhoto}
          >
            기본 이미지로 변경
          </button>
        ) : (
          <div className="mt-0.5 text-[12px] text-text-muted">{username}</div>
        )}
      </div>

      {/* Basic Info */}
      <div className="flex flex-col gap-3.5 border-b border-border bg-surface p-[14px_12px]">
        <div className="text-[11px] font-bold tracking-[0.06em] text-text-muted uppercase">기본 정보</div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-text-secondary">별명</label>
          <input
            type="text"
            className="h-[42px] w-full rounded border-[1.5px] border-text bg-surface px-3 text-[14px] font-medium text-text outline-none"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <p className="text-[11px] text-text-muted leading-tight">영문·숫자·밑줄(_)·마침표(.) 사용 가능</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-text-secondary">이름</label>
          <input
            type="text"
            className="h-[42px] w-full rounded border border-border bg-bg px-3 text-[14px] text-text opacity-70 outline-none cursor-not-allowed"
            value={realName}
            readOnly
            placeholder="실명이 등록되지 않았습니다"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-semibold text-text-secondary">이메일</label>
            {!user.isEmailProtected && <EmailProtectionToggle mode="set" />}
          </div>
          <div className="rounded-lg border border-border bg-bg p-2 min-h-[42px] flex items-center">
            {user.isEmailProtected ? (
              <EmailProtectionToggle mode="unset" />
            ) : (
              <span className="text-[14px] font-medium text-text px-1">{user.email}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-semibold text-text-secondary">전화번호</label>
          <input
            type="tel"
            placeholder="010-0000-0000"
            className="h-[42px] w-full rounded border border-border bg-surface px-3 text-[14px] text-text outline-none focus:border-text transition-colors"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      {/* Address Management */}
      <div className="flex flex-col border-b border-border bg-surface p-[14px_12px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-bold tracking-[0.06em] text-text-muted uppercase">배송지 관리</div>
          <button 
            className="h-[26px] rounded-full border border-border bg-bg px-2.5 text-[11px] font-bold text-text transition-colors hover:bg-border-light"
            onClick={() => {
              setEditingAddress(null);
              setShowAddressSheet(true);
            }}
          >
            + 추가
          </button>
        </div>

        {/* Default Address */}
        {user.addresses && user.addresses.length > 0 ? (
          <div className="space-y-2">
            {user.addresses.map((addr) => (
              <div key={addr.id} className={`rounded-xl p-3 ${addr.isDefault ? "border-[1.5px] border-text" : "border border-border"}`}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <div className="text-[12px] font-bold text-text">{addr.label}</div>
                  {addr.isDefault && (
                    <div className="rounded-full bg-text px-1.5 py-0.5 text-[9px] font-bold text-white">기본</div>
                  )}
                </div>
                <div className="text-[13px] font-semibold text-text">{addr.recipient} · {addr.phone}</div>
                <div className="mt-1 text-[12px] text-text-secondary leading-normal">
                  {addr.address} {addr.addressDetail}<br />
                  우편번호 {addr.zipCode}
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingAddress(addr);
                      setShowAddressSheet(true);
                    }}
                    className="flex-1 h-[30px] rounded border border-border bg-surface text-[12px] font-bold text-text hover:bg-bg transition-colors"
                  >
                    수정
                  </button>
                  <button 
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="flex-1 h-[30px] rounded border border-border bg-surface text-[12px] font-bold text-text-secondary hover:bg-bg transition-colors"
                  >
                    삭제
                  </button>
                  {!addr.isDefault && (
                    <button 
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      className="flex-1 h-[30px] rounded border border-border bg-surface text-[12px] font-bold text-[#0095F6] hover:bg-bg transition-colors text-nowrap"
                    >
                      기본 설정
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-[12px] text-text-muted bg-bg/50 rounded-lg border border-dashed border-border">
            등록된 배송지가 없습니다.
          </div>
        )}
      </div>

      {/* Account Management */}
      <div className="bg-surface px-3 pt-3 pb-1">
        <div className="text-[11px] font-bold tracking-[0.06em] text-text-muted uppercase mb-2">계정 관리</div>
      </div>
      
      <div 
        className="flex h-[54px] items-center gap-3 bg-surface px-3 cursor-pointer active:bg-bg transition-colors"
        onClick={() => router.push("/mypage/password")}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-text stroke-[2px]">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <div className="flex-1 text-[14px] font-bold text-text">비밀번호 변경</div>
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-text-muted stroke-[2px]">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      <div 
        className="flex h-[54px] items-center gap-3 bg-surface px-3 cursor-pointer active:bg-bg transition-colors"
        onClick={() => setShowDeleteSheet(true)}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[#ED4956] stroke-[2px]">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
        <div className="flex-1">
          <div className="text-[14px] font-bold text-[#ED4956]">계정 탈퇴</div>
          <div className="text-[11px] text-[#ED4956]/60 font-medium">탭 → 확인 팝업 표시</div>
        </div>
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[#ED4956] stroke-[2px]">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* Delete Account Bottom Sheet (Consistent with LoginPromptSheet) */}
      <Drawer
        open={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        placement="bottom"
        closable={false}
        getContainer={false}
        styles={{
          wrapper: { 
            height: "auto",
            width: "calc(100% + 2px)",
            marginLeft: "-1px",
            position: "absolute",
            bottom: 0,
          },
          section: {
            borderRadius: "20px 20px 0 0",
            overflow: "hidden"
          },
          body: { padding: 0 },
        }}
      >
        <div className="flex flex-col items-center px-5 pb-10 pt-2">
          {/* Drag Handle */}
          <div className="flex justify-center py-3">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>

          {/* Trash Icon */}
          <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-red-50">
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-[#ED4956] stroke-[2px]">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
          
          <h2 className="mb-1 text-[18px] font-bold text-text">계정 탈퇴</h2>
          <p className="mb-4 text-center text-[13px] leading-relaxed text-text-secondary">
            탈퇴 시 주문 내역, 찜 목록이<br />
            <span className="font-bold text-[#ED4956]">영구 삭제</span>되며 복구할 수 없어요.
          </p>

          {/* Data Loss Summary (Real Data Synced) */}
          <div className="mb-5 w-full rounded-xl border border-red-100 bg-red-50/30 p-3.5 space-y-1.5 text-left">
            <div className="flex gap-2 text-[11px] text-[#ED4956] font-medium">
              <span>✕</span> <span>주문 내역 {ordersCount}건</span>
            </div>
            <div className="flex gap-2 text-[11px] text-[#ED4956] font-medium">
              <span>✕</span> <span>찜한 상품 {wishlistCount}개</span>
            </div>
            <div className="flex gap-2 text-[11px] text-[#ED4956] font-medium">
              <span>✕</span> <span>적립 포인트 {userPoints.toLocaleString()}P</span>
            </div>
          </div>

          {/* Password Input for deletion */}
          <input 
            type="password"
            placeholder="비밀번호를 입력하세요"
            className="mb-5 h-12 w-full rounded-xl border border-border bg-bg px-4 text-[14px] outline-none focus:border-red-400 transition-colors"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />

          <div className="flex w-full gap-3">
            <button 
              className="h-[50px] flex-1 rounded-xl border border-border bg-surface text-[15px] font-bold text-text active:scale-95 transition-all"
              onClick={() => setShowDeleteSheet(false)}
            >
              취소
            </button>
            <button 
              className="h-[50px] flex-1 rounded-xl bg-[#ED4956] text-[15px] font-bold text-white shadow-lg shadow-red-200 active:scale-95 transition-all"
              onClick={handleDeleteAccount}
            >
              탈퇴하기
            </button>
          </div>
        </div>
      </Drawer>

      {/* Address Add/Edit Bottom Sheet */}
      {showAddressSheet && (
        <AddressAddSheet 
          editData={editingAddress}
          onClose={() => {
            setShowAddressSheet(false);
            setEditingAddress(null);
          }} 
        />
      )}
    </div>
  );
}
