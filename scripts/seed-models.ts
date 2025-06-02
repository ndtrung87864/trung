import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedModels = async () => {
  try {
    console.log('Seeding default AI models...');
    
    const defaultModels = [
      { name: 'Gemini 2.0 Flash', isActive: true },
      { name: 'Gemini 1.5 Pro', isActive: true },
      { name: 'Gemini 1.5 Flash', isActive: true },
    ];
    
    // Create the models
    for (const model of defaultModels) {
      const exists = await prisma.model.findFirst({
        where: { name: model.name }
      });
      
      if (!exists) {
        await prisma.model.create({
          data: model
        });
        console.log(`Created model: ${model.name}`);
      } else {
        console.log(`Model already exists: ${model.name}`);
      }
    }
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding models:', error);
  } finally {
    await prisma.$disconnect();
  }
};

seedModels();
