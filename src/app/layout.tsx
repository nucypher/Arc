import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from '../components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Arc',
  description: 'Privacy-preserving location sharing',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
