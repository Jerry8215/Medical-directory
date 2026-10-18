import { conversion, sugerencia, type Conteo } from "@/lib/metricas";
import type { Panorama } from "@/lib/metricas-datos";

/**
 * Las métricas del perfil, en la forma en que sirven para decidir.
 *
 * Cada número va acompañado de con qué compararlo, porque «cuarenta
 * vistas» no le dice nada a nadie. La barra de los días no lleva ejes ni
 * leyenda: no es un tablero de análisis, es un vistazo para saber si el
 * mes viene mejor o peor.
 */
export function MetricasPerfil({
  panorama,
  puedeWhatsapp,
  tieneFoto,
}: {
  panorama: Panorama;
  puedeWhatsapp: boolean;
  tieneFoto: boolean;
}) {
  const { mes, comparacion, porDia, especialidad } = panorama;
  const tasa = conversion(mes);
  const consejo = sugerencia(mes, puedeWhatsapp, tieneFoto);
  const tope = Math.max(1, ...porDia.map((d) => d.vistas));

  return (
    <div>
      <div className="cifras">
        <Cifra valor={mes.vistas} rotulo="Vieron su perfil" />
        <Cifra valor={mes.telefono} rotulo="Pidieron su teléfono" />
        <Cifra valor={mes.whatsapp} rotulo="Le escribieron por WhatsApp" />
        <Cifra valor={mes.citas} rotulo="Citas recibidas" />
      </div>

      <p className="meta" style={{ marginTop: 12 }}>
        {comparacion.frase}
        {especialidad ? ` Especialidad: ${especialidad}.` : ""}
      </p>

      {tasa !== null ? (
        <p className="meta">
          De cada cien que vieron su perfil, {Math.round(tasa)} hicieron algo:
          llamar, escribir o agendar.
        </p>
      ) : null}

      {porDia.length > 0 ? (
        <div className="barras-dias" aria-hidden="true">
          {porDia.map((d) => (
            <span
              key={d.dia}
              className="barra-dia"
              style={{ height: `${Math.max(4, (d.vistas / tope) * 100)}%` }}
              title={`${d.dia}: ${d.vistas}`}
            />
          ))}
        </div>
      ) : null}

      {consejo ? <div className="consejo">{consejo}</div> : null}
    </div>
  );
}

function Cifra({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="cifra">
      <b>{valor}</b>
      <span>{rotulo}</span>
    </div>
  );
}

export type { Conteo };
