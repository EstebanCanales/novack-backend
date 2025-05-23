import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorService } from '../services/visitor.service';
import { VisitorController } from '../../interface/controllers/visitor.controller';
import { Visitor, Supplier, Appointment } from 'src/domain/entities';
import { EmailService } from '../services/email.service';
import { CardModule } from './card.module';
import { FileStorageModule } from './file-storage.module';
import { ImageProcessingPipe } from '../pipes/image-processing.pipe';
import { TokenModule } from './token.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Visitor, Supplier, Appointment]),
        CardModule,
        TokenModule,
        FileStorageModule,
    ],
    controllers: [VisitorController],
    providers: [
        VisitorService,
        EmailService,
        ImageProcessingPipe,
    ],
    exports: [VisitorService],
})
export class VisitorModule {} 