import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'INZO IA MUTALÊ | Gestão Integrada',
  description: 'Portal administrativo e religioso do INZO IA MUTALÊ — fundado em 1984.',
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
