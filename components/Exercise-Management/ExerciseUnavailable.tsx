import { AlertCircle } from "lucide-react";

export const ExerciseUnavailable = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 max-w-2xl mx-auto">
      <div className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-amber-500" />
        </div>
        
        <h2 className="text-xl font-semibold mb-2">Tính năng bài tập hiện chưa khả dụng</h2>
        
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          Bảng Exercise đã bị xóa khỏi cơ sở dữ liệu trong quá trình cập nhật hệ thống. 
          Để sử dụng tính năng này, cần khôi phục lại cấu trúc cơ sở dữ liệu.
        </p>
        
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ.
        </p>
      </div>
    </div>
  );
};
