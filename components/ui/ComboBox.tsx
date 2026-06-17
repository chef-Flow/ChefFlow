'use client'

import {
  useState, useRef, useEffect,
  KeyboardEvent, forwardRef, useImperativeHandle,
} from 'react'
import { ChevronDown, Search } from 'lucide-react'

export interface ComboOption {
  value: string
  label: string
  subLabel?: string
  /** Small pill shown before the label inside the dropdown (not shown in the input field) */
  tag?: { text: string; className: string }
}

interface Props {
  options: ComboOption[]
  value: string
  onChange: (value: string) => void
  /** Called after the user confirms a selection (Enter or click) */
  onConfirm?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** Minimum characters typed before showing suggestions (default 0 = show all on focus) */
  minChars?: number
  /** Max number of suggestions shown (default unlimited) */
  maxResults?: number
  tabIndex?: number
}

const ComboBox = forwardRef<HTMLInputElement, Props>(function ComboBox(
  { options, value, onChange, onConfirm, placeholder = 'Buscar...', className = '', disabled, minChars = 0, maxResults, tabIndex },
  ref,
) {
  const [query, setQuery]         = useState('')
  const [open, setOpen]           = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef      = useRef<HTMLInputElement>(null)
  const justSelected  = useRef(false)

  useImperativeHandle(ref, () => inputRef.current!)

  const selected = options.find(o => o.value === value)

  const queryTrimmed = query.trim()
  const shouldShow = open && queryTrimmed.length >= Math.max(minChars, 1) || (open && minChars === 0)

  const filtered = (() => {
    const base = queryTrimmed
      ? options.filter(o =>
          o.label.toLowerCase().includes(queryTrimmed.toLowerCase()) ||
          o.subLabel?.toLowerCase().includes(queryTrimmed.toLowerCase())
        )
      : options
    return maxResults ? base.slice(0, maxResults) : base
  })()

  useEffect(() => { setActiveIdx(0) }, [query])

  const select = (opt: ComboOption) => {
    justSelected.current = true
    setTimeout(() => { justSelected.current = false }, 200)
    onChange(opt.value)
    onConfirm?.()
    // Retrasar el cierre del dropdown al siguiente frame para que el
    // re-render del ComboBox no compita con el foco ya establecido
    requestAnimationFrame(() => {
      setQuery('')
      setOpen(false)
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setOpen(true)
        setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (justSelected.current) break           // ignorar Enter duplicado post-selección
        if (shouldShow && filtered[activeIdx]) select(filtered[activeIdx])
        else if (!open) setOpen(true)
        break
      case 'Escape':
        setOpen(false)
        break
      default:
        if (!open) setOpen(true)
    }
  }

  const showDropdown = shouldShow && filtered.length > 0
  const showEmpty    = open && queryTrimmed.length >= Math.max(minChars, 1) && filtered.length === 0

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={open ? query : (selected?.label ?? '')}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => {
            if (justSelected.current) {
              // El foco volvió al ComboBox inmediatamente después de una selección.
              // Redirigirlo al siguiente campo en lugar de reabrir el dropdown.
              onConfirm?.()
              return
            }
            setOpen(true)
            setQuery('')
          }}
          onBlur={() => setTimeout(() => { if (!justSelected.current) setOpen(false) }, 160)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          tabIndex={tabIndex}
          className="w-full pl-7 pr-7 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <ChevronDown
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>

      {showDropdown && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-y-auto" style={{ maxHeight: '22rem' }}>
          {filtered.map((opt, i) => (
            <li
              key={opt.value}
              onMouseDown={e => { e.preventDefault(); select(opt) }}
              className={`px-3 py-2.5 cursor-pointer border-b border-slate-50 last:border-0 ${
                i === activeIdx ? 'bg-brand-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {opt.tag && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 leading-none ${opt.tag.className}`}>
                    {opt.tag.text}
                  </span>
                )}
                <span className={`text-sm font-medium truncate ${i === activeIdx ? 'text-brand-700' : 'text-slate-800'}`}>
                  {opt.label}
                </span>
              </div>
              {opt.subLabel && (
                <div className="text-xs text-slate-400 truncate mt-0.5 pl-0.5">{opt.subLabel}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showEmpty && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow p-3 text-sm text-slate-400 text-center">
          Sin resultados para &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
})

export default ComboBox
