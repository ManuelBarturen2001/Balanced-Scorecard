import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface FileUploadResult {
  success: boolean;
  fileName?: string;
  filePath?: string; // ✅ Esta será la ruta relativa correcta para la URL
  error?: string;
  size?: number;
}

// Función para crear directorio si no existe
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Función para generar nombre único de archivo
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, extension);
  return `${nameWithoutExt}_${timestamp}_${random}${extension}`;
}

// Función para validar tipo de archivo
export function isValidFileType(fileName: string): boolean {
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const extension = path.extname(fileName).toLowerCase();
  return allowedExtensions.includes(extension);
}

// Función para sanitizar nombre de usuario para uso como carpeta
export function sanitizeUserName(userName: string): string {
  return userName
    .replace(/[<>:"/\\|?*]/g, '') // Eliminar caracteres no válidos en nombres de carpeta
    .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
    .trim();
}

// Función principal para guardar archivo
export async function saveUploadedFile(
  file: File,
  userName: string,
  assignedIndicatorId: string,
  verificationMethodName: string
): Promise<FileUploadResult> {
  try {
    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `El archivo excede el tamaño máximo permitido de ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    // Validar tipo de archivo
    if (!isValidFileType(file.name)) {
      return {
        success: false,
        error: 'Tipo de archivo no permitido. Solo se permiten archivos PDF y DOC'
      };
    }

    // Crear estructura de carpetas
    const sanitizedUserName = sanitizeUserName(userName);
    const userDir = path.join(UPLOAD_DIR, sanitizedUserName);
    await ensureDirectoryExists(userDir);

    // Generar nombre único para el archivo
    const uniqueFileName = generateUniqueFileName(file.name);
    const filePath = path.join(userDir, uniqueFileName);

    // Convertir File a Buffer y guardar
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await fs.writeFile(filePath, buffer);

    // ✅ CORREGIR: Crear la ruta relativa correcta para la URL
    const relativePath = `${sanitizedUserName}/${uniqueFileName}`;

    console.log('File saved at:', filePath);
    console.log('Relative path for URL:', relativePath);

    return {
      success: true,
      fileName: uniqueFileName,
      filePath: relativePath, // ✅ Ruta relativa que coincide con cómo se guarda
      size: file.size
    };

  } catch (error) {
    console.error('Error saving file:', error);
    return {
      success: false,
      error: 'Error interno al guardar el archivo'
    };
  }
}

// Función para servir archivos
export async function getFileContent(filePath: string): Promise<Buffer | null> {
  try {
    // La filePath que llega ya es relativa desde el endpoint /api/files/[...path]
    // Solo necesitamos construir la ruta completa
    const fullPath = path.join(UPLOAD_DIR, filePath);
    console.log('Trying to read file from:', fullPath);
    
    return await fs.readFile(fullPath);
  } catch (error) {
    console.error('Error reading file:', error);
    console.error('Full path was:', path.join(UPLOAD_DIR, filePath));
    return null;
  }
}

// Función para verificar si un archivo existe
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(UPLOAD_DIR, filePath);
    console.log('Checking if file exists:', fullPath);
    
    await fs.access(fullPath);
    return true;
  } catch {
    console.log('File does not exist:', path.join(UPLOAD_DIR, filePath));
    return false;
  }
}