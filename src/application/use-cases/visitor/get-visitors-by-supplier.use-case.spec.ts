import { Test, TestingModule } from '@nestjs/testing';
import { GetVisitorsBySupplierUseCase } from './get-visitors-by-supplier.use-case';
import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
import { ISupplierRepository } from '../../../../domain/repositories/supplier.repository.interface';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';
import { Visitor } from '../../../../domain/entities/visitor.entity';
import { Supplier } from '../../../../domain/entities/supplier.entity';
import { NotFoundException } from '@nestjs/common';

// --- Mocks ---
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
  let visitorRepo: IVisitorRepository;
  let supplierRepo: ISupplierRepository;

  const supplierId = 'supplier-uuid-for-visitors';
  const mockSupplier = { id: supplierId, supplier_name: 'Supplier For Visitors' } as Supplier;
  const mockVisitorsList: Visitor[] = [
    { id: 'visitor-uuid-1', name: 'Visitor Alpha', supplier_id: supplierId } as Visitor,
    { id: 'visitor-uuid-2', name: 'Visitor Beta', supplier_id: supplierId } as Visitor,
  ];

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVisitorsBySupplierUseCase,
        { provide: IVisitorRepository, useValue: mockVisitorRepository },
        { provide: ISupplierRepository, useValue: mockSupplierRepository },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    useCase = module.get<GetVisitorsBySupplierUseCase>(GetVisitorsBySupplierUseCase);
    visitorRepo = module.get<IVisitorRepository>(IVisitorRepository);
    supplierRepo = module.get<ISupplierRepository>(ISupplierRepository);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should return a list of visitors for a valid supplier', async () => {
      mockSupplierRepository.findById.mockResolvedValue(mockSupplier);
      mockVisitorRepository.findBySupplier.mockResolvedValue(mockVisitorsList);

      const result = await useCase.execute(supplierId);

      expect(result).toEqual(mockVisitorsList);
      expect(supplierRepo.findById).toHaveBeenCalledWith(supplierId);
      expect(visitorRepo.findBySupplier).toHaveBeenCalledWith(supplierId);
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Attempting to fetch visitors for supplier id: ${supplierId}`,
        { supplierId },
      );
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Successfully fetched ${mockVisitorsList.length} visitors for supplier id: ${supplierId}`,
        { supplierId, count: mockVisitorsList.length },
      );
    });

    it('should return an empty list if supplier is valid but has no visitors', async () => {
      mockSupplierRepository.findById.mockResolvedValue(mockSupplier);
      mockVisitorRepository.findBySupplier.mockResolvedValue([]);

      const result = await useCase.execute(supplierId);

      expect(result).toEqual([]);
      expect(supplierRepo.findById).toHaveBeenCalledWith(supplierId);
      expect(visitorRepo.findBySupplier).toHaveBeenCalledWith(supplierId);
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Successfully fetched 0 visitors for supplier id: ${supplierId}`,
        { supplierId, count: 0 },
      );
    });

    it('should throw NotFoundException if the supplier does not exist', async () => {
      mockSupplierRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(supplierId)).rejects.toThrow(NotFoundException);
      expect(supplierRepo.findById).toHaveBeenCalledWith(supplierId);
      expect(visitorRepo.findBySupplier).not.toHaveBeenCalled(); // Should not be called if supplier not found
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        // The use case log message is "Supplier not found when attempting to fetch its visitors: ${supplierId}"
        `Supplier not found when attempting to fetch its visitors: ${supplierId}`,
        { supplierId },
      );
    });

    it('should propagate errors from supplierRepository.findById', async () => {
      const dbError = new Error('DB error finding supplier');
      mockSupplierRepository.findById.mockRejectedValue(dbError);

      await expect(useCase.execute(supplierId)).rejects.toThrow(dbError);
      expect(visitorRepo.findBySupplier).not.toHaveBeenCalled();
    });

    it('should propagate errors from visitorRepository.findBySupplier', async () => {
      mockSupplierRepository.findById.mockResolvedValue(mockSupplier); // Supplier found
      const dbError = new Error('DB error finding visitors');
      mockVisitorRepository.findBySupplier.mockRejectedValue(dbError);

      await expect(useCase.execute(supplierId)).rejects.toThrow(dbError);
    });
  });
});
