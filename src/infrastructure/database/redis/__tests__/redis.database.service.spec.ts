import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisDatabaseService } from '../redis.database.service';

// Mock para Redis - definir primero los métodos mock
const mockMethods = {
  on: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG'),
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  lPush: jest.fn().mockResolvedValue(1),
  lTrim: jest.fn().mockResolvedValue('OK'),
  expire: jest.fn().mockResolvedValue(1),
  lRange: jest.fn(),
  multi: jest.fn(),
  exec: jest.fn(),
  geoAdd: jest.fn().mockResolvedValue(1),
  geoSearchWith: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
  flushAll: jest.fn().mockResolvedValue('OK'),
  connect: jest.fn().mockResolvedValue(undefined),
};

// Crear clase mock de Redis
class MockRedis {
  on = mockMethods.on;
  ping = mockMethods.ping;
  set = mockMethods.set;
  get = mockMethods.get;
  lPush = mockMethods.lPush;
  lTrim = mockMethods.lTrim;
  expire = mockMethods.expire;
  lRange = mockMethods.lRange;
  multi = mockMethods.multi;
  exec = mockMethods.exec;
  geoAdd = mockMethods.geoAdd;
  geoSearchWith = mockMethods.geoSearchWith;
  del = mockMethods.del;
  flushAll = mockMethods.flushAll;
  connect = mockMethods.connect;
}

// Mock del módulo redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => new MockRedis()),
}));

describe('RedisDatabaseService', () => {
  let service: RedisDatabaseService;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup del módulo de prueba con un mock de ConfigService
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisDatabaseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'REDIS_HOST') return 'redis-17374.c80.us-east-1-2.ec2.redns.redis-cloud.com';
              if (key === 'REDIS_PORT') return 17374;
              if (key === 'REDIS_USERNAME') return 'default';
              if (key === 'REDIS_PASSWORD') return 'vNrEVCdgtVb3A0Rr6Nb6H7JKKNxa4XYh';
              if (key === 'REDIS_ENCRYPTION_KEY') return 'secure_encryption_key_for_tests';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisDatabaseService>(RedisDatabaseService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize Redis client properly', async () => {
      // Asignar el cliente mock al servicio antes de onModuleInit
      (service as any).redisClient = new MockRedis();
      
      // Ejecutar
      await service.onModuleInit();

      // Verificar conexión iniciada
      expect(mockMethods.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockMethods.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('testConnection', () => {
    it('should verify Redis connection', async () => {
      // Asignar el cliente mock al servicio
      (service['redisClient'] as any) = new MockRedis();

      // Ejecutar
      const result = await service.testConnection();

      // Verificar
      expect(mockMethods.ping).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'ok',
        message: 'Conexión a Redis Cloud establecida',
      });
    });
  });

  describe('saveChatMessage', () => {
    it('should save chat message to Redis', async () => {
      // Desactivar la encriptación para este test
      jest.spyOn(service as any, 'encrypt').mockImplementation((value) => value);
      
      // Setup
      (service['redisClient'] as any) = new MockRedis();
      const roomId = 'room123';
      const message = { id: 'msg456', content: 'Hola mundo' };

      // Ejecutar
      await service.saveChatMessage(roomId, message);

      // Verificar
      expect(mockMethods.set).toHaveBeenCalledWith(
        `chat:message:${roomId}:${message.id}`,
        expect.stringContaining('msg456'),
        expect.anything()
      );
      expect(mockMethods.lPush).toHaveBeenCalledWith(
        `chat:messages:${roomId}`,
        message.id,
      );
      expect(mockMethods.lTrim).toHaveBeenCalledWith(
        `chat:messages:${roomId}`,
        0,
        99,
      );
    });
  });

  describe('getChatMessages', () => {
    it('should retrieve chat messages from Redis', async () => {
      // Desactivar la desencriptación para este test
      jest.spyOn(service as any, 'decrypt').mockImplementation((value) => value);
      
      // Setup
      (service['redisClient'] as any) = new MockRedis();
      const roomId = 'room123';
      const messageIds = ['msg456', 'msg789'];
      
      mockMethods.lRange.mockResolvedValue(messageIds);
      mockMethods.multi.mockReturnValue({
        get: jest.fn().mockReturnThis(),
        exec: mockMethods.exec,
      });
      
      mockMethods.exec.mockResolvedValue([
        JSON.stringify({ id: 'msg456', content: 'Hola' }),
        JSON.stringify({ id: 'msg789', content: 'Mundo' }),
      ]);

      // Ejecutar
      const result = await service.getChatMessages(roomId);

      // Verificar
      expect(mockMethods.lRange).toHaveBeenCalledWith(`chat:messages:${roomId}`, 0, 49);
      expect(mockMethods.multi).toHaveBeenCalled();
      expect(mockMethods.exec).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('msg456');
      expect(result[1].id).toBe('msg789');
    });
  });

  describe('saveCardLocation', () => {
    it('should save card location to Redis', async () => {
      // Desactivar la encriptación para este test
      jest.spyOn(service as any, 'encrypt').mockImplementation((value) => value);
      
      // Setup
      (service['redisClient'] as any) = new MockRedis();
      const cardId = 'card123';
      const location = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10.5,
      };

      // Ejecutar
      await service.saveCardLocation(cardId, location);

      // Verificar
      expect(mockMethods.set).toHaveBeenCalledWith(
        `card:location:${cardId}`,
        expect.any(String),
        expect.anything()
      );
      expect(mockMethods.geoAdd).toHaveBeenCalledWith('cards:locations', {
        longitude: location.longitude,
        latitude: location.latitude,
        member: cardId
      });
    });
  });

  describe('getNearbyCards', () => {
    it('should find nearby cards using geospatial query', async () => {
      // Desactivar la desencriptación para este test
      jest.spyOn(service as any, 'decrypt').mockImplementation((value) => value);
      
      // Setup
      (service['redisClient'] as any) = new MockRedis();
      const latitude = 40.7128;
      const longitude = -74.006;
      const radius = 100;
      const mockResults = [
        {
          member: 'card123',
          distance: 50,
          coordinates: { longitude: -74.004, latitude: 40.715 }
        },
        {
          member: 'card456',
          distance: 80,
          coordinates: { longitude: -74.009, latitude: 40.71 }
        },
      ];
      
      mockMethods.geoSearchWith.mockResolvedValue(mockResults);
      mockMethods.get.mockImplementation((key) => {
        if (key === 'card:location:card123') {
          return Promise.resolve(JSON.stringify({
            id: 'loc1',
            latitude: 40.715,
            longitude: -74.004,
            card_number: 'CARD-123',
          }));
        }
        if (key === 'card:location:card456') {
          return Promise.resolve(JSON.stringify({
            id: 'loc2',
            latitude: 40.710,
            longitude: -74.009,
            card_number: 'CARD-456',
          }));
        }
        return Promise.resolve(null);
      });

      // Ejecutar
      const result = await service.getNearbyCards(latitude, longitude, radius);

      // Verificar
      expect(mockMethods.geoSearchWith).toHaveBeenCalledWith({
        key: 'cards:locations',
        longitude,
        latitude,
        radius,
        unit: 'm',
        withCoord: true,
        withDist: true,
        sort: 'ASC',
      });
      
      expect(result).toHaveLength(2);
      expect(result[0].distance_meters).toBe(50);
      expect(result[1].card_number).toBe('CARD-456');
    });
  });

  describe('generic cache methods', () => {
    beforeEach(() => {
      (service['redisClient'] as any) = new MockRedis();
      // Desactivar encriptación/desencriptación para estos tests
      jest.spyOn(service as any, 'encrypt').mockImplementation((value) => value);
      jest.spyOn(service as any, 'decrypt').mockImplementation((value) => value);
      jest.spyOn(service as any, 'shouldEncrypt').mockReturnValue(false);
    });
    
    it('should set and get values from cache', async () => {
      // Setup
      const key = 'test:key';
      const data = { name: 'Test', value: 123 };
      mockMethods.get.mockResolvedValue(JSON.stringify(data));

      // Ejecutar set
      await service.set(key, data);

      // Verificar set
      expect(mockMethods.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(data),
        expect.any(Object)
      );

      // Ejecutar get
      const result = await service.get(key);

      // Verificar get
      expect(mockMethods.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(data);
    });

    it('should delete keys from cache', async () => {
      // Setup
      const keys = ['key1', 'key2', 'key3'];

      // Ejecutar
      await service.delete(...keys);

      // Verificar
      expect(mockMethods.del).toHaveBeenCalledWith(keys);
    });

    it('should flush the cache', async () => {
      // Ejecutar
      await service.flushAll();

      // Verificar
      expect(mockMethods.flushAll).toHaveBeenCalled();
    });
  });
}); 