# Cuarto Oscuro

Test de ideología política argentina. Ubica a quien lo hace en 4 ejes (Economía, Valores, Mundo, Orden) frente a 25 partidos nacionales, con campañas, votos de sus legisladores y proyectos, todo con fuentes enlazadas. **No es una recomendación de voto.**

Sitio: https://cuarto-oscuro.vercel.app

## Funciones
- Versión corta (15 preguntas) y completa (44), con peso doble por pregunta.
- Resultado compartible por enlace (las respuestas viajan en el hash) y tarjeta PNG.
- Filtro por sección (campañas, votos, proyectos) y ficha por partido (`#partido/<slug>`).
- Explorador de votaciones con tablas por bloque del Senado (actas oficiales).
- Línea de tiempo de leyes y decretos desde 1983 (curada y verificada, **no exhaustiva**) y cifras de DNU.
- Aviso de contradicciones entre discurso y voto, y fecha de relevamiento por dato.
- Modo claro/oscuro, navegación por teclado, tests con Playwright y axe.

## Correr localmente
Los datos se cargan con `fetch`, así que hace falta un servidor estático (no abre con `file://`):

```
npm install
npm start      # http://localhost:4173
npm test
```

## Estructura de datos (`data/`)
- `questions.json`: ejes, opciones y preguntas (`core: true` = versión corta).
- `parties.json`: partidos (`c` = [Economía, Valores, Mundo, Orden], `ev` = A/B/C de evidencia, `vv` = postura en cada votación, `ct` = aviso, `asof` = fecha).
- `votes.json`: definiciones de votaciones y actas del Senado por bloque.
- `dnu.json`, `timeline.json`, `content.json`, `meta.json`.

Para actualizar: editar el JSON, cambiar `asof` y `meta.updated`, correr `npm test` y hacer push a `main` (Vercel despliega solo).

## Límites
El sitio de votaciones nominales de Diputados no permite lectura automatizada; sus cifras salen de la prensa y Parlamentario. Las posiciones de los partidos son estimaciones.
