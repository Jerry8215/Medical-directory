"use client";

import { useState, useTransition } from "react";

import {
  eliminarConsultorio,
  guardarConsultorio,
  guardarPerfil,
  type DatosConsultorio,
  type DatosPerfil,
} from "@/lib/profesionales-admin";

const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

type Props = {
  slug: string;
  perfil: DatosPerfil;
  consultorios: DatosConsultorio[];
  ciudades: { slug: string; nombre: string }[];
};

/**
 * Editor del perfil.
 *
 * Los horarios se escriben como los dice el consultorio —día, de tal hora a
 * tal hora— y de ahí sale la agenda que ve el paciente. Por eso el editor
 * muestra el efecto en una línea: cuántas citas caben en cada tramo.
 */
export function EditorProfesional({ slug, perfil, consultorios, ciudades }: Props) {
  const [datos, setDatos] = useState<DatosPerfil>(perfil);
  const [locales, setLocales] = useState<DatosConsultorio[]>(consultorios);
  const [aviso, setAviso] = useState("");
  const [trabajando, iniciar] = useTransition();

  function cambiar<K extends keyof DatosPerfil>(campo: K, valor: DatosPerfil[K]) {
    setDatos((d) => ({ ...d, [campo]: valor }));
  }

  function cambiarConsultorio(i: number, cambios: Partial<DatosConsultorio>) {
    setLocales((cs) => cs.map((c, n) => (n === i ? { ...c, ...cambios } : c)));
  }

  function citasQueCaben(c: DatosConsultorio): number {
    return c.franjas.reduce((total, f) => {
      const minutos =
        Number(f.hasta.slice(0, 2)) * 60 +
        Number(f.hasta.slice(3)) -
        (Number(f.desde.slice(0, 2)) * 60 + Number(f.desde.slice(3)));
      return total + Math.max(0, Math.floor(minutos / (c.duracionCitaMin || 30)));
    }, 0);
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      <section className="ficha formulario">
        <h2>Datos del profesional</h2>

        <div className="campo">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            value={datos.nombre}
            onChange={(e) => cambiar("nombre", e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="semblanza">Semblanza</label>
          <textarea
            id="semblanza"
            rows={3}
            value={datos.semblanza}
            onChange={(e) => cambiar("semblanza", e.target.value)}
            placeholder="Qué atiende y cómo, en lenguaje de paciente."
          />
        </div>

        <div className="campo">
          <label htmlFor="convenios">Aseguradoras y convenios</label>
          <input
            id="convenios"
            value={datos.convenios}
            onChange={(e) => cambiar("convenios", e.target.value)}
            placeholder="GNP, AXA, MetLife…"
          />
        </div>

        <div className="campos-dos">
          <div className="campo">
            <label htmlFor="correo">Correo</label>
            <input
              id="correo"
              type="email"
              value={datos.correo}
              onChange={(e) => cambiar("correo", e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="telefono">WhatsApp</label>
            <input
              id="telefono"
              inputMode="tel"
              value={datos.telefono}
              onChange={(e) => cambiar("telefono", e.target.value)}
              placeholder="10 dígitos"
            />
          </div>
        </div>

        <fieldset className="campo" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="meta">Cómo quiere enterarse de una cita nueva</legend>
          <label className="casilla">
            <input
              type="checkbox"
              checked={datos.avisoCorreo}
              onChange={(e) => cambiar("avisoCorreo", e.target.checked)}
            />
            Por correo
          </label>
          <label className="casilla">
            <input
              type="checkbox"
              checked={datos.avisoWhatsapp}
              onChange={(e) => cambiar("avisoWhatsapp", e.target.checked)}
            />
            Por WhatsApp
          </label>
          <label className="casilla">
            <input
              type="checkbox"
              checked={datos.publicado}
              onChange={(e) => cambiar("publicado", e.target.checked)}
            />
            Perfil visible en el directorio
          </label>
        </fieldset>

        <button
          type="button"
          className="boton-lleno boton-corto"
          disabled={trabajando}
          onClick={() =>
            iniciar(async () => {
              const r = await guardarPerfil(slug, datos);
              setAviso(r.mensaje);
            })
          }
        >
          Guardar perfil
        </button>
      </section>

      {locales.map((c, i) => (
        <section className="ficha formulario" key={c.id ?? `nuevo-${i}`}>
          <h2>{c.id ? c.nombre || "Consultorio" : "Consultorio nuevo"}</h2>

          <div className="campos-dos">
            <div className="campo">
              <label htmlFor={`nombre-${i}`}>Nombre del consultorio</label>
              <input
                id={`nombre-${i}`}
                value={c.nombre}
                onChange={(e) => cambiarConsultorio(i, { nombre: e.target.value })}
              />
            </div>
            <div className="campo">
              <label htmlFor={`ciudad-${i}`}>Ciudad</label>
              <select
                id={`ciudad-${i}`}
                value={c.ciudadSlug}
                onChange={(e) => cambiarConsultorio(i, { ciudadSlug: e.target.value })}
              >
                {ciudades.map((x) => (
                  <option key={x.slug} value={x.slug}>
                    {x.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="campo">
            <label htmlFor={`direccion-${i}`}>Dirección</label>
            <input
              id={`direccion-${i}`}
              value={c.direccion}
              onChange={(e) => cambiarConsultorio(i, { direccion: e.target.value })}
              placeholder="Calle, número, consultorio"
            />
          </div>

          <div className="campos-dos">
            <div className="campo">
              <label htmlFor={`precio-${i}`}>Precio de la valoración</label>
              <input
                id={`precio-${i}`}
                inputMode="numeric"
                value={c.precioValoracion ?? ""}
                onChange={(e) =>
                  cambiarConsultorio(i, {
                    precioValoracion: Number(e.target.value) || undefined,
                  })
                }
              />
            </div>
            <div className="campo">
              <label htmlFor={`duracion-${i}`}>Duración de la consulta (minutos)</label>
              <input
                id={`duracion-${i}`}
                inputMode="numeric"
                value={c.duracionCitaMin}
                onChange={(e) =>
                  cambiarConsultorio(i, { duracionCitaMin: Number(e.target.value) || 30 })
                }
              />
            </div>
          </div>

          <div className="campo">
            <span className="meta">
              Horarios de atención · caben {citasQueCaben(c)} citas por semana
            </span>
            {c.franjas.map((f, j) => (
              <div className="franja" key={j}>
                <select
                  value={f.dia}
                  aria-label="Día"
                  onChange={(e) => {
                    const franjas = [...c.franjas];
                    franjas[j] = { ...f, dia: Number(e.target.value) };
                    cambiarConsultorio(i, { franjas });
                  }}
                >
                  {DIAS.map((d, n) => (
                    <option key={d} value={n}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  value={f.desde}
                  aria-label="Desde"
                  onChange={(e) => {
                    const franjas = [...c.franjas];
                    franjas[j] = { ...f, desde: e.target.value };
                    cambiarConsultorio(i, { franjas });
                  }}
                />
                <input
                  value={f.hasta}
                  aria-label="Hasta"
                  onChange={(e) => {
                    const franjas = [...c.franjas];
                    franjas[j] = { ...f, hasta: e.target.value };
                    cambiarConsultorio(i, { franjas });
                  }}
                />
                <button
                  type="button"
                  className="enlace-boton"
                  onClick={() =>
                    cambiarConsultorio(i, {
                      franjas: c.franjas.filter((_, n) => n !== j),
                    })
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              type="button"
              className="boton-suave"
              style={{ justifySelf: "start", marginTop: 8 }}
              onClick={() =>
                cambiarConsultorio(i, {
                  franjas: [...c.franjas, { dia: 0, desde: "09:00", hasta: "14:00" }],
                })
              }
            >
              Agregar tramo
            </button>
          </div>

          <div className="acciones">
            <button
              type="button"
              className="boton-lleno boton-corto"
              disabled={trabajando}
              onClick={() =>
                iniciar(async () => {
                  const r = await guardarConsultorio(slug, c);
                  setAviso(r.mensaje);
                })
              }
            >
              Guardar consultorio
            </button>
            {c.id ? (
              <button
                type="button"
                className="boton-suave"
                disabled={trabajando}
                onClick={() =>
                  iniciar(async () => {
                    const r = await eliminarConsultorio(slug, c.id!);
                    setAviso(r.mensaje);
                    if (r.ok) setLocales((cs) => cs.filter((_, n) => n !== i));
                  })
                }
              >
                Eliminar
              </button>
            ) : null}
          </div>
        </section>
      ))}

      <button
        type="button"
        className="boton-suave"
        style={{ justifySelf: "start" }}
        onClick={() =>
          setLocales((cs) => [
            ...cs,
            {
              ciudadSlug: ciudades[0]?.slug ?? "",
              nombre: "",
              direccion: "",
              referencias: "",
              duracionCitaMin: 30,
              franjas: [{ dia: 0, desde: "09:00", hasta: "14:00" }],
            },
          ])
        }
      >
        Agregar otro consultorio
      </button>
    </div>
  );
}
