# TortuTAM — Reglas del proyecto

## Sobre el proyecto
Aplicación de captura de datos de campo para el Programa Binacional de Recuperación de la Tortuga Lora: fichas de anidación, marcado por aleta, limpieza/exhumación de nido y varamientos.

## Decisiones técnicas
- Backend: ASP.NET Core (C#).
- Base de datos: SQL Server (el esquema en `database/schema/esquema_base_datos.sql` está en sintaxis MySQL/MariaDB y debe portarse a T-SQL antes de usarse; las modificaciones a partir de ahora se registran como migraciones numeradas en `database/migrations/`, ver plantilla en `database/migrations/README.md`).
- Cliente: sitio web responsivo (sin apps nativas por ahora), instalable como PWA, con vistas optimizadas para móvil. El boceto original (`docs/referencia/index.html`) es solo referencia visual/UX, no se edita; el código real se construye desde cero en `src/TortuTAM.Web/`, mismo tratamiento que el esquema heredado.
- Offline: la app debe funcionar sin conexión en campo y sincronizar al recuperar señal.
- GPS: captura obligatoria de coordenadas en cada toma de datos.
- Imágenes: la app debe permitir adjuntar fotos a la ficha.
- Hosting: aún sin definir (probable AWS a futuro); no hay servidor, dominio ni presupuesto asignado todavía.
- Idioma de la UI: español únicamente por ahora; inglés queda para una fase futura, no prioritario.
- Exportación de datos y cronograma del proyecto: pendientes, sin definir todavía.

## Pendientes de alcance
Documentar como issue antes de tocar catálogos o tablas relacionadas:
- Especies a cubrir (el esquema actual ya soporta más de una).
- Número de playas/organizaciones participantes.
- Roles de usuario (quién captura vs. quién solo consulta/reporta).
- Qué implica "binacional" en este proyecto.

## Idioma y tono
- Responder siempre en español.
- Documentación, UI, commits e issues en español, salvo que se indique lo contrario.

## Atribución
- No incluir menciones a Claude, Anthropic, IA generativa ni frases equivalentes ("realizado por", "escrito por", etc.) en código, comentarios, README, issues, descripciones de PR ni ningún otro documento del proyecto.
- Excepción única: la línea de coautoría en commits y pull requests es una política fija de la herramienta y no se omite ahí. No debe aparecer en ningún otro lugar del proyecto.

## Agentes del proyecto
Usar estos subagentes para las tareas correspondientes en lugar de resolverlo todo desde el hilo principal:
- `git-tortutam`: operaciones de git (ramas, commits, merges, resolución de conflictos).
- `github-tortutam`: gestión de GitHub (issues, pull requests, labels, milestones, releases).
- `redaccion-tortutam`: redacción técnica y documentación — issues, descripciones de PR, README, notas de release, documentación general.
- `sql-server-tortutam`: esquema, índices, stored procedures y migración de MySQL a T-SQL.
- `csharp-tortutam`: backend en C#/ASP.NET Core (endpoints, sincronización offline, autenticación, carga de imágenes).
- `frontend-tortutam`: HTML/CSS del sitio web responsivo, consistencia visual y base para PWA.

## Skills
- `caveman`: solo cuando el usuario la invoque explícitamente.
- Skill de UX/diseño (`ui-ux-pro-max` u otra): solo cuando el usuario la invoque explícitamente.
- Fuera de esas invocaciones, no aplicar estos modos por defecto.

## Flujo de trabajo
- No crear el repositorio de GitHub ni hacer push hasta que el usuario lo indique explícitamente.
- Confirmar antes de acciones difíciles de revertir (force-push, reset --hard, eliminar ramas, etc.).
