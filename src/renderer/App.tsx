import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Terminal, Plus, Trash2, ShieldCheck, HardDrive, RefreshCw, Eye, EyeOff, Info } from "lucide-react"

type Status = "active" | "expired" | "expiring-soon"

interface EnvVariable {
  id: string
  name: string // Service name
  key: string // Token value
  expiryDate: string // yyyy-mm-dd
  status: Status
}

interface TokenVisibility {
  [id: string]: boolean
}

declare global {
  interface Window {
    electron?: {
      saveFile?: (options: { defaultPath?: string; content: string }) => Promise<void>
    }
  }
}

function toEnvKey(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function computeStatus(expiryDate: string): Status {
  if (!expiryDate) return "active"
  const today = new Date()
  const expiry = new Date(expiryDate + "T00:00:00")
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "expired"
  if (diffDays <= 7) return "expiring-soon"
  return "active"
}

async function saveTextFile(filename: string, content: string) {
  // Try Electron preload first
  if (typeof window !== "undefined" && window.electron?.saveFile) {
    await window.electron.saveFile({ defaultPath: filename, content })
    return
  }
  // Fallback for web preview: download via blob
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [envVars, setEnvVars] = useState<EnvVariable[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newVar, setNewVar] = useState({ name: "", key: "", expiryDate: "" })
  const [tokenVisibility, setTokenVisibility] = useState<TokenVisibility>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem("envvault:data")
      if (raw) {
        const parsed: EnvVariable[] = JSON.parse(raw)
        setEnvVars(
          parsed.map((v) => ({
            ...v,
            status: computeStatus(v.expiryDate),
          })),
        )
      } else {
        // starter example rows (can delete)
        const seed: EnvVariable[] = [
          {
            id: "1",
            name: "GitHub",
            key: "ghp_xxxxxx",
            expiryDate: "2026-12-31",
            status: "active",
          },
          {
            id: "2",
            name: "Stripe",
            key: "sk_xxxxxx",
            expiryDate: "2025-02-01",
            status: "expiring-soon",
          },
          {
            id: "3",
            name: "OpenAI",
            key: "sk_xxxxxx",
            expiryDate: "2024-01-01",
            status: "expired",
          },
        ]
        setEnvVars(seed)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("envvault:data", JSON.stringify(envVars))
    } catch {
      // ignore
    }
  }, [envVars])

  const allSelected = useMemo(() => envVars.length > 0 && selected.size === envVars.length, [envVars, selected])

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(envVars.map((v) => v.id)))
    } else {
      setSelected(new Set())
    }
  }

  const toggleRow = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const addVar = () => {
    if (!newVar.name || !newVar.key || !newVar.expiryDate) return
    const item: EnvVariable = {
      id: String(Date.now()),
      name: newVar.name,
      key: newVar.key,
      expiryDate: newVar.expiryDate,
      status: computeStatus(newVar.expiryDate),
    }
    setEnvVars((prev) => [...prev, item])
    setNewVar({ name: "", key: "", expiryDate: "" })
    setIsAddOpen(false)
  }

  const refreshStatuses = () => {
    setEnvVars((prev) => prev.map((v) => ({ ...v, status: computeStatus(v.expiryDate) })))
  }

  const deleteSelected = () => {
    if (selected.size === 0) return
    setEnvVars((prev) => prev.filter((v) => !selected.has(v.id)))
    setSelected(new Set())
  }

  const exportAsEnv = async () => {
    const chosen = envVars.filter((v) => selected.has(v.id))
    const content = chosen.map((v) => `${toEnvKey(v.name)}=${v.key}`).join("\n")
    await saveTextFile(".env", content)
  }

  const exportAsBash = async () => {
    const chosen = envVars.filter((v) => selected.has(v.id))
    const content = chosen.map((v) => `export ${toEnvKey(v.name)}="${v.key.replace(/"/g, '\\"')}"`).join("\n")
    await saveTextFile("export-env.sh", content)
  }

  const statusBadge = (s: Status) => {
    if (s === "active")
      return <Badge className="border border-emerald-300 bg-emerald-100 text-emerald-800 font-mono">ACTIVE</Badge>
    if (s === "expiring-soon")
      return <Badge className="border border-amber-300 bg-amber-100 text-amber-800 font-mono">EXPIRING</Badge>
    return <Badge className="border border-rose-300 bg-rose-100 text-rose-800 font-mono">EXPIRED</Badge>
  }

  const maskToken = (token: string) => {
    if (token.length <= 8) return token
    return token.slice(0, 4) + "•".repeat(Math.min(token.length - 8, 12)) + token.slice(-4)
  }

  const toggleTokenVisibility = (id: string) => {
    setTokenVisibility((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      {/* Retro scanline + grid background overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.06]"
        style={{
          background:
            "repeating-linear-gradient(0deg, #000, #000 1px, transparent 1px, transparent 3px), radial-gradient(1000px 500px at 50% -20%, #0f172a 0%, transparent 60%)",
          mixBlendMode: "multiply",
        }}
      />
      {/* Header */}
      <header className="relative z-10 border-b border-neutral-200 bg-gradient-to-b from-neutral-900 to-neutral-800 text-neutral-50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-4">
          <div className="h-11 w-11 rounded-[8px] bg-neutral-700/60 border border-neutral-600 flex items-center justify-center shadow-inner">
            <ShieldCheck className="h-6 w-6 text-emerald-300" />
          </div>
          <div className="leading-tight">
            <div className="text-xl font-bold tracking-[0.08em] font-mono">EnvVault</div>
            <div className="text-xs text-neutral-300 font-mono tracking-widest">Environment Variable Manager</div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-neutral-300 font-mono">
            <HardDrive className="h-4 w-4 text-emerald-300" />
            {envVars.length} items
            <span className="mx-2">•</span>
            <Button
              variant="ghost"
              className="h-8 px-2 text-neutral-300 hover:text-white hover:bg-neutral-700/50 font-mono"
              onClick={refreshStatuses}
              title="Recompute statuses"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl p-6">
        {/* Controls */}
        <Card className="mb-6 border-neutral-200 bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-sm tracking-widest text-neutral-600">CONTROLS</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-neutral-900 hover:bg-neutral-800 text-emerald-300 border border-neutral-700 font-mono tracking-wide">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Key
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white/95 border border-neutral-200">
                <DialogHeader>
                  <DialogTitle className="font-mono tracking-wider">Add New API Token</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 pt-2">
                  <div>
                    <Label htmlFor="name" className="font-mono text-neutral-700">
                      Service
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., GitHub, Stripe, OpenAI"
                      value={newVar.name}
                      onChange={(e) => setNewVar((v) => ({ ...v, name: e.target.value }))}
                      className="mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="key" className="font-mono text-neutral-700">
                      Token
                    </Label>
                    <Input
                      id="key"
                      placeholder="e.g., ghp_xxxx or sk_xxxx"
                      value={newVar.key}
                      onChange={(e) => setNewVar((v) => ({ ...v, key: e.target.value }))}
                      className="mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry" className="font-mono text-neutral-700">
                      Expiry Date
                    </Label>
                    <Input
                      id="expiry"
                      type="date"
                      value={newVar.expiryDate}
                      onChange={(e) => setNewVar((v) => ({ ...v, expiryDate: e.target.value }))}
                      className="mt-1 font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-neutral-500 font-mono">
                      Will export as {toEnvKey(newVar.name || "SERVICE")}=...
                    </div>
                    <Button
                      onClick={addVar}
                      className="bg-neutral-900 hover:bg-neutral-800 text-emerald-300 border border-neutral-700 font-mono"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={exportAsEnv}
              disabled={selected.size === 0}
              className="bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-900 font-mono disabled:opacity-50"
            >
              <Download className="mr-2 h-4 w-4" />
              Export .env
            </Button>

            <Button
              onClick={exportAsBash}
              disabled={selected.size === 0}
              className="bg-slate-800 hover:bg-slate-900 text-emerald-300 border border-slate-700 font-mono disabled:opacity-50"
            >
              <Terminal className="mr-2 h-4 w-4" />
              Export Bash
            </Button>

            <Button
              onClick={deleteSelected}
              disabled={selected.size === 0}
              className="bg-white hover:bg-neutral-50 text-rose-600 border border-rose-300 font-mono disabled:opacity-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>

            <div className="ml-auto text-xs text-neutral-500 font-mono">
              Selected {selected.size} / {envVars.length}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="p-4 w-12 text-left">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(c) => toggleSelectAll(Boolean(c))}
                      className="border-neutral-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                  </th>
                  <th className="p-4 text-left font-mono text-sm tracking-wider text-neutral-700">SERVICE</th>
                  <th className="p-4 text-left font-mono text-sm tracking-wider text-neutral-700">TOKEN</th>
                  <th className="p-4 text-left font-mono text-sm tracking-wider text-neutral-700">VALUE</th>
                  <th className="p-4 text-left font-mono text-sm tracking-wider text-neutral-700">EXPIRY</th>
                  <th className="p-4 text-left font-mono text-sm tracking-wider text-neutral-700">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {envVars.map((v, i) => (
                  <tr key={v.id} className={i % 2 === 0 ? "bg-white" : "bg-neutral-50/60 hover:bg-neutral-100/60"}>
                    <td className="p-4">
                      <Checkbox
                        checked={selected.has(v.id)}
                        onCheckedChange={(c) => toggleRow(v.id, Boolean(c))}
                        className="border-neutral-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-mono font-semibold text-neutral-900">{v.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">export as {toEnvKey(v.name)}</div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-xs text-neutral-700 max-w-[20ch] truncate px-2 py-1 rounded border border-neutral-200 bg-neutral-50">
                          {v.key}
                        </div>
                        <div className="group relative inline-block cursor-help">
                          <Info className="h-4 w-4 text-neutral-400 hover:text-neutral-600" />
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-neutral-900 text-neutral-50 text-[10px] px-2 py-1 rounded whitespace-nowrap font-mono z-20">
                            Full token length: {v.key.length} chars
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-xs text-neutral-700 px-2 py-1 rounded border border-neutral-200 bg-neutral-50 max-w-[32ch] break-all">
                          {tokenVisibility[v.id] ? v.key : maskToken(v.key)}
                        </div>
                        <button
                          onClick={() => toggleTokenVisibility(v.id)}
                          className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
                          title={tokenVisibility[v.id] ? "Hide token" : "Show token"}
                        >
                          {tokenVisibility[v.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-mono text-sm text-neutral-800">{v.expiryDate}</div>
                    </td>
                    <td className="p-4 align-top">{statusBadge(v.status)}</td>
                  </tr>
                ))}

                {envVars.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="font-mono text-neutral-500">No variables yet. Add one now.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mx-auto max-w-7xl px-6 py-8 text-[11px] text-neutral-500 font-mono"></footer>
    </main>
  )
}
