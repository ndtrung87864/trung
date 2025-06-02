"use client";

import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
}

export const PDFViewer = ({ fileUrl, fileName }: PDFViewerProps) => {
  const [documentContent, setDocumentContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchDocumentContent = async () => {
      try {
        setLoading(true);
        
        // Check if the file is a PDF
        if (fileName.toLowerCase().endsWith('.pdf')) {
          // For PDFs, we'll just use the embedded viewer
          setDocumentContent({ type: 'pdf', url: fileUrl });
          setLoading(false);
          return;
        }
        
        // For DOCX/DOC files, call our extraction API
        if (fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc')) {
          const res = await fetch('/api/extract-document-content', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileUrl, fileName }),
          });
          
          if (!res.ok) {
            throw new Error('Failed to extract document content');
          }
          
          const data = await res.json();
          setDocumentContent({ type: 'doc', content: data.content });
        } else {
          // For other file types, set error
          throw new Error('Unsupported file type');
        }
      } catch (error) {
        console.error('Error processing document:', error);
        setError(true);
        toast({
          title: "Lỗi",
          description: "Không thể đọc nội dung tài liệu. Vui lòng tải xuống.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocumentContent();
  }, [fileUrl, fileName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px]">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-center">Đang đọc nội dung tài liệu...</p>
      </div>
    );
  }
  
  if (error || !documentContent) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] p-6 text-center">
        <p className="text-red-500 mb-4">Không thể hiển thị nội dung tài liệu này.</p>
        <p>Vui lòng tải xuống và mở bằng phần mềm trên máy tính của bạn.</p>
      </div>
    );
  }

  // Render PDF using iframe
  if (documentContent.type === 'pdf') {
    return (
      <div className="w-full h-[600px] overflow-hidden">
        <iframe
          src={`${documentContent.url}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full h-full border-0"
          title="PDF Viewer"
        />
      </div>
    );
  }

  // Render DOC/DOCX content as HTML
  if (documentContent.type === 'doc') {
    return (
      <div className="w-full h-[600px] bg-white dark:bg-slate-800 rounded-md p-6 overflow-y-auto">
        <div className="prose dark:prose-invert max-w-none">
          {documentContent.content.map((paragraph: any, idx: number) => {
            if (paragraph.type === 'heading') {
              return (
                <h2 key={idx} className="text-xl font-bold mb-4">
                  {paragraph.text}
                </h2>
              );
            } else if (paragraph.type === 'subheading') {
              return (
                <h3 key={idx} className="text-lg font-semibold mb-3">
                  {paragraph.text}
                </h3>
              );
            } else if (paragraph.type === 'list') {
              return (
                <ul key={idx} className="list-disc pl-5 mb-4">
                  {paragraph.items.map((item: string, itemIdx: number) => (
                    <li key={itemIdx}>{item}</li>
                  ))}
                </ul>
              );
            } else {
              // Regular paragraph
              return (
                <p key={idx} className="mb-4">
                  {paragraph.text}
                </p>
              );
            }
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[500px] p-6 text-center">
      <p>Không thể hiển thị định dạng tài liệu này.</p>
    </div>
  );
};
