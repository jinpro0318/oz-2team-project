"use client";

import { useState, useEffect, useRef } from "react";
import { Switch, Slider, Spin, Radio, Checkbox, Modal, InputNumber, App, Space } from "antd";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lock, Shield, Image as ImageIcon, Zap, Key, FileDigit, Cpu, Activity, Settings2, FileType, MapPin, Database, Truck } from "lucide-react";
import { useDaumPostcode } from "@/hooks/useDaumPostcode";
import { getSystemSettings, updateSystemSettings } from "@/lib/services/settings";

interface SecurityConfigs {
  enableAdminJwtVerify: boolean;
  enableMagicBytesCheck: boolean;
  enableExifStripping: boolean;
  enablePixelBombCheck: boolean;
  enableFilenameHashing: boolean;
  enablePayloadLimit: boolean;
  maxPayloadSize: number;
  
  // [NEW]
  enableDdosRateLimit: boolean;
  clientMaxWidth: number; // 1024, 2048, 4096
  clientCompressionQuality: number; // 50 ~ 100
  serverSharpQuality: number; // 50 ~ 100
  allowedFormats: {
    jpg: boolean;
    png: boolean;
    webp: boolean;
    gif: boolean;
  };
}

const defaultConfigs: SecurityConfigs = {
  enableAdminJwtVerify: true,
  enableMagicBytesCheck: true,
  enableExifStripping: true,
  enablePixelBombCheck: true,
  enableFilenameHashing: true,
  enablePayloadLimit: true,
  maxPayloadSize: 5,
  
  enableDdosRateLimit: true,
  clientMaxWidth: 1024,
  clientCompressionQuality: 70,
  serverSharpQuality: 80,
  allowedFormats: {
    jpg: true,
    png: true,
    webp: true,
    gif: true,
  },
};

export default function AdminSettingsPage() {
  const { message } = App.useApp();
  const [configs, setConfigs] = useState<SecurityConfigs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // [NEW] 가상 물류 및 배송 API 설정 상태
  const { embedPostcode } = useDaumPostcode();
  const [mallAddress, setMallAddress] = useState("설정 중...");
  const [showSearchLayer, setShowSearchLayer] = useState(false);
  const [currentSyncInterval, setCurrentSyncInterval] = useState(60);
  const [tempSyncInterval, setTempSyncInterval] = useState(60);
  const [inputState, setInputState] = useState<"idle" | "editing" | "ready">("idle");
  const [savingLogistics, setSavingLogistics] = useState(false);
  const logisticsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. 가상 쇼핑몰 주소 로드
  useEffect(() => {
    getSystemSettings().then((res) => {
      if (res && res.mallAddress) setMallAddress(res.mallAddress);
    });
  }, []);

  // 2. 주소 검색 레이어 모달 임베드
  useEffect(() => {
    if (showSearchLayer) {
      setTimeout(() => {
        embedPostcode("admin-settings-postcode-container", async (data) => {
          setMallAddress(data.address);
          setShowSearchLayer(false);
          setSavingLogistics(true);
          try {
            await updateSystemSettings({ mallAddress: data.address, mallZipCode: data.zonecode });
            message.success("가상 쇼핑몰 주소가 업데이트되었습니다.");
          } catch (e) {
            console.error("설정 저장 실패:", e);
            message.error("주소 저장에 실패했습니다.");
          } finally {
            setSavingLogistics(false);
          }
        });
      }, 100);
    }
  }, [showSearchLayer, embedPostcode]);

  // 3. 스윗트래커 DB 캐싱 주기 실시간 구독
  useEffect(() => {
    const settingsRef = doc(db, "settings", "logistics");
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const val = data.sweetTrackerCacheInterval || 60;
        setCurrentSyncInterval(val);
        setTempSyncInterval(val);
      } else {
        setDoc(settingsRef, { 
          sweetTrackerCacheInterval: 60,
          updatedAt: new Date().toISOString()
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const inputTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 4. 스윗트래커 DB 캐싱 주기 변경 핸들러
  const handleSyncIntervalChange = (val: number | null) => {
    if (val === null) return;
    setTempSyncInterval(val);

    if (val === currentSyncInterval) {
      setInputState("idle");
      if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
      return;
    }

    setInputState("editing");

    if (inputTimerRef.current) clearTimeout(inputTimerRef.current);

    inputTimerRef.current = setTimeout(() => {
      setInputState("ready");
    }, 1500);
  };

  const handleInputBlur = () => {
    if (tempSyncInterval !== currentSyncInterval) {
      if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
      setInputState("ready");
    }
  };

  const handleApplySettings = async () => {
    setSavingLogistics(true);
    const settingsRef = doc(db, "settings", "logistics");
    try {
      await setDoc(settingsRef, { 
        sweetTrackerCacheInterval: tempSyncInterval,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setCurrentSyncInterval(tempSyncInterval);
      setInputState("idle");
      message.success("동기화 캐시 주기가 적용되었습니다.");
    } catch (error) {
      console.error("Failed to update sync interval:", error);
      message.error("캐시 주기 저장에 실패했습니다.");
    } finally {
      setSavingLogistics(false);
    }
  };

  const handleCancelSettings = () => {
    setTempSyncInterval(currentSyncInterval);
    setInputState("idle");
    if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
  };

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const docRef = doc(db, "settings", "security");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfigs({ ...defaultConfigs, ...docSnap.data() } as SecurityConfigs);
        } else {
          await setDoc(docRef, defaultConfigs);
          setConfigs(defaultConfigs);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        message.error("설정을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  const updateConfig = async <K extends keyof SecurityConfigs>(key: K, value: SecurityConfigs[K]) => {
    if (!configs) return;
    
    // Optimistic update
    const newConfigs = { ...configs, [key]: value };
    setConfigs(newConfigs);
    setSaving(true);

    try {
      const docRef = doc(db, "settings", "security");
      
      // Perform background save without blocking
      setDoc(docRef, newConfigs, { merge: true }).catch((error) => {
        console.error("Failed to save setting in background:", error);
        message.error("설정 저장에 실패했습니다.");
        setConfigs(configs);
      });

      // Quick 400ms snappiness feedback
      setTimeout(() => {
        setSaving(false);
        message.success("설정이 저장되었습니다.");
      }, 400);

    } catch (error) {
      console.error("Failed to save setting:", error);
      message.error("설정 저장에 실패했습니다.");
      setSaving(false);
    }
  };

  const updateFormat = (format: keyof SecurityConfigs["allowedFormats"], checked: boolean) => {
    if (!configs) return;
    const newFormats = { ...configs.allowedFormats, [format]: checked };
    updateConfig("allowedFormats", newFormats);
  };

  if (loading || !configs) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E1E2D]">시스템 관제 설정 센터</h1>
        <p className="text-gray-500 mt-2 leading-relaxed">
          가상 물류 시뮬레이터 환경 및 외부 배송 API의 동기화 주기를 제어하고, 쇼핑몰의 핵심 보안과 미디어 최적화 정책을 실시간으로 관제합니다.
        </p>
      </div>

      {/* [NEW] 가상 물류 및 배송 API 설정 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#1E1E2D] px-6 py-4 flex items-center gap-3">
          <Truck className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white tracking-wide">가상 물류 및 배송 API 설정</h2>
          {savingLogistics && <span className="ml-auto text-xs text-blue-300 animate-pulse">저장 중...</span>}
        </div>

        <div className="divide-y divide-gray-100">
          
          {/* 가상 쇼핑몰 주소 (발송지) */}
          <div className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">가상 쇼핑몰 주소 (발송지) 설정</h3>
                <button
                  onClick={() => setShowSearchLayer(true)}
                  className="px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 text-xs font-bold rounded-lg transition-colors border border-blue-100"
                >
                  주소 변경
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800 bg-gray-100 px-3 py-1 rounded-md max-w-lg truncate block" title={mallAddress}>
                  {mallAddress}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-3 leading-relaxed">
                배송비 계산 시뮬레이션 및 가상 배송 경로 계산의 기준이 되는 출발지 주소를 설정합니다. (Daum 우편번호 서비스 연동)
              </p>
            </div>
          </div>

          {/* 스윗트래커 DB 캐싱 주기 */}
          <div className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">스윗트래커 DB 캐싱 주기 제어</h3>
                <div className="flex items-center gap-3">
                  {/* [취소] / [적용] 버튼 노출 및 활성/비활성 제어 */}
                  {inputState !== "idle" && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                      <button
                        onClick={handleCancelSettings}
                        disabled={inputState === "editing"}
                        className="px-3.5 py-1.5 border border-gray-200 text-gray-500 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-semibold rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleApplySettings}
                        disabled={inputState === "editing" || savingLogistics}
                        className="px-3.5 py-1.5 border border-emerald-100 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all font-semibold rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        {savingLogistics ? "저장 중..." : "적용"}
                      </button>
                    </div>
                  )}

                  <Space.Compact>
                    <InputNumber
                      size="middle"
                      min={1}
                      max={1440}
                      value={tempSyncInterval}
                      onChange={handleSyncIntervalChange}
                      onBlur={handleInputBlur}
                      className="w-24 rounded-l-lg!"
                    />
                    
                    {/* 상태별 우측 라벨/아이콘 피드백 */}
                    {inputState === "idle" && (
                      <div className="bg-gray-50 border border-l-0 border-gray-200 px-3 flex items-center text-gray-500 rounded-r-lg text-sm select-none transition-all duration-300 w-10 justify-center">
                        분
                      </div>
                    )}
                    {inputState === "editing" && (
                      <div className="bg-red-50 border border-l-0 border-red-200 px-3 flex items-center text-red-500 rounded-r-lg text-sm select-none font-bold animate-pulse w-10 justify-center">
                        ❌
                      </div>
                    )}
                    {inputState === "ready" && (
                      <div className="bg-emerald-50 border border-l-0 border-emerald-200 px-3 flex items-center text-emerald-500 rounded-r-lg text-sm select-none font-bold animate-bounce w-10 justify-center">
                        ✔️
                      </div>
                    )}
                  </Space.Compact>
                </div>
              </div>
              <p className="text-gray-500 text-sm mt-3 leading-relaxed">
                스윗트래커 외부 배송 조회 API의 유료 호출 횟수를 획기적으로 절약하고, 효율적으로 배송 데이터를 자사 DB 캐시로 임포트하여 동기화할 최적 시간을 제어합니다.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 보안 및 통제 서비스 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#1E1E2D] px-6 py-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white tracking-wide">보안 및 통제 서비스</h2>
          {saving && <span className="ml-auto text-xs text-blue-300 animate-pulse">저장 중...</span>}
        </div>

        <div className="divide-y divide-gray-100">
          
          {/* DDoS Rate Limit */}
          <div className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">DDoS 무차별 업로드 연사 차단 (API Rate Limiting)</h3>
                <Switch 
                  checked={configs.enableDdosRateLimit} 
                  onChange={(val) => updateConfig("enableDdosRateLimit", val)} 
                  className={configs.enableDdosRateLimit ? "bg-blue-600" : "bg-gray-300"}
                />
              </div>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                단일 IP에서 1분 이내에 비정상적으로 연속 업로드를 요청해 서버 자원을 고갈시키려는 디도스(DDoS) 및 매크로 공격을 감지하여 입구에서 즉각 차단합니다. (1분당 최대 10회 제한)
              </p>
            </div>
          </div>

          {/* Client Compression (Width & Quality) */}
          <div className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
              <Settings2 className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">클라이언트 1차 압축 품질 및 해상도 (Client Pre-Compression)</h3>
              </div>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                사용자의 브라우저에서 서버로 전송하기 전에 이미지를 1차적으로 캔버스(Canvas) 압축하는 강도를 조절합니다. 대형 배너가 필요할 때 해상도를 높일 수 있습니다.
              </p>
              
              <div className="mt-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">최대 허용 가로 해상도 (픽셀)</span>
                  </div>
                  <Radio.Group 
                    value={configs.clientMaxWidth} 
                    onChange={(e) => updateConfig("clientMaxWidth", e.target.value)}
                    className="flex gap-4"
                  >
                    <Radio.Button value={1024} className="rounded-lg!">1024px (기본/리뷰용)</Radio.Button>
                    <Radio.Button value={2048} className="rounded-lg!">2048px (고화질 상품용)</Radio.Button>
                    <Radio.Button value={4096} className="rounded-lg!">4096px (초고화질 배너용)</Radio.Button>
                  </Radio.Group>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">클라이언트 압축 화질 (%)</span>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{configs.clientCompressionQuality}%</span>
                  </div>
                  <Slider 
                    min={50} max={100} 
                    value={configs.clientCompressionQuality}
                    onChangeComplete={(val) => updateConfig("clientCompressionQuality", val)}
                    onChange={(val) => setConfigs({ ...configs, clientCompressionQuality: val })}
                    tooltip={{ open: false }}
                    className="mx-2"
                  />
                  <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
                    <span>50% (초경량)</span>
                    <span>100% (무손실 원본급)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* JWT Verify */}
          <div className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">어드민 세션 서명 검증 (JWT Authentication)</h3>
                <Switch 
                  checked={configs.enableAdminJwtVerify} 
                  onChange={(val) => updateConfig("enableAdminJwtVerify", val)} 
                  className={configs.enableAdminJwtVerify ? "bg-blue-600" : "bg-gray-300"}
                />
              </div>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                비로그인 악성 봇이나 권한이 없는 일반 사용자가 업로드 API 경로에 접근해 공격하지 못하도록, 백엔드에서 서명 토큰을 대조해 관리자 세션을 강제 검증합니다.
              </p>
            </div>
          </div>

          {/* Magic Bytes & Allowed Formats */}
          <div className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <FileType className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">매직 바이트 위조 방지 및 포맷 통제 (MIME Magic Bytes Check)</h3>
                <Switch 
                  checked={configs.enableMagicBytesCheck} 
                  onChange={(val) => updateConfig("enableMagicBytesCheck", val)} 
                  className={configs.enableMagicBytesCheck ? "bg-blue-600" : "bg-gray-300"}
                />
              </div>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                해커가 악성 스크립트 파일의 확장자만 .jpg나 .png로 조작해 올리는 경우를 차단합니다. 아래의 스위치를 끄면 해당 포맷(예: 무거운 GIF)의 업로드를 원천 차단합니다.
              </p>

              <div className={`mt-5 flex gap-6 p-4 rounded-xl border border-gray-100 bg-gray-50/50 transition-all ${configs.enableMagicBytesCheck ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <Checkbox checked={configs.allowedFormats?.jpg} onChange={(e) => updateFormat('jpg', e.target.checked)}>JPEG 허용</Checkbox>
                <Checkbox checked={configs.allowedFormats?.png} onChange={(e) => updateFormat('png', e.target.checked)}>PNG 허용</Checkbox>
                <Checkbox checked={configs.allowedFormats?.webp} onChange={(e) => updateFormat('webp', e.target.checked)}>WebP 허용</Checkbox>
                <Checkbox checked={configs.allowedFormats?.gif} onChange={(e) => updateFormat('gif', e.target.checked)}>GIF 허용 (짤방)</Checkbox>
              </div>
            </div>
          </div>

          {/* EXIF Stripping & Server Quality */}
          <div className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <ImageIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">EXIF 메타데이터 제거 및 정화 (EXIF Stripping)</h3>
                <Switch 
                  checked={configs.enableExifStripping} 
                  onChange={(val) => updateConfig("enableExifStripping", val)} 
                  className={configs.enableExifStripping ? "bg-blue-600" : "bg-gray-300"}
                />
              </div>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                이미지 속성에 포함된 개인정보(GPS, 기기 정보) 및 악성 XSS 코드를 물리적으로 분해하여 제거하고 서버에서 재압축합니다.
              </p>

              <div className={`mt-6 transition-all duration-300 ${configs.enableExifStripping ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">서버 재렌더링 압축 품질 (%)</span>
                  <span className="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">{configs.serverSharpQuality}%</span>
                </div>
                <Slider 
                  min={50} max={100} 
                  value={configs.serverSharpQuality}
                  onChangeComplete={(val) => updateConfig("serverSharpQuality", val)}
                  onChange={(val) => setConfigs({ ...configs, serverSharpQuality: val })}
                  tooltip={{ open: false }}
                  className="mx-2"
                />
                <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
                  <span>50% (서버 디스크 극강 절약)</span>
                  <span>100% (원래 화질 보존)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pixel Bomb */}
          <div className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">픽셀 폭탄 공격 방지 (Pixel Bomb Check)</h3>
                <Switch 
                  checked={configs.enablePixelBombCheck} 
                  onChange={(val) => updateConfig("enablePixelBombCheck", val)} 
                  className={configs.enablePixelBombCheck ? "bg-blue-600" : "bg-gray-300"}
                />
              </div>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                압축 해제 시 서버 내부 메모리를 무한 팽창시켜 서버를 먹통으로 만드는 기가바이트 급 압축 폭탄 이미지를 사전 가상 픽셀 면적 검사로 차단합니다.
              </p>
            </div>
          </div>

          {/* Filename Hashing */}
          <div className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-slate-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">파일명 난수화 해싱 (Filename Hashing)</h3>
                <Switch 
                  checked={configs.enableFilenameHashing} 
                  onChange={(val) => updateConfig("enableFilenameHashing", val)} 
                  className={configs.enableFilenameHashing ? "bg-blue-600" : "bg-gray-300"}
                />
              </div>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                원본 파일명과 똑같은 이름으로 해킹 파일을 덮어써서 파괴하는 디렉토리 테러를 막기 위해, 모든 파일명을 무작위 SHA-256 난수로 은닉 저장합니다.
              </p>
            </div>
          </div>

          {/* Payload Size */}
          <div className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-base">페이로드 용량 엄격 제한 (Payload Size Limit)</h3>
                <Switch 
                  checked={configs.enablePayloadLimit} 
                  onChange={(val) => updateConfig("enablePayloadLimit", val)} 
                  className={configs.enablePayloadLimit ? "bg-blue-600" : "bg-gray-300"}
                />
              </div>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                네트워크 대역폭 마비를 막기 위해 단일 파일 업로드 한계를 엄격히 통제합니다.
              </p>
              
              <div className={`mt-6 transition-all duration-300 ${configs.enablePayloadLimit ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">최대 허용 용량 (MB)</span>
                  <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">{configs.maxPayloadSize} MB</span>
                </div>
                <Slider 
                  min={1} 
                  max={50} 
                  value={configs.maxPayloadSize}
                  onChangeComplete={(val) => updateConfig("maxPayloadSize", val)}
                  onChange={(val) => setConfigs({ ...configs, maxPayloadSize: val })}
                  tooltip={{ open: false }}
                  className="mx-2"
                />
                <div className="flex justify-between text-xs text-gray-400 px-1 mt-1">
                  <span>1MB</span>
                  <span>50MB</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 주소 검색 모달 */}
      <Modal
        title={
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 font-semibold text-gray-900">
            <MapPin className="text-blue-500 w-5 h-5" />
            <span>가상 쇼핑몰 주소 검색</span>
          </div>
        }
        open={showSearchLayer}
        onCancel={() => setShowSearchLayer(false)}
        footer={null}
        destroyOnHidden
        width={500}
        centered
        className="rounded-2xl overflow-hidden"
      >
        <div id="admin-settings-postcode-container" style={{ width: '100%', height: '400px', marginTop: '10px' }} />
      </Modal>
    </div>
  );
}
