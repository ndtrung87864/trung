import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ExamContent from "@/components/exam/exam-content";

interface ChannelExamsPageProps {
    params: Promise<{
        serverId: string;
        channelId: string;
    }>;
}

const ChannelExamsPage = async ({ params }: ChannelExamsPageProps) => {
    const profile = await currentProfile();
    
    if (!profile) {
        return redirect("/");
    }
    
    const { serverId, channelId } = await params;
    
    // Get server details
    const server = await db.server.findUnique({
        where: {
            id: serverId,
            members: {
                some: {
                    profileId: profile.id
                }
            }
        }
    });
    
    if (!server) {
        return notFound();
    }
    
    // Get channel with exams
    const channel = await db.channel.findUnique({
        where: {
            id: channelId,
            serverId: serverId
        },
        include: {
            exams: true
        }
    });
    
    if (!channel) {
        return notFound();
    }
    
    return (
        <div className="h-screen flex flex-col">
            <div className="p-3 border-b-2 h-12 flex items-center gap-2">
                <Link href={`/servers/${serverId}/exams`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Trở về danh sách môn học</span>
                </Link>
            </div>
            <div className="flex-1 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted overflow-y-auto">
                <ExamContent 
                    channel={channel}
                    server={server}
                    exams={channel.exams || []}
                />
            </div>
        </div>
    );
};

export default ChannelExamsPage;