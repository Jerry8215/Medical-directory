"use client";

import { useState, useTransition } from "react";

import { registrarSolicitud, type Solicitud } from "@/lib/solicitudes";

type Opcion = { slug: string; nombre: string };

const VACIO: Solicitud = {
  nombre: "",
  correo: "",
  telefono: "",
  especialidad: "",
  ciudad: "",
  cedula: "",
  consejo: "",
  consultorio: "",
  mensaje: "",
};

/**
 * Alta de un profesional.
 *
 * Pide lo mínimo para poder verificar y publicar: quién es, dónde atiende y
 * su cédula. Todo lo demás —fotografía, precios, horarios— se completa
 * después, porque un formulario largo en el primer contacto es la forma más
 * rápida de perder al profesional que sí quería aparecer.
 */
export function FormularioAlta({
  especialidades,
  ciudades,
}: {
  especialidades: Opcion[];
  ciudades: Opcion[];
}) {
  const [datos, setDatos] = useState<Solicitud>(VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof Solicitud, string>>>({});
  const [enviada, setEnviada] = useState(false);
  const [enviando, iniciar] = useTransition();

  function cambiar(campo: keyof Solicitud, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  if (enviada) {
    return (
      <div className="ficha">
        <h2>Solicitud recibida</h2>
        <p style={{ color: "var(--suave)" }}>
          Gracias, doctor. El siguiente paso es la verificación de su cédula
          contra el Registro Nacional de Profesionistas. En cuanto quede
          aprobada le escribimos al correo que nos dejó y su perfil se publica
          con el distintivo de cédula verificada.
        </p>
      </div>
    );
  }

  return (
    <form
      className="ficha formulario"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await registrarSolicitud(datos);
          if (r.ok) setEnviada(true);
          else setErrores(r.errores);
        });
      }}
      noValidate
    >
      <div className="campo">
        <label htmlFor="nombre">Nombre completo</label>
        <input
          id="nombre"
          value={datos.nombre}
          onChange={(e) => cambiar("nombre", e.target.value)}
          placeholder="Como aparece en su cédula"
          autoComplete="name"
        />
        {errores.nombre ? <small className="error">{errores.nombre}</small> : null}
      </div>

      <div className="campos-dos">
        <div className="campo">
          <label htmlFor="especialidad">Especialidad</label>
          <select
            id="especialidad"
            value={datos.especialidad}
            onChange={(e) => cambiar("especialidad", e.target.value)}
          >
            <option value="">Elija una</option>
            {especialidades.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.nombre}
              </option>
            ))}
          </select>
          {errores.especialidad ? (
            <small className="error">{errores.especialidad}</small>
          ) : null}
        </div>

        <div className="campo">
          <label htmlFor="ciudad">Ciudad donde atiende</label>
          <select
            id="ciudad"
            value={datos.ciudad}
            onChange={(e) => cambiar("ciudad", e.target.value)}
          >
            <option value="">Elija una</option>
            {ciudades.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nombre}
              </option>
            ))}
          </select>
          {errores.ciudad ? <small className="error">{errores.ciudad}</small> : null}
        </div>
      </div>

      <div className="campos-dos">
        <div className="campo">
          <label htmlFor="cedula">Cédula profesional</label>
          <input
            id="cedula"
            inputMode="numeric"
            value={datos.cedula}
            onChange={(e) => cambiar("cedula", e.target.value)}
            placeholder="Solo números"
          />
          {errores.cedula ? <small className="error">{errores.cedula}</small> : null}
        </div>

        <div className="campo">
          <label htmlFor="consejo">Consejo de especialidad (opcional)</label>
          <input
            id="consejo"
            value={datos.consejo}
            onChange={(e) => cambiar("consejo", e.target.value)}
            placeholder="Número de certificación y vigencia"
          />
        </div>
      </div>

      <div className="campos-dos">
        <div className="campo">
          <label htmlFor="correo">Correo</label>
          <input
            id="correo"
            type="email"
            value={datos.correo}
            onChange={(e) => cambiar("correo", e.target.value)}
            autoComplete="email"
          />
          {errores.correo ? <small className="error">{errores.correo}</small> : null}
        </div>

        <div className="campo">
          <label htmlFor="telefono">Teléfono</label>
          <input
            id="telefono"
            inputMode="tel"
            value={datos.telefono}
            onChange={(e) => cambiar("telefono", e.target.value)}
            placeholder="10 dígitos"
            autoComplete="tel"
          />
          {errores.telefono ? <small className="error">{errores.telefono}</small> : null}
        </div>
      </div>

      <div className="campo">
        <label htmlFor="consultorio">Consultorio (opcional)</label>
        <input
          id="consultorio"
          value={datos.consultorio}
          onChange={(e) => cambiar("consultorio", e.target.value)}
          placeholder="Nombre y dirección"
        />
      </div>

      <div className="campo">
        <label htmlFor="mensaje">Algo que debamos saber (opcional)</label>
        <textarea
          id="mensaje"
          rows={3}
          value={datos.mensaje}
          onChange={(e) => cambiar("mensaje", e.target.value)}
        />
      </div>

      <button className="boton-lleno" type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Solicitar mi alta"}
      </button>

      <p className="meta">
        Sus datos se usan para verificar su cédula y publicar su perfil. No se
        comparten con terceros.
      </p>
    </form>
  );
}
