import { Test, TestingModule } from '@nestjs/testing';
import { UpdateVisitorAndAppointmentUseCase } from './update-visitor-and-appointment.use-case';
import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
import { IAppointmentRepository } from '../../../../domain/repositories/appointment.repository.interface';
import { ISupplierRepository } from '../../../../domain/repositories/supplier.repository.interface';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';
import { UpdateVisitorDto } from '../../../dtos/visitor/update-visitor.dto';
import { Visitor, Appointment, Supplier } from '../../../../domain/entities';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mocks
const mockVisitorRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};
const mockAppointmentRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};
const mockSupplierRepository = {
  findById: jest.fn(),
};
const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('UpdateVisitorAndAppointmentUseCase', () => {
  let useCase: UpdateVisitorAndAppointmentUseCase;

  beforeEach(async () => {
    Object.values(mockVisitorRepository).forEach(mockFn => mockFn.mockReset());
    Object.values(mockAppointmentRepository).forEach(mockFn => mockFn.mockReset());
    Object.values(mockSupplierRepository).forEach(mockFn => mockFn.mockReset());
    Object.values(mockLoggerService).forEach(mockFn => mockFn.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateVisitorAndAppointmentUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: IAppointmentRepository, useValue: mockAppointmentRepository },
        { provide: ISupplierRepository, useValue: mockSupplierRepository },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<UpdateVisitorAndAppointmentUseCase>(UpdateVisitorAndAppointmentUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  // TODO: Add tests for visitor not found, appointment not found, supplier not found (if supplier_id provided),
  // date validation, successful update.
});
