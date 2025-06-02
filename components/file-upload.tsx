"use-client";

import { useState, useEffect } from "react";
import { FileIcon, X } from "lucide-react";
import Image from "next/image";
import { UploadDropzone } from "@/lib/uploadthing";

import "@uploadthing/react/styles.css";

interface FileUploadProps {
    onChange: (url?: string) => void;
    value: string;
    endpoint: "messageFile" | "serverImage" | "fileAgent";
}

export const FileUpload = ({
    onChange,
    value,
    endpoint
}: FileUploadProps) => {
    const [contentType, setContentType] = useState<string | null>(null);

    // sửa lỗi không đọc đươc định dạng file khi upload và nhận về
    useEffect(() => {
        const fetchContentType = async () => {
            if (value) {
                const response = await fetch(value, { method: "HEAD" });
                setContentType(response.headers.get("content-type"));
            }
        };
        fetchContentType();
    }, [value]);

    if (value && contentType?.startsWith("image/")) {
        return (
            <div className="relative h-20 w-20">
                <Image
                    fill
                    src={value}
                    alt="Upload"
                    className="rounded-full"
                />
                <button
                    onClick={() => onChange("")}
                    className="bg-rose-500 text-white p-1
                    rounded-full absolute top-0 right-0 shadow-sm"
                    type="button"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    if (value && contentType === "application/pdf") {
        return (
            <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10">
                <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400" />
                <a
                    href={value}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="ml-2 w-[380px] text-indigo-500 text-sm dark:text-indigo-400 hover:underline overflow-hidden whitespace-nowrap"
                >
                    {value}
                </a>
                <button
                    onClick={() => onChange("")}
                    className="bg-rose-500 text-white p-1
                    rounded-full absolute -top-2 -right-2 shadow-sm"
                    type="button"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <UploadDropzone
            endpoint={endpoint}
            onClientUploadComplete={(res) => {
                onChange(res?.[0].url);
            }}
            onUploadError={(error: Error) => {
                console.error(error);
            }}
        />
    );
}