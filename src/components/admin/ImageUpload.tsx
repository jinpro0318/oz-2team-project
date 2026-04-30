"use client";

import { useState } from "react";
import { Upload, App } from "antd"; // [효진] App 추가
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { uploadImage } from "@/lib/services/upload";
import type { UploadChangeParam, UploadFile, UploadProps } from "antd/es/upload";

interface ImageUploadProps {
  value?: string | string[]; // [효진] 단일 URL 또는 URL 배열 지원
  onChange?: (val: any) => void;
  folder?: string;
  multiple?: boolean; // [효진] 다중 업로드 모드 추가
  maxCount?: number;
}

/**
 * [효진] 관리자용 공통 이미지 업로드 컴포넌트 (다중 업로드 지원)
 * Ant Design Upload를 사용하여 Firebase Storage에 이미지를 업로드하고 URL을 반환함
 */
export default function ImageUpload({ 
  value, 
  onChange, 
  folder = "general", 
  multiple = false,
  maxCount = 5
}: ImageUploadProps) {
  const { message } = App.useApp(); 
  const [loading, setLoading] = useState(false);

  // value(URL)를 Ant Design Upload가 이해하는 fileList 형식으로 변환
  const getFileList = () => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((url, i) => ({
        uid: `-${i}`,
        name: `image-${i}`,
        status: "done" as const,
        url,
      }));
    }
    return [{
      uid: "-1",
      name: "image",
      status: "done" as const,
      url: value,
    }];
  };

  const customRequest = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;
    
    try {
      setLoading(true);
      onProgress({ percent: 30 });
      const url = await uploadImage(file as File, folder);
      onProgress({ percent: 100 });
      
      onSuccess(url, file);
      
      if (onChange) {
        if (multiple) {
          const currentList = Array.isArray(value) ? value : (value ? [value] : []);
          onChange([...currentList, url]);
        } else {
          onChange(url);
        }
      }
      message.success("업로드 완료");
    } catch (error: any) {
      onError(error);
      message.error("업로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (file: UploadFile) => {
    if (!onChange) return;
    const urlToRemove = file.url || (file.response as string);
    
    if (multiple && Array.isArray(value)) {
      onChange(value.filter(u => u !== urlToRemove));
    } else {
      onChange("");
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
      listType="picture-card"
      fileList={getFileList()}
      customRequest={customRequest}
      onRemove={handleRemove}
      accept="image/*"
      maxCount={multiple ? maxCount : 1}
    >
      {getFileList().length >= (multiple ? maxCount : 1) ? null : uploadButton}
    </Upload>
  );
}
