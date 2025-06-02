"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import qs from "query-string";
import { format } from "date-fns";
import { Loader2, Copy, ArrowLeft, User, MessageSquare, BotMessageSquare, Plus, UserPlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { MemberRole } from "@prisma/client";
import { Select } from "@radix-ui/react-select";
import { SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useModal } from "@/hooks/use-modal-store";

interface Profile {
  id: string;
  name: string;
  imageUrl: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Member {
  id: string;
  role: MemberRole;
  profileId: string;
  serverId: string;
  createdAt: string;
  updatedAt: string;
  profile: Profile;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  profileId: string;
  serverId: string;
  fieldId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ServerField {
  id: string;
  serverId: string;
  fieldId: string;
  createdAt: string;
  updatedAt: string;
  field: {
    id: string;
    name: string;
    description: string | null;
    model: {
      id: string;
      name: string;
    }
  }
}

interface Classroom {
  id: string;
  name: string;
  imageUrl: string;
  inviteCode: string;
  profileId: string;
  createdAt: string;
  updatedAt: string;
  members: Member[];
  channels: Channel[];
  fields: ServerField[];
}

interface ClassroomDetailsProps {
  classroomId: string;
}

const roleNameMap = {
  "GUEST": "Học sinh",
  "MODERATOR": "Quản lý",
  "ADMIN": "Giáo viên",
}

const ClassroomDetails = ({ classroomId }: ClassroomDetailsProps) => {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingAgentId, setLoadingAgentId] = useState("");
  const router = useRouter();
  const { onOpen } = useModal();

  useEffect(() => {
    const fetchClassroomDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/admin/classroom/${classroomId}`);
        setClassroom(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching classroom details:", err);
        setError("Failed to load classroom details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (classroomId) {
      fetchClassroomDetails();
    }
  }, [classroomId]);

  const handleCopyInviteCode = () => {
    if (classroom) {
      navigator.clipboard.writeText(classroom.inviteCode);
      toast({
        title: "Invite Code Copied",
        description: "The invite code has been copied to your clipboard.",
        variant: "success",
      });
    }
  };

  const onRoleChange = async (memberId: string, role: MemberRole) => {
    try {
      setLoadingId(memberId);
      const url = qs.stringifyUrl({
        url: `/api/members/${memberId}`,
        query: {
          serverId: classroom?.id,
          memberId,
        }
      });

      const response = await axios.patch(url, { role });

      if (response.status === 200) {
        toast({
          title: "Role Updated",
          description: "Member role has been updated successfully.",
          variant: "success",
        });

        setClassroom((prevClassroom) => {
          if (prevClassroom) {
            return {
              ...prevClassroom,
              members: prevClassroom.members.map((member) =>
                member.id === memberId ? { ...member, role } : member
              ),
            };
          }
          return prevClassroom;
        });
      }
      // router.refresh();
      // onOpen("members", { server: response.data });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update member role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingId("");
    }
  };

  const fetchClassroomFields = async () => {
    try {
      const response = await axios.get(`/api/admin/classroom/${classroomId}/agents`);
      setClassroom(prev => prev ? { ...prev, fields: response.data } : null);
    } catch (error) {
      console.error("Error fetching classroom fields:", error);
    }
  };

  const handleRemoveAgent = async (serverFieldId: string) => {
    try {
      setLoadingAgentId(serverFieldId);
      await axios.delete(`/api/admin/classroom/${classroomId}/agents`, {
        data: { serverFieldId }
      });
      
      toast({
        title: "Agent Removed",
        description: "The agent has been removed from this classroom.",
        variant: "success",
      });
      
      // Update classroom data
      setClassroom(prev => {
        if (prev) {
          return {
            ...prev,
            fields: prev.fields.filter(field => field.id !== serverFieldId)
          };
        }
        return prev;
      });
    } catch (error) {
      console.error("Failed to remove agent:", error);
      toast({
        title: "Error",
        description: "Failed to remove agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingAgentId("");
    }
  };

  const handleAddMember = () => {
    onOpen("addMember", {
      classroomId,
      existingMemberIds: classroom?.members?.map(m => m.profile.id) || [],
    });
  };

  const handleRemoveMember = (member: Member) => {
    onOpen("removeMember", {
      classroomId,
      member,
    });
  };

  const handleAddAgent = () => {
    onOpen("addAgent", {
      classroomId,
      existingAgentIds: classroom?.fields?.map(f => f.field.id) || [],
      onSuccess: fetchClassroomFields
    });
  };

  const goBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading classroom details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p className="font-medium">Error</p>
        <p>{error}</p>
        <Button variant="outline" onClick={goBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="bg-amber-50 text-amber-700 p-4 rounded-md">
        <p className="font-medium">Classroom not found</p>
        <Button variant="outline" onClick={goBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={goBack} size="icon" className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Chi tiết</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Classroom Info Card */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle>Thông tin lớp học</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-4">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={classroom.imageUrl} alt={classroom.name} />
                <AvatarFallback className="text-2xl">
                  {classroom.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{classroom.name}</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mã mời lớp học</p>
                <div className="flex items-center">
                  <p className="text-sm font-mono truncate">{classroom.inviteCode}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-1"
                    onClick={handleCopyInviteCode}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ngày tạo</p>
                <p className="text-sm">
                  {format(new Date(classroom.createdAt), "PPP pp")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ngày cập nhật</p>
                <p className="text-sm">
                  {format(new Date(classroom.updatedAt), "PPP pp")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members and Channels */}
        <Card className="col-span-1 md:col-span-2 !h-full">
          <CardHeader className="pb-2">
            <CardTitle>Chi tiết</CardTitle>
            <CardDescription>
              Thành viên: {classroom.members.length} | Nhóm: {classroom.channels.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="members">
              <TabsList className="mb-4">
                <TabsTrigger value="members" className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Thành viên
                </TabsTrigger>
                <TabsTrigger value="channels" className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Nhóm
                </TabsTrigger>
                {/* <TabsTrigger value="assistant" className="flex items-center">
                  <BotMessageSquare className="h-4 w-4 mr-2" />
                  Trợ lý lớp học
                </TabsTrigger> */}
                <TabsTrigger value="agents" className="flex items-center">
                  <BotMessageSquare className="h-4 w-4 mr-2" />
                  Trợ lý lớp học
                </TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <Button size="sm" onClick={handleAddMember}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Thêm thành viên
                  </Button>
                </div>

                <div className="rounded-md border">
                  <div className="p-3 bg-muted/50 flex justify-between items-center text-sm font-medium">
                    <div className="w-1/2">Tên</div>
                    <div className="w-1/4">Vai trò</div>
                    <div className="w-1/4">Hành động</div>
                  </div>
                  <Separator />

                  {classroom.members.map((member) => (
                    <div key={member.id} className="p-3 flex justify-between items-center text-sm hover:bg-muted/30">
                      <div className="w-1/2 flex items-center gap-x-2">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={member.profile.imageUrl || undefined} alt={member.profile.name} />
                          <AvatarFallback className="text-2xl">
                            {member.profile.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="font-medium">{member.profile.name}</div>
                          <div className="text-xs text-muted-foreground">{member.profile.email}</div>
                        </div>
                      </div>
                      
                      <div className={cn(loadingId === member.id ? "w-1/4 opacity-50 flex items-center cursor-wait" : "w-1/4 flex items-center gap-x-2")}>
                        <Select
                          defaultValue={member.role}
                          onValueChange={(value) => onRoleChange(member.id, value as MemberRole)}
                        >
                          <SelectTrigger className="w-fit text-sm font-medium">
                            <SelectValue placeholder={roleNameMap[member.role]} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="GUEST" className="text-sm font-medium">
                                Học sinh
                              </SelectItem>
                              <SelectItem value="MODERATOR" className="text-sm font-medium">
                                Quản lý
                              </SelectItem>
                              <SelectItem value="ADMIN" className="text-sm font-medium">
                                Giáo viên
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        {loadingId === member.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary ms-3" />
                        )}
                      </div>

                      <div className="w-1/4 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(member.createdAt), "dd/MM/yyyy")}
                        </span>
                        {/* Chỉ cho phép xóa nếu không phải là chủ lớp học */}
                        {member.profileId !== classroom.profileId && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveMember(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {classroom.members.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      Không có thành viên nào
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="channels" className="space-y-4">
                <div className="rounded-md border">
                  <div className="p-3 bg-muted/50 flex justify-between items-center text-sm font-medium">
                    <div className="w-1/3">Name</div>
                    <div className="w-1/3">Type</div>
                    <div className="w-1/3">Created</div>
                  </div>
                  <Separator />

                  {classroom.channels.map((channel) => (
                    <div key={channel.id} className="p-3 flex justify-between items-center text-sm hover:bg-muted/30">
                      <div className="w-1/3 font-medium">{channel.name}</div>
                      <div className="w-1/3">
                        <Badge variant="outline">{channel.type}</Badge>
                      </div>
                      <div className="w-1/3 text-muted-foreground">
                        {format(new Date(channel.createdAt), "PPP")}
                      </div>
                    </div>
                  ))}

                  {classroom.channels.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      No channels found
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* <TabsContent value="assistant" className="space-y-4">
                <div className="rounded-md border">
                  <div className="p-3 bg-muted/50 flex justify-between items-center text-sm font-medium">
                    <div className="w-1/2">Tên</div>
                    <div className="w-1/2">Vai trò</div>
                  </div>
                  <Separator />

                  <div className="p-3 flex justify-between items-center text-sm hover:bg-muted/30">
                    <div className="w-1/2 font-mono text-xs truncate">Trợ lý lớp học</div>
                    <div className="w-1/2 flex items-center gap-x-2">
                      <Select defaultValue="ADMIN" disabled>
                        <SelectTrigger className="w-fit text-sm font-medium">
                          <SelectValue placeholder="Giáo viên" />
                        </SelectTrigger>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent> */}

              <TabsContent value="agents" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <Button size="sm" onClick={handleAddAgent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm trợ lý
                  </Button>
                </div>

                <div className="rounded-md border">
                  <div className="p-3 bg-muted/50 flex justify-between items-center text-sm font-medium">
                    <div className="w-1/2">Tên</div>
                    <div className="w-1/4">Model</div>
                    <div className="w-1/4">Hành động</div>
                  </div>
                  <Separator />

                  {classroom.fields && classroom.fields.length > 0 ? (
                    classroom.fields.map((serverField) => (
                      <div key={serverField.id} className="p-3 flex justify-between items-center text-sm hover:bg-muted/30">
                        <div className="w-1/2 font-medium">{serverField.field.name}</div>
                        <div className="w-1/4">
                          <Badge variant="outline">{serverField.field.name}</Badge>
                        </div>
                        <div className="w-1/4 flex items-center">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveAgent(serverField.id)}
                            disabled={loadingAgentId === serverField.id}
                          >
                            {loadingAgentId === serverField.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      Không có trợ lý AI nào được thêm vào lớp học
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClassroomDetails;