'use client';

import { useEffect, useState } from 'react';

type Field = {
    id: string;
    name: string;
    modelId: string;
    prompt?: string;
    description?: string;
    model?: { id: string; name: string };
};

type Model = {
    id: string;
    name: string;
};

export default function FieldPage() {
    const [fields, setFields] = useState<Field[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [name, setName] = useState('');
    const [modelId, setModelId] = useState('');
    const [prompt, setPrompt] = useState('');
    const [description, setDescription] = useState('');
    const [editId, setEditId] = useState<string | null>(null);

    // Lấy danh sách field
    const fetchFields = async () => {
        const res = await fetch('/api/field');
        const data = await res.json();
        setFields(data);
    };

    // Lấy danh sách model
    const fetchModels = async () => {
        const res = await fetch('/api/model');
        const data = await res.json();
        setModels(data);
    };

    useEffect(() => {
        fetchFields();
        fetchModels();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !modelId) return;
        if (editId) {
            await fetch('/api/field', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editId, name, modelId, prompt, description }),
            });
        } else {
            await fetch('/api/field', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, modelId, prompt, description }),
            });
        }
        setName('');
        setModelId('');
        setPrompt('');
        setDescription('');
        setEditId(null);
        fetchFields();
    };

    const handleDelete = async (id: string) => {
        await fetch('/api/field', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        fetchFields();
    };

    const handleEdit = (field: Field) => {
        setEditId(field.id);
        setName(field.name);
        setModelId(field.modelId);
        setPrompt(field.prompt || '');
        setDescription(field.description || '');
    };

    return (
        <div style={{ maxWidth: 700, margin: '40px auto' }}>
            <h2>Quản lý Lĩnh vực (Field)</h2>
            <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tên lĩnh vực"
                    required
                    style={{ marginRight: 8 }}
                />
                <select
                    value={modelId}
                    onChange={e => setModelId(e.target.value)}
                    required
                    style={{ marginRight: 8 }}
                >
                    <option value="">Chọn Model</option>
                    {models.map(model => (
                        <option key={model.id} value={model.id}>
                            {model.name}
                        </option>
                    ))}
                </select>
                <input
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Prompt"
                    style={{ marginRight: 8 }}
                />
                <input
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Mô tả"
                    style={{ marginRight: 8 }}
                />
                <button type="submit" style={{ marginLeft: 8 }}>
                    {editId ? 'Cập nhật' : 'Thêm mới'}
                </button>
                {editId && (
                    <button
                        type="button"
                        onClick={() => {
                            setEditId(null);
                            setName('');
                            setModelId('');
                            setPrompt('');
                            setDescription('');
                        }}
                        style={{ marginLeft: 8 }}
                    >
                        Hủy
                    </button>
                )}
            </form>
            <table border={1} cellPadding={8} style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tên</th>
                        <th>Model</th>
                        <th>Prompt</th>
                        <th>Mô tả</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {fields.map(field => (
                        <tr key={field.id}>
                            <td>{field.id}</td>
                            <td>{field.name}</td>
                            <td>{field.model?.name || models.find(m => m.id === field.modelId)?.name || field.modelId}</td>
                            <td>{field.prompt}</td>
                            <td>{field.description}</td>
                            <td>
                                <button onClick={() => handleEdit(field)}>Sửa</button>
                                <button onClick={() => handleDelete(field.id)} style={{ marginLeft: 8 }}>Xóa</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}