import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorService } from '../services/visitor.service';
import { VisitorController } from '../../interface/controllers/visitor.controller';
import { Visitor, Supplier, Appointment } from 'src/domain/entities';
import { EmailService } from '../services/email.service';
import { CardModule } from './card.module';
import { FileStorageService } from '../services/file-storage.service';
import { ImageProcessingPipe } from '../pipes/image-processing.pipe';

@Module({
    imports: [
        TypeOrmModule.forFeature([Visitor, Supplier, Appointment]),
        CardModule,
    ],
    controllers: [VisitorController],
    providers: [
        VisitorService,
        EmailService,
        FileStorageService,
        ImageProcessingPipe,
    ],
    exports: [VisitorService],
})
export class VisitorModule {} 