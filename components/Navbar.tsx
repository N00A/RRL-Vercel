import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-navy-light text-white shadow-lg border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex gap-0.5">
            <span className="w-1.5 h-5 bg-red-500 rounded-sm" />
            <span className="w-1.5 h-5 bg-orange-400 rounded-sm" />
            <span className="w-1.5 h-5 bg-yellow-400 rounded-sm" />
            <span className="w-1.5 h-5 bg-green-500 rounded-sm" />
            <span className="w-1.5 h-5 bg-blue-500 rounded-sm" />
            <span className="w-1.5 h-5 bg-purple-500 rounded-sm" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">Rainbow Roads League</span>
            <span className="text-[10px] text-white/40 ml-1.5 font-mono">RRL</span>
          </div>
        </Link>
        <div className="flex gap-4 text-sm">
          <Link href="/tournaments" className="hover:text-dorado transition">
            Torneos
          </Link>
        </div>
      </div>
    </nav>
  );
}
