import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import ExercisePageClient from "@/components/exercise/exercise-page";

interface ServerIdPageProps {
    params: Promise<{
        serverId: string;
    }>;
}

const ExercisePage = async ({ params }: ServerIdPageProps) => {
    const profile = await currentProfile();

    if (!profile) {
        return redirect("/");
    }

    const { serverId } = await params;
    
    // Using similar query logic to fetch channels with exercises
    const serverData = await db.server.findMany({
        where: { id: serverId },
        include: {
            channels: {
                where: { 
                    type: "TEXT",
                    NOT: {
                        name: "general"
                    }
                },
                include: {
                    exercises: {
                        include: {
                            model: true,
                            field: true,
                            files: true
                        }
                    },
                }
            },
        }
    });
    
    // Get the server (should only be one since we're querying by ID)
    const server = serverData[0];
    
    if (!server) {
        return redirect("/servers");
    }

    return <ExercisePageClient serverData={server} />;
}

export default ExercisePage;
