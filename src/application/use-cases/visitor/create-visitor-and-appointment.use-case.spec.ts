import { Test, TestingModule } from '@nestjs/testing';
import { CreateVisitorAndAppointmentUseCase } from './create-visitor-and-appointment.use-case';
import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
import { IAppointmentRepository } from '../../../../domain/repositories/appointment.repository.interface';
import { ISupplierRepository } from '../../../../domain/repositories/supplier.repository.interface';
import { EmailService } from '../../../services/email.service';
import { CardService } from '../../../services/card.service';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';
import { CreateVisitorDto } from '../../../dtos/visitor/create-visitor.dto';
import { Visitor, Appointment, Supplier } from '../../../../domain/entities';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock Repositories and Services
const mockVisitorRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findById: jest.fn(),
};
const mockAppointmentRepository = {
  create: jest.fn(),
  save: jest.fn(),
};
const mockSupplierRepository = {
  findById: jest.fn(),
};
const mockEmailService = {
  sendVisitorWelcomeEmail: jest.fn(),
};
const mockCardService = {
  findAvailableCards: jest.fn(),
  assignToVisitor: jest.fn(),
};
const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('CreateVisitorAndAppointmentUseCase', () => {
  let useCase: CreateVisitorAndAppointmentUseCase;

  beforeEach(async () => {
    // Reset all mocks
    Object.values(mockVisitorRepository).forEach(mockFn => mockFn.mockReset());
    Object.values(mockAppointmentRepository).forEach(mockFn => mockFn.mockReset());
    Object.values(mockSupplierRepository).forEach(mockFn => mockFn.mockReset());
    Object.values(mockEmailService).forEach(mockFn => mockFn.mockReset());
    Object.values(mockCardService).forEach(mockFn => mockFn.mockReset());
    Object.values(mockLoggerService).forEach(mockFn => mockFn.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateVisitorAndAppointmentUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: IAppointmentRepository, useValue: mockAppointmentRepository },
        { provide: ISupplierRepository, useValue: mockSupplierRepository },
        { provide: EmailService, useValue: mockEmailService },
        { provide: CardService, useValue: mockCardService },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<CreateVisitorAndAppointmentUseCase>(CreateVisitorAndAppointmentUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  // TODO: Add more tests for success path, supplier not found, date validation,
  // email failure, card assignment failure/no cards scenarios.
  // Example:
  // it('should throw BadRequestException if supplier not found', async () => {
  //   mockSupplierRepository.findById.mockResolvedValue(null);
  //   const dto = { /* minimal DTO */ } as CreateVisitorDto;
  //   await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
  // });
});
