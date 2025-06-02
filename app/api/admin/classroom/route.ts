import { db } from "@/lib/db";

export async function GET(request: Request) {
    try {

        // const classroom = await db.server.findMany()
        const classroom = await db.server.findMany()

        return Response.json(classroom, { status: 200 });

    } catch (error) {

    }
}