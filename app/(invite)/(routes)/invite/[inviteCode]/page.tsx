import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { RedirectToSignIn } from "@clerk/nextjs";
import { db } from "@/lib/db";

interface InviteCodePageProps {
    params: Promise<{
        inviteCode: string;
    }>;
};

const InviteCodePage = async ({
    params
}: InviteCodePageProps) => {
    const profile = await currentProfile();
    const { inviteCode } = await params;

    if (!profile) {
        return <RedirectToSignIn />;
    }

    if(!inviteCode) {
        return redirect("/");
    }

    // Kiểm tra server có tồn tại không
    const server = await db.server.findFirst({
        where: {
            inviteCode: inviteCode,
        }
    });

    if (!server) {
        return redirect("/");
    }

    // Kiểm tra user đã là member chưa
    const existingMember = await db.member.findFirst({
        where: {
            serverId: server.id,
            profileId: profile.id
        }
    });

    if (existingMember) {
        if (existingMember.status === "ACTIVE") {
            return redirect(`/servers/${server.id}`);
        } else if (existingMember.status === "PENDING") {
            return redirect(`/pending/${server.id}`);
        } else if (existingMember.status === "REJECTED") {
            return redirect(`/rejected/${server.id}`);
        }
    }

    // Xử lý logic join server dựa trên trạng thái
    if (server.isPublic) {
        // Server public - join trực tiếp
        const newMember = await db.member.create({
            data: {
                profileId: profile.id,
                serverId: server.id,
                status: "ACTIVE",
                role: "GUEST"
            }
        });

        return redirect(`/servers/${server.id}`);
    } else {
        // Server private - tạo request pending
        const pendingMember = await db.member.create({
            data: {
                profileId: profile.id,
                serverId: server.id,
                status: "PENDING",
                role: "GUEST",
                requestedAt: new Date()
            }
        });

        return redirect(`/pending/${server.id}`);
    }
};

export default InviteCodePage;