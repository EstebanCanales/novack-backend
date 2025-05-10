import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { VisitorService } from '../../application/services/visitor.service';
import {
  CreateVisitorDto,
  UpdateVisitorDto,
} from '../../application/dtos/visitor';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileStorageService } from '../../application/services/file-storage.service';
import { ImageProcessingPipe } from '../../application/pipes/image-processing.pipe';
import { Express } from 'express';

@ApiTags('visitors')
@Controller('visitors')
export class VisitorController {
  constructor(
    private readonly visitorService: VisitorService,
    private readonly fileStorageService: FileStorageService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo visitante' })
  @ApiBody({ type: CreateVisitorDto })
  @ApiResponse({
    status: 201,
    description: 'El visitante ha sido creado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: `Datos de entrada inválidos.`,
  })
  create(@Body() createVisitorDto: CreateVisitorDto) {
    return this.visitorService.create(createVisitorDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los visitantes',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los visitantes con sus relaciones.',
  })
  findAll() {
    return this.visitorService.findAll();
  }

  @Get('by-supplier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener historial de visitas por proveedor',
    description: `Obtiene todas las visitas asociadas a un proveedor específico.
        - Incluye visitas completadas y en progreso
        - Ordenadas por fecha de check-in
        - Incluye detalles del visitante y tarjeta asignada`,
  })
  @ApiQuery({
    name: 'supplier_id',
    description: 'ID UUID del proveedor',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de visitas del proveedor.',
  })
  @ApiResponse({
    status: 400,
    description: 'ID de proveedor con formato inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado en el sistema.',
  })
  findBySupplier(@Query('supplier_id', new ParseUUIDPipe({ version: '4' })) supplier_id: string) {
    return this.visitorService.findBySupplier(supplier_id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener un visitante por ID' })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del visitante',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'El visitante ha sido encontrado.',
  })
  @ApiResponse({
    status: 400,
    description: 'ID con formato inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado en el sistema.',
  })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.visitorService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar un visitante',
    description: `Actualiza los datos de un visitante existente.
        - Permite actualizar datos básicos
        - Permite actualizar ubicación
        - Permite actualizar quejas
        - No permite modificar asignación de tarjetas`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del visitante a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateVisitorDto })
  @ApiResponse({
    status: 200,
    description: 'El visitante ha sido actualizado exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Juan Pérez Actualizado',
        // ... otros campos actualizados
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos o ID con formato incorrecto.',
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado en el sistema.',
  })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateVisitorDto: UpdateVisitorDto,
  ) {
    return this.visitorService.update(id, updateVisitorDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un visitante',
    description: `Elimina un visitante del sistema.
        - Libera cualquier tarjeta asignada
        - Elimina el registro completamente
        - No se puede deshacer esta operación`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del visitante a eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'El visitante ha sido eliminado exitosamente.',
  })
  @ApiResponse({ status: 400, description: 'ID con formato inválido.' })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado en el sistema.',
  })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.visitorService.remove(id);
  }

  @Post(':id/check-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Realizar check-out de un visitante',
    description: `Registra la salida de un visitante.
        - Establece la hora de salida
        - Libera la tarjeta asignada
        - Actualiza el estado a 'completed'
        - Si hay visitantes en espera, asigna la tarjeta liberada`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del visitante',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Check-out realizado exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        state: 'completed',
        check_out_time: '2024-12-30T11:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: `Operación inválida. Posibles errores:
        - Visitante ya realizó check-out
        - Visitante no tiene tarjeta asignada
        - ID con formato inválido`,
  })
  @ApiResponse({
    status: 404,
    description: 'Visitante no encontrado en el sistema.',
  })
  checkOut(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.visitorService.checkOut(id);
  }

  @Patch(':id/profile-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('profileImage'))
  @ApiOperation({ summary: 'Subir o actualizar imagen de perfil del visitante' })
  @ApiParam({ name: 'id', description: 'ID UUID del visitante', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo de imagen de perfil (JPG, PNG, WEBP)',
    schema: {
      type: 'object',
      properties: {
        profileImage: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Imagen de perfil actualizada.' })
  @ApiResponse({ status: 400, description: 'Archivo inválido, tipo no permitido o error de procesamiento.' })
  @ApiResponse({ status: 404, description: 'Visitante no encontrado.' })
  async uploadProfileImage(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile(ImageProcessingPipe)
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo.');
    }

    const bucketName = this.configService.get<string>('AWS_S3_VISITOR_BUCKET_NAME');
    if (!bucketName) {
      throw new Error('Nombre del bucket S3 para visitantes no configurado (AWS_S3_VISITOR_BUCKET_NAME).');
    }

    const destinationPath = `profile/`;
    const imageUrl = await this.fileStorageService.uploadFile(
      bucketName,
      file.buffer,
      file.originalname,
      file.mimetype,
      destinationPath,
    );

    await this.visitorService.updateProfileImageUrl(id, imageUrl);

    return { message: 'Imagen de perfil actualizada correctamente.', url: imageUrl };
  }
}
