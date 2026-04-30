export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <span className="text-xl font-bold text-indigo-600">AgendaPro</span>
          <div className="flex gap-6 text-sm font-medium text-gray-600">
            <a href="/dashboard" className="hover:text-indigo-600">Dashboard</a>
            <a href="/agenda" className="hover:text-indigo-600">Agenda</a>
            <a href="/clientes" className="hover:text-indigo-600">Clientes</a>
            <a href="/whatsapp" className="hover:text-indigo-600">WhatsApp</a>
            <a href="/relatorios" className="hover:text-indigo-600">Relatórios</a>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
