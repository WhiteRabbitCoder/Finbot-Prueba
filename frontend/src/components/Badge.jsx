export default function Badge({ tool, fromCache }) {
  if (fromCache) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-300">
        ⚡ Caché
      </span>
    );
  }
  if (tool) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
        🔧 {tool}
      </span>
    );
  }
  return null;
}
