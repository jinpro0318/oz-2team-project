import { useEffect } from "react";
import { App } from "antd";

export function useDaumPostcode() {
  const { message } = App.useApp();

  useEffect(() => {
    const scriptId = "daum-postcode-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const openPostcode = (onComplete: (data: { zonecode: string; address: string }) => void) => {
    if (typeof window !== "undefined" && (window as any).daum && (window as any).daum.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          onComplete({ zonecode: data.zonecode, address: data.address });
        },
      }).open();
    } else {
      message.error("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const embedPostcode = (containerId: string, onComplete: (data: { zonecode: string; address: string }) => void) => {
    if (typeof window !== "undefined" && (window as any).daum && (window as any).daum.Postcode) {
      const element = document.getElementById(containerId);
      if (!element) return;
      
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          onComplete({ zonecode: data.zonecode, address: data.address });
        },
        width: '100%',
        height: '100%'
      }).embed(element);
    } else {
      message.error("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return { openPostcode, embedPostcode };
}
