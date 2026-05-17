import { NextResponse } from "next/server";
import { adminDb, adminAuth, adminStorage } from "@/lib/firebase-admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// [Dynamic Settings Cache] 60-second TTL
let cachedConfigs: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000;

// [DDoS Protection] In-memory Rate Limit Bucket
// Maps IP to { count: number, resetTime: number }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

async function getSystemConfigs() {
  const now = Date.now();
  if (cachedConfigs && (now - lastFetchTime < CACHE_TTL)) {
    return cachedConfigs;
  }

  try {
    if (!adminDb) throw new Error("adminDb is not initialized");
    const docRef = adminDb.collection("settings").doc("security");
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      cachedConfigs = docSnap.data();
      lastFetchTime = now;
      return cachedConfigs;
    }
  } catch (error) {
    console.error("[Settings Cache] Firestore Fetch Error:", error);
  }

  // Fallback defaults if DB fetch fails
  return {
    enableAdminJwtVerify: false,
    enableMagicBytesCheck: true,
    enableExifStripping: true,
    enablePixelBombCheck: true,
    enableFilenameHashing: true,
    enablePayloadLimit: true,
    maxPayloadSize: 5,
    enableDdosRateLimit: true,
    serverSharpQuality: 80,
    allowedFormats: {
      jpg: true,
      png: true,
      webp: true,
      gif: true,
    }
  };
}

export async function POST(req: Request) {
  try {
    if (!adminStorage) {
      return NextResponse.json({ error: "Firebase Admin Storage not initialized." }, { status: 500 });
    }

    const configs = await getSystemConfigs();

    // 0. DDoS Rate Limiting Guard
    if (configs.enableDdosRateLimit) {
      // In Next.js App Router, extracting IP can be tricky depending on the host. 
      // We check common headers. Fallback to a generic bucket if IP is completely hidden.
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown_ip";
      const now = Date.now();
      
      let record = rateLimitMap.get(ip);
      if (!record || record.resetTime < now) {
        record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
      } else {
        record.count += 1;
      }
      rateLimitMap.set(ip, record);

      if (record.count > MAX_REQUESTS_PER_WINDOW) {
        console.warn(`[DDoS Guard] Blocked IP: ${ip} (Requests: ${record.count})`);
        return NextResponse.json({ 
          error: "DDoS 방어 작동: 단시간에 너무 많은 업로드 요청이 감지되었습니다. 잠시 후 다시 시도해주세요." 
        }, { status: 429 });
      }
    }

    // 1. JWT Admin Verification
    if (configs.enableAdminJwtVerify) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized: Missing Token" }, { status: 401 });
      }
      const token = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await adminAuth!.verifyIdToken(token);
        if (!decodedToken.uid) throw new Error("Invalid token");
      } catch (err) {
        return NextResponse.json({ error: "Unauthorized: Invalid Admin Token" }, { status: 403 });
      }
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = (formData.get("path") as string) || (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 2. Payload Size Limit
    if (configs.enablePayloadLimit) {
      const sizeLimit = (configs.maxPayloadSize || 5) * 1024 * 1024;
      if (file.size > sizeLimit) {
        return NextResponse.json({ 
          error: `파일 크기는 ${configs.maxPayloadSize || 5}MB를 초과할 수 없습니다.` 
        }, { status: 413 });
      }
    }

    let buffer = Buffer.from(await file.arrayBuffer());

    // 3. Magic Bytes Check & Allowed Formats
    if (configs.enableMagicBytesCheck) {
      const hex = buffer.toString("hex", 0, 4).toUpperCase();
      let isAllowed = false;
      const allowed = configs.allowedFormats || { jpg: true, png: true, webp: true, gif: true };
      
      if (allowed.jpg && hex.startsWith("FFD8FF")) isAllowed = true;
      if (allowed.png && hex.startsWith("89504E47")) isAllowed = true;
      if (allowed.webp && hex.startsWith("52494646")) isAllowed = true;
      if (allowed.gif && hex.startsWith("47494638")) isAllowed = true;
      
      if (!isAllowed) {
        return NextResponse.json({ 
          error: "보안 차단: 실제 이미지 바이너리가 아니거나, 관리자가 허용하지 않은 파일 확장자 포맷입니다." 
        }, { status: 400 });
      }
    }

    // Attempt to load sharp
    let sharp: any;
    try {
      sharp = require("sharp");
    } catch (e) {
      console.warn("[Upload API] 'sharp' is not installed. Skipping EXIF stripping and Pixel Bomb checks.");
    }

    if (sharp) {
      // 4. Pixel Bomb Check
      if (configs.enablePixelBombCheck) {
        try {
          const metadata = await sharp(buffer).metadata();
          const pixels = (metadata.width || 0) * (metadata.height || 0);
          if (pixels > 40_000_000) { // 40 million pixels
            return NextResponse.json({ 
              error: "픽셀 폭탄 방어: 비정상적으로 거대한 해상도입니다." 
            }, { status: 400 });
          }
        } catch (e) {
          return NextResponse.json({ error: "이미지 메타데이터 분석 실패" }, { status: 400 });
        }
      }

      // 5. EXIF Stripping & Dynamic Quality Control
      if (configs.enableExifStripping) {
        try {
          const quality = configs.serverSharpQuality || 80;
          buffer = await sharp(buffer).rotate().jpeg({ quality }).toBuffer();
        } catch (e) {
          console.error("EXIF stripping failed", e);
        }
      }
    }

    // 6. Filename Hashing
    let finalFileName = file.name;
    if (configs.enableFilenameHashing) {
      const ext = file.name.split('.').pop();
      const hash = crypto.createHash("sha256").update(`${file.name}-${Date.now()}`).digest("hex");
      finalFileName = `${hash}.${ext}`;
    } else {
      finalFileName = `${Date.now()}_${file.name}`;
    }

    // 7. Upload to Firebase Storage
    const bucket = adminStorage.bucket();
    const destination = `${path}/${finalFileName}`;
    const fileRef = bucket.file(destination);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type || "image/jpeg",
        cacheControl: "public, max-age=31536000",
      },
    });

    await fileRef.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

    return NextResponse.json({ url: publicUrl, success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Upload API] General Error:", error);
    return NextResponse.json({ error: error.message || "서버 업로드 중 오류가 발생했습니다." }, { status: 500 });
  }
}
