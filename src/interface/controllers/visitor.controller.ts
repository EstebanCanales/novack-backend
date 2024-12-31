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
} from '@nestjs/swagger';

@ApiTags('visitors')
@Controller('visitors')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo visitante',
    description: `Registra un nuevo visitante en el sistema.
        - Si hay tarjetas disponibles, se le asignará una automáticamente
        - Si no hay tarjetas disponibles, quedará en lista de espera
        - Se validará la existencia del proveedor
        - Se validarán los formatos de fecha`,
  })
  @ApiBody({ type: CreateVisitorDto })
  @ApiResponse({
    status: 201,
    description: 'El visitante ha sido creado exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Juan Pérez',
        email: 'juan@empresa.com',
        state: 'in_progress',
        // ... otros campos
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: `Datos de entrada inválidos. Posibles errores:
        - Formato de email inválido
        - Teléfono no tiene 9 dígitos
        - Fechas inválidas
        - Proveedor no existe
        - Proveedor sin suscripción activa`,
  })
  create(@Body() createVisitorDto: CreateVisitorDto) {
    return this.visitorService.create(createVisitorDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los visitantes',
    description: `Retorna la lista completa de visitantes.
        - Incluye visitantes activos e históricos
        - Incluye información del proveedor asociado
        - Incluye información de tarjetas asignadas`,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los visitantes con sus relaciones.',
    schema: {
      type: 'array',
      items: {
        example: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Juan Pérez',
          state: 'in_progress',
          supplier: {
            id: '987fcdeb-51a2-43f7-9abc-def012345678',
            name: 'Empresa ABC',
          },
          cards: [
            {
              id: 'abc12345-e89b-12d3-a456-426614174000',
              is_active: true,
            },
          ],
        },
      },
    },
  })
  findAll() {
    return this.visitorService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener un visitante por ID',
    description: `Busca y retorna un visitante específico por su ID.
        - Incluye información detallada del visitante
        - Incluye información del proveedor
        - Incluye historial de tarjetas asignadas`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del visitante',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'El visitante ha sido encontrado.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Juan Pérez',
        // ... otros campos
      },
    },
  })
  @ApiResponse({ status: 400, description: 'ID con formato inválido.' })
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
}

