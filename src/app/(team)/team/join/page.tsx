'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { joinTeamAction } from './actions'

export default function TeamJoinPage() {
  return (
    <Suspense fallback={null}>
      <TeamJoinForm />
    </Suspense>
  )
}

function TeamJoinForm() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoTried = useRef(false)

  async function submitCode(value: string) {
    setError(null)
    setLoading(true)

    const result = await joinTeamAction(value)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/team')
    }
  }

  useEffect(() => {
    const fromUrl = searchParams.get('code')?.toUpperCase().trim()
    if (fromUrl && !autoTried.current) {
      autoTried.current = true
      setCode(fromUrl)
      submitCode(fromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submitCode(code)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join Your Team</CardTitle>
          <CardDescription>Enter the join code provided by your facilitator.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-xl tracking-widest uppercase"
                maxLength={10}
                required
              />
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Join Team'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
