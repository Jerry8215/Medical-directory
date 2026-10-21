"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import { BotonConfirmar } from "@/componentes/BotonConfirmar";
import { quitarFotografia, subirFotografia } from "@/lib/fotografia";

/** Un retrato de perfil no necesita más que esto, ni en pantalla ni impreso. */
const LADO_MAXIMO = 800;

/**
 * Reducir la imagen en el navegador, antes de enviarla.
 *
 * Una fotografía de celular pesa entre tres y ocho megas. Mandarla entera
 * para recortarla después significa que el médico espera medio minuto
 * mirando una barra, y que el almacén guarda treinta veces lo necesario.
 * El recorte cuadrado se hace aquí mismo, por el centro, que es donde
 * está la cara en el noventa por ciento de los retratos.
 */
function reducir(archivo: File): Promise<Blob> {
  return new Promise((listo, falla) => {
    const lector = new FileReader();
    lector.onerror = () => falla(new Error("No se pudo leer el archivo."));
    lector.onload = () => {
      const imagen = new window.Image();
      imagen.onerror = () => falla(new Error("Ese archivo no es una imagen."));
      imagen.onload = () => {
        const lado = Math.min(imagen.width, imagen.height);
        const destino = Math.min(lado, LADO_MAXIMO);
        const lienzo = document.createElement("canvas");
        lienzo.width = destino;
        lienzo.height = destino;

        const pincel = lienzo.getContext("2d");
        if (!pincel) {
          falla(new Error("Su navegador no pudo procesar la imagen."));
          return;
        }
        pincel.drawImage(
          imagen,
          (imagen.width - lado) / 2,
          (imagen.height - lado) / 2,
          lado,
          lado,
          0,
          0,
          destino,
          destino,
        );

        lienzo.toBlob(
          (resultado) =>
            resultado ? listo(resultado) : falla(new Error("No se pudo procesar la imagen.")),
          "image/jpeg",
          0.85,
        );
      };
      imagen.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  });
}

export function SubirFoto({
  slug,
  fotografia,
  nombre,
  seVePublicada = true,
}: {
  slug: string;
  fotografia: string | null;
  nombre: string;
  /** Si el plan la muestra en el perfil público. */
  seVePublicada?: boolean;
}) {
  const [actual, setActual] = useState(fotografia);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [trabajando, iniciar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  const iniciales = nombre
    .replace(/^(Dr\.|Dra\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  async function elegir(archivo: File) {
    setAviso(null);
    let reducida: Blob;
    try {
      reducida = await reducir(archivo);
    } catch (error) {
      setAviso({ ok: false, texto: (error as Error).message });
      return;
    }

    const datos = new FormData();
    datos.append("archivo", new File([reducida], "retrato.jpg", { type: "image/jpeg" }));

    iniciar(async () => {
      const r = await subirFotografia(slug, datos);
      setAviso({ ok: r.ok, texto: r.mensaje });
      if (r.ok) setActual(r.url);
    });
  }

  return (
    <div className="subir-foto">
      <div className="subir-foto-vista">
        {actual ? (
          <Image src={actual} alt="" width={96} height={96} unoptimized />
        ) : (
          <span className="subir-foto-iniciales">{iniciales}</span>
        )}
      </div>

      <div className="subir-foto-acciones">
        <p className="meta">
          Una foto de frente, con buena luz y sin lentes de sol. El recorte
          cuadrado lo hace el sistema.
        </p>

        {/* Sin este aviso, el plan básico subía la fotografía, la guardaba
            y no la mostraba en ninguna parte. El médico la veía aquí y no
            en su perfil, y concluía que el sitio estaba roto. */}
        {!seVePublicada ? (
          <div className="nota-umbral" style={{ marginBlock: "10px 4px" }}>
            Su plan no incluye fotografía en el perfil público. Aquí la puede
            dejar lista, pero el paciente verá sus iniciales hasta que el
            perfil pase a Gold o Premium.
          </div>
        ) : null}

        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) elegir(archivo);
            e.target.value = "";
          }}
        />

        <div className="subir-foto-botones">
          <button
            type="button"
            className="boton-suave"
            disabled={trabajando}
            onClick={() => entrada.current?.click()}
          >
            {trabajando ? "Subiendo…" : actual ? "Cambiar fotografía" : "Subir fotografía"}
          </button>

          {actual ? (
            <BotonConfirmar
              className="boton-texto"
              etiqueta="Quitar"
              disabled={trabajando}
              titulo="¿Quitar la fotografía?"
              cuerpo="El perfil vuelve a mostrar las iniciales y el archivo se borra del almacén. Para recuperarla habría que volver a subirla."
              confirmar="Sí, quitarla"
              peligro
              alConfirmar={async () => {
                const r = await quitarFotografia(slug);
                setAviso({ ok: r.ok, texto: r.mensaje });
                if (r.ok) setActual(null);
              }}
            />
          ) : null}
        </div>

        {aviso ? (
          <p className={aviso.ok ? "confirmada" : "error"} style={{ marginTop: 8 }}>
            {aviso.texto}
          </p>
        ) : null}
      </div>
    </div>
  );
}
