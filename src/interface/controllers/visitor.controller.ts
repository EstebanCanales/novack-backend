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
}
