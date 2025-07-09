interface BalanceDisplayProps {
  balance: number
  loading: boolean
  onRefresh: () => void
}

export function BalanceDisplay({
  balance,
  loading,
  onRefresh,
}: BalanceDisplayProps) {
  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold text-blue-800">
          Current Balance:
        </span>
        <div className="text-right">
          {loading ? (
            <span className="text-blue-600">Loading...</span>
          ) : (
            <span className="text-2xl font-bold text-blue-900">
              {balance.toFixed(2)} ETB
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        🔄 Refresh Balance
      </button>
    </div>
  )
}
