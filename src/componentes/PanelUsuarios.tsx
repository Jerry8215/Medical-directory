"use client";

import { useState, useTransition } from "react";

import {
  activarAcceso,
  cambiarRolDeEquipo,
  crearAccesoDeEquipo,
  reemitirClaveDeEquipo,
  type RolDeEquipo,
} from "@/lib/equipo-admin";

type Cuenta = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  esMedico: boolean;
};

/** Lo que cada papel puede hacer, dicho sin tecnicismos. */
const QUE_PUEDE: Record<RolDeEquipo, string> = {
  RECEPCION:
    "Agenda de los médicos, lista de espera, registro de depósitos y solicitudes de datos personales.",
  ADMINISTRADOR:
    "Todo lo anterior, más precios, catálogos, verificación de cédulas, planes, opiniones y accesos.",
};

export function PanelUsuarios({ cuentas, yo }: { cuentas: Cuenta[]; yo: string }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<RolDeEquipo>("RECEPCION");
  const [aviso, setAviso] = useState<string | null>(null);
  const [credencial, setCredencial] = useState<{ correo: string; clave: string } | null>(
    null,
  );
  const [trabajando, iniciar] = useTransition();

  const deEquipo = cuentas.filter((c) => !c.esMedico);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      {/* La contraseña se muestra una sola vez y no vuelve a existir en
          claro en ningún lado, así que conviene que se vea grande. */}
      {credencial ? (
        <div className="credencial-nueva">
          <p className="rotulo">Entregue estos datos y guárdelos usted también</p>
          <p>
            <b>Correo:</b> {credencial.correo}
          </p>
          <p>
            <b>Contraseña:</b> <code>{credencial.clave}</code>
          </p>
          <button
            type="button"
            className="boton-suave"
            onClick={() => setCredencial(null)}
          >
            Ya la anoté
          </button>
        </div>
      ) : null}

      <section className="ficha formulario">
        <h2>Quién entra al panel</h2>

        <div className="tabla">
          <div className="tabla-cabeza">
            <span>Persona</span>
            <span>Permiso</span>
            <span>Estado</span>
          </div>

          {deEquipo.map((c) => (
            <div className="tabla-fila" key={c.id}>
              <span>
                {c.nombre}
                <br />
                <small className="meta">{c.correo}</small>
              </span>

              <span>
                {c.correo === yo ? (
                  <em className="meta">Usted</em>
                ) : (
                  <select
                    value={c.rol}
                    disabled={trabajando}
                    onChange={(e) =>
                      iniciar(async () => {
                        const r = await cambiarRolDeEquipo(
                          c.id,
                          e.target.value as RolDeEquipo,
                        );
                        setAviso(r.mensaje);
                      })
                    }
                  >
                    <option value="RECEPCION">Recepción</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                  </select>
                )}
              </span>

              <span>
                {c.correo === yo ? (
                  <span className="meta">activo</span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="enlace-boton"
                      disabled={trabajando}
                      onClick={() =>
                        iniciar(async () => {
                          const r = await activarAcceso(c.id, !c.activo);
                          setAviso(r.mensaje);
                        })
                      }
                    >
                      {c.activo ? "Activo · quitar" : "Sin acceso · dar"}
                    </button>
                    {" · "}
                    <button
                      type="button"
                      className="enlace-boton"
                      disabled={trabajando}
                      onClick={() =>
                        iniciar(async () => {
                          const r = await reemitirClaveDeEquipo(c.id);
                          setAviso(r.mensaje);
                          if (r.ok) setCredencial({ correo: r.correo, clave: r.clave });
                        })
                      }
                    >
                      nueva clave
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="ficha formulario">
        <h2>Dar acceso a alguien más</h2>

        <div className="campo">
          <label htmlFor="usuario-nombre">Nombre</label>
          <input
            id="usuario-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="campo">
          <label htmlFor="usuario-correo">Correo con el que entrará</label>
          <input
            id="usuario-correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="campo">
          <label htmlFor="usuario-rol">Permiso</label>
          <select
            id="usuario-rol"
            value={rol}
            onChange={(e) => setRol(e.target.value as RolDeEquipo)}
          >
            <option value="RECEPCION">Recepción</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </select>
          <p className="meta" style={{ marginTop: 6 }}>
            {QUE_PUEDE[rol]}
          </p>
        </div>

        <button
          className="boton-lleno"
          type="button"
          disabled={trabajando}
          onClick={() =>
            iniciar(async () => {
              const r = await crearAccesoDeEquipo(nombre, correo, rol);
              setAviso(r.mensaje);
              if (r.ok) {
                setCredencial({ correo: r.correo, clave: r.clave });
                setNombre("");
                setCorreo("");
              }
            })
          }
        >
          {trabajando ? "Creando…" : "Crear el acceso"}
        </button>
      </section>
    </div>
  );
}
