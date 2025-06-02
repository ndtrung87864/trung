import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { RedirectToSignIn } from "@clerk/nextjs";
import { db } from "@/lib/db";
import Link from "next/link";

interface PendingPageProps {
    params: Promise<{
        serverId: string;
    }>;
};

const PendingPage = async ({
    params
}: PendingPageProps) => {
    const profile = await currentProfile();
    const { serverId } = await params;

    if (!profile) {
        return <RedirectToSignIn />;
    }

    const server = await db.server.findFirst({
        where: {
            id: serverId,
        }
    });

    const member = await db.member.findFirst({
        where: {
            serverId: serverId,
            profileId: profile.id
        }
    });

    if (!server || !member) {
        return redirect("/");
    }

    if (member.status === "ACTIVE") {
        return redirect(`/servers/${serverId}`);
    }

    if (member.status === "REJECTED") {
        return redirect(`/rejected/${serverId}`);
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#313338]">
            <div className="text-center space-y-4 max-w-md mx-auto p-6">
                <div className="w-20 h-20 mx-auto bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Đang chờ duyệt
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                    Yêu cầu tham gia server <strong>{server.name}</strong> đang được xem xét. 
                    Bạn sẽ nhận được thông báo khi được chấp thuận.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        Thời gian yêu cầu: {member.requestedAt?.toLocaleString('vi-VN')}
                    </p>
                </div>
                <Link
                    href={`/`}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                    Về trang chủ
                </Link>
            </div>
        </div>
    );
};

export default PendingPage;