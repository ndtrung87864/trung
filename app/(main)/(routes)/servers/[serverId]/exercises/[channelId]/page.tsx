import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ExerciseContent from "@/components/exercise/exercise-content";

interface ChannelExercisesPageProps {
    params: Promise<{
        serverId: string;
        channelId: string;
    }>;
}

const ChannelExercisesPage = async ({ params }: ChannelExercisesPageProps) => {
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
    
    // Get channel with exercises
    const channel = await db.channel.findUnique({
        where: {
            id: channelId,
            serverId: serverId
        },
        include: {
            exercises: {
                include: {
                    model: true,
                    field: true,
                    files: true
                }
            }
        }
    });
    
    if (!channel) {
        return notFound();
    }
    
    return (
        <div className="h-screen flex flex-col">
            <div className="p-3 border-b-2 h-12 flex items-center gap-2">
                <Link href={`/servers/${serverId}/exercises`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Trở về danh sách môn học</span>
                </Link>
            </div>
            <div className="flex-1 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted overflow-y-auto">
                <ExerciseContent 
                    channel={channel}
                    server={server}
                    exercises={channel.exercises?.map(exercise => ({
                        ...exercise,
                        field: exercise.field ? { id: exercise.field.id, name: exercise.field.name } : undefined
                    })) || []}
                />
            </div>
        </div>
    );
};

export default ChannelExercisesPage;
