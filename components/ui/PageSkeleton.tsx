function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
}

interface Props {
  rows?: number
  hasSearch?: boolean
  hasGrid?: boolean
}

export default function PageSkeleton({ rows = 6, hasSearch = false, hasGrid = false }: Props) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Pulse className="h-7 w-40" />
          <Pulse className="h-4 w-64" />
        </div>
        <Pulse className="h-9 w-36 rounded-lg" />
      </div>

      {/* Optional search bar */}
      {hasSearch && <Pulse className="h-10 w-full mb-4 rounded-lg" />}

      {/* Content */}
      {hasGrid ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <Pulse className="h-5 w-3/4" />
              <Pulse className="h-4 w-1/2" />
              <div className="flex gap-2 pt-1">
                <Pulse className="h-6 w-16 rounded-full" />
                <Pulse className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-3 border-b border-slate-100 flex gap-4">
            <Pulse className="h-4 w-24" />
            <Pulse className="h-4 w-16 ml-auto" />
            <Pulse className="h-4 w-16" />
            <Pulse className="h-4 w-16" />
          </div>
          {/* Rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-slate-50 flex items-center gap-4">
              <Pulse className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Pulse className="h-4 w-48" />
                <Pulse className="h-3 w-32" />
              </div>
              <Pulse className="h-4 w-20" />
              <Pulse className="h-4 w-20" />
              <Pulse className="h-7 w-7 rounded-lg" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
