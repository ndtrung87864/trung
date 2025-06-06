import { Channel, ChannelType, Server } from "@prisma/client";
import { create } from "zustand";

export type ModalType = "createServer" | "invite" | "editServer" | "members" | "createChannel" | "leaveServer" | "deleteServer"
 | "deleteChannel" | "editChannel" | "messageFile" | "deleteMessage" | "addAgent" | "addMember" | "removeMember" | "pendingMembers";

interface Profile {
  id: string;
  name: string;
  imageUrl: string | null;
  email: string | null;
}

interface Member {
  id: string;
  role: string;
  profileId: string;
  serverId: string;
  profile: Profile;
}

interface ModalData {
    server?: Server;
    channel?: Channel;
    channelType?: ChannelType;
    apiUrl?: string;
    query?: Record<string, any>;
    classroomId?: string;
    member?: Member;
    existingAgentIds?: string[];
    existingMemberIds?: string[];
    onSuccess?: () => void;
}

interface ModalStore {
    type: ModalType | null;
    data: ModalData;
    isOpen: boolean;
    onOpen: (type: ModalType, data?: ModalData) => void;
    onClose: () => void;
}

export const useModal = create<ModalStore>((set) => ({
    type: null,
    data: {},
    isOpen: false,
    onOpen: (type, data = {}) => set({ type, isOpen: true, data }),
    onClose: () => set({ type: null, isOpen: false }),
}));