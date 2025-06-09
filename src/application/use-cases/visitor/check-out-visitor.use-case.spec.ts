import { Test, TestingModule } from '@nestjs/testing';
import { CheckOutVisitorUseCase } from './check-out-visitor.use-case';
import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
import { IAppointmentRepository } from '../../../../domain/repositories/appointment.repository.interface';
import { CardService } from '../../../services/card.service';
import { EmailService } from '../../../services/email.service';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';
import { Visitor, Appointment, Card } from '../../../../domain/entities'; // Assuming Card entity path
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mocks
const mockVisitorRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};
const mockAppointmentRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};
const mockCardService = {
  unassignFromVisitor: jest.fn(),
};
const mockEmailService = {
  sendVisitorCheckoutEmail: jest.fn(),
};
const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('CheckOutVisitorUseCase', () => {
  let useCase: CheckOutVisitorUseCase;

  beforeEach(async () => {
    Object.values(mockVisitorRepository).forEach(mockFn => mockFn.mockReset());
    Object.values(mockAppointmentRepository).forEach(mockFn => mockFn.mockReset());
    Object.values(mockCardService).forEach(mockFn => mockFn.mockReset());
    Object.values(mockEmailService).forEach(mockFn => mockFn.mockReset());
    Object.values(mockLoggerService).forEach(mockFn => mockFn.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckOutVisitorUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: IAppointmentRepository, useValue: mockAppointmentRepository },
        { provide: CardService, useValue: mockCardService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<CheckOutVisitorUseCase>(CheckOutVisitorUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  // TODO: Add tests for various scenarios:
  // visitor not found, visitor already checked out, no appointments,
  // appointment not checked in, successful checkout (with/without card, with/without email success/failure).
});
