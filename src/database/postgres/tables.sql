CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Identificador único
    employee_count INT NOT NULL,                  -- Cantidad de empleados
    card_count INT NOT NULL,                      -- Número de tarjetas
    is_subscribed BOOLEAN NOT NULL,               -- Si tiene suscripción general
    has_card_subscription BOOLEAN NOT NULL,       -- Si tiene suscripción a tarjetas
    has_sensor_subscription BOOLEAN NOT NULL,     -- Si tiene suscripción al sensor
    created_at TIMESTAMP DEFAULT NOW(),           -- Fecha de creación
    updated_at TIMESTAMP DEFAULT NOW()            -- Fecha de última actualización
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Identificador único
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE, -- Relación con suppliers
    name VARCHAR(255) NOT NULL,                     -- Nombre del usuario
    email VARCHAR(255) UNIQUE NOT NULL,             -- Correo electrónico
    role VARCHAR(50) NOT NULL,                      -- Rol del usuario (admin, empleado, etc.)
    is_active BOOLEAN DEFAULT TRUE,                 -- Si el usuario está activo
    created_at TIMESTAMP DEFAULT NOW(),             -- Fecha de creación
    updated_at TIMESTAMP DEFAULT NOW()              -- Fecha de última actualización
);

CREATE TABLE card (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- Identificador único de la tarjeta
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE, -- Relación con suppliers
    card_number VARCHAR(50) NOT NULL UNIQUE,        -- Número único de tarjeta
    issued_to UUID REFERENCES users(id),            -- Usuario al que está asignada (puede ser NULL si no está asignada)
    is_active BOOLEAN DEFAULT TRUE,                 -- Si la tarjeta está activa
    issued_at TIMESTAMP,                            -- Fecha de emisión

    -- Datos de GPS
    latitude DECIMAL(9,6),                          -- Latitud de la tarjeta
    longitude DECIMAL(9,6),                         -- Longitud de la tarjeta
    accuracy DECIMAL(5,2),                          -- Precisión de los datos GPS (en metros)

    created_at TIMESTAMP DEFAULT NOW(),             -- Fecha de creación
    updated_at TIMESTAMP DEFAULT NOW()              -- Fecha de última actualización
);

INSERT INTO suppliers (employee_count, card_count, is_subscribed, has_card_subscription, has_sensor_subscription)
VALUES (50, 100, TRUE, TRUE, FALSE);

SELECT * 
FROM users 
WHERE supplier_id = 'supplier-uuid';

UPDATE cards
SET issued_to = 'user-uuid', issued_at = NOW()
WHERE id = 'card-uuid';

INSERT INTO cards (supplier_id, card_number, latitude, longitude, accuracy)
VALUES ('supplier-uuid', '12345-67890', 40.712776, -74.005974, 5.25);

UPDATE cards
SET latitude = 41.40338, longitude = 2.17403, accuracy = 3.50, updated_at = NOW()
WHERE id = 'card-uuid';

SELECT id, card_number, latitude, longitude, accuracy
FROM cards
WHERE is_active = TRUE;
