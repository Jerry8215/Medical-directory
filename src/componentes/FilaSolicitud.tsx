"use client";

import { useState, useTransition } from "react";

import { intentar } from "@/lib/intentar";

import { BotonConfirmar } from "@/componentes/BotonConfirmar";

import { claseBotonIcono } from "@/componentes/BotonIcono";
import { Papelera } from "@/componentes/Iconos";
import {
  aprobarSolicitud,
  borrarSolicitud,
  marcarEnVerificacion,
  rechazarSolicitud,
} from "@/lib/verificacion";

/**
 * Una solicitud en el panel, con lo que hace falta para resolverla sin
 * salir de la pantalla: el dato de la cédula, el enlace al registro oficial
 * para cotejarla y las dos decisiones posibles.
 */
export function FilaSolicitud({
  id,
  nombre,
  correo,
  telefono,
  especialidad,
  ciudad,
  cedula,
  consejo,
  consultorio,
  estado,
  puedeBorrar = false,
}: {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  especialidad: string;
  ciudad: string;
  cedula: string;
  consejo?: string | null;
  consultorio?: string | null;
  estado: string;
  /** Borrar es del administrador: rechazar deja constancia, borrar no. */
  puedeBorrar?: boolean;
}) {
  const [aviso, setAviso] = useState("");
  const [motivo, setMotivo] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const [borrada, setBorrada] = useState(false);
  const [credencial, setCredencial] = useState<
    { correo: string; clave: string; porCorreo: boolean } | null
  >(null);
  const [trabajando, iniciar] = useTransition();

  // Borrada, la fila desaparece sola: dejarla ahí con un aviso invita a
  // volver a pulsar sobre algo que ya no existe.
  if (borrada) return null;

  return (
    <div className="solicitud">
      <div className="solicitud-datos">
        <div>
          <b>{nombre}</b>
          <p className="meta">
            {especialidad} · {ciudad}
          </p>
          <p className="meta num">
            {correo} · {telefono}
          </p>
          {consultorio ? <p className="meta">{consultorio}</p> : null}
        </div>

        <div>
          <p className="meta">Cédula profesional</p>
          <b className="num">{cedula}</b>
          <p style={{ marginTop: 6 }}>
            <a
              href="https://www.cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action"
              target="_blank"
              rel="noreferrer"
              className="enlace-acento"
            >
              Cotejar en el registro de la SEP
            </a>
          </p>
          {consejo ? (
            <p className="meta">Consejo declarado: {consejo}</p>
          ) : (
            <p className="meta">Sin consejo de especialidad declarado</p>
          )}
        </div>
      </div>

      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      {rechazando ? (
        <div className="campo" style={{ marginTop: 10 }}>
          <label htmlFor={`motivo-${id}`}>Motivo del rechazo</label>
          <input
            id={`motivo-${id}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="La cédula no corresponde al nombre, por ejemplo"
          />
        </div>
      ) : null}

      {/* La contraseña, en pantalla y a la vista. Antes solo viajaba por
          correo, y cuando el correo no llegaba —o caía en no deseados— el
          médico se quedaba sin entrar y nadie sabía por qué. */}
      {credencial ? (
        <div className="credencial">
          <p className="credencial-titulo">
            {credencial.porCorreo
              ? "Datos de acceso, enviados también por correo"
              : "Datos de acceso. El correo no salió: dicteselos usted"}
          </p>
          <dl>
            <div>
              <dt>Correo</dt>
              <dd>{credencial.correo}</dd>
            </div>
            <div>
              <dt>Contraseña</dt>
              <dd className="credencial-clave">{credencial.clave}</dd>
            </div>
          </dl>
          <p className="meta">
            No se vuelve a mostrar. Si la pierde, reemita el acceso desde la
            ficha del médico.
          </p>
        </div>
      ) : null}

      <div className="acciones">
        <BotonConfirmar
          className="boton-lleno boton-corto"
          etiqueta="Cédula comprobada · publicar"
          disabled={trabajando}
          titulo={`¿Publicar el perfil de ${nombre}?`}
          cuerpo={`Está declarando que cotejó la cédula ${cedula} contra el Registro Nacional de Profesionistas y que corresponde a esta persona. El perfil queda visible para los pacientes y se le envía su acceso por correo.`}
          confirmar="Sí, la cédula está comprobada"
          alConfirmar={async () => {
            const r = await intentar(() => aprobarSolicitud(id));
            setAviso(r.mensaje);
            if (r.ok && r.acceso) setCredencial(r.acceso);
          }}
        />

        {estado === "RECIBIDA" ? (
          <button
            type="button"
            className="boton-suave"
            disabled={trabajando}
            onClick={() =>
              iniciar(async () => {
                const r = await intentar(() => marcarEnVerificacion(id));
                setAviso(r.mensaje);
              })
            }
          >
            En verificación
          </button>
        ) : null}

        {rechazando ? (
          <BotonConfirmar
            className="enlace-boton peligro"
            etiqueta="Confirmar rechazo"
            disabled={trabajando}
            titulo={`¿Rechazar la solicitud de ${nombre}?`}
            cuerpo="No se publica su perfil y la solicitud queda cerrada. Conviene que el motivo quede escrito: es lo único que va a tener a la mano si después le pregunta por qué."
            confirmar="Sí, rechazar"
            peligro
            alConfirmar={async () => {
              const r = await intentar(() => rechazarSolicitud(id, motivo));
              setAviso(r.mensaje);
              setRechazando(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="boton-suave"
            disabled={trabajando}
            onClick={() => setRechazando(true)}
          >
            Rechazar
          </button>
        )}

        {puedeBorrar ? (
          <BotonConfirmar
            className={claseBotonIcono("peligro")}
            etiqueta={<Papelera size={16} />}
            rotulo={`Borrar la solicitud de ${nombre}`}
            disabled={trabajando}
            titulo={`¿Borrar la solicitud de ${nombre}?`}
            cuerpo="Desaparece de la base de datos y no se puede deshacer. Es para lo que nunca debió existir: una prueba, un duplicado, alguien que se registró dos veces. Si lo que quiere es dejar constancia de que se decidió que no, rechácela en lugar de borrarla."
            confirmar="Sí, borrarla"
            peligro
            alConfirmar={async () => {
              const r = await intentar(() => borrarSolicitud(id));
              setAviso(r.mensaje);
              if (r.ok) setBorrada(true);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
