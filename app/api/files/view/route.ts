import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { currentProfile } from "@/lib/current-profile";

export async function GET(req: NextRequest) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return new NextResponse("File path is required", { status: 400 });
    }

    // Sanitize and validate the file path
    const sanitizedPath = filePath.replace(/^\/+/, ""); // Remove leading slashes
    const fullPath = path.join(process.cwd(), "public", sanitizedPath);

    // Security check: ensure the file is within the public directory
    const publicDir = path.join(process.cwd(), "public");
    const resolvedPath = path.resolve(fullPath);
    const resolvedPublicDir = path.resolve(publicDir);

    if (!resolvedPath.startsWith(resolvedPublicDir)) {
      return new NextResponse("Access denied", { status: 403 });
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Get file stats
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      return new NextResponse("Path is not a file", { status: 400 });
    }

    // Read the file
    const fileBuffer = fs.readFileSync(resolvedPath);

    // Determine content type
    const ext = path.extname(resolvedPath).toLowerCase();
    let contentType = "application/octet-stream";

    switch (ext) {
      case ".pdf":
        contentType = "application/pdf";
        break;
      case ".docx":
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case ".doc":
        contentType = "application/msword";
        break;
      case ".txt":
        contentType = "text/plain";
        break;
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
      default:
        contentType = "application/octet-stream";
    }

    // Return the file with appropriate headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stats.size.toString(),
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
        "Content-Disposition": `inline; filename="${path.basename(resolvedPath)}"`,
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}