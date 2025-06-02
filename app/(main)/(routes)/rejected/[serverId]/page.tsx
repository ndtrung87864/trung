import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { RedirectToSignIn } from "@clerk/nextjs";
import { db } from "@/lib/db";
import Link from "next/link";

interface RejectedPageProps {
    params: Promise<{
        serverId: string;
    }>;
};

const RejectedPage = async ({
    params
}: RejectedPageProps) => {
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

    if (member.status === "PENDING") {
        return redirect(`/pending/${serverId}`);
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#313338]">
            <div className="text-center space-y-4 max-w-md mx-auto p-6">
                <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Yêu cầu bị từ chối
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                    Yêu cầu tham gia server <strong>{server.name}</strong> đã bị từ chối.
                </p>
                {member.rejectReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">
                            <strong>Lý do:</strong> {member.rejectReason}
                        </p>
                    </div>
                )}
                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Thời gian từ chối: {member.rejectedAt?.toLocaleString('vi-VN')}
                    </p>
                </div>
                <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                    Về trang chủ
                </Link>
            </div>
        </div>
    );
};

export default RejectedPage;