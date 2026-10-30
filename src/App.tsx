import { type ChangeEvent, type PointerEvent, useEffect, useRef, useState } from "react";

import { type Modo, type Opciones, OPCIONES_INICIALES, aplicarOjoDePez, puntoFuente } from "./lib/ojoDePez";

// La vista previa se calcula en chico para que los controles respondan al instante;
// al guardar se procesa en grande.
const LADO_VISTA = 900;
const LADO_GUARDAR = 3200;

function aImageData(foto: ImageBitmap, ladoMaximo: number) {
  const escala = Math.min(1, ladoMaximo / Math.max(foto.width, foto.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(foto.width * escala);
  lienzo.height = Math.round(foto.height * escala);
  const ctx = lienzo.getContext("2d") as CanvasRenderingContext2D;
  ctx.drawImage(foto, 0, 0, lienzo.width, lienzo.height);
  return ctx.getImageData(0, 0, lienzo.width, lienzo.height);
}

function pintar(lienzo: HTMLCanvasElement, imagen: ImageData) {
  lienzo.width = imagen.width;
  lienzo.height = imagen.height;
  (lienzo.getContext("2d") as CanvasRenderingContext2D).putImageData(imagen, 0, 0);
}

async function guardarImagen(imagen: ImageData) {
  const lienzo = document.createElement("canvas");
  pintar(lienzo, imagen);
  const blob = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, "image/jpeg", 0.92));
  if (!blob) {
    throw new Error("No se pudo crear la imagen.");
  }
  const archivo = new File([blob], `ojo-de-pez-${Date.now()}.jpg`, { type: "image/jpeg" });
  // En el celular abre el menú de compartir (Guardar en galería, WhatsApp, Instagram…).
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] });
      return;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }
    }
  }
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = archivo.name;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000);
}

export function App() {
  const [foto, setFoto] = useState<ImageBitmap | null>(null);
  const [vista, setVista] = useState<ImageData | null>(null);
  const [op, setOp] = useState<Opciones>(OPCIONES_INICIALES);
  const [original, setOriginal] = useState(false);
  const [estado, setEstado] = useState<"" | "cargando" | "guardando">("");
  const [error, setError] = useState("");
  const lienzo = useRef<HTMLCanvasElement>(null);
  const entrada = useRef<HTMLInputElement>(null);

  // Redibuja la vista previa cuando cambia algo, como mucho una vez por cuadro de pantalla.
  useEffect(() => {
    if (!vista || !lienzo.current) {
      return;
    }
    const cuadro = requestAnimationFrame(() => {
      if (lienzo.current) {
        pintar(lienzo.current, original ? vista : aplicarOjoDePez(vista, op));
      }
    });
    return () => cancelAnimationFrame(cuadro);
  }, [vista, op, original]);

  const elegir = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.currentTarget.files?.[0];
    evento.currentTarget.value = "";
    if (!archivo) {
      return;
    }
    setEstado("cargando");
    setError("");
    try {
      // "from-image" respeta la rotación que guarda la cámara (fotos verticales).
      const nueva = await createImageBitmap(archivo, { imageOrientation: "from-image" });
      foto?.close();
      setFoto(nueva);
      setVista(aImageData(nueva, LADO_VISTA));
      setOp({ ...op, centro: { x: 0.5, y: 0.5 } });
    } catch {
      setError("No pude abrir esa imagen. Prueba con una foto JPG o PNG.");
    }
    setEstado("");
  };

  const centrar = (evento: PointerEvent<HTMLCanvasElement>) => {
    if (!vista || original) {
      return;
    }
    const caja = evento.currentTarget.getBoundingClientRect();
    const x = ((evento.clientX - caja.left) / caja.width) * evento.currentTarget.width;
    const y = ((evento.clientY - caja.top) / caja.height) * evento.currentTarget.height;
    const punto = puntoFuente(x, y, vista.width, vista.height, op);
    if (punto) {
      const limitar = (v: number) => Math.min(0.95, Math.max(0.05, v));
      setOp({ ...op, centro: { x: limitar(punto.x / vista.width), y: limitar(punto.y / vista.height) } });
    }
  };

  const guardar = () => {
    if (!foto) {
      return;
    }
    setEstado("guardando");
    setError("");
    // El setTimeout deja que se pinte "Guardando…" antes del cálculo pesado.
    setTimeout(async () => {
      try {
        await guardarImagen(aplicarOjoDePez(aImageData(foto, LADO_GUARDAR), op));
      } catch (e) {
        setError((e as Error).message);
      }
      setEstado("");
    }, 30);
  };

  const cambiar = <K extends keyof Opciones>(clave: K, valor: Opciones[K]) => setOp({ ...op, [clave]: valor });

  return (
    <main className="app">
      <header className="cabecera">
        <h1>
          Lente<span className="punto">.</span>
        </h1>
        {foto ? (
          <button className="boton-texto" onClick={() => entrada.current?.click()} type="button">
            Otra foto
          </button>
        ) : null}
      </header>

      <input accept="image/*" className="oculto" onChange={(e) => void elegir(e)} ref={entrada} type="file" />

      {!vista ? (
        <section className="vacio">
          <div className="vacio-lente" aria-hidden="true" />
          <h2>Ojo de pez</h2>
          <p>Elige una foto de tu galería. Todo se procesa en tu celular: la foto no se sube a ningún lado.</p>
          <button className="boton" disabled={estado === "cargando"} onClick={() => entrada.current?.click()} type="button">
            {estado === "cargando" ? "Abriendo…" : "Elegir foto"}
          </button>
        </section>
      ) : (
        <>
          <div className="marco">
            <canvas
              aria-label="Vista previa. Toca para mover el centro del lente."
              className="lienzo"
              onPointerDown={centrar}
              ref={lienzo}
            />
          </div>
          <button
            className="boton-original"
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={() => setOriginal(true)}
            onPointerLeave={() => setOriginal(false)}
            onPointerUp={() => setOriginal(false)}
            type="button"
          >
            {original ? "Viendo la original" : "Mantén para ver la original"}
          </button>

          <section className="controles">
            <div className="segmentos" role="radiogroup" aria-label="Forma">
              {(
                [
                  ["circulo", "Círculo"],
                  ["completo", "Pantalla completa"],
                ] as [Modo, string][]
              ).map(([valor, texto]) => (
                <button aria-checked={op.modo === valor} key={valor} onClick={() => cambiar("modo", valor)} role="radio" type="button">
                  {texto}
                </button>
              ))}
            </div>

            <Deslizador etiqueta="Curva" onCambio={(v) => cambiar("intensidad", v)} valor={op.intensidad} />
            <Deslizador etiqueta="Alcance" max={1} min={0.4} onCambio={(v) => cambiar("alcance", v)} valor={op.alcance} />

            <label className="interruptor">
              <input checked={op.vineta} onChange={(e) => cambiar("vineta", e.currentTarget.checked)} type="checkbox" />
              <span>Oscurecer orillas</span>
            </label>

            <p className="pista">Toca la foto para poner el centro del lente donde quieras.</p>
          </section>

          {error ? <p className="error" role="alert">{error}</p> : null}

          <div className="barra-final">
            <button className="boton-texto" onClick={() => setOp({ ...OPCIONES_INICIALES })} type="button">
              Restablecer
            </button>
            <button className="boton" disabled={estado === "guardando"} onClick={guardar} type="button">
              {estado === "guardando" ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </>
      )}

      {error && !vista ? <p className="error" role="alert">{error}</p> : null}
    </main>
  );
}

function Deslizador({
  etiqueta,
  valor,
  onCambio,
  min = 0,
  max = 1,
}: {
  etiqueta: string;
  valor: number;
  onCambio: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const porcentaje = Math.round(((valor - min) / (max - min)) * 100);
  return (
    <label className="deslizador">
      <span className="deslizador-cabeza">
        {etiqueta}
        <output>{porcentaje}</output>
      </span>
      <input
        max={max}
        min={min}
        onChange={(e) => onCambio(Number(e.currentTarget.value))}
        step={0.01}
        style={{ "--lleno": `${porcentaje}%` } as React.CSSProperties}
        type="range"
        value={valor}
      />
    </label>
  );
}
