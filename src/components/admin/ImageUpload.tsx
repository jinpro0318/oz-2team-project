"use client";

import { useState } from "react";
import { Upload, message as staticMessage, App } from "antd"; // [효진] App 추가
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { uploadImage } from "@/lib/services/upload";
import type { UploadChangeParam, UploadFile, UploadProps } from "antd/es/upload";

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  folder?: string;
}

/**
 * [효진] 관리자용 공통 이미지 업로드 컴포넌트
 * Ant Design Upload를 사용하여 Firebase Storage에 이미지를 업로드하고 URL을 반환함
 */
export default function ImageUpload({ value, onChange, folder = "general" }: ImageUploadProps) {
  const { message } = App.useApp(); // [효진] 컨텍스트 기반 메시지 사용
  const [loading, setLoading] = useState(false);

  const handleChange: UploadProps["onChange"] = async (info: UploadChangeParam<UploadFile>) => {
    if (info.file.status === "uploading") {
      setLoading(true);
      return;
    }
  };

  const customRequest = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;
    
    try {
      setLoading(true);
      console.log("[효진] 업로드 프로세스 시작...");
      
      onProgress({ percent: 30 });
      const url = await uploadImage(file as File, folder);
      
      console.log("[효진] 업로드 완료/폴백 수신:", url);
      onProgress({ percent: 100 });
      
      onSuccess(url, file);
      
      if (onChange) {
        onChange(url);
      }
      message.success("이미지 처리가 완료되었습니다.");
    } catch (error: any) {
      console.error("[효진] 업로드 예외 발생:", error);
      onError(error);
      message.error("이미지 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>업로드</div>
    </div>
  );

  return (
    <Upload
      name="avatar"
      listType="picture-card"
      className="avatar-uploader"
      showUploadList={false}
      customRequest={customRequest}
      onChange={handleChange}
      accept="image/*"
    >
      {value ? (
        <img src={value} alt="uploaded" style={{ width: "100%", borderRadius: "8px" }} />
      ) : (
        uploadButton
      )}
    </Upload>
  );
}
