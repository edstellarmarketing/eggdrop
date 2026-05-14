import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CreateEventForm } from './create-event-form'

export const dynamic = 'force-dynamic'

export default function NewEventPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-14 w-full">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to events
      </Link>

      <header className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
          Create a new event
        </h1>
        <p className="text-zinc-500 mt-1">
          A default resource catalog will be added automatically — you can edit it after creation.
        </p>
      </header>

      <CreateEventForm />
    </div>
  )
}
