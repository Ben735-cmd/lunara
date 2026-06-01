type SidebarProps = {
  logout: () => void
}

export default function Sidebar({
  logout,
}: SidebarProps) {
  return (
    <aside className="w-[260px] bg-[#0F172A] border-r border-white/10 p-6 flex flex-col justify-between">
      <div>
        {/* Logo */}
        <div className="mb-12">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
            L
          </div>

          <h1 className="text-white text-2xl font-bold mt-4">
            Lunara
          </h1>

          <p className="text-[#64748B] text-sm mt-1">
            University Workspace
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-3">
          <button className="w-full bg-white/10 text-white rounded-2xl px-4 py-4 text-left">
            Dashboard
          </button>

          <button className="w-full text-[#94A3B8] hover:bg-white/5 rounded-2xl px-4 py-4 text-left transition">
            Courses
          </button>

          <button className="w-full text-[#94A3B8] hover:bg-white/5 rounded-2xl px-4 py-4 text-left transition">
            Assignments
          </button>

          <button className="w-full text-[#94A3B8] hover:bg-white/5 rounded-2xl px-4 py-4 text-left transition">
            Notes
          </button>

          <button className="w-full text-[#94A3B8] hover:bg-white/5 rounded-2xl px-4 py-4 text-left transition">
            Calendar
          </button>
        </nav>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full bg-red-500 hover:bg-red-600 transition text-white rounded-2xl py-4 font-medium"
      >
        Logout
      </button>
    </aside>
  )
}