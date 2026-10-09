import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-fg shadow-card">
        IT
      </span>
      <span className="text-lg font-bold tracking-tight">ITOJ</span>
    </Link>
  );
}
