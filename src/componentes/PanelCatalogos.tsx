"use client";

import { useState, useTransition } from "react";

import {
  ajustarCiudad,
  ajustarUmbralGeneral,
  crearCiudad,
  crearEspecialidad,
  crearPadecimiento,
  crearProfesion,
} from "@/lib/catalogos-admin";

type Opcion = { slug: string; nombre: string };

type Props = {
  ciudades: (Opcion & { umbral: number | null; activa: boolean; profesionales: number })[];
  especialidades: (Opcion & { padecimientos: number })[];
  profesiones: (Opcion & { exigeConsejo: boolean })[];
  umbralGeneral: number;
};

/**
 * Alta de catálogos desde el panel.
 *
 * Cada formulario es corto a propósito: quien administra esto no es
 * desarrollador, y abrir una especialidad no debería sentirse como llenar
 * un expediente.
 */
export function PanelCatalogos({
  ciudades,
  especialidades,
  profesiones,
  umbralGeneral,
}: Props) {
  const [aviso, setAviso] = useState("");
  const [trabajando, iniciar] = useTransition();

  // ciudad
  const [ciudadNombre, setCiudadNombre] = useState("");
  const [ciudadTexto, setCiudadTexto] = useState("");
  const [ciudadUmbral, setCiudadUmbral] = useState("");

  // especialidad
  const [espNombre, setEspNombre] = useState("");
  const [espProfesion, setEspProfesion] = useState(profesiones[0]?.slug ?? "");
  const [espTexto, setEspTexto] = useState("");

  // padecimiento
  const [padNombre, setPadNombre] = useState("");
  const [padEspecialidad, setPadEspecialidad] = useState(especialidades[0]?.slug ?? "");

  // profesión
  const [profNombre, setProfNombre] = useState("");
  const [profConsejo, setProfConsejo] = useState(true);

  // umbral general
  const [umbral, setUmbral] = useState(String(umbralGeneral));

  function ejecutar(accion: () => Promise<{ ok: boolean; mensaje: string }>) {
    iniciar(async () => {
      const r = await accion();
      setAviso(r.mensaje);
    });
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      <section className="ficha">
        <h2>Mínimo para publicar una página</h2>
        <p className="meta" style={{ marginBottom: 10 }}>
          Una página de ciudad o de especialidad se ofrece a Google solo al
          reunir esta cantidad de profesionales. Mientras tanto responde para
          quien tenga el enlace, pero no se indexa.
        </p>
        <div className="campos-dos">
          <div className="campo">
            <label htmlFor="umbral-general">Profesionales mínimos</label>
            <input
              id="umbral-general"
              inputMode="numeric"
              value={umbral}
              onChange={(e) => setUmbral(e.target.value)}
            />
          </div>
          <div className="campo" style={{ alignSelf: "end" }}>
            <button
              type="button"
              className="boton-lleno boton-corto"
              disabled={trabajando}
              onClick={() => ejecutar(() => ajustarUmbralGeneral(Number(umbral)))}
            >
              Guardar mínimo
            </button>
          </div>
        </div>
      </section>

      <section className="ficha">
        <h2>Ciudades</h2>
        <div className="tabla" style={{ marginBottom: 16 }}>
          <div className="tabla-fila tabla-cabeza">
            <span>Ciudad</span>
            <span>Profesionales</span>
            <span>Mínimo propio</span>
            <span>Estado</span>
          </div>
          {ciudades.map((c) => (
            <div className="tabla-fila" key={c.slug}>
              <span>{c.nombre}</span>
              <span className="num">{c.profesionales}</span>
              <span className="num">{c.umbral ?? "general"}</span>
              <span>
                <button
                  type="button"
                  className="enlace-boton"
                  disabled={trabajando}
                  onClick={() => ejecutar(() => ajustarCiudad(c.slug, { activa: !c.activa }))}
                >
                  {c.activa ? "Abierta · cerrar" : "Cerrada · abrir"}
                </button>
              </span>
            </div>
          ))}
        </div>

        <div className="campo">
          <label htmlFor="ciudad-nombre">Abrir una ciudad nueva</label>
          <input
            id="ciudad-nombre"
            value={ciudadNombre}
            onChange={(e) => setCiudadNombre(e.target.value)}
            placeholder="Jiménez"
          />
        </div>
        <div className="campo">
          <label htmlFor="ciudad-texto">Descripción para su página</label>
          <textarea
            id="ciudad-texto"
            rows={2}
            value={ciudadTexto}
            onChange={(e) => setCiudadTexto(e.target.value)}
            placeholder="Qué debe saber un paciente que busca médico ahí."
          />
        </div>
        <div className="campos-dos">
          <div className="campo">
            <label htmlFor="ciudad-umbral">Mínimo propio (opcional)</label>
            <input
              id="ciudad-umbral"
              inputMode="numeric"
              value={ciudadUmbral}
              onChange={(e) => setCiudadUmbral(e.target.value)}
              placeholder="Deje vacío para usar el general"
            />
          </div>
          <div className="campo" style={{ alignSelf: "end" }}>
            <button
              type="button"
              className="boton-lleno boton-corto"
              disabled={trabajando}
              onClick={() =>
                ejecutar(() =>
                  crearCiudad(ciudadNombre, ciudadTexto, Number(ciudadUmbral) || undefined),
                )
              }
            >
              Abrir ciudad
            </button>
          </div>
        </div>
      </section>

      <section className="ficha">
        <h2>Especialidades</h2>
        <div className="chips" style={{ marginBottom: 16 }}>
          {especialidades.map((e) => (
            <span key={e.slug} className="chip">
              {e.nombre} · {e.padecimientos} padecimientos
            </span>
          ))}
        </div>

        <div className="campos-dos">
          <div className="campo">
            <label htmlFor="esp-nombre">Especialidad nueva</label>
            <input
              id="esp-nombre"
              value={espNombre}
              onChange={(e) => setEspNombre(e.target.value)}
              placeholder="Oftalmología"
            />
          </div>
          <div className="campo">
            <label htmlFor="esp-profesion">Profesión</label>
            <select
              id="esp-profesion"
              value={espProfesion}
              onChange={(e) => setEspProfesion(e.target.value)}
            >
              {profesiones.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="esp-texto">Qué atiende esta especialidad</label>
          <textarea
            id="esp-texto"
            rows={3}
            value={espTexto}
            onChange={(e) => setEspTexto(e.target.value)}
            placeholder="Dos o tres líneas en lenguaje de paciente. Es el texto que lee Google."
          />
        </div>
        <button
          type="button"
          className="boton-lleno boton-corto"
          disabled={trabajando}
          onClick={() => ejecutar(() => crearEspecialidad(espNombre, espProfesion, espTexto))}
        >
          Abrir especialidad
        </button>
      </section>

      <section className="ficha">
        <h2>Padecimientos</h2>
        <p className="meta" style={{ marginBottom: 10 }}>
          Cada padecimiento abre su propia página por ciudad. Son las que
          captan al paciente que busca «vesícula» y no «cirugía general».
        </p>
        <div className="campos-dos">
          <div className="campo">
            <label htmlFor="pad-nombre">Padecimiento</label>
            <input
              id="pad-nombre"
              value={padNombre}
              onChange={(e) => setPadNombre(e.target.value)}
              placeholder="Cataratas"
            />
          </div>
          <div className="campo">
            <label htmlFor="pad-especialidad">De qué especialidad</label>
            <select
              id="pad-especialidad"
              value={padEspecialidad}
              onChange={(e) => setPadEspecialidad(e.target.value)}
            >
              {especialidades.map((e) => (
                <option key={e.slug} value={e.slug}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          className="boton-lleno boton-corto"
          disabled={trabajando}
          onClick={() => ejecutar(() => crearPadecimiento(padNombre, padEspecialidad))}
        >
          Agregar padecimiento
        </button>
      </section>

      <section className="ficha">
        <h2>Profesiones</h2>
        <p className="meta" style={{ marginBottom: 10 }}>
          Abrir odontología, psicología o nutrición no requiere programación.
          Lo que cambia entre una y otra es qué se le exige verificar.
        </p>
        <div className="chips" style={{ marginBottom: 16 }}>
          {profesiones.map((p) => (
            <span key={p.slug} className="chip">
              {p.nombre} · {p.exigeConsejo ? "cédula y consejo" : "cédula"}
            </span>
          ))}
        </div>
        <div className="campos-dos">
          <div className="campo">
            <label htmlFor="prof-nombre">Profesión nueva</label>
            <input
              id="prof-nombre"
              value={profNombre}
              onChange={(e) => setProfNombre(e.target.value)}
              placeholder="Odontólogo"
            />
          </div>
          <div className="campo">
            <label htmlFor="prof-consejo">Verificación exigida</label>
            <select
              id="prof-consejo"
              value={profConsejo ? "si" : "no"}
              onChange={(e) => setProfConsejo(e.target.value === "si")}
            >
              <option value="si">Cédula y consejo de especialidad vigente</option>
              <option value="no">Solo cédula profesional</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          className="boton-lleno boton-corto"
          disabled={trabajando}
          onClick={() => ejecutar(() => crearProfesion(profNombre, profConsejo))}
        >
          Abrir profesión
        </button>
      </section>
    </div>
  );
}
