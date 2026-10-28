export default function FullPageLoader({ message = "Loading..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="text-center" role="status">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-line border-t-brand" />
        <p className="mt-4 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}
