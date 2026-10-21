"use client";

/**
 * El último recurso.
 *
 * Si lo que falla es el armazón del sitio, no hay barra, ni pie, ni hoja
 * de estilos: Next reemplaza la página entera por esta. Por eso va con
 * sus estilos escritos aquí mismo y sin depender de nada. Es la pantalla
 * que nunca debería verse, y justamente por eso tiene que verse bien.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#ebf4fb",
          color: "#10263a",
          fontFamily:
            "Inter, 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #dbe7f2",
            borderRadius: 20,
            padding: "40px 32px",
            boxShadow: "0 10px 30px -18px rgba(18, 59, 89, 0.4)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 18px",
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              background: "#e3eef7",
              color: "#176a98",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="30"
              height="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.6v5" />
              <path d="M12 16.2h.01" />
            </svg>
          </div>

          <h1 style={{ fontSize: "1.5rem", margin: "0 0 10px", color: "#123b59" }}>
            El sitio no pudo cargar
          </h1>
          <p style={{ margin: "0 0 6px", color: "#5b7183", lineHeight: 1.55 }}>
            Fue un problema nuestro, no suyo.
          </p>
          <p style={{ margin: "0 0 24px", color: "#5b7183", lineHeight: 1.55 }}>
            Espere un momento o inténtelo de nuevo más tarde.
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                font: "inherit",
                fontWeight: 600,
                padding: "12px 20px",
                borderRadius: 10,
                border: "1px solid transparent",
                background: "#20be70",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
            {/* Una recarga completa a propósito: si lo que falló es el
                armazón, navegar con el router del sitio puede fallar igual. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                font: "inherit",
                fontWeight: 600,
                padding: "12px 20px",
                borderRadius: 10,
                border: "1px solid #dbe7f2",
                background: "#fff",
                color: "#123b59",
                textDecoration: "none",
              }}
            >
              Ir al inicio
            </a>
          </div>

          {error.digest ? (
            <p style={{ margin: "20px 0 0", color: "#9fb6c8", fontSize: "0.78rem" }}>
              Referencia: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
