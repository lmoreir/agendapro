export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Agendamentos hoje</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">0</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Clientes ativos</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">0</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500">Total este mês</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">0</p>
        </div>
      </div>
    </div>
  )
}
