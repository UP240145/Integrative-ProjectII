# Sistema Esencia Madera - Documentación de la API (Colección de Postman)

Este directorio contiene la colección oficial de endpoints para probar el backend de **Sistema Esencia Madera** (proyecto desarrollado en Next.js con base de datos SQL). 

Puedes importar el archivo JSON incluido (`Sistema Esencia Madera - API.postman_collection.json`) directamente en [Postman](https://www.postman.com/) para probar y validar el funcionamiento de cada ruta.

---

## Estructura y Endpoints de la Colección

La colección está organizada por módulos funcionales del sistema. A continuación se detallan todas las peticiones configuradas, incluyendo sus métodos HTTP, rutas, parámetros y cuerpos de solicitud (`body`) según el archivo exportado:

### 1. Admins (Administradores)
* **Listar Admins**
  * `GET http://localhost:3000/api/admins`
  * **Descripción:** Obtiene la lista completa de administradores registrados en el sistema.
* **Crear Admin**
  * `POST http://localhost:3000/api/admins`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "email": "admin@esenciamadera2.com",
      "password": "password123"
    }
    ```
* **Obtener Admin por ID**
  * `GET http://localhost:3000/api/admins/1`
  * **Descripción:** Consulta los detalles de un administrador específico mediante su ID.
* **Actualizar Admin**
  * `GET http://localhost:3000/api/admins/8` *(Nota: Configurado con método GET/Body según exportación)*
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "email": "nuevo.correo@esenciamadera.com",
      "password": "nuevaPassword123"
    }
    ```
* **Eliminar Admin**
  * `DELETE http://localhost:3000/api/admins/8`
  * **Descripción:** Elimina lógicamente o físicamente al administrador indicado por su ID.

---

### 2. Appointments (Citas)
* **Listar Citas**
  * `GET http://localhost:3000/api/appointments`
  * **Descripción:** Devuelve la agenda completa de citas programadas.
* **Crear Cita**
  * `POST http://localhost:3000/api/appointments`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "id_client": 8,
      "appointment_type": "medir",
      "appointment_date": "2026-08-10",
      "appointment_time": "10:00",
      "notes": "Primera cita de prueba"
    }
    ```
* **Reagendar Cita**
  * `PUT http://localhost:3000/api/appointments/14`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "appointment_date": "2026-08-11",
      "appointment_time": "11:30"
    }
    ```
* **Cancelar Cita**
  * `DELETE http://localhost:3000/api/appointments/13`
  * **Descripción:** Cancela o elimina la cita especificada.
* **Consultar Disponibilidad**
  * `GET http://localhost:3000/api/appointments/availability?date=2026-08-11&type=instalar`
  * **Descripción:** Verifica los horarios disponibles en una fecha dada para un tipo de cita específico (considerando buffers y duraciones).

---

### 3. Autenticación (Autenticacion)
* **Iniciar Sesión**
  * `POST http://localhost:3000/api/auth/login`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "email": "admin@carpinteria.com",
      "password": "admin123"
    }
    ```
* **Cerrar Sesión**
  * `POST http://localhost:3000/api/auth/logout`
  * **Descripción:** Invalida la sesión actual del administrador.

---

### 4. Clientes (Clientes)
* **Listar Clientes por Búsqueda**
  * `GET http://localhost:3000/api/clients?search=Pa`
  * **Descripción:** Filtra clientes cuyo nombre o datos coincidan con el término de búsqueda.
* **Crear Cliente**
  * `POST http://localhost:3000/api/clients`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "full_name": "Juan Pérez",
      "email": "juan.perez@example.com",
      "phone": "4491234567",
      "address": "Calle Principal #123"
    }
    ```
* **Obtener Cliente por ID**
  * `GET http://localhost:3000/api/clients/8`
* **Actualizar Cliente**
  * `PUT http://localhost:3000/api/clients/9`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "full_name": "Juan Pérez Actualizado",
      "email": "juan.nuevo@example.com",
      "phone": "4499887766",
      "address": "Nueva Calle #456"
    }
    ```
* **Eliminar Cliente**
  * `DELETE http://localhost:3000/api/clients/9`
* **Listar Todos los Clientes**
  * `GET http://localhost:3000/api/clients/all`
  * **Descripción:** Obtiene el directorio general de clientes sin filtros.

---

### 5. Inventario (Inventario)
* **Listar Todo el Inventario**
  * `GET http://localhost:3000/api/inventory`
* **Agregar Nuevo Material**
  * `POST http://localhost:3000/api/inventory`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "name": "Madera de Pino",
      "stock_quantity": 50,
      "price": 350.50,
      "min_stock_alert": 10
    }
    ```
* **Obtener Detalle de Material por ID**
  * `GET http://localhost:3000/api/inventory/11`
* **Actualizar Material**
  * `PUT http://localhost:3000/api/inventory/11`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "name": "Madera de Pino Modificada",
      "price": 380.00,
      "min_stock_alert": 15
    }
    ```
* **Agregar Stock a Material**
  * `PATCH http://localhost:3000/api/inventory/11`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "quantity": 25
    }
    ```
* **Eliminar Material**
  * `DELETE http://localhost:3000/api/inventory/11`

---

### 6. Cotizaciones (Cotizaciones)
* **Listar Cotizaciones**
  * `GET http://localhost:3000/api/quotes`
* **Crear Cotización**
  * `POST http://localhost:3000/api/quotes`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "id_client": 8,
      "furniture_type": "Clóset",
      "material": "Madera de Pino",
      "width": 200,
      "height": 220,
      "depth": 60,
      "calculated_cost": 2500.00,
      "final_price": 4500.00,
      "status": "pendiente",
      "notes": "Diseño especial con repisas"
    }
    ```
* **Obtener Cotización por ID**
  * `GET http://localhost:3000/api/quotes/10`
* **Actualizar Cotización**
  * `PUT http://localhost:3000/api/quotes/14`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "furniture_type": "Mesa de Centro Modificada",
      "width": 120,
      "height": 45,
      "depth": 60,
      "calculated_cost": 1200.00,
      "final_price": 2200.00,
      "status": "aceptada",
      "notes": "Se actualizaron las medidas"
    }
    ```
* **Actualizar Estado de Cotización**
  * `PATCH http://localhost:3000/api/quotes/13/status`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "status": "aceptada"
    }
    ```

---

### 7. Reportes (Reportes)
* **Obtener Reportes del Mes**
  * `GET http://localhost:3000/api/reports?month=2024-06`
  * **Descripción:** Genera estadísticas y métricas financieras o operativas correspondientes al mes especificado.

---

### 8. Órdenes de Trabajo (Ordenes de trabajo)
* **Listar Órdenes de Trabajo**
  * `GET http://localhost:3000/api/work-orders`
* **Crear Orden de Trabajo**
  * `POST http://localhost:3000/api/work-orders`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "id_quote": 13
    }
    ```
* **Cancelar Orden de Trabajo**
  * `POST http://localhost:3000/api/work-orders/11/cancel`
  * **Descripción:** Cambia el estado de la orden a `"cancelada"`, revierte la cotización asociada a `"pendiente"` y repone automáticamente los materiales calculados al inventario.
* **Completar Orden de Trabajo**
  * `POST http://localhost:3000/api/work-orders/10/complete`
  * **Headers:** `Content-Type: application/json`
  * **Body (JSON):**
    ```json
    {
      "appointment_date": "2026-08-10",
      "appointment_time": "11:00",
      "address": "Calle Principal #123",
      "notes": "Entrega de mueble terminado"
    }
    ```
  * **Descripción:** Marca la orden como `"completada"` y agenda automáticamente la cita de entrega correspondiente validando disponibilidad y conflictos de horario.

---

## Instrucciones de Importación en Postman
1. Abre **Postman**.
2. Haz clic en el botón **Import** ubicado en la parte superior izquierda.
3. Arrastra o selecciona el archivo `Sistema Esencia Madera - API.postman_collection.json` dentro de esta carpeta.
4. ¡Listo! Todas las carpetas y peticiones quedarán configuradas para apuntar a tu entorno local (`http://localhost:3000`).