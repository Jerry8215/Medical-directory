"use client";

import { useMemo, useState, useTransition } from "react";

import { BotonIcono } from "@/componentes/BotonIcono";
import { Reabrir } from "@/componentes/Iconos";
import { apartarHora, liberarHora } from "@/lib/horas-cerradas";

export type HoraFila = {
  id: string;
  consultorioId: string;
  consultorio: string;
  fecha: string;
  hora: string;
  motivo: string | null;
  pasada: boolean;
};

export type ConsultorioConHuecos = {
  id: string;
  nombre: string;
  /** Día -> horas que todavía se le ofrecen al paciente. */
  dias: { fecha: string; etiqueta: string; horas: string[] }[];
};

/**
 * Apartar una hora que ya se comprometió por otro medio.
 *
 * Se eligen de una lista y no se escriben: el médico no tiene por qué
 * saber que atiende de 16:00 a 17:20 con citas de cuarenta minutos y
 * deducir que los huecos son las 16:00 y las 16:40. Se le muestran los
 * que de verdad están libres hoy y aparta el que acaba de comprometer,
 * con un clic.
 *
 * Por lo mismo solo aparecen los huecos libres: ofrecerle apartar una
 * hora que ya tiene cita sería invitarlo a tapar algo que no está
 * destapado.
 */
export function HorasApartadas({
  consultorios,
  apartadas,
}: {
  consultorios: ConsultorioConHuecos[];
  apartadas: HoraFila[];
}) {
  const [consultorioId, setConsultorioId] = useState(consultorios[0]?.id ?? "");
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const [aviso, setAviso] = useState("");
  const [quitadas, setQuitadas] = useState<string[]>([]);
  const [nuevas, setNuevas] = useState<HoraFila[]>([]);
  const [trabajando, iniciar] = useTransition();

  const elegido = consultorios.find((c) => c.id === consultorioId);
  const dia = elegido?.dias.find((d) => d.fecha === fecha) ?? elegido?.dias[0];

  const visibles = useMemo(
    () =>
      [...apartadas, ...nuevas]
        .filter((h) => !quitadas.includes(h.id))
        .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`)),
    [apartadas, nuevas, quitadas],
  );

  function apartar(hora: string) {
    if (!elegido || !dia) return;
    iniciar(async () => {
      const r = await apartarHora(elegido.id, dia.fecha, hora, motivo);
      setAviso(r.mensaje);
      if (r.ok) {
        setNuevas((n) => [
          ...n,
          {
            id: `nueva-${dia.fecha}-${hora}`,
            consultorioId: elegido.id,
            consultorio: elegido.nombre,
            fecha: dia.fecha,
            hora,
            motivo: motivo.trim() || null,
            pasada: false,
          },
        ]);
        setMotivo("");
      }
    });
  }

  if (consultorios.length === 0) {
    return (
      <div className="nota-umbral">
        Para apartar horas sueltas hace falta un consultorio con horario
        cargado.
      </div>
    );
  }

  return (
    <div>
      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      <div className="apartar">
        {consultorios.length > 1 ? (
          <label className="campo">
            <span>Consultorio</span>
            <select
              value={consultorioId}
              onChange={(e) => {
                setConsultorioId(e.target.value);
                setFecha("");
              }}
            >
              {consultorios.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="campo">
          <span>Día</span>
          <select value={dia?.fecha ?? ""} onChange={(e) => setFecha(e.target.value)}>
            {elegido?.dias.map((d) => (
              <option key={d.fecha} value={d.fecha}>
                {d.etiqueta}
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Motivo, si quiere anotarlo</span>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Paciente agendado por teléfono"
            maxLength={140}
          />
        </label>
      </div>

      {dia && dia.horas.length > 0 ? (
        <>
          <p className="meta" style={{ marginBottom: 10 }}>
            Huecos que el sitio todavía ofrece ese día. Toque el que acaba de
            comprometer.
          </p>
          <div className="chips">
            {dia.horas.map((h) => (
              <button
                key={h}
                type="button"
                className="chip-hora"
                disabled={trabajando}
                onClick={() => apartar(h)}
              >
                {h}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="nota-umbral">
          Ese día ya no tiene huecos libres: están todos tomados o apartados.
        </div>
      )}

      <div className="seccion-cabeza" style={{ marginTop: 26 }}>
        <h3>Horas apartadas</h3>
        <span>{visibles.length}</span>
      </div>

      {visibles.length === 0 ? (
        <div className="nota-umbral">
          Todavía no hay ninguna. Las que aparte se dejan de ofrecer al
          instante, en el sitio y en el asistente de WhatsApp.
        </div>
      ) : (
        <div className="tabla">
          <div className="tabla-fila tabla-cabeza">
            <span>Día</span>
            <span>Hora</span>
            <span>Motivo</span>
            <span />
          </div>
          {visibles.map((h) => (
            <div className="tabla-fila" key={h.id}>
              <span>
                {h.fecha}
                <br />
                <em className="meta">{h.consultorio}</em>
              </span>
              <span>{h.hora}</span>
              <span className="meta">{h.motivo ?? "—"}</span>
              <span className="acciones-tabla">
                <BotonIcono
                  etiqueta={`Liberar las ${h.hora} del ${h.fecha}`}
                  disabled={trabajando || h.id.startsWith("nueva-")}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await liberarHora(h.id);
                      setAviso(r.mensaje);
                      if (r.ok) setQuitadas((q) => [...q, h.id]);
                    })
                  }
                >
                  <Reabrir />
                </BotonIcono>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
