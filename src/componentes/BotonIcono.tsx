import Link from "next/link";

/**
 * Un botón cuadrado que solo lleva un icono.
 *
 * Es el de las acciones de una fila del panel: corregir, borrar, aprobar.
 * Lo que hace se dice en `etiqueta`, que va al `aria-label` para el lector
 * de pantalla y al `title` para quien pasa el ratón; sin ella el botón no
 * existe, porque un icono suelto no se puede anunciar.
 *
 * Con `href` es un enlace con el mismo aspecto. Para lo que no se deshace,
 * `BotonConfirmar` con `className={claseBotonIcono("peligro")}` y el icono
 * en `icono` da el mismo cuadro y conserva la pregunta antes de actuar.
 */

export type TonoBotonIcono = "neutro" | "peligro" | "exito";

export function claseBotonIcono(tono: TonoBotonIcono = "neutro", extra?: string) {
  return ["boton-accion", tono === "neutro" ? null : tono, extra]
    .filter(Boolean)
    .join(" ");
}

type Comun = {
  /** Qué hace, dicho como verbo: «Editar el texto de Delicias». */
  etiqueta: string;
  tono?: TonoBotonIcono;
  className?: string;
  /** El icono, a 16 px. */
  children: React.ReactNode;
};

type ComoBoton = Comun &
  Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "className" | "title" | "aria-label"
  > & { href?: undefined };

type ComoEnlace = Comun & { href: string };

export function BotonIcono(props: ComoBoton | ComoEnlace) {
  if (props.href !== undefined) {
    const { etiqueta, tono, className, children, href } = props;
    return (
      <Link
        href={href}
        className={claseBotonIcono(tono, className)}
        aria-label={etiqueta}
        title={etiqueta}
      >
        {children}
      </Link>
    );
  }

  const { etiqueta, tono, className, children, type = "button", ...resto } = props;
  delete (resto as { href?: unknown }).href;
  return (
    <button
      {...resto}
      type={type}
      className={claseBotonIcono(tono, className)}
      aria-label={etiqueta}
      title={etiqueta}
    >
      {children}
    </button>
  );
}
