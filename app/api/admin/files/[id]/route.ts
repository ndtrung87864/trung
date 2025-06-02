import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from 'fs';
import path from 'path';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const file = await db.file.findUnique({
      where: { id: id },
    });
    
    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
    
    // In a real application, you would likely serve files from cloud storage
    // For this example, we'll assume files are stored locally
    const filePath = path.join(process.cwd(), 'public', file.url);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found on server" },
        { status: 404 }
      );
    }
    
    const fileContent = fs.readFileSync(filePath);
    
    // Determine content type from file extension
    const ext = path.extname(file.name).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.txt') contentType = 'text/plain';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    
    return new Response(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${file.name}"`,
      },
    });
  } catch (error) {
    console.error("Failed to fetch file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}