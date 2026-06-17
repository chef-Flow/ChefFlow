function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
}

export default function Loading() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Pulse className="h-7 w-32 mb-6" />
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <Pulse className="h-5 w-32" />
          <Pulse className="h-10 w-full rounded-lg" />
          <Pulse className="h-9 w-28 rounded-lg" />
        </div>
      ))}
    </div>
  )
}
