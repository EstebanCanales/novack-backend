import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ESP32Controller } from '../../interface/controllers/esp32.controller';
import { CardSchedulerModule } from './card-scheduler.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../../domain/entities';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CardSchedulerModule,
    TypeOrmModule.forFeature([Supplier]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'supersecret'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [ESP32Controller],
})
export class ESP32Module {} 