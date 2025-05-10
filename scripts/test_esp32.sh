#!/bin/bash

# Colores para terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
CARD_NUMBER="CARD-001"
AUTH_KEY="esp32_secret_key_12345"
ENDPOINT="http://localhost:3001/esp32"
MULTI_COMPANY_ENDPOINT="${ENDPOINT}/supplier"
DEFAULT_COMPANY_ID="1234"

# Función para mostrar el uso del script
show_usage() {
  echo "Uso: $0 [OPTIONS]"
  echo "Simula envío de datos desde tarjeta ESP32."
  echo ""
  echo "Opciones:"
  echo "  -s, --supplier ID  Especifica el ID del proveedor/empresa"
  echo "  -e, --endpoint URL Especifica la URL del endpoint (predeterminado: $ENDPOINT)"
  echo "  -c, --card NUM     Especifica el número de tarjeta (predeterminado: $CARD_NUMBER)"
  echo "  -h, --help         Muestra esta ayuda"
}

# Procesar argumentos
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -s|--supplier) SUPPLIER_ID="$2"; shift ;;
    -e|--endpoint) ENDPOINT="$2"; shift ;;
    -c|--card) CARD_NUMBER="$2"; shift ;;
    -h|--help) show_usage; exit 0 ;;
    *) echo "Opción desconocida: $1"; show_usage; exit 1 ;;
  esac
  shift
done

# Decidir qué endpoint usar basado en si se proporcionó un supplier_id
if [ -n "$SUPPLIER_ID" ]; then
  FINAL_ENDPOINT="${MULTI_COMPANY_ENDPOINT}/${SUPPLIER_ID}/report-location"
  echo -e "${BLUE}Usando endpoint específico de proveedor: ${FINAL_ENDPOINT}${NC}"
else
  FINAL_ENDPOINT="${ENDPOINT}/report-location"
  echo -e "${YELLOW}Usando endpoint general con company_id=${DEFAULT_COMPANY_ID}${NC}"
fi

echo -e "${GREEN}Iniciando simulador ESP32${NC}"
echo -e "Tarjeta: ${CARD_NUMBER}"
echo -e "Endpoint: ${FINAL_ENDPOINT}"
echo -e "${YELLOW}Presiona Ctrl+C para detener${NC}\n"

# Generar coordenadas aleatorias dentro de un área (Madrid, España)
BASE_LAT=40.416
BASE_LON=-3.703
MAX_VARIATION=0.005

# Batería y señal
BATTERY_LEVEL=100
SIGNAL_STRENGTH=-60
BATTERY_DRAIN_RATE=0.5

# Función para generar números aleatorios en un rango
random_float() {
  local min=$1
  local max=$2
  echo "scale=6; $min + ($max - $min) * $RANDOM / 32767" | bc
}

# Función para generar datos de señal realistas
update_signal() {
  local base=$1
  local variation=5
  echo "scale=4; $base + ($RANDOM % $variation) - ($variation / 2)" | bc
}

while true; do
  # Generar coordenadas
  LAT=$(random_float $(echo "$BASE_LAT - $MAX_VARIATION" | bc) $(echo "$BASE_LAT + $MAX_VARIATION" | bc))
  LON=$(random_float $(echo "$BASE_LON - $MAX_VARIATION" | bc) $(echo "$BASE_LON + $MAX_VARIATION" | bc))
  
  # Generar precisión aleatoria entre 1 y 10 metros
  ACCURACY=$(random_float 1 10)
  
  # Actualizar batería y señal
  BATTERY_LEVEL=$(echo "$BATTERY_LEVEL - $BATTERY_DRAIN_RATE" | bc)
  if (( $(echo "$BATTERY_LEVEL < 0" | bc -l) )); then
    BATTERY_LEVEL=0
  fi
  SIGNAL_STRENGTH=$(update_signal "$SIGNAL_STRENGTH")
  
  echo -e "${BLUE}Generando coordenadas:${NC} Lat: $LAT, Lon: $LON, Precisión: $ACCURACY m"
  echo -e "${YELLOW}Batería:${NC} $BATTERY_LEVEL%, ${YELLOW}Señal:${NC} $SIGNAL_STRENGTH dBm"

  # Construir el JSON para la petición
  if [ -n "$SUPPLIER_ID" ]; then
    # JSON sin company_id para el endpoint específico de proveedor
    JSON_DATA="{\"card_number\":\"$CARD_NUMBER\",\"latitude\":$LAT,\"longitude\":$LON,\"accuracy\":$ACCURACY,\"auth_key\":\"$AUTH_KEY\",\"battery_level\":$BATTERY_LEVEL,\"signal_strength\":$SIGNAL_STRENGTH}"
  else
    # JSON con company_id para el endpoint general
    JSON_DATA="{\"card_number\":\"$CARD_NUMBER\",\"company_id\":\"$DEFAULT_COMPANY_ID\",\"latitude\":$LAT,\"longitude\":$LON,\"accuracy\":$ACCURACY,\"auth_key\":\"$AUTH_KEY\",\"battery_level\":$BATTERY_LEVEL,\"signal_strength\":$SIGNAL_STRENGTH}"
  fi

  # Enviar datos via curl
  RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$JSON_DATA" $FINAL_ENDPOINT)
  
  echo -e "${GREEN}Enviando datos:${NC} $JSON_DATA"
  echo -e "${GREEN}Respuesta:${NC} $RESPONSE\n"
  
  # Dormir por 5 segundos
  sleep 5
done 