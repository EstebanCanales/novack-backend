import { Test, TestingModule } from '@nestjs/testing';
import { SupplierService } from '../supplier.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier, SupplierSubscription } from 'src/domain/entities';
import { BadRequestException } from '@nestjs/common';
import { CreateSupplierDto, UpdateSupplierDto } from '../../dtos/supplier';
import { EmployeeService } from '../employee.service';
import { EmailService } from '../email.service';

describe('SupplierService', () => {
  let service: SupplierService;
  let supplierRepository: Repository<Supplier>;
  let subscriptionRepository: Repository<SupplierSubscription>;
  let employeeService: EmployeeService;
  let emailService: EmailService;

  // Mock data
  const mockSubscription = {
    id: '1',
    is_subscribed: true,
    has_card_subscription: true,
    has_sensor_subscription: false,
    max_employee_count: 10,
    max_card_count: 5,
  };

  const mockSupplier = {
    id: '1',
    supplier_name: 'Test Supplier',
    supplier_creator: 'John Creator',
    contact_email: 'contact@supplier.com',
    phone_number: '123456789',
    subscription: mockSubscription,
    address: 'Test Address',
    description: 'Test description',
    logo_url: 'https://test-supplier.com/logo.png',
    is_subscribed: true,
    has_card_subscription: true,
    has_sensor_subscription: false,
    employee_count: 5,
    card_count: 3,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockCreateSupplierDto: CreateSupplierDto = {
    supplier_name: 'New Supplier',
    supplier_creator: 'John Creator',
    contact_email: 'new@supplier.com',
    phone_number: '987654321',
    address: 'New Address',
    description: 'New description',
    logo_url: 'https://new-supplier.com/logo.png',
    is_subscribed: true,
    has_card_subscription: true,
    has_sensor_subscription: false,
    employee_count: 5,
    card_count: 3
  };

  const mockUpdateSupplierDto: UpdateSupplierDto = {
    supplier_name: 'Updated Supplier',
    contact_email: 'updated@supplier.com',
    phone_number: '111222333',
    is_subscribed: true
  };

  beforeEach(async () => {
    const mockEmployeeService = {
      create: jest.fn().mockResolvedValue({ id: '1', name: 'Test Employee' }),
      findBySupplier: jest.fn().mockResolvedValue([]),
    };

    const mockEmailService = {
      sendSupplierCreationEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SupplierSubscription),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: EmployeeService,
          useValue: mockEmployeeService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
    supplierRepository = module.get<Repository<Supplier>>(getRepositoryToken(Supplier));
    subscriptionRepository = module.get<Repository<SupplierSubscription>>(getRepositoryToken(SupplierSubscription));
    employeeService = module.get<EmployeeService>(EmployeeService);
    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new supplier successfully', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(supplierRepository, 'create').mockReturnValue(mockSupplier as any);
      jest.spyOn(supplierRepository, 'save').mockResolvedValue(mockSupplier as any);
      jest.spyOn(subscriptionRepository, 'create').mockReturnValue(mockSubscription as any);
      jest.spyOn(subscriptionRepository, 'save').mockResolvedValue(mockSubscription as any);
      jest.spyOn(employeeService, 'create').mockResolvedValue({ id: '1', name: 'John Creator' } as any);
      jest.spyOn(emailService, 'sendSupplierCreationEmail').mockResolvedValue(true as any);
      
      // Mock para findOne en la segunda llamada (dentro de service.findOne)
      jest.spyOn(supplierRepository, 'findOne')
        .mockResolvedValueOnce(null) // Primera llamada para verificar si existe
        .mockResolvedValueOnce(mockSupplier as any); // Segunda llamada dentro de findOne
      
      const result = await service.create(mockCreateSupplierDto);
      
      expect(result).toEqual(mockSupplier);
      expect(supplierRepository.save).toHaveBeenCalled();
      expect(subscriptionRepository.save).toHaveBeenCalled();
      expect(employeeService.create).toHaveBeenCalled();
      expect(emailService.sendSupplierCreationEmail).toHaveBeenCalled();
    });

    it('should throw error if supplier name already exists', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(mockSupplier as any);
      
      await expect(service.create(mockCreateSupplierDto)).rejects.toThrow(BadRequestException);
      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { supplier_name: mockCreateSupplierDto.supplier_name },
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of suppliers', async () => {
      const mockSuppliers = [mockSupplier];
      jest.spyOn(supplierRepository, 'find').mockResolvedValue(mockSuppliers as any);
      
      const result = await service.findAll();
      
      expect(result).toEqual(mockSuppliers);
      expect(supplierRepository.find).toHaveBeenCalledWith({
        relations: ['employees', 'subscription', 'visitors', 'cards'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a single supplier by id', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(mockSupplier as any);
      
      const result = await service.findOne('1');
      
      expect(result).toEqual(mockSupplier);
      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['employees', 'subscription', 'visitors', 'cards'],
      });
    });

    it('should throw exception if supplier not found', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(null);
      
      await expect(service.findOne('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a supplier successfully', async () => {
      const updatedSupplier = { 
        ...mockSupplier, 
        supplier_name: mockUpdateSupplierDto.supplier_name,
        contact_email: mockUpdateSupplierDto.contact_email,
        phone_number: mockUpdateSupplierDto.phone_number,
        is_subscribed: mockUpdateSupplierDto.is_subscribed,
      };
      
      // Mock para findOne en service.findOne
      jest.spyOn(supplierRepository, 'findOne')
        .mockResolvedValueOnce(mockSupplier as any) // Primera llamada en service.findOne
        .mockResolvedValueOnce(null); // Segunda llamada para verificar nombre único
        
      jest.spyOn(supplierRepository, 'save').mockResolvedValue(updatedSupplier as any);
      
      // Mock adicional para la segunda llamada a findOne (en service.findOne al final)
      jest.spyOn(supplierRepository, 'findOne')
        .mockResolvedValueOnce(mockSupplier as any) // Primera llamada 
        .mockResolvedValueOnce(null) // Segunda llamada
        .mockResolvedValueOnce(updatedSupplier as any); // Tercera llamada en el return this.findOne
      
      const result = await service.update('1', mockUpdateSupplierDto);
      
      expect(result).toEqual(updatedSupplier);
    });

    it('should throw error if supplier not found', async () => {
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(null);
      
      await expect(service.update('1', mockUpdateSupplierDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if updated name already exists for another supplier', async () => {
      const existingSupplier = { ...mockSupplier, id: '2' }; // Different ID
      
      const mockUpdateDtoWithNameChange = {
        ...mockUpdateSupplierDto,
        supplier_name: 'Existing Name', // Nombre que ya existe en otro proveedor
      };
      
      // Importante: primero necesitamos mockear correctamente el service.findOne
      jest.spyOn(supplierRepository, 'findOne')
        .mockResolvedValueOnce(mockSupplier as any) // Primera llamada en service.update -> service.findOne
        .mockResolvedValueOnce(existingSupplier as any); // Segunda llamada en la verificación de nombre único
      
      await expect(service.update('1', mockUpdateDtoWithNameChange)).rejects.toThrow(BadRequestException);
    });
  });
}); 