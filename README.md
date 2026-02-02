# 🎨 Muralia - Manual de Despliegue e Instalación

Este manual describe los pasos necesarios para desplegar la aplicación **Muralia** en un entorno local para propósitos de desarrollo o pruebas.

## 📋 1. Requisitos Previos

Antes de iniciar, asegúrese de tener instalado el siguiente software en su equipo:

- **[Node.js]** y **NPM**.
- **[Git]** (para clonar el repositorio).
- **MongoDB** (Servicio local corriendo o una URI de conexión a MongoDB Atlas).
- **Angular CLI** (Instalado globalmente):
  ```bash
  npm install -g @angular/cli

  ## 2. Instalación del Proyecto

El proyecto se encuentra alojado en un repositorio único que contiene tanto el Backend como el Frontend.

### Paso 1: Clonar el repositorio

Abra una terminal y ejecute:

```bash
git clone https://github.com/alvarops11/Muralia
cd muralia

### Paso 2: Configuración del Backend

Navegue a la carpeta del servidor e instale las dependencias:

```bash
cd backend-api
npm install

Cree un archivo .env en la raíz de la carpeta backend-api con las siguientes variables de entorno (necesarias para la conexión a BBDD y seguridad):

```bash
PORT=3000
MONGO_URI=mongodb+srv://alvaroperez24_db_user:n1KrJSaGMepNS5UA@muralia.nndourt.mongodb.net/Muralia_DB?appName=Muralia
JWT_SECRET=secreto_temporal_super_seguro
NODE_ENV=development

Para iniciar el servidor:
```bash
npm run dev
# El servidor escuchará en http://localhost:3000
