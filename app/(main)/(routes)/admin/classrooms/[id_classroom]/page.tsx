import ClassroomDetails from "@/components/admin/classroom/classroom-details";

interface ClassroomPageProps {
    params: Promise<{
        id_classroom: string;
    }>
}

const ClassroomPage = async ({
    params
}: ClassroomPageProps) => {

    const { id_classroom } = await params;

    // console.log("[CLASSROOM_ID]", id_classroom);

    return (
        <div className="h-full p-6">
            <ClassroomDetails classroomId={id_classroom} />
        </div>
    );
};

export default ClassroomPage;