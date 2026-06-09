import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-navy-light text-white shadow-lg border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="text-rojo">Mario</span>{" "}
          <span className="text-dorado">Kart</span> Torneos
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
