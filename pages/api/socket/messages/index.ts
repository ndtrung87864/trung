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
        const { serverId, channelId } = req.query;

        if (!profile) {
            return res.status(401).json({ message: "Không dược cấp quyền" });
        }

        if (!serverId) {
            return res.status(400).json({ message: "Thông tin danh sách thành viên không xác định" });
        }

        if (!channelId) {
            return res.status(400).json({ message: "Thông tin lớp học không xác định" });

        }

        if (!content || typeof content !== "string") {
            return res.status(400).json({ message: "Không khả dụng hoặc thiếu thông tin" });
        }

        if (fileUrl && typeof fileUrl !== "string") {
            return res.status(400).json({ message: "Đường dẫn URL không khả dụng" });
        }

        const server = await db.server.findFirst({
            where: {
                id: serverId as string,
                members: {
                    some: {
                        profileId: profile.id
                    }
                }
            },
            include: {
                members: true
            }
        });

        if (!server) {
            return res.status(404).json({ message: "Không tìm thấy danh sách thành viên" });
        }

        const channel = await db.channel.findFirst({
            where: {
                id: channelId as string,
                serverId: serverId as string
            }
        });

        if (!channel) {
            return res.status(404).json({ message: "Không tìm thấy lớp học" });
        }

        const member = server.members.find((member) => member.profileId === profile.id);

        if (!member) {
            return res.status(404).json({ message: "Thành viên chưa tham gia lớp học" });
        }

        const message = await db.message.create({
            data: {
                content,
                fileUrl,
                channelId: channelId as string,
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

        const channelKey = `chat:${channelId}:messages`;

        res?.socket?.server?.io?.emit(channelKey, message);

        return res.status(200).json({ message });
    } catch (error) {
        console.error("[MESSAGE_POST", error);
        res.status(500).json({ message: "Không thể tìm thấy toàn bộ danh sách thành viên" });
    }
}