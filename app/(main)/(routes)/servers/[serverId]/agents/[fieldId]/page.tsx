import AgentChat from "@/components/agent/agent-chat";
import { RedirectToSignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentProfile } from "@/lib/current-profile";

interface AgentPageProps {
  params: Promise<{
    serverId: string;
    fieldId: string;
  }>;
}

const AgentPage = async ({ params }: AgentPageProps) => {
  const profile = await currentProfile();

  const { serverId, fieldId } = await params;

  if (!profile) {
    return <RedirectToSignIn />;
  }

  // Verify the server exists and user is a member
  const server = await db.server.findUnique({
    where: {
      id: serverId,
    },
    include: {
      members: {
        where: {
          profileId: profile.id,
        }
      },
      fields: {
        where: {
          fieldId: fieldId
        },
        include: {
          field: {
            include: {
              model: true,
              files: true
            }
          }
        }
      }
    }
  });

  // If server doesn't exist or user isn't a member or the field isn't associated with server
  if (!server || !server.members.length || !server.fields.length) {
    return redirect(`/servers/${serverId}`);
  }

  const agent = server.fields[0].field;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <AgentChat 
          agent={agent} 
          serverId={serverId} 
          profileId={profile.id} 
        />
      </div>
    </div>
  );
};

export default AgentPage;