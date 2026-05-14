'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface RealtimeTimerProps {
  endsAt: string | null
  onExpiry?: () => void
}

export function RealtimeTimer({ endsAt, onExpiry }: RealtimeTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('--:--')
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    if (!endsAt) {
      setTimeLeft('--:--')
      return
    }

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const end = new Date(endsAt).getTime()
      const distance = end - now

      if (distance < 0) {
        clearInterval(interval)
        setTimeLeft('00:00')
        onExpiry?.()
        return
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)

      setTimeLeft(
        `${minutes.toString().padStart(2, '0')}:${seconds
          .toString()
          .padStart(2, '0')}`
      )

      if (distance < 60000) { // Less than 1 minute
        setIsUrgent(true)
      } else {
        setIsUrgent(false)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [endsAt, onExpiry])

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
      isUrgent 
        ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' 
        : 'bg-zinc-50 border-zinc-200 text-zinc-900'
    }`}>
      <Clock className="w-4 h-4" />
      <span className="font-mono text-xl font-bold tracking-tighter">{timeLeft}</span>
    </div>
  )
}
