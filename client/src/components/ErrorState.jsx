export default function ErrorState({ message, onRetry }) {
  return (
    <div className="panel border-red-200 bg-red-50 text-sm text-red-700">
      <div>{message || "Unable to load data"}</div>
      {onRetry && (
        <button className="mt-3 text-sm font-semibold underline" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
