export default function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-ink">
      <span className="mr-2 font-semibold text-warn">The rule held.</span>
      {message}
    </div>
  );
}
