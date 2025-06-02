import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileUrl, fileName } = await req.json();

    if (!fileUrl || !fileName) {
      return NextResponse.json({ error: "Missing file information" }, { status: 400 });
    }
    
    // Trong ứng dụng thực tế, bạn sẽ tải xuống và phân tích nội dung tệp
    // Demo: Trích xuất câu hỏi từ tài liệu
    
    // Tạo mảng câu hỏi từ tài liệu (trong một ứng dụng thực tế, sẽ phân tích nội dung file)
    const mockQuestions = [
      {
        id: "q1",
        question: "Mạng máy tính là gì?",
        options: [
          "Mạng máy tính là một hệ thống các máy tính được kết nối với nhau để chia sẻ tài nguyên và thông tin",
          "Mạng máy tính là mạng xã hội",
          "Mạng máy tính là một loại phần mềm",
          "Mạng máy tính là thiết bị phần cứng"
        ]
      },
      {
        id: "q2",
        question: "Giao thức TCP/IP hoạt động ở tầng nào trong mô hình OSI?",
        options: [
          "Tầng vận chuyển và tầng mạng",
          "Tầng ứng dụng",
          "Tầng vật lý",
          "Tầng liên kết dữ liệu"
        ]
      },
      {
        id: "q3",
        question: "Địa chỉ IP có bao nhiêu bit?",
        options: [
          "IPv4: 32 bit; IPv6: 128 bit",
          "IPv4: 64 bit; IPv6: 256 bit",
          "IPv4: 16 bit; IPv6: 32 bit",
          "IPv4: 8 bit; IPv6: 16 bit"
        ]
      },
      {
        id: "q4",
        question: "Thiết bị nào sau đây hoạt động ở tầng liên kết dữ liệu?",
        options: [
          "Switch",
          "Router",
          "Hub",
          "Gateway"
        ]
      },
      {
        id: "q5",
        question: "Mô hình client-server là gì?",
        options: [
          "Là mô hình máy chủ cung cấp dịch vụ cho các máy khách",
          "Là mô hình các máy tính kết nối ngang hàng",
          "Là mô hình mạng không dây",
          "Là mô hình kết nối internet"
        ]
      },
      {
        id: "essay1",
        question: "Hãy trình bày về mô hình OSI và chức năng của từng tầng trong mô hình."
      },
      {
        id: "essay2",
        question: "So sánh giao thức TCP và UDP. Nêu ưu nhược điểm và trường hợp sử dụng của mỗi giao thức."
      },
      {
        id: "essay3",
        question: "Thiết kế mô hình mạng cho một doanh nghiệp vừa với các yêu cầu đã cho."
      },
      {
        id: "essay4",
        question: "Viết một đoạn mã giả mô tả thuật toán định tuyến RIP hoặc OSPF."
      },
      {
        id: "essay5",
        question: "Phân tích một tình huống khi mạng bị tấn công DDoS và đề xuất giải pháp khắc phục."
      }
    ];
    
    // Tạo nội dung thô
    const rawContent = `
BÀI KIỂM TRA MÔN MẠNG MÁY TÍNH

Thời gian: 90 phút
Sinh viên được phép sử dụng tài liệu

Các câu hỏi:
${mockQuestions.map((q, i) => {
  if (q.options) {
    return `${i+1}. ${q.question}\n${q.options.map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`).join('\n')}`;
  } else {
    return `${i+1}. ${q.question}`;
  }
}).join('\n\n')}

Lưu ý: Sinh viên cần trả lời đầy đủ tất cả các câu hỏi.
`;

    return NextResponse.json({
      success: true,
      questions: mockQuestions,
      rawContent: rawContent    });
  } catch (error) {
    console.error("[EXTRACT_DOCUMENT_CONTENT]", error);
    
    // Kiểm tra xem lỗi có liên quan đến việc phân tích file không
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("parse") || errorMessage.includes("format")) {
      return NextResponse.json(
        { 
          error: "Không thể phân tích file này. Model Gemini hiện tại gặp hạn chế khi xử lý file định dạng này. Vui lòng thử với định dạng file khác hoặc sử dụng chức năng 'Trợ lý học tập AI' để phân tích nội dung tương tự.",
          modelError: true,
          suggestion: "Bạn có thể thử chuyển đổi file sang định dạng PDF hoặc sử dụng tính năng 'Trợ lý học tập AI' trong menu chính để phân tích nội dung."
        },
        { status: 422 }
      );
    }
    
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi phân tích nội dung tài liệu. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
