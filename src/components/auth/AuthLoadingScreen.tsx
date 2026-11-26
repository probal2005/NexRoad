import { LoaderCircle } from 'lucide-react'

interface AuthLoadingScreenProps {
  message?: string
}

export default function AuthLoadingScreen({
  message = 'Verifying your account...',
}: AuthLoadingScreenProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <LoaderCircle
          size={36}
          className="mx-auto animate-spin text-emerald-600"
        />

        <p className="mt-4 text-sm font-medium text-slate-600">
          {message}
        </p>
      </div>
    </main>
  )
}
