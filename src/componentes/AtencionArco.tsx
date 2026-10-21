"use client";

import { useState, useTransition } from "react";

import { Lupa } from "@/componentes/Iconos";
import {
  buscarTitular,
  cancelarTitular,
  exportarTitular,
  oponerTitular,
  rectificarTitular,
  type Hallazgo,
} from "@/lib/datos-personales";

/**
 * Atender una solicitud ARCO, de principio a fin y en una sola pantalla.
 *
 * Quien recibe la llamada del paciente no es abogado ni programador: es
 * quien contesta el teléfono del consultorio. Por eso cada derecho es un
 * botón con el nombre que el paciente usó al pedirlo, y la cancelación
 * pide confirmación aparte, porque es la única que no se puede deshacer.
 */
export function AtencionArco() {
  const [telefono, setTelefono] = useState("");
  const [hallazgos, setHallazgos] = useState<Hallazgo[] | null>(null);
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [confirmando, setConfirmando] = useState("");
  const [trabajando, iniciar] = useTransition();

  function buscar() {
    iniciar(async () => {
      setAviso("");
      setHallazgos(await buscarTitular(telefono));
    });
  }

  function refrescar() {
    iniciar(async () => setHallazgos(await buscarTitular(telefono)));
  }

  function descargar(texto: string, archivo: string) {
    const url = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <form
        className="filtros"
        onSubmit={(e) => {
          e.preventDefault();
          buscar();
        }}
      >
        <label className="campo-busqueda">
          <Lupa size={17} />
          <span className="sr-only">Teléfono del titular</span>
          <input
            id="telefono-titular"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Teléfono con el que agendó"
            inputMode="tel"
          />
        </label>
        <button className="boton-lleno" type="submit" disabled={trabajando}>
          Buscar
        </button>
      </form>

      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      {hallazgos === null ? (
        <div className="nota-umbral">
          Escriba el teléfono con el que el paciente agendó. Es el dato que él
          puede aportar para identificarse.
        </div>
      ) : hallazgos.length === 0 ? (
        <div className="nota-umbral">
          No hay ningún expediente con ese teléfono. Si el paciente insiste,
          pídale el número exacto con el que agendó.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {hallazgos.map((h) => (
            <div className="ficha" key={h.id}>
              <b>{h.nombre ?? "Sin nombre registrado"}</b>
              <p className="meta">
                {h.cancelado ? "Expediente cancelado" : h.telefono}
                {h.correo ? ` · ${h.correo}` : ""}
              </p>
              <p className="meta">
                {h.citas} cita(s) · {h.opiniones} opinión(es)
                {h.bajaEn ? ` · oposición activa desde ${h.bajaEn}` : ""}
              </p>

              {editando === h.id ? (
                <div className="formulario" style={{ marginTop: 12 }}>
                  <div className="campo">
                    <label htmlFor={`n-${h.id}`}>Nombre correcto</label>
                    <input
                      id={`n-${h.id}`}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>
                  <div className="campo">
                    <label htmlFor={`c-${h.id}`}>Correo correcto</label>
                    <input
                      id={`c-${h.id}`}
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                    />
                  </div>
                  <button
                    className="boton-lleno"
                    type="button"
                    disabled={trabajando}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await rectificarTitular(h.id, nombre, correo);
                        setAviso(r.mensaje);
                        setEditando("");
                        refrescar();
                      })
                    }
                  >
                    Guardar la corrección
                  </button>
                </div>
              ) : null}

              <div className="acciones-fila" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="enlace-boton"
                  disabled={trabajando}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await exportarTitular(h.id);
                      setAviso(r.mensaje);
                      if (r.ok && r.archivo && r.nombre) descargar(r.archivo, r.nombre);
                    })
                  }
                >
                  Acceso: descargar sus datos
                </button>

                <button
                  type="button"
                  className="enlace-boton"
                  disabled={trabajando || h.cancelado}
                  onClick={() => {
                    setEditando(h.id);
                    setNombre(h.nombre ?? "");
                    setCorreo(h.correo ?? "");
                  }}
                >
                  Rectificación: corregir
                </button>

                <button
                  type="button"
                  className="enlace-boton"
                  disabled={trabajando}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await oponerTitular(h.id, !h.bajaEn);
                      setAviso(r.mensaje);
                      refrescar();
                    })
                  }
                >
                  {h.bajaEn ? "Oposición: volver a avisarle" : "Oposición: dejar de avisarle"}
                </button>

                {h.cancelado ? null : confirmando === h.id ? (
                  <button
                    type="button"
                    className="enlace-boton peligro"
                    disabled={trabajando}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await cancelarTitular(h.id);
                        setAviso(r.mensaje);
                        setConfirmando("");
                        refrescar();
                      })
                    }
                  >
                    Confirmar: esto no se puede deshacer
                  </button>
                ) : (
                  <button
                    type="button"
                    className="enlace-boton peligro"
                    disabled={trabajando}
                    onClick={() => setConfirmando(h.id)}
                  >
                    Cancelación: borrar sus datos
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
