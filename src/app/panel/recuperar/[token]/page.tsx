import type { Metadata } from "next";
import Link from "next/link";

import { FijarClaveNueva } from "@/componentes/FijarClaveNueva";
import { prisma } from "@/lib/prisma";
import { revisarToken, usuarioDelToken } from "@/lib/recuperacion";
import { sitio } from "@/config/sitio";

export const metadata: Metadata = {
  title: "Elegir una contraseña nueva",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/**
 * Elegir la contraseña nueva desde el enlace del correo.
 *
 * El enlace se comprueba antes de dibujar el formulario. Dejar escribir
 * una contraseña y rechazarla al guardar es la clase de detalle que hace
 * que alguien ya molesto por haber quedado fuera se moleste más.
 */
export default async function ElegirClave({ params }: Props) {
  const { token } = await params;
  const secreto = process.env.AUTH_SECRET;

  const id = usuarioDelToken(token);
  const usuario = id
    ? await prisma.usuario.findUnique({
        where: { id },
        select: { nombre: true, hashClave: true, activo: true },
      })
    : null;

  const revision =
    secreto && usuario && usuario.activo
      ? revisarToken(token, usuario.hashClave, secreto)
      : ({ ok: false, motivo: "ilegible" } as const);

  if (!revision.ok) {
    const vencido = revision.motivo === "vencido";
    return (
      <main>
        <section
          className="envoltura"
          style={{ maxWidth: 440, paddingBlock: "56px 40px" }}
        >
          <h1 style={{ fontSize: "1.6rem", marginBlock: "10px 10px" }}>
            {vencido ? "Ese enlace venció" : "Ese enlace ya no sirve"}
          </h1>
          <div className="nota-umbral">
            {vencido
              ? "Los enlaces duran una hora por seguridad. Pida uno nuevo y úselo en cuanto le llegue."
              : "O ya se usó para cambiar la contraseña, o se pidió otro después. En cualquier caso, pida uno nuevo."}
          </div>
          <p style={{ marginTop: 16 }}>
            <Link href="/panel/recuperar" className="boton-lleno">
              Pedir un enlace nuevo
            </Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section
        className="envoltura"
        style={{ maxWidth: 440, paddingBlock: "56px 40px" }}
      >
        <p className="eyebrow">{sitio.nombre}</p>
        <h1 style={{ fontSize: "1.7rem", marginBlock: "10px 8px" }}>
          Elija su contraseña
        </h1>
        <p className="intro" style={{ marginBottom: 20 }}>
          {usuario?.nombre}, escriba la contraseña con la que va a entrar de
          ahora en adelante. Este enlace deja de servir en cuanto la guarde.
        </p>

        <FijarClaveNueva token={token} />
      </section>
    </main>
  );
}
