import { db } from "@/lib/db";
import { Building, BookOpen } from "lucide-react";
import React from "react";

export async function getExerciseSearchData(profileId: string) {
  // Get all servers with exercises that the user is a member of
  const userServers = await db.server.findMany({
    where: {
      members: {
        some: {
          profileId: profileId,
        },
      },
    },
    include: {
      channels: {
        where: {
          exercises: {
            some: {},
          },
        },
        include: {
          exercises: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Filter to servers that have channels with exercises
  const serversWithExercises = userServers.filter(server => server.channels.length > 0);

  // Prepare data for search component
  return [
    {
      label: "Lớp học",
      type: "class",
      data: serversWithExercises.map(server => ({
        id: server.id,
        name: server.name,
        icon: <Building className="h-4 w-4 mr-2" />,
      })),
    },
    {
      label: "Môn học",
      type: "subject",
      data: serversWithExercises.flatMap(server => 
        server.channels.map(channel => ({
          id: channel.id,
          name: channel.name,
          icon: <BookOpen className="h-4 w-4 mr-2" />,
          subjectId: server.id,
          subjectName: server.name,
        }))
      ),
    },
  ];
}
