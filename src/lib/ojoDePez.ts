// Efecto ojo de pez hecho a mano, píxel por píxel, sin subir la foto a ningún lado.
//
// Cómo funciona: un lente ojo de pez reparte el ángulo de visión de forma pareja desde el centro (θ = r·a),
// mientras que una foto normal lo reparte según tan(θ). Para cada píxel de la imagen final calculamos de qué
// punto de la foto original viene: el centro queda agrandado y las orillas se curvan y se aprietan.

export type Modo = "circulo" | "completo";

export type Opciones = {
  // 0 = casi sin curva, 1 = ojo de pez extremo.
  intensidad: number;
  // Cuánto de la foto entra en el lente: 1 = toda, menos = acercamiento.
  alcance: number;
  modo: Modo;
  // Centro del lente en la foto original, de 0 a 1 en cada eje.
  centro: { x: number; y: number };
  vineta: boolean;
};

export const OPCIONES_INICIALES: Opciones = {
  intensidad: 0.65,
  alcance: 1,
  modo: "circulo",
  centro: { x: 0.5, y: 0.5 },
  vineta: true,
};

// Medio ángulo de visión del lente, en radianes: de ~20° (suave) a ~86° (extremo).
const anguloDe = (intensidad: number) => 0.35 + intensidad * 1.15;

function distanciaAEsquinaLejana(x: number, y: number, ancho: number, alto: number) {
  return Math.hypot(Math.max(x, ancho - x), Math.max(y, alto - y));
}

// Tamaño de la imagen final: en modo círculo es un cuadrado con el lado corto de la foto.
export function tamanoSalida(ancho: number, alto: number, modo: Modo) {
  const lado = Math.min(ancho, alto);
  return modo === "circulo" ? { ancho: lado, alto: lado } : { ancho, alto };
}

// Prepara la geometría compartida entre el efecto y el "toca para centrar".
function geometria(ancho: number, alto: number, op: Opciones) {
  const salida = tamanoSalida(ancho, alto, op.modo);
  const fx = op.centro.x * ancho;
  const fy = op.centro.y * alto;
  const ox = op.modo === "circulo" ? salida.ancho / 2 : fx;
  const oy = op.modo === "circulo" ? salida.alto / 2 : fy;
  const radioSalida = op.modo === "circulo" ? salida.ancho / 2 : distanciaAEsquinaLejana(fx, fy, ancho, alto);
  // En círculo se toma hasta la orilla más cercana para que el círculo quede siempre lleno;
  // en pantalla completa, hasta la esquina más lejana para que no queden huecos.
  const radioBase = op.modo === "circulo" ? Math.min(fx, ancho - fx, fy, alto - fy) : distanciaAEsquinaLejana(fx, fy, ancho, alto);
  const radioFuente = radioBase * op.alcance;
  const a = anguloDe(op.intensidad);
  return { salida, fx, fy, ox, oy, radioSalida, radioFuente, a, tanA: Math.tan(a) };
}

// Punto de la foto original que se ve en (x, y) de la imagen final. Null si cae fuera del lente.
export function puntoFuente(x: number, y: number, ancho: number, alto: number, op: Opciones) {
  const g = geometria(ancho, alto, op);
  const dx = x - g.ox;
  const dy = y - g.oy;
  const d = Math.hypot(dx, dy);
  const r = d / g.radioSalida;
  if (op.modo === "circulo" && r > 1) {
    return null;
  }
  const escala = d === 0 ? 0 : (Math.tan(r * g.a) / g.tanA) * (g.radioFuente / d);
  return { x: g.fx + dx * escala, y: g.fy + dy * escala };
}

export function aplicarOjoDePez(fuente: ImageData, op: Opciones): ImageData {
  const { width: ancho, height: alto, data: org } = fuente;
  const g = geometria(ancho, alto, op);
  const salida = new ImageData(g.salida.ancho, g.salida.alto);
  const dst = salida.data;
  const circulo = op.modo === "circulo";
  // Borde suave del círculo, de ~1.5 píxeles, para que no se vea dentado.
  const suavizado = 1.5 / g.radioSalida;

  for (let y = 0; y < g.salida.alto; y++) {
    for (let x = 0; x < g.salida.ancho; x++) {
      const i = (y * g.salida.ancho + x) * 4;
      const dx = x + 0.5 - g.ox;
      const dy = y + 0.5 - g.oy;
      const d = Math.hypot(dx, dy);
      const r = d / g.radioSalida;
      if (circulo && r > 1 + suavizado) {
        dst[i + 3] = 255; // negro
        continue;
      }
      const escala = d === 0 ? 0 : (Math.tan(Math.min(r, 1) * g.a) / g.tanA) * (g.radioFuente / d);
      const sx = g.fx + dx * escala - 0.5;
      const sy = g.fy + dy * escala - 0.5;

      // Lectura bilineal: mezcla los 4 píxeles vecinos para que no se pixele al estirar.
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      if (x0 < 0 || y0 < 0 || x0 >= ancho - 1 || y0 >= alto - 1) {
        dst[i + 3] = 255;
        continue;
      }
      const tx = sx - x0;
      const ty = sy - y0;
      const a = (y0 * ancho + x0) * 4;
      const b = a + 4;
      const c = a + ancho * 4;
      const e = c + 4;
      let oscuro = op.vineta ? 1 - 0.45 * Math.min(r, 1) ** 4 : 1;
      if (circulo && r > 1) {
        oscuro *= 1 - (r - 1) / suavizado;
      }
      for (let k = 0; k < 3; k++) {
        const arriba = org[a + k] + (org[b + k] - org[a + k]) * tx;
        const abajo = org[c + k] + (org[e + k] - org[c + k]) * tx;
        dst[i + k] = (arriba + (abajo - arriba) * ty) * oscuro;
      }
      dst[i + 3] = 255;
    }
  }
  return salida;
}
