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
} from '@nestjs/common';
import { CardService } from '../../application/services/card.service';
import { CreateCardDto, UpdateCardDto } from '../../application/dtos/card';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('cards')
@Controller('cards')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una nueva tarjeta',
    description: `Registra una nueva tarjeta en el sistema.
    - La tarjeta se crea con estado activo por defecto
    - Se valida la existencia del proveedor
    - Se verifica que el proveedor tenga suscripción de tarjetas activa
    - Se asigna automáticamente a un visitante en espera si existe`,
  })
  @ApiBody({ type: CreateCardDto })
  @ApiResponse({
    status: 201,
    description: 'La tarjeta ha sido creada exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        is_active: true,
        supplier: {
          id: '987fcdeb-51a2-43f7-9abc-def012345678',
          name: 'Empresa ABC',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: `Datos de entrada inválidos. Posibles errores:
    - Proveedor no existe
    - Proveedor sin suscripción de tarjetas activa
    - Formato de datos inválido`,
  })
  create(@Body() createCardDto: CreateCardDto) {
    return this.cardService.create(createCardDto);
  }

  @Post('assign/:visitor_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Asignar una tarjeta a un visitante' })
  @ApiParam({ name: 'visitor_id', description: 'ID del visitante' })
  @ApiResponse({
    status: 200,
    description: 'La tarjeta ha sido asignada exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido o no hay tarjetas disponibles.',
  })
  @ApiResponse({ status: 404, description: 'Visitante no encontrado.' })
  assignToVisitor(
    @Param('visitor_id', new ParseUUIDPipe({ version: '4' }))
    visitor_id: string,
  ) {
    return this.cardService.assignCardToVisitor(visitor_id);
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liberar una tarjeta' })
  @ApiParam({ name: 'id', description: 'ID de la tarjeta' })
  @ApiResponse({
    status: 200,
    description: 'La tarjeta ha sido liberada exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'ID inválido o la tarjeta no está asignada.',
  })
  @ApiResponse({ status: 404, description: 'Tarjeta no encontrada.' })
  releaseCard(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.cardService.releaseCard(id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todas las tarjetas',
    description: `Retorna la lista completa de tarjetas.
    - Incluye tarjetas activas e inactivas
    - Incluye información del proveedor asociado
    - Incluye información del visitante actual si está asignada`,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las tarjetas con sus relaciones.',
    schema: {
      type: 'array',
      items: {
        example: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          is_active: true,
          supplier: {
            id: '987fcdeb-51a2-43f7-9abc-def012345678',
            name: 'Empresa ABC',
          },
          visitor: {
            id: 'abc12345-e89b-12d3-a456-426614174000',
            name: 'Juan Pérez',
          },
        },
      },
    },
  })
  findAll() {
    return this.cardService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener una tarjeta por ID',
    description: `Busca y retorna una tarjeta específica por su ID.
    - Incluye información detallada de la tarjeta
    - Incluye información del proveedor
    - Incluye historial de visitantes asignados`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID de la tarjeta',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'La tarjeta ha sido encontrada.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        is_active: true,
        // ... otros campos
      },
    },
  })
  @ApiResponse({ status: 400, description: 'ID con formato inválido.' })
  @ApiResponse({
    status: 404,
    description: 'Tarjeta no encontrada en el sistema.',
  })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.cardService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar una tarjeta',
    description: `Actualiza los datos de una tarjeta existente.
    - Permite activar/desactivar la tarjeta
    - No permite modificar el proveedor asociado
    - No permite modificar asignaciones de visitantes directamente`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID de la tarjeta a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateCardDto })
  @ApiResponse({
    status: 200,
    description: 'La tarjeta ha sido actualizada exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        is_active: false,
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
    description: 'Tarjeta no encontrada en el sistema.',
  })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateCardDto: UpdateCardDto,
  ) {
    return this.cardService.update(id, updateCardDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar una tarjeta',
    description: `Elimina una tarjeta del sistema.
    - Solo se pueden eliminar tarjetas sin visitante asignado
    - La eliminación es permanente
    - Se actualiza el contador de tarjetas del proveedor`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID de la tarjeta a eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'La tarjeta ha sido eliminada exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: `Operación inválida. Posibles errores:
    - ID con formato inválido
    - Tarjeta tiene visitante asignado`,
  })
  @ApiResponse({
    status: 404,
    description: 'Tarjeta no encontrada en el sistema.',
  })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.cardService.remove(id);
  }
}
