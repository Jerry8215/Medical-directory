"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { abrirConsulta } from "@/lib/consultas";
import { intentar } from "@/lib/intentar";

/**
 * Abrir una consulta en línea desde el perfil del médico.
 *
 * Arranca cerrado, con el precio a la vista. Quien entró a buscar un
 * médico para ir a verlo no tiene por qué encontrarse un cuadro de texto
 * pidiéndole que cuente lo que le pasa; quien quiere escribir ahora lo
 * abre de un toque.
 */
export function AbrirConsultaEnLinea({
  slug,
  profesional,
  precio,
  haySesion,
}: {
  slug: string;
  profesional: string;
  /** Ya formateado, para mostrarlo tal cual. */
  precio: string;
  haySesion: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [urgencias, setUrgencias] = useState("");
  const [enviando, iniciar] = useTransition();

  // La barrera clínica no es un error de formulario: si lo que describe
  // parece una urgencia, lo que toca es sacarlo de aquí, no corregirle el
  // texto.
  if (urgencias) {
    return (
      <div className="ficha" style={{ padding: 16, borderColor: "var(--rojo, #c0392b)" }}>
        <p style={{ whiteSpace: "pre-line", margin: 0 }}>{urgencias}</p>
      </div>
    );
  }

  if (!abierto) {
    return (
      <div className="ficha" style={{ padding: 16 }}>
        <p className="rotulo">Consulta en línea</p>
        <p className="meta" style={{ marginTop: 4 }}>
          {profesional} está disponible ahora para responderle por escrito.
          La sala dura dos horas.
        </p>
        <p style={{ fontWeight: 700, fontSize: "1.1rem", marginTop: 8 }}>{precio}</p>
        <button
          type="button"
          className="boton-lleno"
          style={{ marginTop: 10, width: "100%" }}
          onClick={() => setAbierto(true)}
        >
          Consultar ahora
        </button>
      </div>
    );
  }

  return (
    <div className="ficha formulario">
      <h2>¿Qué le ocurre?</h2>
      <p className="meta">
        Cuéntelo con sus palabras. Mientras más claro, mejor le puede
        responder {profesional}. Nadie más que él lo lee.
      </p>

      <div className="campo" style={{ marginTop: 12 }}>
        <label htmlFor="motivo-consulta" className="oculto-visual">
          Lo que le ocurre
        </label>
        <textarea
          id="motivo-consulta"
          rows={5}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={4000}
          placeholder="Desde cuándo, qué siente, si ha tomado algo…"
          style={{
            width: "100%",
            border: "1px solid var(--borde)",
            borderRadius: 12,
            padding: "10px 12px",
            font: "inherit",
            fontSize: "0.93rem",
          }}
        />
      </div>

      {error ? <p className="error">{error}</p> : null}

      {haySesion ? (
        <button
          type="button"
          className="boton-lleno"
          disabled={enviando || motivo.trim().length < 15}
          onClick={() =>
            iniciar(async () => {
              setError("");
              const r = await intentar(() =>
                abrirConsulta({ profesionalSlug: slug, motivo }),
              );
              if (r.ok && "token" in r && r.token) {
                router.push(`/consulta/${r.token}`);
              } else if (!r.ok && r.motivo === "urgencias") {
                setUrgencias(r.mensaje);
              } else {
                setError(r.mensaje);
              }
            })
          }
        >
          {enviando ? "Abriendo…" : `Abrir la consulta · ${precio}`}
        </button>
      ) : (
        <>
          <Link href="/paciente/entrar" className="boton-lleno" style={{ display: "block", textAlign: "center" }}>
            Entrar para continuar
          </Link>
          <p className="meta" style={{ marginTop: 10 }}>
            Solo su correo y su WhatsApp. No hace falta contraseña.
          </p>
        </>
      )}
    </div>
  );
}
