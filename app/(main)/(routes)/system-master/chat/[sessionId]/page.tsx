import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/current-profile";
import { SystemMasterChat } from "@/components/system-assistant/system-master-chat";

interface SystemMasterChatPageProps {
    params: Promise<{
        sessionId: string;
    }>;
}

const SystemMasterChatPage = async ({ params }: SystemMasterChatPageProps) => {
    const user = await currentProfile();

    if (!user) {
        return redirect("/");
    }

    if (user.role !== "ADMIN") {
        return redirect("/");
    }

    const { sessionId } = await params;

    return (
        <div className="bg-white dark:bg-[#313338] flex-1 p-4">
            <SystemMasterChat sessionId={sessionId} />
        </div>
    );
};

export default SystemMasterChatPage;