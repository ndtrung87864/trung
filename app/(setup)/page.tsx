import { initialProfile } from "@/lib/initial-profile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { InitialModal } from "@/components/modals/initial-modal";
const SetupPage = async () => {
    const profile = await initialProfile();

    const server = await db.server.findFirst({
        where: {
            members: {
                some: {
                    profileId: profile.id
                }
            }
        },
    });

    const servers = await db.server.findFirst({
        where: {
           name: "Hunre",
        }
    });


    if (server) {
        return redirect(`/servers/${server.id}`);
    }

    if (servers) {
        return redirect(`/invite/${servers.inviteCode}`);
    }

    return <InitialModal/>;
};

export default SetupPage;
