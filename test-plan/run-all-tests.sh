#!/bin/bash

# Colores para la salida
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== Iniciando ejecución de pruebas completas para Novack Backend =====${NC}"
echo ""

# Directorio para guardar resultados
mkdir -p test-results

# Función para ejecutar tests y verificar resultado
run_test() {
  local test_name=$1
  local test_command=$2
  
  echo -e "${YELLOW}Ejecutando pruebas para: ${test_name}${NC}"
  
  # Ejecutar los tests y capturar el resultado
  eval $test_command > "test-results/${test_name}.log" 2>&1
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Pruebas para ${test_name} completadas exitosamente${NC}"
    return 0
  else
    echo -e "${RED}✗ Pruebas para ${test_name} fallaron${NC}"
    return 1
  fi
}

# Inicializar contador de errores
errors=0

echo "Iniciando pruebas de servicios:"
echo "------------------------------"

# Ejecutar todas las pruebas de servicios existentes
run_test "FileStorageService" "pnpm run pnpm:test:s3"
[ $? -ne 0 ] && errors=$((errors+1))

run_test "AuthService" "pnpm run pnpm:test:auth"
[ $? -ne 0 ] && errors=$((errors+1))

run_test "EmployeeService" "pnpm run pnpm:test:employee"
[ $? -ne 0 ] && errors=$((errors+1))

run_test "VisitorService" "pnpm run pnpm:test:visitor"
[ $? -ne 0 ] && errors=$((errors+1))

run_test "SupplierService" "pnpm run pnpm:test:supplier"
[ $? -ne 0 ] && errors=$((errors+1))

echo ""
echo "Iniciando pruebas de controladores:"
echo "--------------------------------"

run_test "DatabaseResetController" "pnpm run pnpm:test:db-reset"
[ $? -ne 0 ] && errors=$((errors+1))

run_test "EmployeeController" "pnpm run pnpm:test:employee-controller"
[ $? -ne 0 ] && errors=$((errors+1))

echo ""
echo "Iniciando pruebas de guardias:"
echo "--------------------------"

run_test "AuthGuard" "pnpm run pnpm:test:guard"
[ $? -ne 0 ] && errors=$((errors+1))

echo ""
echo -e "${YELLOW}===== Resumen de pruebas =====${NC}"
if [ $errors -eq 0 ]; then
  echo -e "${GREEN}Todas las pruebas se ejecutaron exitosamente✓${NC}"
else
  echo -e "${RED}Hubo errores en $errors conjunto(s) de pruebas✗${NC}"
  echo -e "Revise los logs en la carpeta test-results/ para más detalles"
fi

exit $errors 