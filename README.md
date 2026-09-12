# Películas Neón — versión gratuita compartida

Esta versión está preparada para publicar la web en Internet usando:

- **Render Free** → ejecuta la aplicación Node/Express y proporciona una URL pública `onrender.com`.
- **Supabase Free** → almacena el catálogo en PostgreSQL para que todos los visitantes vean las mismas películas.

Render ofrece Web Services gratuitos y una URL pública; su plan gratuito puede apagarse después de 15 minutos sin tráfico y volver a arrancar cuando llegue una petición.
Supabase Free proporciona una base PostgreSQL gratuita con 500 MB por proyecto.

## 1. Crear la base de datos

Crea una cuenta gratuita en Supabase y crea un proyecto.

En el panel de Supabase busca la información de conexión de PostgreSQL y copia la **connection string**.

No publiques esa cadena ni la compartas con otras personas.

## 2. Subir este proyecto a GitHub

Crea un repositorio nuevo en GitHub y sube TODOS los archivos de esta carpeta.

No necesitas hacer público el repositorio si conectas Render a tu cuenta de GitHub.

## 3. Crear la web gratuita en Render

En Render:

1. New → Web Service.
2. Conecta GitHub.
3. Selecciona el repositorio.
4. Runtime/Language: Node.
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Plan: **Free**.

En Environment Variables añade:

`DATABASE_URL` = la connection string de Supabase

`ADMIN_PASSWORD` = `MiMario0098`

`SESSION_SECRET` = una cadena larga aleatoria, por ejemplo:
`mario-peliculas-7f3a9d1c-una-clave-larga-2026`

Después crea el Web Service.

Render te dará una dirección parecida a:

`https://peliculas-neon-xxxx.onrender.com`

Esa será la dirección que puedes compartir.

## Importante

La contraseña está configurada por defecto como `MiMario0098`, pero para una web pública es mejor establecerla como variable `ADMIN_PASSWORD` en Render.

El catálogo NO se guarda en el navegador. Se guarda en PostgreSQL, por lo que todos los visitantes consultan la misma base de datos.

El servidor gratuito puede tardar aproximadamente un minuto en despertar después de un periodo sin visitas. Esto es una limitación del alojamiento gratuito.

## Vídeos

La aplicación necesita una URL de vídeo que el navegador pueda reproducir. Son especialmente adecuados:

- MP4 directo
- HLS `.m3u8`

Para HLS se utiliza hls.js y, cuando la fuente proporciona varias variantes, se muestran las calidades disponibles.

El reproductor puede hacer play/pausa, pantalla completa, desplazamiento por la duración y salto exacto a horas/minutos/segundos.

La continuidad final depende también del servidor/CDN que proporciona el vídeo. La web no puede evitar cortes causados por una fuente externa lenta o inestable.

## Seguridad

El panel de administración está protegido por contraseña y las operaciones de crear, modificar y eliminar se hacen en el servidor.

Para una publicación real, cambia `ADMIN_PASSWORD` y `SESSION_SECRET` en Render y no los pongas dentro del código fuente.
