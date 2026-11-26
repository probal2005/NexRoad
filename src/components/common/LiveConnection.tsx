const labels = {
  connecting: 'Connecting live updates',
  live: 'Live updates on',
  reconnecting: 'Live connection interrupted · automatic refresh is on',
} as const

export default function LiveConnection({ status }: { status: keyof typeof labels }) {
  return <p role="status" className="text-xs font-medium text-slate-600">{labels[status]}</p>
}
