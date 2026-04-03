import * as Sentry from "@sentry/nextjs";
import { getServerSentryOptions } from "@/sentry-options";

Sentry.init(getServerSentryOptions());
