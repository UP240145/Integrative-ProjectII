```md
# Sistema Esencia Madera - Backend / API

## Descripción
API REST y núcleo lógico del Sistema Esencia Madera. Gestiona la persistencia de datos relacionales, el control de inventarios, el procesamiento de cotizaciones a medida, citas y la generación de reportes financieros.

---

## 1. Código Fuente y Arquitectura
El código fuente de este módulo se encuentra estructurado para excluir carpetas innecesarias o pesadas (como `node_modules` o compilados `dist`), manteniendo únicamente los archivos lógicos de la aplicación, controladores y rutas.

---

## 2. Diagrama de la Base de Datos (Modelo Relacional)
```text
+-----------------------+           +-----------------------+           +-----------------------+           +-----------------------+
|      appointments     |           |         Client        |           |         Quote         |           |      work_orders      |
+-----------------------+           +-----------------------+           +-----------------------+           +-----------------------+
| PK id_appointment     |           | PK id_client          |           | PK id_quote           |           | PK id_work_order      |
| FK id_client          |--------o<-| full_name             |--------o<-| FK id_client          |--------o<-| FK id_quote           |
| appointment_type      |           | email                 |           | furniture_type        |           | status                |
| appointment_date      |           | address               |           | width                 |           | updated_at            |
| appointment_time      |           | phone                 |           | height                |           |                       |
| address               |           | created_at            |           | depth                 |           +-----------------------+
| notes                 |           +-----------------------+           | calculated_cost       |
+-----------------------+                                               | final_price           |
                                                                        | status                |
                                                                        | created_at            |
                                                                        +-----------------------+
                                                                                    |
                                                                                    |
+-----------------------+                                                           |
|          User         |                                                           |
+-----------------------+                                                           v
| PK id_user            |                                               +-----------------------+
| email                 |                                               |    quote_materials    |
| password              |                                               +-----------------------+
| created_at            |                                               | PK id_quote_materials |
+-----------------------+                                               | FK id_quote           |
                                                                        | FK id_wood            |----o
                                                                        | calculated_quantity   |    |
                                                                        +-----------------------+    |
                                                                                                     |
                                                                        +-----------------------+    |
                                                                        |       Inventory       |<---o
                                                                        +-----------------------+
                                                                        | PK id_wood            |
                                                                        | name                  |
                                                                        | stock_quantity        |
                                                                        | price                 |
                                                                        | min_stock_alert       |
                                                                        +-----------------------+

```

---

## 3. Scripts de Creación de Tablas (SQL)

```sql
CREATE TABLE Client (
    id_client INT(11) AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(100),
    address VARCHAR(255),
    phone VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
    id_appointment INT(11) AUTO_INCREMENT PRIMARY KEY,
    id_client INT(11) NOT NULL,
    appointment_type VARCHAR(100),
    appointment_date DATE,
    appointment_time TIME,
    address VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (id_client) REFERENCES Client(id_client)
);

CREATE TABLE User (
    id_user INT(11) AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Inventory (
    id_wood INT(11) AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    stock_quantity INT(11) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    min_stock_alert INT(11) DEFAULT 10
);

CREATE TABLE Quote (
    id_quote INT(11) AUTO_INCREMENT PRIMARY KEY,
    id_client INT(11) NOT NULL,
    furniture_type VARCHAR(20) NOT NULL,
    width INT(11) NOT NULL,
    height INT(11) NOT NULL,
    depth INT(11) NOT NULL,
    calculated_cost DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_client) REFERENCES Client(id_client)
);

CREATE TABLE work_orders (
    id_work_order INT(11) AUTO_INCREMENT PRIMARY KEY,
    id_quote INT(11) NOT NULL,
    status VARCHAR(20),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_quote) REFERENCES Quote(id_quote)
);

CREATE TABLE quote_materials (
    id_quote_materials INT(11) AUTO_INCREMENT PRIMARY KEY,
    id_quote INT(11) NOT NULL,
    id_wood INT(11) NOT NULL,
    calculated_quantity DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_quote) REFERENCES Quote(id_quote),
    FOREIGN KEY (id_wood) REFERENCES Inventory(id_wood)
);

```

---

## 4. Librerías y Dependencias Empleadas

El proyecto utiliza las siguientes librerías principales para su funcionamiento:

* **`express`**: Framework minimalista para la creación de rutas y manejo del servidor HTTP en Node.js.
* **`mysql2`**: Conector optimizado para la comunicación asíncrona con la base de datos relacional MySQL.
* **`bcryptjs`**: Utilizado para el cifrado seguro de contraseñas de usuario.
* **`dotenv`**: Manejo seguro de variables de entorno globales.
* **`jose`**: Implementación para la generación y validación de tokens de sesión/autenticación.

---

## 5. Comandos de Instalación y Ejecución

### Instalación de dependencias

Ejecuta el siguiente comando en la terminal dentro de la carpeta del backend:

```bash
npm install

```

### Ejecución en entorno de desarrollo

Para iniciar el servidor local con recarga automática:

```bash
npm run dev

```

---

## 6. Ruta del README.md Correspondiente

* **Ubicación exacta del archivo:** `src\app\api\README.md`

```

```