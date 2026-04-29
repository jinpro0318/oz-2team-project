"use client";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * [효진] 공통 이미지 업로드 서비스
 * 클라이언트 사이드에서 이미지를 압축하고 서버 API를 통해 업로드함
 */

/**
 * [효진] 이미지 압축 헬퍼
 * 고해상도 이미지를 1024px 너비로 압축하여 전송 및 저장 효율 최적화
 */
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1024;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
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
        }, "image/jpeg", 0.7); // 70% 품질로 압축
      };
    };
  });
}

/**
 * 이미지 업로드 메인 함수
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  let compressedFile: File | null = null;
  
  try {
    // [효진] 업로드 전 이미지 압축 진행
    console.log("[효진] 이미지 압축 중...");
    compressedFile = await compressImage(file);
    
    console.log(`[효진] 서버 API 업로드 시도: ${path}/${compressedFile.name}`);
    
    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("folder", path);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "서버 업로드 실패");
    }

    const data = await response.json();
    console.log("[효진] 서버 API 업로드 성공:", data.url);
    return data.url;
  } catch (error: any) {
    console.warn("[효진] 서버 업로드 실패, 압축된 로컬 폴백 진행:", error);
    
    // [효진] 업로드 실패 시, '압축된' 파일을 Base64로 변환하여 반환 (Firestore 1MB 제한 대응)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("[효진] 압축된 로컬 모드 전환 완료");
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      
      // [효진] 원본 대신 압축된 파일 사용
      reader.readAsDataURL(compressedFile || file);
    });
  }
}
