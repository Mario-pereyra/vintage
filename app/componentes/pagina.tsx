import type { ReactNode } from "react";

/** Marco común de las páginas públicas: cabecera con la marca y contenido centrado. */
export function Pagina({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <p className="mx-auto max-w-5xl text-lg font-semibold tracking-wide">
          Vintage
        </p>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <h1 className="sr-only">{titulo}</h1>
        {children}
      </main>
    </div>
  );
}
