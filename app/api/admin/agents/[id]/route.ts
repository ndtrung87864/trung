import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

// Function to normalize Vietnamese text to folder-friendly format
function normalizeFolderName(name: string): string {
  // Remove diacritical marks (accents)
  const normalized = name.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove combining diacritical marks
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')  // Replace Vietnamese 'đ/Đ'
    .toLowerCase()  // Convert to lowercase
    .replace(/\s+/g, '_');  // Replace spaces with underscores

  return normalized;
}

// Get a specific agent
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = await db.field.findUnique({
      where: {
        id: id
      },
      include: {
        model: true,
        files: true,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Failed to fetch agent:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

// Update an agent
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const formData = await req.formData();
    const dataStr = formData.get("data") as string;
    const { id } = await params;

    if (!dataStr) {
      return NextResponse.json(
        { error: "No agent data provided" },
        { status: 400 }
      );
    }

    const agentData = JSON.parse(dataStr);
    const { name, description, modelId, prompt, isActive, keepFiles } = agentData;

    // Get existing agent to check for name changes
    const existingAgent = await db.field.findUnique({
      where: { id: id },
      include: { files: true }
    });

    if (!existingAgent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Update the agent
    const agent = await db.field.update({
      where: { id: id },
      data: {
        name,
        description,
        modelId,
        prompt,
        isActive,
      },
      include: {
        model: true,
      },
    });

    // Check if name changed to update folder structure
    const nameChanged = existingAgent.name !== name;

    // Normalize folder names
    const oldNormalizedFolderName = normalizeFolderName(existingAgent.name);
    const newNormalizedFolderName = normalizeFolderName(name);

    // Old and new folder paths
    const oldUploadDir = path.join(process.cwd(), "public", "uploads", "file", oldNormalizedFolderName);
    const newUploadDir = path.join(process.cwd(), "public", "uploads", "file", newNormalizedFolderName);

    // FIXED: Only handle file deletion if keepFiles is explicitly provided
    // This ensures we don't accidentally delete files when just adding new ones
    if (keepFiles !== undefined) {
      const filesToKeep = keepFiles || [];

      // Delete files that are no longer needed
      if (existingAgent.files) {
        for (const file of existingAgent.files) {
          // If the file is not in the keepFiles array, delete it
          if (!filesToKeep.includes(file.id)) {
            // Get file path from the URL
            const filePath = path.join(process.cwd(), "public", file.url);

            // Delete the file from disk if it exists
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }

            // Delete from database
            await db.file.delete({
              where: { id: file.id }
            });
          }
        }
      }
    }

    // If the name changed, we need to update file paths and move files
    if (nameChanged && existingAgent.files && existingAgent.files.length > 0) {
      // Create the new directory if it doesn't exist
      if (!fs.existsSync(newUploadDir)) {
        fs.mkdirSync(newUploadDir, { recursive: true });
      }

      // Update file paths in the database and move files
      for (const file of existingAgent.files) {
        // Extract filename from URL
        const fileName = path.basename(file.url);
        const oldFilePath = path.join(process.cwd(), "public", file.url);
        const newFilePath = path.join(newUploadDir, fileName);
        const newFileUrl = `/uploads/file/${newNormalizedFolderName}/${fileName}`;

        // Move the file if it exists
        if (fs.existsSync(oldFilePath)) {
          fs.renameSync(oldFilePath, newFilePath);
        }

        // Update the file record with the new URL
        await db.file.update({
          where: { id: file.id },
          data: { url: newFileUrl }
        });
      }

      // Remove the old directory if it exists and is empty
      if (fs.existsSync(oldUploadDir) && fs.readdirSync(oldUploadDir).length === 0) {
        fs.rmdirSync(oldUploadDir);
      }
    }

    // Handle new file uploads if any
    const files = formData.getAll("files") as File[];

    if (files && files.length > 0 && files[0].size > 0) {
      // Create directory if it doesn't exist
      if (!fs.existsSync(newUploadDir)) {
        fs.mkdirSync(newUploadDir, { recursive: true });
      }

      // Process and save files
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name;
        const filePath = path.join(newUploadDir, fileName);

        // Write file to disk
        fs.writeFileSync(filePath, buffer);

        // Create relative URL for database
        const fileUrl = `/uploads/file/${newNormalizedFolderName}/${fileName}`;

        await db.file.create({
          data: {
            name: fileName,
            url: fileUrl,
            fieldId: agent.id,
          },
        });
      }
    }

    // Fetch the updated agent with all files
    const updatedAgent = await db.field.findUnique({
      where: { id: agent.id },
      include: {
        model: true,
        files: true,
      },
    });

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error("Failed to update agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}

// Delete an agent
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await params;
    // Check if agent exists
    const agent = await db.field.findUnique({
      where: { id: id },
      include: { files: true },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Delete associated files from disk
    if (agent.files && agent.files.length > 0) {
      // Get the folder name from the agent name
      const normalizedFolderName = normalizeFolderName(agent.name);
      const uploadDir = path.join(process.cwd(), "public", "uploads", "file", normalizedFolderName);

      // Delete each file from disk
      for (const file of agent.files) {
        const filePath = path.join(process.cwd(), "public", file.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Delete the directory if it exists and is empty
      if (fs.existsSync(uploadDir)) {
        const remainingFiles = fs.readdirSync(uploadDir);
        if (remainingFiles.length === 0) {
          fs.rmdirSync(uploadDir);
        }
      }
    }

    // Delete the agent (this will cascade delete file records due to foreign key constraints)
    await db.field.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}
