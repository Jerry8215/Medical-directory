/**
 * Qué pantallas ve cada quien dentro del panel.
 *
 * Vive aparte de la página porque la usan dos: el armazón que dibuja el
 * rail y la propia pantalla de inicio.
 *
 * Las cuentas de administración y las de médico están separadas del todo.
 * El administrador gestiona el directorio —altas, catálogos, cobros,
 * accesos— y no tiene «Mi perfil» ni «Mi agenda»: si además pasa consulta,
 * entra con su cuenta de médico. Mezclar las dos cosas en una cuenta era
 * lo que hacía que el panel de gestión mostrara ajustes personales.
 */

export type EnlaceDelPanel = {
  href: string;
  texto: string;
  icono: string;
};

export function esEquipo(rol: string | undefined): boolean {
  return rol === "ADMINISTRADOR" || rol === "RECEPCION";
}

export function enlacesDelPanel(rol: string | undefined): EnlaceDelPanel[] {
  const inicio: EnlaceDelPanel = { href: "/panel", texto: "Inicio", icono: "casa" };

  const gestion: EnlaceDelPanel[] = [
    { href: "/panel/solicitudes", texto: "Solicitudes", icono: "documento" },
    { href: "/panel/catalogos", texto: "Catálogos", icono: "maletin" },
    { href: "/panel/opiniones", texto: "Opiniones", icono: "estrella" },
    { href: "/panel/cobros", texto: "Cobros", icono: "tarjeta" },
    { href: "/panel/datos-personales", texto: "Datos personales", icono: "escudo" },
  ];

  if (rol === "ADMINISTRADOR") {
    return [inicio, ...gestion, { href: "/panel/usuarios", texto: "Accesos", icono: "puerta" }];
  }

  if (rol === "RECEPCION") {
    // Recepción agenda por teléfono: la agenda de todo el consultorio es su
    // herramienta de trabajo, no un ajuste personal.
    return [inicio, { href: "/panel/mi-agenda", texto: "Agenda", icono: "calendario" }, ...gestion];
  }

  // El médico no ve el tablero del directorio: ahí hay datos de todos los
  // perfiles y teléfonos de pacientes ajenos. Su inicio es su agenda.
  return [
    { href: "/panel/mi-agenda", texto: "Agenda", icono: "calendario" },
    { href: "/panel/mi-perfil", texto: "Mi perfil", icono: "persona" },
    // Sin esta puerta, mejorar de plan exigía llamar por teléfono.
    { href: "/panel/mi-plan", texto: "Mi plan", icono: "tarjeta" },
  ];
}
