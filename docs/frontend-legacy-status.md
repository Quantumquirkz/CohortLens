# Estado Actual del Frontend (Legacy)

## Arquitectura
- **Framework**: Next.js
- **Lenguaje**: TypeScript
- **Estilos**: TailwindCSS
- **Gestión de Estado**: React Context API
- **Autenticación**: JWT

## Estructura de Archivos
- **Componentes**: `/components`
- **Hooks**: `/hooks`
- **Librerías**: `/lib`
- **Estilos Globales**: `/styles`
- **Configuraciones**: `next.config.mjs`, `tsconfig.json`

## Funcionalidades Clave
1. **Login**: Pantalla de autenticación con validación de credenciales.
2. **Dashboard**: Visualización de métricas y reportes.
3. **Predict**: Predicción de gastos basada en datos históricos.
4. **Segment**: Segmentación de usuarios por reglas definidas.
5. **Recommendations**: Recomendaciones personalizadas.

## Estado Actual
- **Activo**: Sí, pero marcado como legacy.
- **Nuevas Características**: Congeladas.
- **Soporte**: Solo fixes críticos.

## Próximos Pasos
- Migrar flujos clave al cliente React Native.
- Retirar soporte después de la migración completa.