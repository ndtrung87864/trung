"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileIcon, Trash, Upload, X } from "lucide-react";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  existingFiles?: any[];
  acceptedFileTypes?: string;
  maxFileSizeInMB?: number;
  maxFiles?: number;
}

interface FileWithPreview extends File {
  preview?: string;
}

export const FileUploader = ({
  onFilesSelected,
  existingFiles = [],
  acceptedFileTypes = "*",
  maxFileSizeInMB = 20,
  maxFiles = 5,
}: FileUploaderProps) => {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Không thể tải lên quá ${maxFiles} tệp tin.`);
      return;
    }

    // Validate file size
    const maxSizeBytes = maxFileSizeInMB * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > maxSizeBytes);
    
    if (oversizedFiles.length > 0) {
      setError(`Kích thước tệp vượt quá ${maxFileSizeInMB}MB: ${oversizedFiles.map(f => f.name).join(", ")}`);
      return;
    }

    // Clear any previous errors
    setError(null);

    // Create file previews for images
    const newFiles = files.map(file => {
      const fileWithPreview = file as FileWithPreview;
      
      // Create preview URLs for images
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      
      return fileWithPreview;
    });

    // Update state
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // Pass files to parent component
    onFilesSelected([...selectedFiles, ...newFiles]);
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    
    // Revoke object URL to prevent memory leaks
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }
    
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return null; // Will use preview image instead
    }
    
    return <FileIcon className="h-8 w-8 text-blue-500" />;
  };

  const getFileTypeLabel = (file: File) => {
    const extensionMatch = file.name.match(/\.([^.]+)$/);
    return extensionMatch ? extensionMatch[1].toUpperCase() : 'FILE';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Function to get proper file view URL - hỗ trợ cả URL mới và cũ
  const getFileViewUrl = (fileUrl: string) => {
    // Nếu URL có dạng đầy đủ https://example.com/files/filename, 
    // trả về trực tiếp để mở trong tab mới
    if (fileUrl.startsWith('http')) {
      // Kiểm tra đường dẫn mới
      if (fileUrl.includes('/uploads/')) {
        return fileUrl;
      }
      // Nếu là định dạng cũ, sử dụng API xem file
      return `/api/files/view?path=${encodeURIComponent(fileUrl)}`;
    }
    
    // Nếu URL có định dạng /files/exam/[examId]/[fileName]
    if (fileUrl.startsWith('/files/exam/')) {
      return `/api/files/view?path=${encodeURIComponent(fileUrl)}`;
    }
    
    // Nếu URL có định dạng mới /uploads/exercise/[fileName]
    if (fileUrl.startsWith('/uploads/exercise/')) {
      // Có thể mở trực tiếp
      return fileUrl;
    }
    
    // Nếu URL có định dạng mới /uploads/exercises/[fileName] (cũ)
    if (fileUrl.startsWith('/uploads/exercises/')) {
      // Có thể mở trực tiếp
      return fileUrl;
    }
    
    // Nếu URL có định dạng mới /uploads/[fileName]
    if (fileUrl.startsWith('/uploads/')) {
      // Có thể mở trực tiếp
      return fileUrl;
    }
    
    // Định dạng khác, chuyển về API view
    return `/api/files/view?path=${encodeURIComponent(fileUrl)}`;
  };

  return (
    <div className="w-full space-y-4">
      {/* File input */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept={acceptedFileTypes}
          multiple={maxFiles > 1}
        />
        <Upload className="h-6 w-6 mx-auto text-gray-400" />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Nhấp vào đây hoặc kéo thả tệp tin
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Tối đa {maxFileSizeInMB}MB mỗi tệp, {maxFiles} tệp
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-red-500 text-sm p-2 bg-red-50 dark:bg-red-950/30 rounded-md">
          <div className="flex items-center">
            <X className="h-4 w-4 mr-1" />
            {error}
          </div>
        </div>
      )}

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Tệp tin đã chọn:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-md group">
                {file.preview ? (
                  <img src={file.preview} alt={file.name} className="h-10 w-10 object-cover rounded mr-2" />
                ) : (
                  <div className="mr-2">
                    {getFileIcon(file.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {getFileTypeLabel(file)} · {formatFileSize(file.size)}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="opacity-0 group-hover:opacity-100" 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing files list */}
      {existingFiles && existingFiles.length > 0 && (
        <div className="space-y-2 mt-4">
          <h3 className="text-sm font-medium">Tệp tin hiện có:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {existingFiles.map((file, index) => (
              <div key={file.id || index} className="flex items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                <FileIcon className="h-8 w-8 text-blue-500 mr-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <a 
                    href={getFileViewUrl(file.url)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Xem tệp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};