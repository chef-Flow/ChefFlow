function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
}

export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Pulse className="h-7 w-32" />
        <div className="flex gap-2">
          <Pulse className="h-9 w-28 rounded-lg" />
          <Pulse className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
            <Pulse className="h-4 w-24" />
            <Pulse className="h-8 w-20" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex gap-4">
          {[1,2,3,4,5].map(i => <Pulse key={i} className="h-4 w-20" />)}
        </div>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="px-5 py-4 border-b border-slate-50 flex gap-4 items-center">
            <Pulse className="h-4 w-40" />
            <Pulse className="h-4 w-20 ml-auto" />
            <Pulse className="h-4 w-20" />
            <Pulse className="h-4 w-20" />
            <Pulse className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
