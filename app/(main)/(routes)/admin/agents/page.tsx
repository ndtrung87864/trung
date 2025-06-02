import AgentManagement from "@/components/AI-Agent-Management/Agent-Management-Page";

const Page = async () => {
    return (
        // <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        //     <h1 className="text-2xl font-bold mb-4">Chào mừng bạn đến với ChatGPT</h1>
        //     <p className="text-gray-600 mb-8">Hãy bắt đầu cuộc trò chuyện của bạn!</p>
        //     <div className="flex space-x-4">
        //         <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Bắt đầu</button>
        //         <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Hướng dẫn</button>
        //     </div>
        // </div>
        <>
            <AgentManagement />
        </>
    );
};

export default Page;
