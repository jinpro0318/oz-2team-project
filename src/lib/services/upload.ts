import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * [효진] 공통 이미지 업로드 서비스
 * @param file 업로드할 파일 객체
 * @param path 저장할 경로 (예: 'products', 'posts', 'celebrities')
 * @returns 업로드된 이미지의 다운로드 URL
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  try {
    console.log(`[효진] 서버 API를 통한 업로드 시도: ${path}/${file.name}`);
    
    // [효진] FormData 생성하여 서버 API 호출
    const formData = new FormData();
    formData.append("file", file);
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
    console.warn("[효진] 서버 업로드 실패, 마지막 수단으로 로컬 폴백 진행:", error);
    
    // [효진] 서버 업로드마저 실패할 경우(용량 초과 등), 로컬 Base64로 반환하여 작업 연속성 유지
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("[효진] 로컬 모드 전환 완료 (최종 폴백)");
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
