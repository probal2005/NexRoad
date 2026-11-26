export default function RouteErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-brand-navy">This page could not load</h1>
        <p className="text-sm text-slate-600">Refresh the page or return to the NexRoad homepage.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className="rounded-xl bg-brand-navy px-4 py-2 text-sm font-semibold text-white" onClick={() => window.location.reload()}>Refresh page</button>
          <a href="/" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-navy">Go home</a>
        </div>
      </section>
    </main>
  )
}
