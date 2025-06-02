import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Xử lý tệp (ví dụ: đọc nội dung hoặc lưu trữ)
    const fileContent = await file.text(); // Đọc nội dung tệp dưới dạng văn bản

    // Trả về phản hồi
    return NextResponse.json({
      reply: `Tệp "${file.name}" đã được tải lên và xử lý thành công.`,
    });
  } catch (error) {
    console.error("Error handling file upload:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xử lý tệp." },
      { status: 500 }
    );
  }
}
