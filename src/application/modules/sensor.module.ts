import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorService } from '../services/sensor.service';
import { SensorController } from '../../interface/controllers/sensor.controller';
import { Sensor } from 'src/domain/entities';

@Module({
    imports: [TypeOrmModule.forFeature([Sensor])],
    controllers: [SensorController],
    providers: [SensorService],
    exports: [SensorService],
})
export class SensorModule {} 