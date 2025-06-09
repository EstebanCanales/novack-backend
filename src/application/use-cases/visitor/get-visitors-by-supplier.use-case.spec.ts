import { Test, TestingModule } from '@nestjs/testing';
import { GetVisitorsBySupplierUseCase } from './get-visitors-by-supplier.use-case';
import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
import { ISupplierRepository } from '../../../../domain/repositories/supplier.repository.interface';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';
import { Supplier, Visitor } from '../../../../domain/entities';
import { NotFoundException } from '@nestjs/common';

// Mocks
const mockVisitorRepository = {
  findBySupplier: jest.fn(),
};
const mockSupplierRepository = {
  findById: jest.fn(),
};
const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

describe('GetVisitorsBySupplierUseCase', () => {
  let useCase: GetVisitorsBySupplierUseCase;

  beforeEach(async () => {
    mockVisitorRepository.findBySupplier.mockReset();
    mockSupplierRepository.findById.mockReset();
    mockLoggerService.log.mockReset();
    mockLoggerService.warn.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVisitorsBySupplierUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: ISupplierRepository, useValue: mockSupplierRepository },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<GetVisitorsBySupplierUseCase>(GetVisitorsBySupplierUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  // TODO: Add tests for supplier not found, supplier found but no visitors,
  // supplier found with visitors.
});
