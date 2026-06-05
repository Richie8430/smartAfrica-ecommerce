// Temporary placeholder — will be replaced page by page
export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        <p className="mt-2 text-neutral-500">Coming soon…</p>
      </div>
    </div>
  );
}
