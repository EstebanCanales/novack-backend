import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config'; // Asumiendo que usas ConfigModule
import { randomUUID } from 'crypto';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly s3Client: S3Client;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    // --- Configuración de AWS S3 ---
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1'; // Ejemplo

    this.s3Client = new S3Client({
      region: this.region,
      // Credenciales (automáticas desde entorno/roles IAM)
    });
    this.logger.log(`Servicio de almacenamiento S3 inicializado para la región: ${this.region}`);
  }

  /**
   * Sube un archivo a un bucket específico de AWS S3.
   * @param bucketName Nombre del bucket S3 de destino.
   * @param fileBuffer Buffer del archivo.
   * @param originalName Nombre original del archivo (para obtener extensión).
   * @param mimeType Tipo MIME del archivo.
   * @param destinationPath Prefijo/carpeta dentro del bucket (ej. 'profile/'). Asegúrate de que termine con '/'.
   * @returns La URL pública o firmada del archivo subido.
   */
  async uploadFile(
    bucketName: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    destinationPath: string = '',
  ): Promise<string> {
    if (!bucketName) {
        throw new Error('El nombre del bucket no fue proporcionado para la subida.');
    }

    const fileExtension = originalName.split('.').pop() || '';
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;
    const s3Key = `${destinationPath}${uniqueFileName}`; // Clave completa en S3

    this.logger.log(`Subiendo archivo a S3 Bucket: ${bucketName}, Key: ${s3Key} (MIME: ${mimeType})`);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
      // ACL: 'public-read', // Considera política de bucket o URLs firmadas
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`Archivo subido correctamente a ${bucketName}/${s3Key}`);

      // Construir la URL pública. Ajusta si usas endpoints específicos.
      const url = `https://${bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
      return url;
    } catch (error) {
      this.logger.error(`Error al subir archivo a S3 (Bucket: ${bucketName}, Key: ${s3Key}):`, error);
      throw new Error('No se pudo subir el archivo al almacenamiento.');
    }
  }
} 