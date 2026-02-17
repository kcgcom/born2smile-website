"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const shouldReduce = useReducedMotion();

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="mx-auto max-w-3xl divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
      {items.map((item, index) => (
        <div key={index}>
          <button
            onClick={() => toggle(index)}
            className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset"
            aria-expanded={openIndex === index}
          >
            <span className="text-base font-semibold text-gray-900 md:text-lg">
              {item.q}
            </span>
            <ChevronDown
              size={20}
              className={`shrink-0 text-[var(--color-muted)] transition-transform duration-300 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          <AnimatePresence initial={false}>
            {openIndex === index && (
              <motion.div
                initial={shouldReduce ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={shouldReduce ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <p className="px-6 pb-5 text-base leading-relaxed text-gray-600">
                  {item.a}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
