# Médicos de Delicias

Directorio de profesionales de la salud con cédula verificada, agenda propia
por profesional y asistente con inteligencia artificial, para la región
centro-sur de Chihuahua.

## Cómo está organizado

```
src/config/sitio.ts               nombre, dominio y umbral de publicación
src/datos/semilla.ts              catálogos de arranque y perfiles
src/lib/catalogo.ts               consultas y regla de publicación
src/app/[ciudad]                  página de ciudad
src/app/[ciudad]/[especialidad]   página de especialidad en esa ciudad
src/app/medico/[slug]             perfil del profesional
prisma/schema.prisma              modelo de datos
```

## Dos reglas que explican el resto

**Las direcciones empiezan por la ciudad.** `/delicias/cirugia-general`,
`/camargo/pediatria`. Sumar una ciudad es dar de alta un registro, no rehacer
el sitio. El perfil del profesional vive aparte, en `/medico/slug`, porque un
mismo médico puede atender en varias ciudades.

**Una página de catálogo se publica al reunir un mínimo de profesionales.**
Mientras no lo alcanza responde con normalidad para quien tiene el enlace,
pero pide no ser indexada y no entra al mapa del sitio. Es lo que evita el
contenido delgado que hunde a los directorios nuevos. El mínimo vive en la
configuración y, más adelante, en el panel.

## Entorno

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
```

Variables, todas opcionales mientras no hay base de datos:

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SITIO_NOMBRE` | Nombre de la plataforma; por requisito del cliente nunca va escrito en el código |
| `NEXT_PUBLIC_SITIO_DOMINIO` | Dominio público |
| `UMBRAL_PUBLICACION` | Mínimo de profesionales para publicar una página de catálogo |
| `SITIO_PUBLICADO` | `si` abre el sitio a los buscadores; cualquier otro valor lo mantiene cerrado |
| `DATABASE_URL` | PostgreSQL, cuando se conecte la base |

## Estado

Hito 1 en curso: estructura, catálogos, páginas por ciudad y por especialidad,
perfil del profesional, datos estructurados y mapa del sitio. Quedan por
hacer, dentro del mismo hito, el panel de administración y la identidad
visual definitiva.
