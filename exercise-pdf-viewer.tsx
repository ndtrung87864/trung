"use client";

import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";

interface ExercisePDFViewerProps {
  fileUrl: string;
  fileName: string;
  exerciseId: string;
  onDocumentLoaded?: (documentContent: {
    data: ArrayBuffer | null;
    mimeType: string;
    name: string;
  }) => void;
}

interface DocumentParagraph {
  type: string;
  text?: string;
  items?: string[];
}

export const ExercisePDFViewer = ({ 
  fileUrl, 
  fileName, 
  exerciseId,
  onDocumentLoaded 
}: ExercisePDFViewerProps) => {
  const [documentContent, setDocumentContent] = useState<{
    type: 'pdf' | 'doc';
    url?: string;
    content?: Array<{
      type: string;
      text?: string;
      items?: string[];
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchDocumentContent = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // First, fetch the document data as ArrayBuffer for AI processing
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error('Document is empty or could not be read');
        }
        
        const mimeType = response.headers.get('content-type') || 
          (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 
           fileName.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
           'application/octet-stream');

        // Call the callback with document data for AI processing
        if (onDocumentLoaded) {
          onDocumentLoaded({
            data: arrayBuffer,
            mimeType,
            name: fileName
          });
        }
        
        // Check if the file is a PDF
        if (fileName.toLowerCase().endsWith('.pdf')) {
          // For PDFs, use the embedded viewer
          setDocumentContent({ type: 'pdf', url: fileUrl });
          setLoading(false);
          return;
        }
        
        // For DOCX/DOC files, call our extraction API
        if (fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc')) {
          try {
            const res = await fetch('/api/extract-document-content', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ fileUrl, fileName }),
            });
            
            if (!res.ok) {
              throw new Error(`Failed to extract document content: ${res.status} ${res.statusText}`);
            }
            
            const data = await res.json();
            
            if (!data || !data.content) {
              throw new Error('No content extracted from document');
            }
            
            setDocumentContent({ type: 'doc', content: data.content });
          } catch (extractError) {
            console.error('Error extracting document content:', extractError);
            // Fallback to showing download option
            throw new Error('Could not extract document content for display');
          }
        } else {
          // For other file types, set error
          throw new Error('Unsupported file type for display');
        }
      } catch (error) {
        console.error('Error processing exercise document:', error);
        setError(true);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        toast({
          title: "Lỗi",
          description: `Không thể đọc nội dung tài liệu bài tập: ${errorMessage}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (fileUrl && fileName) {
      fetchDocumentContent();
    } else {
      setError(true);
      setLoading(false);
    }
  }, [fileUrl, fileName, exerciseId, onDocumentLoaded]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px]">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-center">Đang đọc nội dung tài liệu bài tập...</p>
      </div>
    );
  }
  
  if (error || !documentContent) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] p-6 text-center">
        <p className="text-red-500 mb-4">Không thể hiển thị nội dung tài liệu bài tập này.</p>
        <p>Vui lòng tải xuống và mở bằng phần mềm trên máy tính của bạn.</p>
        <a 
          href={fileUrl} 
          download={fileName}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Tải xuống tài liệu
        </a>
      </div>
    );
  }

  // Render PDF using iframe
  if (documentContent.type === 'pdf') {
    return (
      <div className="w-full h-[600px] overflow-hidden border rounded-lg">
        <iframe
          src={`${documentContent.url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
          className="w-full h-full border-0"
          title="Exercise PDF Viewer"
        />
      </div>
    );
  }

  // Render DOC/DOCX content as HTML
  if (documentContent.type === 'doc') {
      <div className="w-full h-[600px] bg-white dark:bg-slate-800 rounded-md border p-6 overflow-y-auto">
        <div className="prose dark:prose-invert max-w-none">
          <h2 className="text-xl font-bold mb-4 text-blue-600">
            Tài liệu bài tập: {fileName}
          </h2>
          {documentContent.content?.map((paragraph: DocumentParagraph, idx: number) => {
            if (paragraph.type === 'heading') {
              return (
                <h2 key={idx} className="text-xl font-bold mb-4 mt-6">
                  {paragraph.text}
                </h2>
              );
            } else if (paragraph.type === 'subheading') {
              return (
                <h3 key={idx} className="text-lg font-semibold mb-3 mt-4">
                  {paragraph.text}
                </h3>
              );
            } else if (paragraph.type === 'list') {
              return (
                <ul key={idx} className="list-disc pl-5 mb-4">
                  {paragraph.items.map((item: string, itemIdx: number) => (
                    <li key={itemIdx} className="mb-1">{item}</li>
                  ))}
                </ul>
              );
            } else if (paragraph.type === 'numbered-list') {
              return (
                <ol key={idx} className="list-decimal pl-5 mb-4">
                  {paragraph.items.map((item: string, itemIdx: number) => (
                    <li key={itemIdx} className="mb-1">{item}</li>
                  ))}
                </ol>
              );
            } else {
              // Regular paragraph
              return (
                <p key={idx} className="mb-4 leading-relaxed">
                  {paragraph.text}
                </p>
              );
            }
          })}
        </div>
      </div>
  }

  return (
    <div className="flex flex-col items-center justify-center h-[500px] p-6 text-center">
      <p>Không thể hiển thị định dạng tài liệu này.</p>
      <a 
        href={fileUrl} 
        download={fileName}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Tải xuống tài liệu
      </a>
    </div>
  );
};
