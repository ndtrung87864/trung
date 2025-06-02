import { ProfanityManagement } from "@/components/admin/profanity-management";
import { currentProfile } from "@/lib/current-profile";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";


const ProfanityPage = async () => {
    const profile = await currentProfile();

    if (!profile || profile.role !== UserRole.ADMIN) {
        return redirect("/");
    }

    return (
        <div className="h-full">
            <ProfanityManagement />
        </div>
    );
};

export default ProfanityPage;