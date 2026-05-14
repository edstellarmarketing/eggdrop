'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet as WalletIcon, ShoppingCart, Package, Info, Loader2, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { RealtimeTimer } from '@/components/game/realtime-timer'
import { purchaseResourceAction, clearTeamSession } from './actions'
import type { Event, Resource, Team, Wallet } from '@/types/game'

const PURCHASE_PHASES = new Set(['build', 'trading'])

function formatPhase(phase: string | null | undefined) {
  if (!phase) return 'unknown'
  return phase.replace(/_/g, ' ')
}

export function TeamConsole({
  team,
  event,
  wallet,
  resources,
}: {
  team: Team
  event: Event
  wallet: Wallet | null
  resources: Resource[]
}) {
  const router = useRouter()
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const marketplaceOpen = PURCHASE_PHASES.has(event.current_phase)
  const remaining = wallet?.remaining_balance ?? 0

  async function handlePurchase(resourceId: string) {
    setBuyingId(resourceId)
    const result = await purchaseResourceAction(resourceId, 1)
    setBuyingId(null)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    toast.success(`Bought ${result.resourceName} for ${result.spent} CR`)
    startTransition(() => router.refresh())
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: team.color || '#999' }}
            />
            <h1 className="text-xl font-bold truncate">{team.name}</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full text-sm font-medium">
              <WalletIcon className="w-4 h-4 text-zinc-500" />
              <span>{Number(remaining).toFixed(0)} CR</span>
            </div>
            <span className="hidden md:inline text-xs uppercase tracking-wider text-zinc-500">
              {formatPhase(event.current_phase)}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <RealtimeTimer endsAt={event.timer_ends_at || null} />
            <form action={clearTeamSession}>
              <Button type="submit" variant="ghost" size="sm" title="Leave team">
                <LogOut className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Marketplace
            </h2>
            <p className="text-sm text-muted-foreground">First come, first served.</p>
          </div>

          {!marketplaceOpen && (
            <div className="mb-6 bg-blue-50 border border-blue-200 p-6 rounded-xl flex items-start gap-4 text-blue-800">
              <Info className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-lg">Marketplace Closed</h3>
                <p>
                  Purchases are only allowed during the Build and Trading phases. Current phase:{' '}
                  <strong>{formatPhase(event.current_phase)}</strong>.
                </p>
              </div>
            </div>
          )}

          {resources.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No resources have been added to this event yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => {
                const soldOut = resource.stock_remaining === 0
                const tooExpensive = Number(resource.price_credits) > Number(remaining)
                const disabled =
                  soldOut ||
                  tooExpensive ||
                  !marketplaceOpen ||
                  buyingId === resource.id
                return (
                  <Card key={resource.id} className={soldOut ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{resource.name}</CardTitle>
                          {resource.category && (
                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider bg-zinc-100 px-2 py-0.5 rounded">
                              {resource.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-end">
                        <div className="text-2xl font-bold">
                          {Number(resource.price_credits).toFixed(0)}{' '}
                          <span className="text-sm font-normal text-zinc-400">CR</span>
                        </div>
                        <div className="text-sm font-medium text-zinc-500">
                          {resource.stock_remaining} left
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        disabled={disabled}
                        onClick={() => handlePurchase(resource.id)}
                      >
                        {buyingId === resource.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Package className="w-4 h-4 mr-2" />
                        )}
                        {soldOut
                          ? 'Sold Out'
                          : tooExpensive
                            ? 'Not enough CR'
                            : !marketplaceOpen
                              ? 'Closed'
                              : 'Purchase Item'}
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
