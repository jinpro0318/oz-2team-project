"use client";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";

/**
 * [효진] 공통 이미지 업로드 서비스
 * 클라이언트 사이드에서 이미지를 압축하고 서버 API를 통해 업로드함
 */

/**
 * [효진] 이미지 압축 헬퍼
 * 관리자 설정에 따른 동적 해상도 및 품질로 압축하여 전송 및 저장 효율 최적화
 */
async function compressImage(file: File, maxWidth: number = 1024, quality: number = 0.7): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        }, "image/jpeg", quality);
      };
    };
  });
}

export async function uploadImage(file: File, path: string): Promise<string> {
  try {
    // 1. 관리자 보안/최적화 설정 패치 (오류 시 기본값 폴백)
    let clientMaxWidth = 1024;
    let clientQuality = 0.7;
    
    try {
      const docRef = doc(db, "settings", "security");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.clientMaxWidth) clientMaxWidth = data.clientMaxWidth;
        if (data.clientCompressionQuality) clientQuality = data.clientCompressionQuality / 100;
      }
    } catch (e) {
      console.warn("[시스템] 설정 패치 실패, 기본 압축 정책 사용");
    }

    // [효진] 업로드 전 클라이언트 이미지 압축 진행
    console.log(`[시스템] 이미지 클라이언트 1차 압축 중... (Max Width: ${clientMaxWidth}px, Quality: ${clientQuality * 100}%)`);
    const compressedFile = await compressImage(file, clientMaxWidth, clientQuality);
    
    console.log(`[시스템] 서버 보안 API(/api/upload)로 업로드 요청: ${path}/${compressedFile.name}`);

    // 서버로 FormData 전송
    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("path", path);

    // [보안] 로컬 스토리지에 저장된 어드민 토큰을 가져와 Authorization 헤더에 동봉
    const token = typeof window !== 'undefined' ? localStorage.getItem("admin_token") || "" : "";

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "서버 통신 오류가 발생했습니다.");
    }

    console.log("[시스템] 서버 보안 업로드 성공:", data.url);
    return data.url;

  } catch (error: any) {
    console.error("[시스템] 안전 업로드 차단됨 상세 에러:", error);
    
    // [보안] 에러 발생 시 악명 높은 Firestore 1MB 초과 유발 로컬 Base64 변환을 영구 차단합니다!
    // 클라이언트 UI단에서 에러를 잡아 경고창을 띄우도록 Error 객체를 강제로 튕겨냅니다.
    throw new Error(
      error.message?.includes("CORS") 
        ? "서버와의 통신에 실패했습니다. (CORS/네트워크 오류)" 
        : `보안 필터 차단: ${error.message}`
    );
  }
}
