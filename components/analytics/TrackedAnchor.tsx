"use client";

import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { captureEvent, type AnalyticsProps } from "@/lib/posthog";

type TrackedAnchorProps = Omit<ComponentPropsWithoutRef<"a">, "onClick"> & {
  event: string;
  properties?: AnalyticsProps;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function TrackedAnchor({
  event,
  properties,
  onClick,
  ...props
}: TrackedAnchorProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    captureEvent(event, properties);
    onClick?.(e);
  };

  return <a {...props} onClick={handleClick} />;
}
