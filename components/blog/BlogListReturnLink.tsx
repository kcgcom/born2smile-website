"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { prepareListReturn } from "./listNavigation";

export default function BlogListReturnLink({ href, className, children }: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Link href={href} className={className} onClick={(event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const listUrl = prepareListReturn();
      if (!listUrl) return;
      event.preventDefault();
      router.push(listUrl, { scroll: false });
    }}>
      {children}
    </Link>
  );
}
