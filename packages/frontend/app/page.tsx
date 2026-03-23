import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 py-20 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400">
        Análisis on-chain
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        Cohortes claras. Decisiones mejor informadas.
      </h1>
      <p className="max-w-xl text-lg text-slate-400">
        CohortLens agrupa usuarios por comportamiento en la cadena. Conecta tu
        cartera desde la barra superior y abre el dashboard para lanzar el
        descubrimiento de cohortes contra tu API.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-500"
        >
          Ir al dashboard
        </Link>
      </div>
    </section>
  );
}
