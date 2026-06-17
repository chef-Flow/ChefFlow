import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChefFlow Costeo',
  description: 'Herramienta de costeo de recetas para restaurantes',
  icons: {
    icon: '/logo.avif',
    apple: '/logo.avif',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-50 antialiased">{children}</body>
    </html>
  )
}
