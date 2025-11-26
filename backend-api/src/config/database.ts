// file: src/config/database.ts
import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGO_URI || '';
    if (!uri) {
      throw new Error("MONGO_URI no está definida en .env");
    }

    // Opciones para asegurar compatibilidad y eventos
    await mongoose.connect(uri);
    
    console.log('✅ MongoDB Conectado exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1); // Detener la app si falla la DB
  }
};