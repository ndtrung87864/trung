'use client';

import { useEffect, useState } from 'react';

type Model = {
    id: string;
    name: string;
    isActive: boolean;
};

export default function ModelPage() {
    const [models, setModels] = useState<Model[]>([]);
    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [editId, setEditId] = useState<string | null>(null);

    // Fetch models
    const fetchModels = async () => {
        const res = await fetch('/api/model');
        const data = await res.json();
        setModels(data);
    };

    useEffect(() => {
        fetchModels();
    }, []);

    // Thêm hoặc sửa model
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editId) {
            await fetch(`/api/model/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, isActive }),
            });
        } else {
            await fetch('/api/model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name, isActive }),
            });
        }
        setId('');
        setName('');
        setIsActive(true);
        setEditId(null);
        fetchModels();
    };

    // Xóa model
    const handleDelete = async (id: string) => {
        await fetch(`/api/model/${id}`, { method: 'DELETE' });
        fetchModels();
    };

    // Chọn model để sửa
    const handleEdit = (model: Model) => {
        setEditId(model.id);
        setId(model.id);
        setName(model.name);
        setIsActive(model.isActive);
    };

    return (
        <div style={{ maxWidth: 600, margin: '40px auto' }}>
            <h2>Quản lý Mô hình</h2>
            <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
                {!editId && (
                    <input
                        value={id}
                        onChange={e => setId(e.target.value)}
                        placeholder="ID model"
                        required
                        style={{ marginRight: 8 }}
                    />
                )}
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tên model"
                    required
                    style={{ marginRight: 8 }}
                />
                <label>
                    <input
                        type="checkbox"
                        checked={isActive}
                        onChange={e => setIsActive(e.target.checked)}
                        style={{ marginRight: 4 }}
                    />
                    Kích hoạt
                </label>
                <button type="submit" style={{ marginLeft: 8 }}>
                    {editId ? 'Cập nhật' : 'Thêm mới'}
                </button>
                {editId && (
                    <button type="button" onClick={() => { setEditId(null); setId(''); setName(''); setIsActive(true); }} style={{ marginLeft: 8 }}>
                        Hủy
                    </button>
                )}
            </form>
            <table border={1} cellPadding={8} style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tên</th>
                        <th>Active</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {models.map(model => (
                        <tr key={model.id}>
                            <td>{model.id}</td>
                            <td>{model.name}</td>
                            <td>{model.isActive ? '✅' : '❌'}</td>
                            <td>
                                <button onClick={() => handleEdit(model)}>Sửa</button>
                                <button onClick={() => handleDelete(model.id)} style={{ marginLeft: 8 }}>Xóa</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button
                onClick={async () => {
                    await fetch('/api/model/sync', { method: 'POST' });
                    fetchModels();
                    alert('Đã đồng bộ danh sách model!');
                }}
            >
                Đồng bộ mô hình Gemini vào cơ sở dữ liệu
            </button>
        </div>
    );
}