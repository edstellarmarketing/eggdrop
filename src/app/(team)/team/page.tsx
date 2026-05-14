'use client'

import { useState } from 'react'
import { useEvent } from '@/hooks/use-event'
import { useWallet } from '@/hooks/use-wallet'
import { useResources } from '@/hooks/use-resources'
import { RealtimeTimer } from '@/components/game/realtime-timer'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet, ShoppingCart, Package, Info, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function TeamConsole() {
  // In a real app, these IDs come from the team session cookie
  const eventId = 'active-event-id'
  const teamId = 'current-team-id'
  const teamName = 'Team Eagles'

  const { event, loading: eventLoading } = useEvent(eventId)
  const { wallet, loading: walletLoading } = useWallet(teamId)
  const { resources, loading: resourcesLoading } = useResources(eventId)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const supabase = createClient()

  async function handlePurchase(resourceId: string) {
    setBuyingId(resourceId)
    
    const { data, error } = await supabase.rpc('purchase_resource', {
      p_team_id: teamId,
      p_resource_id: resourceId,
      p_quantity: 1
    })

    if (error) {
      toast.error(error.message)
    } else if (data?.error) {
      toast.error(data.error)
    } else {
      toast.success('Purchase successful!')
    }
    
    setBuyingId(null)
  }

  if (eventLoading || walletLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">{teamName}</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full text-sm font-medium">
              <Wallet className="w-4 h-4 text-zinc-500" />
              <span>{wallet?.remaining_balance || 0} CR</span>
            </div>
          </div>
          
          <RealtimeTimer endsAt={event?.timer_ends_at || null} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Marketplace Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Marketplace
            </h2>
            <p className="text-sm text-muted-foreground">First come, first served stock.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <Card key={resource.id} className={resource.stock_remaining === 0 ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{resource.name}</CardTitle>
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider bg-zinc-100 px-2 py-0.5 rounded">
                        {resource.category}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end">
                    <div className="text-2xl font-bold">{resource.price_credits} <span className="text-sm font-normal text-zinc-400">CR</span></div>
                    <div className="text-sm font-medium text-zinc-500">
                      {resource.stock_remaining} left
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    disabled={resource.stock_remaining === 0 || buyingId === resource.id}
                    onClick={() => handlePurchase(resource.id)}
                  >
                    {buyingId === resource.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
                    {resource.stock_remaining === 0 ? 'Sold Out' : 'Purchase Item'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* Phase Info (Visible only if not in build phase) */}
        {event?.current_phase !== 'build' && event?.current_phase !== 'trading' && (
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl flex items-start gap-4 text-blue-800">
            <Info className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="font-bold text-lg">Marketplace Closed</h3>
              <p>Purchases are only allowed during the Build and Trading phases. Current phase: <strong>{event?.current_phase.replace('_', ' ')}</strong></p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
