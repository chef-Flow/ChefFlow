export function fbqTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { fbq?: (...args: unknown[]) => void }
  w.fbq?.('track', event, params)
}
