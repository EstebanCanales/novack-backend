#!/bin/bash

echo "🚀 Iniciando stack ELK + Aplicación de forma ordenada..."

# Limpiar contenedores anteriores
echo "🧹 Limpiando contenedores anteriores..."
docker-compose down -v --remove-orphans

# Crear directorios necesarios
echo "📁 Creando directorios necesarios..."
mkdir -p logs
mkdir -p config/logstash
mkdir -p config/filebeat

# Dar permisos correctos
echo "🔐 Configurando permisos..."
chmod 777 logs
chmod 644 config/filebeat/filebeat.yml
chmod 644 config/logstash/logstash.conf

# Paso 1: Iniciar Elasticsearch
echo "1️⃣ Iniciando Elasticsearch..."
docker-compose up -d elasticsearch

# Esperar a que Elasticsearch esté listo
echo "⏳ Esperando a que Elasticsearch esté listo..."
timeout=300
counter=0
while ! curl -s http://localhost:9200/_cluster/health | grep -q '"status":"green\|yellow"'; do
    sleep 5
    counter=$((counter + 5))
    if [ $counter -ge $timeout ]; then
        echo "❌ Timeout esperando Elasticsearch"
        exit 1
    fi
    echo "   Elasticsearch aún no está listo... ($counter/$timeout segundos)"
done
echo "✅ Elasticsearch está listo!"

# Paso 2: Iniciar Logstash
echo "2️⃣ Iniciando Logstash..."
docker-compose up -d logstash

# Esperar a que Logstash esté listo
echo "⏳ Esperando a que Logstash esté listo..."
counter=0
while ! curl -s http://localhost:9600 | grep -q 'logstash'; do
    sleep 5
    counter=$((counter + 5))
    if [ $counter -ge $timeout ]; then
        echo "❌ Timeout esperando Logstash"
        exit 1
    fi
    echo "   Logstash aún no está listo... ($counter/$timeout segundos)"
done
echo "✅ Logstash está listo!"

# Paso 3: Iniciar PostgreSQL
echo "3️⃣ Iniciando PostgreSQL..."
docker-compose up -d postgres

# Esperar a PostgreSQL
echo "⏳ Esperando a que PostgreSQL esté listo..."
counter=0
while ! docker-compose exec -T postgres pg_isready -U postgres -d novack -p 5430; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge 60 ]; then
        echo "❌ Timeout esperando PostgreSQL"
        exit 1
    fi
    echo "   PostgreSQL aún no está listo... ($counter/60 segundos)"
done
echo "✅ PostgreSQL está listo!"

# Paso 4: Iniciar la aplicación
echo "4️⃣ Iniciando la aplicación..."
docker-compose up -d --build api

# Esperar a que la API esté lista
echo "⏳ Esperando a que la API esté lista..."
counter=0
while ! curl -s http://localhost:4000/health | grep -q 'ok'; do
    sleep 5
    counter=$((counter + 5))
    if [ $counter -ge 120 ]; then
        echo "❌ Timeout esperando la API"
        exit 1
    fi
    echo "   API aún no está lista... ($counter/120 segundos)"
done
echo "✅ API está lista!"

# Paso 5: Iniciar servicios complementarios
echo "5️⃣ Iniciando servicios complementarios..."
docker-compose up -d kibana filebeat

echo ""
echo "🎉 ¡Todos los servicios están listos!"
echo ""
echo "📊 URLs disponibles:"
echo "   • API:           http://localhost:4000"
echo "   • Health Check:  http://localhost:4000/health"
echo "   • Elasticsearch: http://localhost:9200"
echo "   • Kibana:        http://localhost:5601"
echo "   • Logstash API:  http://localhost:9600"
echo ""
echo "📝 Para ver los logs:"
echo "   docker-compose logs -f api"
echo "   docker-compose logs -f logstash"
echo "   docker-compose logs -f filebeat"
echo ""
echo "🛑 Para detener todo:"
echo "   docker-compose down"
