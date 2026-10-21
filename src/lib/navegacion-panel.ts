/**
 * Qué pantallas ve cada quien dentro del panel.
 *
 * Vive aparte de la página porque ahora la usan dos: el armazón que dibuja
 * el rail y la propia pantalla de inicio. Tenerla escrita dos veces era
 * garantía de que una se quedara atrás al agregar una pantalla nueva.
 *
 * Cada quien ve lo que puede abrir. Mostrarle «Cobros» a un médico solo
 * le ofrece una puerta que se le va a cerrar en la cara.
 */

export type EnlaceDelPanel = {
  href: string;
  texto: string;
  icono: string;
};

export function enlacesDelPanel(
  rol: string | undefined,
  tienePerfil: boolean,
): EnlaceDelPanel[] {
  const inicio: EnlaceDelPanel = {
    href: "/panel",
    texto: "Inicio",
    icono: "casa",
  };

  const propios: EnlaceDelPanel[] = [
    { href: "/panel/mi-agenda", texto: "Agenda", icono: "calendario" },
    { href: "/panel/mi-perfil", texto: "Mi perfil", icono: "persona" },
  ];

  const delEquipo: EnlaceDelPanel[] = [
    { href: "/panel/solicitudes", texto: "Solicitudes", icono: "documento" },
    { href: "/panel/catalogos", texto: "Catálogos", icono: "maletin" },
    { href: "/panel/opiniones", texto: "Opiniones", icono: "estrella" },
    { href: "/panel/cobros", texto: "Cobros", icono: "tarjeta" },
    {
      href: "/panel/datos-personales",
      texto: "Datos personales",
      icono: "escudo",
    },
  ];

  const soloAdmin: EnlaceDelPanel[] = [
    { href: "/panel/usuarios", texto: "Accesos", icono: "puerta" },
  ];

  const clave: EnlaceDelPanel[] = [
    { href: "/panel/mi-clave", texto: "Mi contraseña", icono: "engrane" },
  ];

  if (rol === "ADMINISTRADOR" || rol === "RECEPCION") {
    const equipo =
      rol === "ADMINISTRADOR" ? [...delEquipo, ...soloAdmin] : delEquipo;
    // El titular del sitio también pasa consulta. Esconderle «Mi perfil»
    // por ser administrador lo dejaba sin forma de editar lo suyo, con la
    // página existiendo y sin un solo enlace que llevara hasta ella.
    return tienePerfil
      ? [inicio, ...propios, ...equipo, ...clave]
      : [inicio, propios[0], ...equipo, ...clave];
  }

  return [inicio, ...propios, ...clave];
}
