#!/bin/bash

# Script para ejecutar el simulador de múltiples empresas
# Este script inicia el servidor mock y el simulador multi-empresa

# Colores para terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar dependencias
echo -e "${BLUE}Verificando dependencias...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js no está instalado. Por favor, instálalo para continuar.${NC}"
  exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Instalando dependencias...${NC}"
  pnpm install express body-parser axios
fi

# Verificar si hay un servidor mock ya corriendo
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
  echo -e "${YELLOW}Hay un servidor ya ejecutándose en el puerto 3001. Continuando...${NC}"
else
  # Iniciar el servidor mock en segundo plano
  echo -e "${GREEN}Iniciando servidor mock en puerto 3001...${NC}"
  node mock_server.js &
  MOCK_PID=$!
  
  # Esperar a que el servidor esté listo
  sleep 2
fi

# Función para manejar la salida del programa
cleanup() {
  echo -e "\n${YELLOW}Deteniendo simulación...${NC}"
  if [ ! -z "$MOCK_PID" ]; then
    kill $MOCK_PID 2>/dev/null
    echo -e "${GREEN}Servidor mock detenido.${NC}"
  fi
  exit 0
}

# Capturar señal de interrupción (Ctrl+C)
trap cleanup SIGINT

# Iniciar el simulador multi-empresa
echo -e "${GREEN}Iniciando simulador multi-empresa...${NC}"
echo -e "${YELLOW}Presiona Ctrl+C para detener la simulación${NC}\n"

node multi_company_simulator.js

# Esto no debería ejecutarse a menos que el simulador termine por sí solo
cleanup 