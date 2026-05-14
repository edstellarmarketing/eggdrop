import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RealtimeTimer } from './realtime-timer'

describe('RealtimeTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders --:-- when endsAt is null', () => {
    render(<RealtimeTimer endsAt={null} />)
    expect(screen.getByText('--:--')).toBeDefined()
  })

  it('renders remaining time correctly', () => {
    const now = new Date('2026-05-14T10:00:00Z').getTime()
    vi.setSystemTime(now)
    
    // 5 minutes from now
    const endsAt = new Date(now + 5 * 60000).toISOString()
    
    render(<RealtimeTimer endsAt={endsAt} />)
    
    // Fast forward to trigger the first interval update
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    
    expect(screen.getByText('04:59')).toBeDefined()
  })

  it('calls onExpiry when time runs out', () => {
    const now = new Date('2026-05-14T10:00:00Z').getTime()
    vi.setSystemTime(now)
    const endsAt = new Date(now + 1000).toISOString() // 1 second
    
    const onExpiry = vi.fn()
    render(<RealtimeTimer endsAt={endsAt} onExpiry={onExpiry} />)
    
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    
    expect(screen.getByText('00:00')).toBeDefined()
    expect(onExpiry).toHaveBeenCalledTimes(1)
  })
})
