import { currentProfilePages } from "@/lib/current-profile-pages";
import { db } from "@/lib/db";
import { NextApiResponseServerIo } from "@/types";
import { NextApiRequest } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponseServerIo
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Phương thức không hợp lệ" });
    }

    try {
        const profile = await currentProfilePages(req);
        const { content, fileUrl } = req.body;
        const { conversationId } = req.query;

        if (!profile) {
            return res.status(401).json({ message: "Không dược cấp quyền" });
        }

        if (!conversationId) {
            return res.status(400).json({ message: "Cuộc hội thoại không xác định" });
        }

        if (!content || typeof content !== "string") {
            return res.status(400).json({ message: "Không khả dụng hoặc thiếu thông tin" });
        }

        if (fileUrl && typeof fileUrl !== "string") {
            return res.status(400).json({ message: "Đường dẫn URL không khả dụng" });
        }

        const conversation = await db.conversation.findFirst({
            where: {
                id: conversationId as string,
                OR: [
                    {
                        memberOne:{
                            profileId: profile.id
                        }
                    },
                    {
                        memberTwo:{
                            profileId: profile.id
                        }
                    }
                ]
            },
            include: {
                memberOne: {
                    include: {
                        profile: true
                    }
                },
                memberTwo: {
                    include: {
                        profile: true
                    }
                }
            }
        });

        if (!conversation) {
            return res.status(404).json({ message: "Cuộc hội thoại không thể tìm thấy" });
        }

        const member = conversation.memberOne.profileId === profile.id ? conversation.memberOne : conversation.memberTwo;

        if (!member) {
            return res.status(404).json({ message: "Thành viên chưa có trong lớp" });
        }

        const message = await db.directMessage.create({
            data: {
                content,
                fileUrl,
                conversationId: conversationId as string,
                memberId: member.id
            },
            include: {
                member: {
                    include: {
                        profile: true
                    }
                }
            }
        });

        const channelKey = `chat:${conversationId}:messages`;

        res?.socket?.server?.io?.emit(channelKey, message);

        return res.status(200).json({ message });
    } catch (error) {
        console.error("[DIRECT_MESSAGE_POST", error);
        res.status(500).json({ message: "Không thể tìm thấy toàn bộ danh sách thành viên" });
    }
}