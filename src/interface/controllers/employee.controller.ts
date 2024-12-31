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
import { EmployeeService } from '../../application/services/employee.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from '../../application/dtos/employee';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('employees')
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo empleado',
    description: `Registra un nuevo empleado en el sistema.
    - Valida que el email sea único
    - Hashea la contraseña automáticamente
    - Verifica si es el creador del proveedor
    - Solo puede haber un creador por proveedor`
  })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiResponse({
    status: 201,
    description: 'El empleado ha sido creado exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Juan Pérez',
        email: 'juan@empresa.com',
        is_creator: true,
        supplier: {
          id: '987fcdeb-51a2-43f7-9abc-def012345678',
          name: 'Empresa ABC'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: `Datos de entrada inválidos. Posibles errores:
    - Email ya registrado
    - Contraseña muy corta
    - Proveedor no existe
    - Ya existe un creador para el proveedor`
  })
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.create(createEmployeeDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los empleados',
    description: `Retorna la lista completa de empleados.
    - Incluye información del proveedor
    - No incluye contraseñas
    - Muestra si es creador del proveedor`
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los empleados con sus relaciones.',
    schema: {
      type: 'array',
      items: {
        example: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Juan Pérez',
          email: 'juan@empresa.com',
          is_creator: true,
          supplier: {
            id: '987fcdeb-51a2-43f7-9abc-def012345678',
            name: 'Empresa ABC'
          }
        }
      }
    }
  })
  findAll() {
    return this.employeeService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener un empleado por ID',
    description: `Busca y retorna un empleado específico por su ID.
    - Incluye información del proveedor
    - No incluye contraseña
    - Muestra si es creador del proveedor`
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del empleado',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 200,
    description: 'El empleado ha sido encontrado.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Juan Pérez',
        email: 'juan@empresa.com',
        is_creator: true,
        supplier: {
          id: '987fcdeb-51a2-43f7-9abc-def012345678',
          name: 'Empresa ABC'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'ID con formato inválido.' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado en el sistema.' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.employeeService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar un empleado',
    description: `Actualiza los datos de un empleado existente.
    - Permite actualizar datos básicos
    - Permite cambiar la contraseña
    - Valida email único si se actualiza
    - No permite modificar creador si ya existe uno`
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del empleado a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiResponse({
    status: 200,
    description: 'El empleado ha sido actualizado exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Juan Pérez Actualizado',
        email: 'juan.nuevo@empresa.com',
        is_creator: true,
        supplier: {
          id: '987fcdeb-51a2-43f7-9abc-def012345678',
          name: 'Empresa ABC'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: `Datos de entrada inválidos. Posibles errores:
    - Email ya registrado
    - Contraseña muy corta
    - Proveedor no existe
    - Conflicto con creador existente`
  })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado en el sistema.' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un empleado',
    description: `Elimina un empleado del sistema.
    - No permite eliminar al creador del proveedor
    - La eliminación es permanente
    - No afecta al proveedor asociado`
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del empleado a eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ status: 204, description: 'El empleado ha sido eliminado exitosamente.' })
  @ApiResponse({
    status: 400,
    description: `Operación inválida. Posibles errores:
    - ID con formato inválido
    - Intento de eliminar al creador`
  })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado en el sistema.' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.employeeService.remove(id);
  }
}

