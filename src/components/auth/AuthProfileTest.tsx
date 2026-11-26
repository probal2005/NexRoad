import { useAuth } from '../../auth/useAuth'

export default function AuthProfileTest() {
  const {
    user,
    profile,
    role,
    loading,
    profileLoading,
    refreshProfile,
  } = useAuth()

  if (loading || profileLoading) {
    return <p>Loading account profile...</p>
  }

  if (!user) {
    return <p>No user is currently signed in.</p>
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-5">
      <h2 className="text-lg font-bold">Authentication Profile Test</h2>

      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Name:</strong> {profile?.full_name ?? 'Not available'}</p>
      <p><strong>Role:</strong> {role ?? 'Not available'}</p>
      <p><strong>Phone:</strong> {profile?.phone ?? 'Not provided'}</p>

      <button
        type="button"
        onClick={() => void refreshProfile()}
        className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950"
      >
        Refresh profile
      </button>
    </div>
  )
}
