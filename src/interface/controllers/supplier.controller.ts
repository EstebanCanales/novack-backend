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
import { SupplierService } from '../../application/services/supplier.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from '../../application/dtos/supplier';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('suppliers')
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo proveedor',
    description: `Registra un nuevo proveedor en el sistema.
    - Crea automáticamente el número de tarjetas especificado
    - Crea automáticamente el número de empleados especificado
    - Valida las suscripciones activas
    - Valida el formato de los datos de contacto`,
  })
  @ApiBody({ type: CreateSupplierDto })
  @ApiResponse({
    status: 201,
    description: 'El proveedor ha sido creado exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        supplier_name: 'Empresa ABC',
        employee_count: 5,
        card_count: 3,
        contact_email: 'contacto@empresa.com',
        phone_number: '123456789',
        address: 'Calle Principal 123',
        description: 'Empresa de tecnología',
        is_subscribed: true,
        has_card_subscription: true,
        has_sensor_subscription: false,
        employees: [
          {
            id: 'abc12345-e89b-12d3-a456-426614174000',
            name: 'Empleado 1',
          },
        ],
        cards: [
          {
            id: 'def67890-e89b-12d3-a456-426614174000',
            is_active: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: `Datos de entrada inválidos. Posibles errores:
    - Formato de email inválido
    - Teléfono no tiene 9 dígitos
    - Número de empleados o tarjetas negativo
    - Datos de suscripción inconsistentes`,
  })
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.supplierService.create(createSupplierDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los proveedores',
    description: `Retorna la lista completa de proveedores.
    - Incluye información de empleados
    - Incluye información de tarjetas
    - Incluye estado de suscripciones
    - Incluye visitantes activos`,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los proveedores con sus relaciones.',
    schema: {
      type: 'array',
      items: {
        example: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          supplier_name: 'Empresa ABC',
          employee_count: 5,
          card_count: 3,
          is_subscribed: true,
          employees: [
            {
              id: 'abc12345-e89b-12d3-a456-426614174000',
              name: 'Empleado 1',
            },
          ],
          cards: [
            {
              id: 'def67890-e89b-12d3-a456-426614174000',
              is_active: true,
            },
          ],
          visitors: [
            {
              id: 'ghi12345-e89b-12d3-a456-426614174000',
              name: 'Visitante 1',
              state: 'in_progress',
            },
          ],
        },
      },
    },
  })
  findAll() {
    return this.supplierService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener un proveedor por ID',
    description: `Busca y retorna un proveedor específico por su ID.
    - Incluye información detallada del proveedor
    - Incluye lista de empleados
    - Incluye lista de tarjetas y su estado
    - Incluye historial de visitantes`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del proveedor',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'El proveedor ha sido encontrado.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        supplier_name: 'Empresa ABC',
        // ... otros campos
      },
    },
  })
  @ApiResponse({ status: 400, description: 'ID con formato inválido.' })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado en el sistema.',
  })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.supplierService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar un proveedor',
    description: `Actualiza los datos de un proveedor existente.
    - Permite actualizar información de contacto
    - Permite modificar suscripciones
    - Permite ajustar cantidad de empleados y tarjetas
    - Actualiza automáticamente las relaciones`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del proveedor a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateSupplierDto })
  @ApiResponse({
    status: 200,
    description: 'El proveedor ha sido actualizado exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        supplier_name: 'Empresa ABC Actualizada',
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
    description: 'Proveedor no encontrado en el sistema.',
  })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.supplierService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un proveedor',
    description: `Elimina un proveedor del sistema.
    - Elimina todos los empleados asociados
    - Elimina todas las tarjetas asociadas
    - Solo permite eliminación si no hay visitantes activos
    - La eliminación es permanente`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del proveedor a eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'El proveedor ha sido eliminado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: `Operación inválida. Posibles errores:
    - ID con formato inválido
    - Proveedor tiene visitantes activos`,
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado en el sistema.',
  })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.supplierService.remove(id);
  }
}
