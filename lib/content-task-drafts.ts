import { z } from "zod/v4";
import { revisionContentSchema } from "./content-revisions";
import { normalizeBlogBlocks } from "./blog/normalize-blocks";

export const taskDraftSchema = z.object({
  baseUpdatedAt: z.iso.datetime({ offset: true }),
  claimToken: z.string().regex(/^[a-f0-9]{64}$/),
  candidate: z.preprocess(value => value && typeof value === "object" && "blocks" in value
    ? { ...value, blocks: normalizeBlogBlocks(value.blocks) } : value, revisionContentSchema),
}).strict();

export function taskDraftSlug(id: string) { return `task-${z.uuid().parse(id)}`; }
