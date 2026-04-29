import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * [효진] 공통 이미지 업로드 서비스
 * @param file 업로드할 파일 객체
 * @param path 저장할 경로 (예: 'products', 'posts', 'celebrities')
 * @returns 업로드된 이미지의 다운로드 URL
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
  try {
    // [효진] 업로드 전 이미지 압축 진행
    console.log("[효진] 이미지 압축 중...");
    const compressedFile = await compressImage(file);
    
    console.log(`[효진] 서버 API 업로드 시도: ${path}/${compressedFile.name}`);
    
    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("folder", path);
...
