#!/bin/bash

# Crear directorios necesarios
mkdir -p config/logstash config/filebeat logs

# Verificar si ya existen los archivos de configuración
if [ ! -f "config/logstash/logstash.conf" ]; then
  echo "Creando configuración de Logstash..."
  cp -v src/infrastructure/logging/logstash.conf config/logstash/
fi

if [ ! -f "config/filebeat/filebeat.yml" ]; then
  echo "Creando configuración de Filebeat..."
  cp -v src/infrastructure/logging/filebeat.yml config/filebeat/
fi

# Establecer permisos correctos
chmod -R 755 config
chmod -R 777 logs

echo "Inicializando entorno ELK..."
docker-compose -f docker-compose.logging.yml up -d

echo "Esperando a que ELK esté disponible..."
sleep 30

# Verificar si Elasticsearch está en funcionamiento
curl -s http://localhost:9200/_cat/health

echo ""
echo "Configuración completada. La interfaz de Kibana estará disponible en: http://localhost:5601"
echo "Recuerda agregar las siguientes variables de entorno a tu archivo .env:"
echo ""
echo "LOG_LEVEL=info"
echo "LOG_TO_FILE=true"
echo "ELK_ENABLED=true"
echo "ELK_HOST=http://localhost:9200"
echo "APP_NAME=novack-backend" 