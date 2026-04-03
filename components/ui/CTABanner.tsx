import { ArrowRight, Phone } from "lucide-react";
import { CLINIC } from "@/lib/constants";
import { FadeIn } from "@/components/ui/Motion";
import { TrackedAnchor } from "@/components/analytics/TrackedAnchor";
import { TrackedLink } from "@/components/analytics/TrackedLink";

interface CTABannerProps {
  heading: string;
  description: string;
  pageType?: string;
  slug?: string;
}

export function CTABanner({
  heading,
  description,
  pageType,
  slug,
}: CTABannerProps) {
  const properties = {
    cta_location: "cta_banner",
    page_type: pageType,
    slug,
  };

  return (
    <section className="relative overflow-hidden bg-[var(--color-primary)] px-4 py-16 text-center text-white md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--color-gold)]/10" />
      <FadeIn>
        <div className="relative mx-auto max-w-2xl">
          <h2 className="font-headline mb-4 text-3xl font-bold md:text-4xl">
            {heading}
          </h2>
          <p className="mb-8 text-white/80">{description}</p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <TrackedLink
              href="/contact"
              event="cta_contact_click"
              properties={properties}
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-medium text-[var(--color-primary)] transition-colors hover:bg-white/90"
            >
              상담 문의
              <ArrowRight size={18} />
            </TrackedLink>
            <TrackedAnchor
              href={CLINIC.phoneHref}
              event="cta_phone_click"
              properties={properties}
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-medium text-[var(--color-primary)] transition-colors hover:bg-white/90"
            >
              <Phone size={18} />
              전화 상담 {CLINIC.phone}
            </TrackedAnchor>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
