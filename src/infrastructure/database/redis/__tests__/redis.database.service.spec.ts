import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisDatabaseService } from '../redis.database.service';

// Mock para Redis - definir primero los métodos mock
const mockMethods = {
  on: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG'),
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  lpush: jest.fn().mockResolvedValue(1),
  ltrim: jest.fn().mockResolvedValue('OK'),
  expire: jest.fn().mockResolvedValue(1),
  lrange: jest.fn(),
  pipeline: jest.fn(),
  geoadd: jest.fn().mockResolvedValue(1),
  georadius: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
  flushall: jest.fn().mockResolvedValue('OK'),
};

// Crear clase mock de Redis
class MockRedis {
  on = mockMethods.on;
  ping = mockMethods.ping;
  set = mockMethods.set;
  get = mockMethods.get;
  lpush = mockMethods.lpush;
  ltrim = mockMethods.ltrim;
  expire = mockMethods.expire;
  lrange = mockMethods.lrange;
  pipeline = mockMethods.pipeline;
  geoadd = mockMethods.geoadd;
  georadius = mockMethods.georadius;
  del = mockMethods.del;
  flushall = mockMethods.flushall;
}

// Mock del módulo ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => new MockRedis());
});

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
              if (key === 'REDIS_HOST') return 'localhost';
              if (key === 'REDIS_PORT') return 6379;
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
        message: 'Conexión a Redis establecida',
      });
    });
  });

  describe('saveChatMessage', () => {
    it('should save chat message to Redis', async () => {
      // Setup
      (service['redisClient'] as any) = new MockRedis();
      const roomId = 'room123';
      const message = { id: 'msg456', content: 'Hola mundo' };

      // Ejecutar
      await service.saveChatMessage(roomId, message);

      // Verificar
      expect(mockMethods.set).toHaveBeenCalledWith(
        `chat:message:${roomId}:${message.id}`,
        JSON.stringify(message),
      );
      expect(mockMethods.lpush).toHaveBeenCalledWith(
        `chat:messages:${roomId}`,
        message.id,
      );
      expect(mockMethods.ltrim).toHaveBeenCalledWith(
        `chat:messages:${roomId}`,
        0,
        99,
      );
    });
  });

  describe('getChatMessages', () => {
    it('should retrieve chat messages from Redis', async () => {
      // Setup
      (service['redisClient'] as any) = new MockRedis();
      const roomId = 'room123';
      const messageIds = ['msg456', 'msg789'];
      const pipeMock = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify({ id: 'msg456', content: 'Hola' })],
          [null, JSON.stringify({ id: 'msg789', content: 'Mundo' })],
        ]),
      };
      
      mockMethods.lrange.mockResolvedValue(messageIds);
      mockMethods.pipeline.mockReturnValue(pipeMock);

      // Ejecutar
      const result = await service.getChatMessages(roomId);

      // Verificar
      expect(mockMethods.lrange).toHaveBeenCalledWith(`chat:messages:${roomId}`, 0, 49);
      expect(mockMethods.pipeline).toHaveBeenCalled();
      expect(pipeMock.exec).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('msg456');
      expect(result[1].id).toBe('msg789');
    });
  });

  describe('saveCardLocation', () => {
    it('should save card location to Redis', async () => {
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
        expect.stringContaining('"latitude":40.7128'),
      );
      expect(mockMethods.geoadd).toHaveBeenCalledWith(
        'cards:locations',
        location.longitude,
        location.latitude,
        cardId,
      );
    });
  });

  describe('getNearbyCards', () => {
    it('should find nearby cards using geospatial query', async () => {
      // Setup
      (service['redisClient'] as any) = new MockRedis();
      const latitude = 40.7128;
      const longitude = -74.006;
      const radius = 100;
      const mockResults = [
        ['card123', '50', ['-74.004', '40.715']],
        ['card456', '80', ['-74.009', '40.710']],
      ];
      mockMethods.georadius.mockResolvedValue(mockResults);
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
      expect(mockMethods.georadius).toHaveBeenCalledWith(
        'cards:locations',
        longitude,
        latitude,
        radius,
        'm',
        'WITHCOORD',
        'WITHDIST',
        'ASC',
      );
      expect(result).toHaveLength(2);
      expect(result[0].distance_meters).toBe(50);
      expect(result[1].card_number).toBe('CARD-456');
    });
  });

  describe('generic cache methods', () => {
    beforeEach(() => {
      (service['redisClient'] as any) = new MockRedis();
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
      expect(mockMethods.del).toHaveBeenCalledWith(...keys);
    });

    it('should flush the cache', async () => {
      // Ejecutar
      await service.flushAll();

      // Verificar
      expect(mockMethods.flushall).toHaveBeenCalled();
    });
  });
}); 