# Proceso de Congelamiento de Nuevas Características en Python

## Objetivo
Congelar el desarrollo de nuevas características en el backend Python (`apps/api`) para enfocarse en la migración a TypeScript (`apps/api-ts`). Solo se permitirán fixes críticos.

## Criterios para Fixes Críticos
1. **Errores Bloqueantes**: Problemas que impiden el uso de funcionalidades clave.
2. **Vulnerabilidades de Seguridad**: Cualquier problema que comprometa la seguridad de los datos o usuarios.
3. **Compatibilidad**: Cambios necesarios para mantener la interoperabilidad con otros sistemas.

## Proceso
1. **Identificación**:
   - Los desarrolladores deben etiquetar los problemas como `critical-fix` en el sistema de seguimiento de tareas.
2. **Revisión**:
   - El equipo de backend revisará y aprobará los fixes críticos en reuniones semanales.
3. **Implementación**:
   - Los fixes aprobados se implementarán en ramas específicas y se fusionarán tras pasar las pruebas.
4. **Documentación**:
   - Cada fix debe incluir una descripción detallada y pruebas asociadas.

## Estado Actual
- **Activo**: Sí, el backend Python está en modo de mantenimiento.
- **Nuevas Características**: Congeladas.
- **Soporte**: Solo fixes críticos.

## Próximos Pasos
- Monitorear el sistema para identificar problemas críticos.
- Priorizar la migración de funcionalidades al backend TypeScript.