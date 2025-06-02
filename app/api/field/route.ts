import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';

// Lấy danh sách field
export async function GET() {
    try {
        const profile = await currentProfile();
        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const fields = await db.field.findMany({
            include: { model: true },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(fields);
    } catch (error) {
        console.error('Error fetching fields:', error);
        return NextResponse.json(
            { error: 'Không thể tải danh sách field' },
            { status: 500 }
        );
    }
}

// Thêm mới field
export async function POST(req: Request) {
    try {
        const profile = await currentProfile();
        if (!profile || profile.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { name, description, prompt, modelId } = await req.json();
        
        if (!name || !modelId) {
            return NextResponse.json({ error: 'Tên và ID mô hình là bắt buộc' }, { status: 400 });
        }

        const field = await db.field.create({
            data: { name, description, prompt, modelId },
            include: { model: true }
        });
        
        return NextResponse.json({
            success: true,
            message: 'Field đã được tạo thành công',
            field
        });
    } catch (error) {
        console.error('Error creating field:', error);
        return NextResponse.json(
            { error: 'Không thể tạo field' },
            { status: 500 }
        );
    }
}

// Sửa field
export async function PUT(req: Request) {
    try {
        const profile = await currentProfile();
        if (!profile || profile.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id, name, description, prompt, modelId } = await req.json();
        
        if (!id) {
            return NextResponse.json({ error: 'ID là bắt buộc' }, { status: 400 });
        }

        const field = await db.field.update({
            where: { id },
            data: { name, description, prompt, modelId },
            include: { model: true }
        });
        
        return NextResponse.json({
            success: true,
            message: 'Field đã được cập nhật thành công',
            field
        });
    } catch (error) {
        console.error('Error updating field:', error);
        return NextResponse.json(
            { error: 'Không thể cập nhật field' },
            { status: 500 }
        );
    }
}

// Xóa field
export async function DELETE(req: Request) {
    try {
        const profile = await currentProfile();
        if (!profile || profile.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await req.json();
        
        if (!id) {
            return NextResponse.json({ error: 'ID là bắt buộc' }, { status: 400 });
        }

        await db.field.delete({ where: { id } });
        
        return NextResponse.json({
            success: true,
            message: 'Field đã được xóa thành công'
        });
    } catch (error) {
        console.error('Error deleting field:', error);
        return NextResponse.json(
            { error: 'Không thể xóa field' },
            { status: 500 }
        );
    }
}