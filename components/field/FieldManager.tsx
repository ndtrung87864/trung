import React, { useEffect, useState } from "react";

interface Model {
    id: string;
    name: string;
}

interface Field {
    id: string;
    name: string;
    description?: string;
    prompt?: string;
    modelId: string;
    model: Model;
}

const FieldManager: React.FC = () => {
    const [fields, setFields] = useState<Field[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [prompt, setPrompt] = useState("");
    const [modelId, setModelId] = useState("");
    const [editing, setEditing] = useState<Field | null>(null);

    // Lấy danh sách field và model
    const fetchFields = async () => {
        const res = await fetch("/api/field");
        const data = await res.json();
        setFields(data);
    };
    const fetchModels = async () => {
        const res = await fetch("/api/model");
        const data = await res.json();
        setModels(data);
    };

    useEffect(() => {
        fetchFields();
        fetchModels();
    }, []);

    // Thêm hoặc sửa field
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modelId) {
            alert("Bạn phải chọn model!");
            return;
        }
        if (editing) {
            await fetch("/api/field", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editing.id, name, description, prompt, modelId }),
            });
        } else {
            await fetch("/api/field", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, prompt, modelId }),
            });
        }
        setName("");
        setDescription("");
        setPrompt("");
        setModelId("");
        setEditing(null);
        fetchFields();
    };

    // Xóa field
    const handleDelete = async (id: string) => {
        if (!confirm("Bạn chắc chắn muốn xóa lĩnh vực này?")) return;
        await fetch("/api/field", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        fetchFields();
    };

    // Chọn để sửa
    const handleEdit = (field: Field) => {
        setEditing(field);
        setName(field.name);
        setDescription(field.description || "");
        setPrompt(field.prompt || "");
        setModelId(field.modelId);
    };

    return (
        <div className="max-w-xl mx-auto p-4">
            <h2 className="text-xl font-bold mb-4">Quản lý Lĩnh vực (Field)</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 mb-4">
                <input
                    className="border px-2 py-1 rounded"
                    placeholder="Tên lĩnh vực"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />
                <textarea
                    className="border px-2 py-1 rounded"
                    placeholder="Mô tả"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
                <textarea
                    className="border px-2 py-1 rounded"
                    placeholder="Prompt huấn luyện"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                />
                <select
                    className="border px-2 py-1 rounded"
                    value={modelId}
                    onChange={e => setModelId(e.target.value)}
                    required
                >
                    <option value="">-- Chọn model --</option>
                    {models.map(model => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <button className="bg-blue-600 text-white px-3 py-1 rounded" type="submit">
                        {editing ? "Cập nhật" : "Thêm mới"}
                    </button>
                    {editing && (
                        <button
                            className="bg-gray-400 text-white px-2 py-1 rounded"
                            type="button"
                            onClick={() => {
                                setEditing(null);
                                setName("");
                                setDescription("");
                                setPrompt("");
                                setModelId("");
                            }}
                        >
                            Hủy
                        </button>
                    )}
                </div>
            </form>
            <table className="w-full border">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border px-2 py-1">Tên</th>
                        <th className="border px-2 py-1">Model</th>
                        <th className="border px-2 py-1">Prompt</th>
                        <th className="border px-2 py-1">Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {fields.map(field => (
                        <tr key={field.id}>
                            <td className="border px-2 py-1">{field.name}</td>
                            <td className="border px-2 py-1">{field.model?.name}</td>
                            <td className="border px-2 py-1 max-w-[200px] truncate">{field.prompt}</td>
                            <td className="border px-2 py-1">
                                <button
                                    className="text-blue-600 mr-2"
                                    onClick={() => handleEdit(field)}
                                >
                                    Sửa
                                </button>
                                <button
                                    className="text-red-600"
                                    onClick={() => handleDelete(field.id)}
                                >
                                    Xóa
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default FieldManager;