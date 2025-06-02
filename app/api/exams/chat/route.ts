import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { conversation } = await req.json();

    if (!conversation || !Array.isArray(conversation)) {
      return NextResponse.json(
        { error: "Invalid conversation format" },
        { status: 400 }
      );
    }

    // Xử lý dữ liệu cuộc trò chuyện
    console.log("Received conversation:", conversation);

    // Trả về phản hồi giả lập
    const reply = `Tôi đã nhận được ${conversation.length} tin nhắn. Đây là phản hồi của tôi.`;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Error processing chat request:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xử lý yêu cầu." },
      { status: 500 }
    );
  }
}
