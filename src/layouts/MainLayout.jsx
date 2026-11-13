import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-full bg-canvas">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-full flex-col lg:pl-[244px] print:pl-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="w-full flex-1 px-4 py-6 sm:px-7">
          <Outlet />
          <footer className="mt-6 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
            <span>Gobierno del Estado de Baja California Sur · BCSnosUNE</span>
            <span>Información de uso interno</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
