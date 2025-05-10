import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
  Param,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CardSchedulerService } from '../../application/services/card-scheduler.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../../domain/entities';

interface ESP32LocationData {
  card_number: string;
  company_id: string; // Identificador de la empresa
  latitude: number;
  longitude: number;
  accuracy?: number;
  auth_key: string;
  battery_level?: number;
  signal_strength?: number;
  in_use?: boolean;
}

@ApiTags('esp32')
@Controller('esp32')
export class ESP32Controller {
  private readonly logger = new Logger(ESP32Controller.name);

  constructor(
    private readonly cardSchedulerService: CardSchedulerService,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  @Post('report-location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recibir y procesar ubicación de tarjeta ESP32' })
  @ApiResponse({ status: 200, description: 'Ubicación procesada correctamente' })
  @ApiResponse({ status: 400, description: 'Datos de petición inválidos' })
  async reportLocation(@Body() data: ESP32LocationData) {
    try {
      this.logger.log(`Recibido reporte de ubicación para tarjeta: ${data.card_number} - Empresa: ${data.company_id || 'No especificada'}`);
      
      // Verificación básica para asegurar que solo dispositivos autorizados envíen datos
      if (data.auth_key !== process.env.ESP32_AUTH_KEY) {
        throw new BadRequestException('Clave de autenticación inválida');
      }

      // Validar datos requeridos
      if (!data.card_number || !data.latitude || !data.longitude) {
        throw new BadRequestException('Datos incompletos: se requiere card_number, latitude y longitude');
      }

      // Validar que se incluya el ID de empresa
      if (!data.company_id) {
        throw new BadRequestException('Se requiere el identificador de empresa (company_id)');
      }

      // Validar formato de coordenadas
      if (data.latitude < -90 || data.latitude > 90 || data.longitude < -180 || data.longitude > 180) {
        throw new BadRequestException('Coordenadas inválidas');
      }

      // Registrar información adicional
      if (data.battery_level !== undefined) {
        this.logger.log(`Nivel de batería de tarjeta ${data.card_number}: ${data.battery_level}%`);
      }
      
      if (data.signal_strength !== undefined) {
        this.logger.log(`Intensidad de señal de tarjeta ${data.card_number}: ${data.signal_strength}dBm`);
      }

      if (data.in_use !== undefined) {
        this.logger.log(`Tarjeta ${data.card_number} en uso: ${data.in_use ? 'Sí' : 'No'}`);
      }

      // Procesar la ubicación incluyendo el ID de empresa
      return this.cardSchedulerService.receiveCardLocation(
        data.card_number,
        data.latitude,
        data.longitude,
        data.accuracy || 0,
        data.company_id,
        data.battery_level,
        data.signal_strength,
        data.in_use
      );
    } catch (error) {
      this.logger.error(`Error al procesar ubicación ESP32: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  @Post('supplier/:supplierId/report-location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recibir y procesar ubicación de tarjeta ESP32 para un proveedor específico' })
  @ApiParam({ name: 'supplierId', description: 'ID del proveedor/empresa' })
  @ApiResponse({ status: 200, description: 'Ubicación procesada correctamente' })
  @ApiResponse({ status: 400, description: 'Datos de petición inválidos' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async reportLocationBySupplier(
    @Param('supplierId') supplierId: string,
    @Body() data: Omit<ESP32LocationData, 'company_id'>
  ) {
    try {
      this.logger.log(`Recibido reporte de ubicación para tarjeta: ${data.card_number} del proveedor ID: ${supplierId}`);
      
      // Verificar que el proveedor exista
      const supplier = await this.supplierRepository.findOne({
        where: { id: supplierId }
      });
      
      if (!supplier) {
        throw new BadRequestException(`No se encontró el proveedor con ID: ${supplierId}`);
      }
      
      // Verificación básica para asegurar que solo dispositivos autorizados envíen datos
      if (data.auth_key !== process.env.ESP32_AUTH_KEY) {
        throw new BadRequestException('Clave de autenticación inválida');
      }

      // Validar datos requeridos
      if (!data.card_number || !data.latitude || !data.longitude) {
        throw new BadRequestException('Datos incompletos: se requiere card_number, latitude y longitude');
      }

      // Validar formato de coordenadas
      if (data.latitude < -90 || data.latitude > 90 || data.longitude < -180 || data.longitude > 180) {
        throw new BadRequestException('Coordenadas inválidas');
      }

      // Registrar información adicional
      if (data.battery_level !== undefined) {
        this.logger.log(`Nivel de batería de tarjeta ${data.card_number}: ${data.battery_level}%`);
      }
      
      if (data.signal_strength !== undefined) {
        this.logger.log(`Intensidad de señal de tarjeta ${data.card_number}: ${data.signal_strength}dBm`);
      }

      if (data.in_use !== undefined) {
        this.logger.log(`Tarjeta ${data.card_number} en uso: ${data.in_use ? 'Sí' : 'No'}`);
      }

      // Procesar la ubicación incluyendo el ID de empresa
      return this.cardSchedulerService.receiveCardLocation(
        data.card_number,
        data.latitude,
        data.longitude,
        data.accuracy || 0,
        supplierId,
        data.battery_level,
        data.signal_strength,
        data.in_use
      );
    } catch (error) {
      this.logger.error(`Error al procesar ubicación ESP32 para proveedor ${supplierId}: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  @Get('supplier/:supplierId/cards')
  @ApiOperation({ summary: 'Obtener tarjetas asociadas a un proveedor específico' })
  @ApiParam({ name: 'supplierId', description: 'ID del proveedor/empresa' })
  @ApiResponse({ status: 200, description: 'Lista de tarjetas del proveedor' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async getSupplierCards(@Param('supplierId') supplierId: string) {
    try {
      const supplier = await this.supplierRepository.findOne({
        where: { id: supplierId },
        relations: ['cards'],
      });
      
      if (!supplier) {
        throw new BadRequestException(`No se encontró el proveedor con ID: ${supplierId}`);
      }
      
      return {
        success: true,
        supplier_id: supplierId,
        supplier_name: supplier.supplier_name,
        cards: supplier.cards || []
      };
    } catch (error) {
      this.logger.error(`Error al obtener tarjetas del proveedor ${supplierId}: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }
} 