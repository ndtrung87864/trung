import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/current-profile";
import { UserRole } from "@prisma/client";
import { GradesManagement } from "@/components/admin/grades-management";

const GradesPage = async () => {
    const profile = await currentProfile();

    if (!profile || profile.role !== UserRole.ADMIN) {
        return redirect("/");
    }

    return (
        <div className="h-full">
            <GradesManagement />
        </div>
    );
};

export default GradesPage;