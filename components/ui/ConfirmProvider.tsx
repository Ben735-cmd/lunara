"use client"

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { TriangleAlert } from "lucide-react"
import { useDialog } from "../../lib/useDialog"

type Options = {
  title: string
  message?: string
  /** Text on the red button, for example "Delete". */
  confirmLabel?: string
  cancelLabel?: string
}

type Confirm = (options: Options) => Promise<boolean>

const ConfirmContext = createContext<Confirm | null>(null)

/** Ask before doing something that cannot be undone: `if (!(await confirm({ title: "Delete this?" }))) return`. */
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider")
  return confirm
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<Options | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<Confirm>((next) => {
    // A second request while one is open cancels the first one.
    resolver.current?.(false)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setOptions(next)
    })
  }, [])

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }, [])

  const dialogRef = useDialog<HTMLDivElement>(!!options, () => settle(false))

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className="anim-fade fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4"
          onClick={() => settle(false)}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={options.message ? "confirm-message" : undefined}
            onClick={(e) => e.stopPropagation()}
            className="anim-pop w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-tint text-danger">
              <TriangleAlert size={22} aria-hidden="true" />
            </span>
            <h2 id="confirm-title" className="mt-4 text-lg font-semibold text-ink">{options.title}</h2>
            {options.message && (
              <p id="confirm-message" className="mt-1.5 text-sm text-ink-muted">{options.message}</p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {/* Cancel comes first so keyboard focus lands on the safe choice. */}
              <button
                onClick={() => settle(false)}
                className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-paper"
              >
                {options.cancelLabel ?? "Cancel"}
              </button>
              <button
                onClick={() => settle(true)}
                className="rounded-lg bg-[#b3321f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#962817]"
              >
                {options.confirmLabel ?? "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
