import { RedirectToSignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { ServerSidebar } from "@/components/server/server-sidebar";
import { MemberStatus } from "@prisma/client";

const SeverIdLayout = async ({
    children,
    params,
}: {
    children: React.ReactNode
    params: { serverId: string }

}) => {

    const profile = await currentProfile();
    if (!profile) {
        return <RedirectToSignIn />;
    }

    const { serverId } = await params;// Thêm await khi truy cập params

    const isMember = await db.member.findFirst({
        where: {
            serverId: serverId,
            profileId: profile.id
        }
    });

    // console.log("isMember:", isMember);

    const status = isMember?.status;
    if (!isMember || status === MemberStatus.REJECTED) {
        return redirect(`/rejected/${serverId}`);
    }
    if (status === MemberStatus.PENDING) {
        return redirect(`/pending/${serverId}`);
    }

    const server = await db.server.findUnique({
        where: {
            id: serverId,
            members: {
                some: {
                    profileId: profile.id
                },
            },
        },
    });

    if (!server) {
        return redirect("/");
    }

    return (
        <div className="h-full">
            < div className="hidden md:flex h-full w-60 z-20 flex-col fixed inset-y-0">
                <ServerSidebar serverId={serverId} />
            </div>
            <main className="h-full md:pl-60">
                {children}
            </main>
        </div>
    );
}

export default SeverIdLayout;