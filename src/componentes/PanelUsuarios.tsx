"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { intentar } from "@/lib/intentar";

import { BotonConfirmar } from "@/componentes/BotonConfirmar";
import { BotonIcono, claseBotonIcono } from "@/componentes/BotonIcono";
import { Llave, Papelera, Visto } from "@/componentes/Iconos";
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
  /** El perfil al que da acceso, si es el de un médico. */
  perfil: {
    nombre: string;
    slug: string;
    plan: string;
    vence: string | null;
    publicado: boolean;
  } | null;
};

/** El plan, dicho como lo lee alguien que no vende software. */
const PLAN: Record<string, string> = {
  BASICO: "Básico",
  GOLD: "Gold",
  PREMIUM: "Premium",
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

  const deEquipo = cuentas.filter((c) => c.rol !== "PROFESIONAL");
  const medicos = cuentas.filter((c) => c.rol === "PROFESIONAL");

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

        <div className="tabla tabla-accesos">
          <div className="tabla-fila tabla-cabeza">
            <span>Persona</span>
            <span>Permiso</span>
            <span className="acciones-tabla">Estado</span>
          </div>

          {deEquipo.map((c) => (
            <div className="tabla-fila" key={c.id}>
              <span>
                {c.nombre}
                <br />
                <small className="meta">{c.correo}</small>
                {/* Quien además es médico llega a su ficha desde aquí, que
                    es donde la estaba buscando. */}
                {c.perfil ? (
                  <>
                    <br />
                    <Link
                      href={`/panel/profesionales/${c.perfil.slug}`}
                      className="meta enlace-acento"
                    >
                      Ver y editar su perfil de médico
                    </Link>
                  </>
                ) : null}
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
                        const r = await intentar(() => cambiarRolDeEquipo(
                          c.id,
                          e.target.value as RolDeEquipo,
                        ));
                        setAviso(r.mensaje);
                      })
                    }
                  >
                    <option value="RECEPCION">Recepción</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                  </select>
                )}
              </span>

              <span className="acciones-tabla">
                {c.correo === yo ? (
                  <span className="meta">activo</span>
                ) : (
                  <>
                    <em className={`pastilla ${c.activo ? "pastilla-bien" : "pastilla-espera"}`}>
                      {c.activo ? "Activo" : "Sin acceso"}
                    </em>
                    {c.activo ? (
                      <BotonConfirmar
                        className={claseBotonIcono("peligro")}
                        icono={<Papelera />}
                        etiqueta={null}
                        rotulo={`Quitar el acceso a ${c.nombre}`}
                        peligro
                        disabled={trabajando}
                        titulo={`¿Quitarle el acceso a ${c.nombre}?`}
                        cuerpo="Deja de poder entrar al panel de inmediato, aunque su cuenta y lo que haya hecho se conservan. Puede devolvérselo cuando quiera."
                        confirmar="Sí, quitar el acceso"
                        alConfirmar={async () => {
                          const r = await intentar(() => activarAcceso(c.id, false));
                          setAviso(r.mensaje);
                        }}
                      />
                    ) : (
                      <BotonIcono
                        tono="exito"
                        etiqueta={`Devolver el acceso a ${c.nombre}`}
                        disabled={trabajando}
                        onClick={() =>
                          iniciar(async () => {
                            const r = await intentar(() => activarAcceso(c.id, true));
                            setAviso(r.mensaje);
                          })
                        }
                      >
                        <Visto />
                      </BotonIcono>
                    )}
                    <BotonIcono
                      etiqueta={`Generar una clave nueva para ${c.nombre}`}
                      disabled={trabajando}
                      onClick={() =>
                        iniciar(async () => {
                          const r = await intentar(() => reemitirClaveDeEquipo(c.id));
                          setAviso(r.mensaje);
                          if (r.ok) setCredencial({ correo: r.correo, clave: r.clave });
                        })
                      }
                    >
                      <Llave />
                    </BotonIcono>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Los médicos, con su plan a la vista. El administrador pedía ver y
          editar las cuentas de todos desde un solo lugar; tenerlos en otra
          pantalla obligaba a recordar en cuál estaba cada cosa. */}
      {medicos.length > 0 ? (
        <section className="ficha formulario">
          <h2>Los médicos y sus planes</h2>
          <p className="meta">
            El permiso de un médico no se cambia desde aquí: dejaría de
            entrar a su propio perfil. Lo que sí puede hacer es emitirle una
            contraseña nueva, quitarle el acceso o abrir su perfil para
            editarlo y cambiarle el plan.
          </p>

          <div className="tabla tabla-accesos" style={{ marginTop: 14 }}>
            <div className="tabla-fila tabla-cabeza">
              <span>Médico</span>
              <span>Plan</span>
              <span className="acciones-tabla">Estado</span>
            </div>

            {medicos.map((c) => (
              <div className="tabla-fila" key={c.id}>
                <span>
                  {c.perfil ? (
                    <Link href={`/panel/profesionales/${c.perfil.slug}`}>
                      {c.perfil.nombre}
                    </Link>
                  ) : (
                    c.nombre
                  )}
                  <br />
                  <small className="meta">{c.correo}</small>
                </span>

                <span>
                  {c.perfil ? (
                    <>
                      <b>{PLAN[c.perfil.plan] ?? c.perfil.plan}</b>
                      <br />
                      <small className="meta">
                        {c.perfil.plan === "BASICO"
                          ? "Sin costo, no caduca"
                          : c.perfil.vence
                            ? `Vence el ${c.perfil.vence}`
                            : "Sin fecha de vencimiento"}
                      </small>
                    </>
                  ) : (
                    <em className="meta">sin perfil</em>
                  )}
                </span>

                <span className="acciones-tabla">
                  <em
                    className={`pastilla ${
                      c.activo && c.perfil?.publicado
                        ? "pastilla-bien"
                        : "pastilla-espera"
                    }`}
                  >
                    {!c.activo
                      ? "Sin acceso"
                      : c.perfil?.publicado
                        ? "Publicado"
                        : "Sin publicar"}
                  </em>

                  {c.activo ? (
                    <BotonConfirmar
                      className={claseBotonIcono("peligro")}
                      icono={<Papelera />}
                      etiqueta={null}
                      rotulo={`Quitar el acceso a ${c.nombre}`}
                      peligro
                      disabled={trabajando}
                      titulo={`¿Quitarle el acceso a ${c.nombre}?`}
                      cuerpo="Deja de poder entrar a administrar su perfil. Su perfil sigue publicado y los pacientes lo siguen encontrando."
                      confirmar="Sí, quitar el acceso"
                      alConfirmar={async () => {
                        const r = await intentar(() => activarAcceso(c.id, false));
                        setAviso(r.mensaje);
                      }}
                    />
                  ) : (
                    <BotonIcono
                      tono="exito"
                      etiqueta={`Devolver el acceso a ${c.nombre}`}
                      disabled={trabajando}
                      onClick={() =>
                        iniciar(async () => {
                          const r = await intentar(() => activarAcceso(c.id, true));
                          setAviso(r.mensaje);
                        })
                      }
                    >
                      <Visto />
                    </BotonIcono>
                  )}

                  <BotonIcono
                    etiqueta={`Generar una clave nueva para ${c.nombre}`}
                    disabled={trabajando}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await intentar(() => reemitirClaveDeEquipo(c.id));
                        setAviso(r.mensaje);
                        if (r.ok) setCredencial({ correo: r.correo, clave: r.clave });
                      })
                    }
                  >
                    <Llave />
                  </BotonIcono>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
              const r = await intentar(() => crearAccesoDeEquipo(nombre, correo, rol));
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
