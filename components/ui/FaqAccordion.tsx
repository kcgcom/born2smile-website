import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
  link?: { href: string; label: string };
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset">
            <span className="text-base font-semibold text-gray-900 md:text-lg">
              {item.q}
            </span>
            <ChevronDown
              size={20}
              className="shrink-0 text-[var(--color-muted)] transition-transform duration-300 group-open:rotate-180"
            />
          </summary>
          <div className="px-6 pb-5">
            <p className="text-base leading-relaxed text-gray-600">{item.a}</p>
            {item.link && (
              <Link
                href={item.link.href}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                {item.link.label} →
              </Link>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
