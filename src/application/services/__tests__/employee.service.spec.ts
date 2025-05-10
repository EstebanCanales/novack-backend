import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeService } from '../employee.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeAuth, Supplier } from 'src/domain/entities';
import { BadRequestException } from '@nestjs/common';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../../dtos/employee';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let employeeRepository: Repository<Employee>;
  let employeeAuthRepository: Repository<EmployeeAuth>;
  let supplierRepository: Repository<Supplier>;

  // Mock data
  const mockSupplier = {
    id: '1',
    name: 'Test Supplier',
    subscription: { id: '1' },
  };

  const mockEmployee = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    is_creator: false,
    phone: '123456789',
    position: 'Developer',
    department: 'IT',
    supplier: mockSupplier,
  };
  
  const mockEmployeeAuth = {
    id: '1',
    password: 'hashedPassword123',
    is_email_verified: false,
    employee: mockEmployee,
  };

  const mockCreateEmployeeDto: CreateEmployeeDto = {
    name: 'New Employee',
    email: 'new@example.com',
    password: 'password123',
    is_creator: false,
    phone: '987654321',
    position: 'Designer',
    department: 'UX',
    supplier_id: '1',
  };

  const mockUpdateEmployeeDto: UpdateEmployeeDto = {
    name: 'Updated Name',
    email: 'updated@example.com',
    password: 'newpassword123',
    phone: '1111111111',
    position: 'Senior Designer',
    department: 'Design',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EmployeeAuth),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    employeeRepository = module.get<Repository<Employee>>(getRepositoryToken(Employee));
    employeeAuthRepository = module.get<Repository<EmployeeAuth>>(getRepositoryToken(EmployeeAuth));
    supplierRepository = module.get<Repository<Supplier>>(getRepositoryToken(Supplier));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new employee successfully', async () => {
      // Mock dependencies
      jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(mockSupplier as any);
      jest.spyOn(employeeRepository, 'create').mockReturnValue(mockEmployee as any);
      jest.spyOn(employeeRepository, 'save').mockResolvedValue(mockEmployee as any);
      jest.spyOn(employeeAuthRepository, 'create').mockReturnValue(mockEmployeeAuth as any);
      jest.spyOn(employeeAuthRepository, 'save').mockResolvedValue(mockEmployeeAuth as any);
      
      // Call method
      const result = await service.create(mockCreateEmployeeDto);
      
      // Assert results
      expect(result).toEqual(mockEmployee);
      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockCreateEmployeeDto.email },
      });
      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCreateEmployeeDto.supplier_id },
        relations: ['subscription'],
      });
      expect(employeeRepository.save).toHaveBeenCalled();
      expect(employeeAuthRepository.save).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      // Mock the email check to return an existing employee
      jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(mockEmployee as any);
      
      // Assert that the method throws the correct exception
      await expect(service.create(mockCreateEmployeeDto)).rejects.toThrow(BadRequestException);
      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockCreateEmployeeDto.email },
      });
    });

    it('should throw error if supplier does not exist', async () => {
      // Mock email check to pass
      jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(null);
      // Mock supplier check to fail
      jest.spyOn(supplierRepository, 'findOne').mockResolvedValue(null);
      
      // Assert error
      await expect(service.create(mockCreateEmployeeDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return an array of employees', async () => {
      const mockEmployees = [mockEmployee];
      jest.spyOn(employeeRepository, 'find').mockResolvedValue(mockEmployees as any);
      
      const result = await service.findAll();
      
      expect(result).toEqual(mockEmployees);
      expect(employeeRepository.find).toHaveBeenCalledWith({
        relations: ['supplier'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a single employee by id', async () => {
      jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(mockEmployee as any);
      
      const result = await service.findOne('1');
      
      expect(result).toEqual(mockEmployee);
      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['supplier'],
      });
    });

    it('should throw exception if employee not found', async () => {
      jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(null);
      
      await expect(service.findOne('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update an employee successfully', async () => {
      // Setup mocks
      jest.spyOn(employeeRepository, 'findOne')
        .mockResolvedValueOnce(mockEmployee as any) // First call for finding the employee
        .mockResolvedValueOnce(null); // Second call for email uniqueness check
      
      jest.spyOn(employeeAuthRepository, 'findOne').mockResolvedValue(mockEmployeeAuth as any);
      jest.spyOn(employeeAuthRepository, 'save').mockResolvedValue({ ...mockEmployeeAuth, password: 'newHashedPassword' } as any);
      
      const updatedEmployee = { 
        ...mockEmployee, 
        name: mockUpdateEmployeeDto.name,
        email: mockUpdateEmployeeDto.email,
        phone: mockUpdateEmployeeDto.phone,
        position: mockUpdateEmployeeDto.position,
        department: mockUpdateEmployeeDto.department
      };
      
      jest.spyOn(employeeRepository, 'save').mockResolvedValue(updatedEmployee as any);
      
      // Call the method
      const result = await service.update('1', mockUpdateEmployeeDto);
      
      // Assert the result
      expect(result).toEqual(updatedEmployee);
      expect(employeeRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        name: mockUpdateEmployeeDto.name,
        email: mockUpdateEmployeeDto.email,
        phone: mockUpdateEmployeeDto.phone,
        position: mockUpdateEmployeeDto.position,
        department: mockUpdateEmployeeDto.department,
      }));
    });

    it('should throw error if employee not found', async () => {
      jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(null);
      
      await expect(service.update('1', mockUpdateEmployeeDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error if employee auth not found', async () => {
      jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(mockEmployee as any);
      jest.spyOn(employeeAuthRepository, 'findOne').mockResolvedValue(null);
      
      await expect(service.update('1', mockUpdateEmployeeDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove an employee successfully', async () => {
      // Setup employee that is not a creator
      const nonCreatorEmployee = { ...mockEmployee, is_creator: false };
      
      jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(nonCreatorEmployee as any);
      jest.spyOn(employeeAuthRepository, 'findOne').mockResolvedValue(mockEmployeeAuth as any);
      jest.spyOn(employeeAuthRepository, 'remove').mockResolvedValue({} as any);
      jest.spyOn(employeeRepository, 'remove').mockResolvedValue(nonCreatorEmployee as any);
      
      const result = await service.remove('1');
      
      expect(result).toEqual(nonCreatorEmployee);
      expect(employeeAuthRepository.remove).toHaveBeenCalled();
      expect(employeeRepository.remove).toHaveBeenCalled();
    });

    it('should throw error if trying to remove a creator employee', async () => {
      // Setup employee that is a creator
      const creatorEmployee = { ...mockEmployee, is_creator: true };
      
      jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(creatorEmployee as any);
      
      await expect(service.remove('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByEmail', () => {
    it('should find an employee by email with auth data', async () => {
      jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(mockEmployee as any);
      jest.spyOn(employeeAuthRepository, 'findOne').mockResolvedValue(mockEmployeeAuth as any);
      
      const result = await service.findByEmail('john@example.com');
      
      expect(result).toEqual({ ...mockEmployee, auth: mockEmployeeAuth });
      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        relations: ['supplier'],
      });
    });

    it('should return null if employee not found', async () => {
      jest.spyOn(employeeRepository, 'findOne').mockResolvedValue(null);
      
      const result = await service.findByEmail('nonexistent@example.com');
      
      expect(result).toBeNull();
    });
  });

  describe('updateProfileImageUrl', () => {
    it('should update the employee profile image url', async () => {
      const imageUrl = 'https://example.com/images/profile.jpg';
      const updatedEmployee = { ...mockEmployee, profile_image_url: imageUrl };
      
      jest.spyOn(employeeRepository, 'findOneBy').mockResolvedValue(mockEmployee as any);
      jest.spyOn(employeeRepository, 'save').mockResolvedValue(updatedEmployee as any);
      
      const result = await service.updateProfileImageUrl('1', imageUrl);
      
      expect(result).toEqual(updatedEmployee);
      expect(employeeRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        profile_image_url: imageUrl,
      }));
    });

    it('should throw error if employee not found', async () => {
      jest.spyOn(employeeRepository, 'findOneBy').mockResolvedValue(null);
      
      await expect(service.updateProfileImageUrl('1', 'https://example.com/image.jpg')).rejects.toThrow(BadRequestException);
    });
  });
}); 