# Lente

Editor de fotos para el celular. Por ahora: efecto ojo de pez (círculo o pantalla completa, curva,
alcance, centro tocando la foto y oscurecer orillas). Todo se procesa en el teléfono: la foto no se sube.

Publicada en https://gamitadiaz.github.io/fotos/ en cada push a `main`.

```
npm install
npm run dev
```

## Cómo se publica

Cada `git push` a `main` corre [`.github/workflows/publicar.yml`](.github/workflows/publicar.yml): GitHub compila
con `npm run build` (sale en `dist/`) y lo sube a GitHub Pages. La app guarda una copia en el celular,
así que abre sin internet y se actualiza sola.

## Qué hace cada archivo

```
index.html                 Página base: título, colores de la barra del celular, ícono
vite.config.ts             Configuración: subruta /fotos/ y datos para instalar la app (PWA)
public/                    Íconos (icono.svg y los PNG generados con rsvg-convert)
src/
  main.tsx                 Arranque: fuente, estilos y modo sin internet
  App.tsx                  La pantalla: elegir foto, vista previa, controles, tocar para centrar, guardar/compartir
  estilos.css              Diseño "cuarto oscuro" con acento ámbar, deslizadores y barra inferior
  lib/
    ojoDePez.ts            El efecto: para cada píxel de la foto final calcula de qué punto de la original
                           viene (θ = r·a contra tan θ) y mezcla los 4 vecinos para que no se pixele
```

### Cómo funciona el ojo de pez

Una foto normal reparte lo que ve según `tan(θ)`; un lente ojo de pez lo reparte parejo (`θ`). Por eso el centro
se ve más grande y las orillas se curvan y se aprietan. **Curva** cambia el ángulo del lente (de ~20° a ~86°),
**Alcance** cuánto de la foto entra, y en modo **círculo** se toma hasta la orilla más cercana al centro para que
el círculo quede siempre lleno.

La vista previa se calcula a 900 px para que responda al instante; al guardar se procesa a 3200 px.
