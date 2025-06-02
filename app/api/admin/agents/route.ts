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

// Get all agents (fields with AI model and files)
export async function GET() {
  try {
    const agents = await db.field.findMany({
      include: {
        model: true,
        files: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// Create a new agent
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const dataStr = formData.get("data") as string;

    if (!dataStr) {
      return NextResponse.json(
        { error: "No agent data provided" },
        { status: 400 }
      );
    }

    const agentData = JSON.parse(dataStr);
    const { name, description, modelId, prompt, isActive } = agentData;

    if (!name || !modelId) {
      return NextResponse.json(
        { error: "Name and model are required" },
        { status: 400 }
      );
    }

    // Create the agent (field)
    const agent = await db.field.create({
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

    // Handle file uploads if any
    const files = formData.getAll("files") as File[];

    if (files && files.length > 0) {
      // Get model name for folder creation
      const model = await db.model.findUnique({
        where: { id: modelId }
      });
      
      if (!model) {
        return NextResponse.json(
          { error: "Model not found" },
          { status: 400 }
        );
      }

      const nameFolder = name;
      // Normalize the model name for folder creation
      const normalizedFolderName = normalizeFolderName(nameFolder);
      
      // Create directory structure: uploads/file/[normalizedModelName]
      const uploadDir = path.join(process.cwd(), "public", "uploads", "file", normalizedFolderName);
      
      // Create directory if it doesn't exist
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
      } catch (err) {
        console.error("Failed to create upload directory:", err);
        return NextResponse.json(
          { error: "Failed to create upload directory" },
          { status: 500 }
        );
      }

      // Process and save files
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name;
        const filePath = path.join(uploadDir, fileName);
        
        // Write file to disk
        fs.writeFileSync(filePath, buffer);
        
        // Create relative URL for database - use normalized folder name here too
        const fileUrl = `/uploads/file/${normalizedFolderName}/${fileName}`;

        await db.file.create({
          data: {
            name: fileName,
            url: fileUrl,
            fieldId: agent.id,
          },
        });
      }

      // Fetch the complete agent with files
      const updatedAgent = await db.field.findUnique({
        where: { id: agent.id },
        include: {
          model: true,
          files: true,
        },
      });

      return NextResponse.json(updatedAgent);
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}