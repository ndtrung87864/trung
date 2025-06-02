import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";
import { ExerciseTakingPage } from "@/components/exercise/exercise-taking-page";

interface ExerciseDetailPageProps {
  params: Promise<{
    serverId: string;
    exerciseId: string;
  }>;
}

const ExerciseDetailPage = async ({ params }: ExerciseDetailPageProps) => {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  const { serverId, exerciseId } = await params;

  // Check if user already has a result for this exercise
  const existingResult = await db.exerciseResult.findFirst({
    where: {
      exerciseId: exerciseId,
      userId: profile.userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // If result exists, redirect to result page
  if (existingResult) {
    // Determine the result page based on exercise type
    if (existingResult.type === "written") {
      return redirect(
        `/servers/${serverId}/exercises/detail/${exerciseId}/written-result/${existingResult.id}`
      );
    } else {
      return redirect(
        `/servers/${serverId}/exercises/detail/${exerciseId}/result/${existingResult.id}`
      );
    }
  }

  // Get exercise data
  const exercise = await db.exercise.findUnique({
    where: {
      id: exerciseId,
      isActive: true,
    },
    include: {
      model: true,
      files: true,
      channel: {
        include: {
          server: true,
        },
      },
      field: true,
    },
  });

  if (!exercise) {
    return redirect(`/servers/${serverId}/exercises`);
  }

  // Check if user is member of the server
  const member = await db.member.findFirst({
    where: {
      profileId: profile.id,
      serverId: serverId,
    },
  });

  if (!member) {
    return redirect("/");
  }

  return (
    <div className="h-full">
      <ExerciseTakingPage exercise={exercise} />
    </div>
  );
};

export default ExerciseDetailPage;
