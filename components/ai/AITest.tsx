"use client"

import AIChat from "./AIChat"

export default function AITest() {
  return (
    <div className="bg-white rounded-[32px] p-8 shadow-sm">
      <h2 className="text-2xl font-bold">
        AI Study Assistant
      </h2>

      <p className="text-[#64748B] mt-2">
        Powered by Llama 3.3
      </p>

      <div className="mt-6">
        <AIChat />
      </div>
    </div>
  )
}
