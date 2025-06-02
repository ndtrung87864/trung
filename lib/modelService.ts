import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Thêm mới một Model
 * @param name Tên model
 * @param isActive Trạng thái (mặc định: true)
 * @returns Model vừa tạo
 */
export async function createModel(name: string, isActive: boolean = true) {
    return prisma.model.create({
        data: { name, isActive },
    });
}

/**
 * Sửa Model theo id
 * @param id ID của model
 * @param data Dữ liệu cập nhật (name, isActive)
 * @returns Model đã cập nhật
 */
export async function updateModel(
    id: string,
    data: { name?: string; isActive?: boolean }
) {
    return prisma.model.update({
        where: { id },
        data,
    });
}

/**
 * Xóa Model theo id
 * @param id ID của model
 * @returns Model đã xóa
 */
export async function deleteModel(id: string) {
    return prisma.model.delete({
        where: { id },
    });
}

/**
 * Lấy danh sách tất cả Model
 */
export async function getAllModels() {
    return prisma.model.findMany();
}

/**
 * Lấy chi tiết một Model theo id
 */
export async function getModelById(id: string) {
    return prisma.model.findUnique({
        where: { id },
    });
}