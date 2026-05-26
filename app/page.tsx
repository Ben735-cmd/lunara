export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F8F8FC] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-[#E8E8F2] p-6">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-[#1E1E2F]">
            Lunara
          </h1>

          <p className="text-sm text-[#73738A] mt-1">
            Learn smarter.
          </p>
        </div>

        <nav className="space-y-3">
          <button className="w-full bg-[#6D5EF5] text-white p-3 rounded-xl text-left font-medium">
            Dashboard
          </button>

          <button className="w-full hover:bg-[#F1F1FB] p-3 rounded-xl text-left">
            Courses
          </button>

          <button className="w-full hover:bg-[#F1F1FB] p-3 rounded-xl text-left">
            Notes
          </button>

          <button className="w-full hover:bg-[#F1F1FB] p-3 rounded-xl text-left">
            AI Tutor
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <section className="flex-1 p-10">
        <h2 className="text-4xl font-bold text-[#1E1E2F]">
          Welcome back 👋
        </h2>

        <p className="text-[#73738A] mt-2">
          Continue your learning journey.
        </p>

        <div className="grid grid-cols-3 gap-6 mt-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <p className="text-sm text-[#73738A]">
              Courses Active
            </p>

            <h3 className="text-4xl font-bold mt-3">
              6
            </h3>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <p className="text-sm text-[#73738A]">
              Study Hours
            </p>

            <h3 className="text-4xl font-bold mt-3">
              42
            </h3>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <p className="text-sm text-[#73738A]">
              Assignments Due
            </p>

            <h3 className="text-4xl font-bold mt-3">
              3
            </h3>
          </div>
        </div>
      </section>
    </main>
  )
}