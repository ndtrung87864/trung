import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/current-profile";
import { SystemMasterDashboard } from "@/components/system-assistant/system-master-dashboard";

const SystemMasterPage = async () => {
    const user = await currentProfile();

    if (!user) {
        return redirect("/");
    }

    if (user.role !== "ADMIN") {
        return redirect("/");
    }

    return (
        <div className="bg-white dark:bg-[#313338] flex-1 p-6">
            <SystemMasterDashboard />
        </div>
    );
};

export default SystemMasterPage;