"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { UserRole } from "@prisma/client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface User {
    id: string;
    userId: string;
    name: string;
    imageUrl: string;
    email: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
}

interface RoleUpdateState {
    [userId: string]: {
        loading: boolean;
        error: boolean;
    };
}

export const ListUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [roleUpdateState, setRoleUpdateState] = useState<RoleUpdateState>({});

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await axios.get("/api/admin/users");
                setUsers(response.data);
                setError(null);
            } catch (err) {
                console.error("Error fetching users:", err);
                setError("Failed to load users. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        // Update local state for loading indicator
        setRoleUpdateState(prev => ({
            ...prev,
            [userId]: { loading: true, error: false }
        }));

        try {
            // Make API call to update user role
            await axios.patch(`/api/admin/users`,
                {
                    userId: userId,
                    role: newRole
                });

            // Update local users state
            setUsers(users.map(user =>
                user.id === userId ? { ...user, role: newRole } : user
            ));

            // Set success state
            setRoleUpdateState(prev => ({
                ...prev,
                [userId]: { loading: false, error: false }
            }));

            // Show success toast
            toast({
                variant: "success",
                title: "Role updated",
                description: `User role successfully changed to ${newRole}`,
            });

            // Clear success indicator after 2 seconds
            setTimeout(() => {
                setRoleUpdateState(prev => {
                    const newState = { ...prev };
                    delete newState[userId];
                    return newState;
                });
            }, 2000);

        } catch (err) {
            console.error("Error updating user role:", err);

            // Set error state
            setRoleUpdateState(prev => ({
                ...prev,
                [userId]: { loading: false, error: true }
            }));

            // Show error toast
            toast({
                title: "Error",
                description: "Failed to update user role. Please try again.",
                variant: "destructive",
            });

            // Clear error indicator after 2 seconds
            setTimeout(() => {
                setRoleUpdateState(prev => {
                    const newState = { ...prev };
                    delete newState[userId];
                    return newState;
                });
            }, 2000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading users...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-700 p-4 rounded-md">
                <p className="font-medium">Error</p>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                    Manage all users in the system ({users.length} users found)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="flex items-center space-x-3">
                                    <Avatar>
                                        <AvatarImage src={user.imageUrl} alt={user.name} />
                                        <AvatarFallback>
                                            {user.name.split(' ').map(name => name[0]).join('').toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                            ID: {user.userId}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-2">
                                        <Select
                                            defaultValue={user.role}
                                            onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                                            disabled={roleUpdateState[user.id]?.loading}
                                        >
                                            <SelectTrigger className="w-[110px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.values(UserRole).map((role) => (
                                                    <SelectItem key={role} value={role}
                                                        className="capitalize">
                                                        {role}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {roleUpdateState[user.id]?.loading && (
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        )}
                                        {roleUpdateState[user.id] && !roleUpdateState[user.id].loading && !roleUpdateState[user.id].error && (
                                            <Check className="h-4 w-4 text-green-500" />
                                        )}
                                        {roleUpdateState[user.id]?.error && (
                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {format(new Date(user.createdAt), "PPP")}
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    No users found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default ListUsers;