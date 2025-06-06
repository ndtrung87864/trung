import { MemberRole } from '@prisma/client';
import { NextApiRequest } from 'next';
import { NextApiResponseServerIo } from '@/types';
import { currentProfilePages } from '@/lib/current-profile-pages';
import { db } from '@/lib/db';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponseServerIo
) {
    if (req.method !== "DELETE" && req.method !== "PATCH") {
        return res.status(405).json({ error: "Phương thức không khả dụng" });
    }

    try {
        const profile = await currentProfilePages(req);
        const { directMessageId, conversationId } = req.query;
        const { content } = req.body;

        console.log(directMessageId, conversationId);

        if (!profile) {
            return res.status(401).json({ error: "Không được cấp quyền" });
        }

        if (!conversationId) {
            return res.status(400).json({ error: "Thông tin hội thoại trao đổi đang bị thiếu" });
        }

        const conversation = await db.conversation.findFirst({
            where: {
                id: conversationId as string,
                OR: [
                    {
                        memberOne: {
                            profileId: profile.id
                        }
                    },
                    {
                        memberTwo: {
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
            return res.status(404).json({ error: "Hội thoại trao đổi không thể tìm thấy" });
        }

        const member = conversation.memberOne.profileId === profile.id ? conversation.memberOne : conversation.memberTwo;

        if (!member) {
            return res.status(404).json({ error: "Thành viên chưa tham gia lớp học" });
        }

        let directMessage = await db.directMessage.findFirst({
            where: {
                id: directMessageId as string,
                conversationId: conversationId as string,
            },
            include: {
                member: {
                    include: {
                        profile: true
                    }
                }
            }
        });

        if (!directMessage || directMessage.deleted) {
            return res.status(404).json({ error: "Tin nhắn đã bị xóa" });
        }

        const isMessageOwner = directMessage.memberId === member.id;
        const isAdmin = member.role === MemberRole.ADMIN;
        const isModerator = member.role === MemberRole.MODERATOR;
        const canModify = isMessageOwner || isAdmin || isModerator;

        if (!canModify) {
            return res.status(401).json({ error: "Không dược cấp quyền" });
        }

        if (req.method === "DELETE") {
            directMessage = await db.directMessage.update({
                where: {
                    id: directMessageId as string,
                },
                data: {
                    fileUrl: null,
                    content: "Tin nhắn đã bị xóa",
                    deleted: true,
                },
                include: {
                    member: {
                        include: {
                            profile: true
                        }
                    }
                }
            });
        }

        if (req.method === "PATCH") {
            if (!isMessageOwner) {
                return res.status(401).json({ error: "Không dược cấp quyền" });
            }

            directMessage = await db.directMessage.update({
                where: {
                    id: directMessageId as string,
                },
                data: {
                    content,
                },
                include: {
                    member: {
                        include: {
                            profile: true
                        }
                    }
                }
            });
        }

        const updateKey = `chat:${conversation.id}:messages:update`;

        res?.socket?.server?.io?.emit(updateKey, directMessage);

        return res.status(200).json(directMessage);
    } catch (error) {
        console.error("[MESSAGES_ID", error);
        return res.status(500).json({ error: "Không thể tìm thấy toàn bộ danh sách thành viên" });
    }
}