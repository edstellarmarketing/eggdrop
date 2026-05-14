import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-lg space-y-6">
        <Image
          src="/edstellar-logo.png"
          alt="Edstellar"
          width={220}
          height={48}
          priority
          className="h-12 w-auto mx-auto opacity-90"
        />
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
          Welcome to your console.
        </h1>
        <p className="text-zinc-500 text-base leading-relaxed">
          Your workspace is ready. Modules will appear here as we wire them in.
        </p>
      </div>
    </div>
  )
}
