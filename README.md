# TortuTAM

Aplicación de captura de datos de campo para el Programa Binacional de Recuperación de la Tortuga Lora: fichas de anidación, marcado por aleta, limpieza/exhumación de nido y varamientos.

## Estado actual

Proyecto en fase de planteamiento. Aún no hay código funcional; lo que existe hoy es la estructura del repositorio y dos referencias heredadas que se reconstruyen desde cero para evitar arrastrar deuda técnica: el boceto de interfaz (`docs/referencia/`) y el esquema de base de datos del proceso en papel (`database/schema/`).

## Stack definido

- Backend: ASP.NET Core (C#)
- Base de datos: SQL Server
- Frontend: sitio web responsivo (HTML/CSS/JS), instalable como PWA, con captura offline y sincronización posterior
- Captura de GPS e imágenes obligatoria en cada toma de datos

Detalle completo de decisiones y pendientes en [docs/planteamiento.md](docs/planteamiento.md).

## Estructura del repositorio

```
src/TortuTAM.Api/     backend ASP.NET Core
src/TortuTAM.Web/     frontend web, construido desde cero
database/schema/      estado vigente de la base de datos
database/migrations/  historial de cambios a la base de datos, numerado
docs/                 planteamiento, documentación y referencias heredadas del proyecto
```

Convención de migraciones SQL en [database/migrations/README.md](database/migrations/README.md).

## Pendientes conocidos

Ver [docs/planteamiento.md](docs/planteamiento.md#pendientes) y los issues abiertos del repositorio.
