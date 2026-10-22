"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import { BotonConfirmar } from "@/componentes/BotonConfirmar";
import { RecorteFoto } from "@/componentes/RecorteFoto";
import { intentar } from "@/lib/intentar";
import { quitarFotografia, subirFotografia } from "@/lib/fotografia";

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
  const [porEncuadrar, setPorEncuadrar] = useState<File | null>(null);
  const [trabajando, iniciar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  const iniciales = nombre
    .replace(/^(Dr\.|Dra\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  /**
   * Subir lo que quedó encuadrado.
   *
   * La imagen llega ya recortada y reducida por el navegador: una foto de
   * celular pesa entre tres y ocho megas, y mandarla entera para
   * recortarla en el servidor significa que el médico espera medio minuto
   * mirando una barra y que el almacén guarda treinta veces lo necesario.
   */
  function subir(recorte: Blob) {
    const datos = new FormData();
    datos.append("archivo", new File([recorte], "retrato.jpg", { type: "image/jpeg" }));

    iniciar(async () => {
      const r = await intentar(() => subirFotografia(slug, datos));
      setAviso({ ok: r.ok, texto: r.mensaje });
      if (r.ok) {
        setActual(r.url);
        setPorEncuadrar(null);
      }
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
          Una foto de frente, con buena luz y sin lentes de sol. Al elegirla
          podrá encuadrarla usted mismo.
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
            if (archivo) {
              setAviso(null);
              setPorEncuadrar(archivo);
            }
            e.target.value = "";
          }}
        />

        {porEncuadrar ? (
          <RecorteFoto
            // Cada archivo entra con su propio encuadre, desde cero.
            key={`${porEncuadrar.name}-${porEncuadrar.lastModified}`}
            archivo={porEncuadrar}
            trabajando={trabajando}
            alConfirmar={subir}
            alCancelar={() => setPorEncuadrar(null)}
          />
        ) : null}

        <div className="subir-foto-botones" hidden={Boolean(porEncuadrar)}>
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
                const r = await intentar(() => quitarFotografia(slug));
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
