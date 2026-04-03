"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { captureEvent, type AnalyticsProps } from "@/lib/posthog";

type TrackedLinkProps = ComponentProps<typeof Link> & {
  event: string;
  properties?: AnalyticsProps;
};

export function TrackedLink({
  event,
  properties,
  onClick,
  ...props
}: TrackedLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    captureEvent(event, properties);
    onClick?.(e);
  };

  return <Link {...props} onClick={handleClick} />;
}
