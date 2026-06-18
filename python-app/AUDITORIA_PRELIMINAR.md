# 🛡️ Reporte de Auditoría de Seguridad y Funcionalidad - Tu POS v1.0

## 🚨 Hallazgos Críticos

### 1. Vulnerabilidad de Bypass de Autenticación (ALTA)
**Archivo:** `main.py`
**Función:** `get_logged_user_bypass()`
**Descripción:** Existe una función expuesta al frontend (`@eel.expose`) que permite obtener una sesión de administrador sin contraseña.
**Riesgo:** Un usuario malintencionado podría ejecutar `eel.get_logged_user_bypass()` desde la consola del navegador developer tools (F12) y obtener acceso total al sistema sin conocer la contraseña.
**Recomendación:** **Eliminar esta función** en la versión de producción o protegerla con una variable de entorno `DEBUG_MODE`.

### 2. Almacenamiento de Contraseñas Débil (MEDIA)
**Archivo:** `api/users.py`
**Función:** `hash_password()`
**Descripción:** Las contraseñas se almacenan usando SHA-256 sin "salt".
**Riesgo:** Susceptible a ataques de diccionario o Rainbow Tables si la base de datos es comprometida. Dos usuarios con la misma contraseña tendrán el mismo hash.
**Recomendación:** Implementar `bcrypt` o `Argon2`, o al menos agregar un salt aleatorio por usuario antes de hashear.

## ⚠️ Hallazgos de Configuración y Lógica

### 3. Inconsistencia entre Configuración y Base de Datos (MEDIA)
**Archivos:** `config.json` vs `database.py`
**Descripción:** El archivo `config.json` puede indicar `"setup_completed": true`, pero si la base de datos `inventory.db` se corrompe o elimina, el sistema intentará iniciar sesión sin usuarios existentes (o creará al admin por defecto silenciosamente).
**Riesgo:** Si un instalador incluye un `config.json` pre-marcado como completado, el usuario final podría quedar bloqueado o confundido.
**Recomendación:** En `main.py`, validar siempre al inicio si `COUNT(users) == 0`. Si es así, forzar el Setup Wizard independientemente del `config.json`.

### 4. Concurrencia en SQLite (BAJA/MEDIA)
**Contexto:** Modo Multicaja
**Descripción:** SQLite bloquea todo el archivo para escrituras. Si múltiples cajas intentan cerrar ventas exactamente al mismo milisegundo, podrían recibir errores de "Database is locked" o timeouts.
**Recomendación:** Implementar un mecanismo de "búsqueda y reintento" (retry) en las transacciones de base de datos, o migrar a PostgreSQL/MariaDB si el volumen de transacciones es alto.

## ✅ Puntos Fuertes (Integridad)

*   **Transacciones Atómicas:** El sistema utiliza correctamente `conn.commit()` y `rollback` para asegurar que las ventas y el descuento de inventario ocurran simultáneamente o no ocurran, evitando inconsistencias de stock.
*   **Validación de Stock:** La lógica respeta la configuración de permitir o negar stocks negativos.
*   **Permisos:** El sistema cuenta con una estructura de permisos granular (JSON en BD) que es extensible.

## 📋 Plan de Acción Inmediato

1.  [URGENTE] Comentar o eliminar `get_logged_user_bypass` en `main.py`.
2.  Modificar el script de instalación para asegurar que `config.json` se instale limpio (`setup_completed: false`).
3.  Agregar validación de "Usuarios Cero" en el arranque de la aplicación.
