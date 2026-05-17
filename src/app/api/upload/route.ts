import { NextResponse } from "next/server";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "general";

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    console.log(`서버 사이드 업로드 시작: ${folder}/${file.name}`);

    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const snapshot = await uploadBytes(storageRef, uint8Array);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log("서버 사이드 업로드 성공:", downloadURL);

    return NextResponse.json({ url: downloadURL });
  } catch (error: any) {
    console.error("서버 사이드 업로드 상세 에러:", {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json({ 
      error: error.message, 
      code: error.code,
      details: "Firebase Storage 규칙 또는 환경 변수를 확인해주세요." 
    }, { status: 500 });
  }
}
