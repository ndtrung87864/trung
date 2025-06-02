import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id_classroom: string }> }
) {
    try {
        const { id_classroom } = await params;

        // console.log("[CLASSROOM_ID_GET]", id_classroom);

        if (!id_classroom) {
            return NextResponse.json({ error: "id_classroom is required" }, { status: 400 });
        }

        const profile = await currentProfile()

        const classroom = await db.server.findUnique({
            where: { id: id_classroom },
            include: {
                members: {
                    where: {
                        profileId: {
                            not: profile?.id,
                        },
                    },
                    include: {
                        profile: true,
                    },
                },
                    channels: true,
                    fields: {
                        include: {
                            field: true,
                        },
                    },
                },
            });

        return NextResponse.json(classroom, { status: 200 });

    } catch (error) {
        console.error("[CLASSROOM_ID_GET]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
