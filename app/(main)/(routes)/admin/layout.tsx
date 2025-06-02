import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/current-profile";
import { UserRole } from "@prisma/client";

const AdminLayout = async ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const profile = await currentProfile();

    if (!profile || profile.role !== UserRole.ADMIN) {
        return redirect("/");
    }

    return (
        <div className="h-full">
            {children}
        </div>
    );
};

export default AdminLayout;