import { NextRequest, NextResponse } from 'next/server';
import { getFileContent, fileExists } from '@/lib/fileUtils';
import path from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    // ✅ Await params before using its properties (Next.js 15 requirement)
    const params = await context.params;
    
    // Reconstruir la ruta del archivo
    const filePath = params.path.join('/');
    
    console.log('Requested file path:', filePath);
    console.log('URL segments:', params.path);
    
    // Verificar que el archivo existe
    if (!(await fileExists(filePath))) {
      console.log('File not found:', filePath);
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    const fileContent = await getFileContent(filePath);
    if (!fileContent) {
      return NextResponse.json(
        { error: 'Error al leer el archivo' },
        { status: 500 }
      );
    }

    // Obtener la extensión del archivo para determinar el Content-Type
    const extension = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';

    switch (extension) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }

    const fileName = path.basename(filePath);

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}