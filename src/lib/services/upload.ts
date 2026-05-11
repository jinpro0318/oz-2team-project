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

export async function uploadImage(file: File, path: string): Promise<string> {
  let compressedFile: File | null = null;
  
  try {
    // [효진] 업로드 전 이미지 압축 진행
    console.log("[효진] 이미지 압축 중...");
    compressedFile = await compressImage(file);
    
    console.log(`[시스템] Firebase Storage 직접 업로드 시도: ${path}/${compressedFile.name}`);
    
    // 파일명 중복 방지를 위한 타임스탬프 추가
    const fileName = `${Date.now()}_${compressedFile.name}`;
    const storageRef = ref(storage, `${path}/${fileName}`);

    // 클라이언트 SDK를 통해 직접 업로드 (사용자 인증 정보 자동 포함)
    // CORS나 규칙으로 인해 무한 재시도(hang)에 빠지는 것을 방지하기 위해 5초 타임아웃 적용
    const uploadTask = async () => {
      const snapshot = await uploadBytes(storageRef, compressedFile!);
      return await getDownloadURL(snapshot.ref);
    };

    const timeoutTask = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error("Firebase Storage Upload Timeout (CORS/Rules Issue)")), 5000);
    });

    const downloadURL = await Promise.race([uploadTask(), timeoutTask]);

    console.log("[시스템] Firebase Storage 직접 업로드 성공:", downloadURL);
    return downloadURL;

  } catch (error: any) {
    console.error("[시스템] Firebase Storage 업로드 상세 에러:", error);
    
    // [효진] 기존의 업로드 실패 시 로컬 폴백 (Base64) 로직 유지
    console.warn("[시스템] 서버 업로드 실패, 압축된 로컬 폴백 진행");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(compressedFile || file);
    });
  }
}
