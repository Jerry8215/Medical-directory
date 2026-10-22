"use client";

import { useState } from "react";

import {
  INICIALES,
  mesCorrido,
  mesDe,
  nombreDelMes,
  rejillaDelMes,
} from "@/lib/calendario";

export type DiaDisponible = { fecha: string; etiqueta: string; horas: string[] };

/**
 * Elegir el día en una cuadrícula de mes.
 *
 * Antes eran sesenta botones en una tira horizontal. El paciente que
 * quiere «el martes de la otra semana» no cuenta botones: busca el martes
 * en un calendario, y los días sin lugar tienen que verse de un golpe,
 * apagados, sin tener que apretarlos para descubrirlo.
 *
 * El mes visible arranca donde está el día elegido, y las flechas solo
 * llegan hasta donde de verdad hay agenda cargada: ofrecer meses vacíos
 * es hacer caminar al paciente para nada.
 */
export function CalendarioMes({
  dias,
  elegida,
  alElegir,
}: {
  dias: DiaDisponible[];
  elegida: string;
  alElegir: (fecha: string) => void;
}) {
  const conLugar = new Map(dias.map((d) => [d.fecha, d]));
  const fechas = dias.map((d) => d.fecha).sort();
  const primerMes = mesDe(fechas[0] ?? elegida);
  const ultimoMes = mesDe(fechas[fechas.length - 1] ?? elegida);

  const [mes, setMes] = useState(mesDe(elegida || fechas[0] || primerMes));

  const celdas = rejillaDelMes(mes);
  const hayAntes = mes > primerMes;
  const hayDespues = mes < ultimoMes;

  return (
    <div className="calendario">
      <div className="calendario-cabeza">
        <button
          type="button"
          className="calendario-paso"
          onClick={() => setMes(mesCorrido(mes, -1))}
          disabled={!hayAntes}
          aria-label="Mes anterior"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <p className="calendario-mes" aria-live="polite">
          {nombreDelMes(mes)}
        </p>

        <button
          type="button"
          className="calendario-paso"
          onClick={() => setMes(mesCorrido(mes, 1))}
          disabled={!hayDespues}
          aria-label="Mes siguiente"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="calendario-semana" aria-hidden="true">
        {INICIALES.map((i, n) => (
          <span key={`${i}-${n}`}>{i}</span>
        ))}
      </div>

      <div className="calendario-rejilla" role="group" aria-label="Días con lugar">
        {celdas.map((fecha, n) => {
          if (!fecha) return <span key={`vacio-${n}`} className="calendario-hueco" />;

          const dia = conLugar.get(fecha);
          const numero = Number(fecha.slice(8));

          return (
            <button
              key={fecha}
              type="button"
              className="calendario-dia num"
              disabled={!dia}
              aria-pressed={fecha === elegida}
              // Un día apagado no explica por qué: el título lo dice.
              title={
                dia
                  ? `${dia.etiqueta}: ${dia.horas.length} ${
                      dia.horas.length === 1 ? "horario" : "horarios"
                    }`
                  : "Sin lugar este día"
              }
              onClick={() => alElegir(fecha)}
            >
              {numero}
            </button>
          );
        })}
      </div>
    </div>
  );
}
