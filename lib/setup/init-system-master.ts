import { SystemAssistantService } from "@/lib/services/system-assistant.service";

export async function initializeSystemMaster() {
  try {
    // Check if System Master already exists
    const existing = await SystemAssistantService.getSystemMaster();
    
    if (!existing) {
      const systemMaster = await SystemAssistantService.createSystemMaster();
      console.log("✓ System Master assistant created successfully");
      
      // Log initialization
      await SystemAssistantService.createLog(
        systemMaster.id,
        'INFO',
        'SYSTEM_MASTER_INITIALIZED',
        {
          message: 'System Master assistant has been initialized',
          timestamp: new Date().toISOString()
        }
      );
      
      return systemMaster;
    } else {
      console.log("✓ System Master assistant already exists");
      return existing;
    }
  } catch (error) {
    console.error("✗ Failed to initialize System Master:", error);
    throw error;
  }
}

// Run this function when your app starts
if (require.main === module) {
  initializeSystemMaster()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}