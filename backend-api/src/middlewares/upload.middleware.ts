// file: src/middlewares/upload.middleware.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateId } from '../utils/idGenerator';

const uploadDir = 'uploads/';

// Asegurar que el directorio de descargas existe
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generar un nombre único para el archivo
        const uniqueSuffix = generateId('file');
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB límite
    },
    fileFilter: (req, file, cb) => {
        // Aceptar cualquier archivo por ahora, o filtrar por tipo si se prefiere
        cb(null, true);
    }
});
