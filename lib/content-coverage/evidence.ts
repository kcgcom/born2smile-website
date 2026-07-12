import { createHash } from "node:crypto";
import type { BlogBlock, BlogPost } from "../blog/types";
import type { TreatmentDetail } from "../treatments";
import { EVIDENCE_SCHEMA_VERSION, type ContentDocument, type ContentPlacement, type EvidenceSnapshot, type EvidenceUnit } from "./types";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function unit(input: Omit<EvidenceUnit, "contentHash">): EvidenceUnit {
  return { ...input, contentHash: hash(JSON.stringify({ kind: input.kind, role: input.role, headingPath: input.headingPath, text: input.text })) };
}

function blogBlockText(block: BlogBlock): string {
  if (block.type === "heading" || block.type === "paragraph") return block.text;
  if (block.type === "list") return block.items.join("\n");
  if (block.type === "faq") return `${block.question}\n${block.answer}`;
  if (block.type === "table") return [block.headers.join(" | "), ...block.rows.map((row) => row.join(" | "))].join("\n");
  if (block.type === "researchCallout") return `${block.title}\n${block.description}`;
  if (block.type === "relatedLinks") return block.items.map((item) => `${item.title} ${item.description ?? ""}`.trim()).join("\n");
  return `${block.alt} ${block.caption ?? ""}`.trim();
}

function blogPlacement(post: BlogPost, region: ContentPlacement["region"] = "main"): ContentPlacement {
  return { surface: "blog", region, path: `/blog/${post.category}/${post.slug}`, visible: true, indexable: true };
}

export function collectBlogEvidence(posts: BlogPost[]): ContentDocument[] {
  return [...posts]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((post) => {
      const documentId = `blog:${post.slug}`;
      const units: EvidenceUnit[] = [];
      let order = 0;
      const summaryText = [post.title, post.subtitle, post.excerpt].filter(Boolean).join("\n");
      units.push(unit({
        id: `${documentId}:summary`, documentId, kind: "summary", role: "supporting", headingPath: [post.title], text: summaryText,
        fragments: [], placements: [blogPlacement(post, "summary")], references: [], order: order++,
      }));

      let headingPath: string[] = [post.title];
      let sectionStart = -1;
      let sectionBlocks: Array<{ index: number; block: BlogBlock }> = [];
      const flushSection = () => {
        if (sectionBlocks.length === 0) return;
        const text = sectionBlocks.map(({ block }) => blogBlockText(block)).filter(Boolean).join("\n");
        if (text) {
          const start = sectionStart;
          const end = sectionBlocks.at(-1)!.index;
          units.push(unit({
            id: `${documentId}:section:${start}-${end}`, documentId, kind: "section", role: "primary", headingPath: [...headingPath], text,
            fragments: [{ source: "blog-block", blockStart: start, blockEnd: end }], placements: [blogPlacement(post)], references: [], order: order++,
          }));
        }
        sectionStart = -1;
        sectionBlocks = [];
      };

      post.blocks.forEach((block, index) => {
        if (block.type === "heading") {
          flushSection();
          headingPath = block.level === 2 ? [post.title, block.text] : [headingPath[0], headingPath[1] ?? post.title, block.text];
          sectionStart = index;
          sectionBlocks.push({ index, block });
          return;
        }
        if (block.type === "faq") {
          flushSection();
          units.push(unit({
            id: `${documentId}:faq:${hash(block.question).slice(0, 12)}`, documentId, kind: "faq", role: "primary", headingPath: [...headingPath, block.question], text: blogBlockText(block),
            fragments: [{ source: "blog-block", blockStart: index, blockEnd: index }], placements: [blogPlacement(post, "faq-section")], references: [], order: order++,
          }));
          return;
        }
        if (block.type === "relatedLinks") {
          flushSection();
          units.push(unit({
            id: `${documentId}:navigation:${index}`, documentId, kind: "list", role: "navigation", headingPath: [...headingPath], text: blogBlockText(block),
            fragments: [{ source: "blog-block", blockStart: index, blockEnd: index }], placements: [blogPlacement(post, "sidebar")], references: [], order: order++,
          }));
          return;
        }
        if (block.type === "image") return;
        if (sectionStart < 0) sectionStart = index;
        sectionBlocks.push({ index, block });
      });
      flushSection();

      const revision = hash(JSON.stringify({ title: post.title, subtitle: post.subtitle, excerpt: post.excerpt, category: post.category, tags: post.tags, dateModified: post.dateModified, units: units.map((item) => item.contentHash) }));
      return {
        id: documentId, sourceType: "blog-post", title: post.title, description: post.excerpt, category: post.category, tags: [...post.tags], status: "published", language: "ko",
        publishedAt: post.date, modifiedAt: post.dateModified ?? post.date, reviewedAt: post.reviewedDate,
        reviewStatus: post.reviewedDate ? "reviewed" : "unreviewed", revision, units,
      } satisfies ContentDocument;
    });
}

function treatmentPlacements(id: string, region: ContentPlacement["region"]): ContentPlacement[] {
  return [{ surface: "treatment-page", region, path: `/treatments/${id}`, visible: true, indexable: true }];
}

export function collectTreatmentEvidence(details: Record<string, TreatmentDetail>): ContentDocument[] {
  return Object.values(details)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((detail) => {
      const documentId = `treatment:${detail.id}`;
      let order = 0;
      const units: EvidenceUnit[] = [];
      units.push(unit({
        id: `${documentId}:summary`, documentId, kind: "summary", role: "primary", headingPath: [detail.name], text: [detail.name, detail.subtitle, detail.description].join("\n"),
        fragments: [{ source: "treatment-field", treatmentId: detail.id, fieldPath: "description" }], placements: treatmentPlacements(detail.id, "summary"), references: [], order: order++,
      }));
      if (detail.audience?.length) units.push(unit({
        id: `${documentId}:audience`, documentId, kind: "list", role: "supporting", headingPath: [detail.name, "치료 대상"], text: detail.audience.join("\n"),
        fragments: [{ source: "treatment-field", treatmentId: detail.id, fieldPath: "audience" }], placements: treatmentPlacements(detail.id, "main"), references: [], order: order++,
      }));
      if (detail.highlights?.length) units.push(unit({
        id: `${documentId}:highlights`, documentId, kind: "highlight", role: "supporting", headingPath: [detail.name, "핵심 정보"], text: detail.highlights.map((item) => `${item.label}: ${item.value}${item.note ? ` (${item.note})` : ""}`).join("\n"),
        fragments: [{ source: "treatment-field", treatmentId: detail.id, fieldPath: "highlights" }], placements: treatmentPlacements(detail.id, "main"), references: [], order: order++,
      }));
      detail.steps.forEach((step, index) => units.push(unit({
        id: `${documentId}:step:${index}`, documentId, kind: "process-step", role: "primary", headingPath: [detail.name, "치료 과정", step.title], text: `${step.title}\n${step.desc}`,
        fragments: [{ source: "treatment-field", treatmentId: detail.id, fieldPath: `steps[${index}]` }], placements: treatmentPlacements(detail.id, "main"), references: [], order: order++,
      })));
      if (detail.advantages.length) units.push(unit({
        id: `${documentId}:advantages`, documentId, kind: "list", role: "supporting", headingPath: [detail.name, "장점"], text: detail.advantages.join("\n"),
        fragments: [{ source: "treatment-field", treatmentId: detail.id, fieldPath: "advantages" }], placements: treatmentPlacements(detail.id, "main"), references: [], order: order++,
      }));
      detail.faq.forEach((faq, index) => units.push(unit({
        id: `${documentId}:faq:${hash(faq.q).slice(0, 12)}`, documentId, kind: "faq", role: "primary", headingPath: [detail.name, "자주 묻는 질문", faq.q], text: `${faq.q}\n${faq.a}`,
        fragments: [{ source: "treatment-field", treatmentId: detail.id, fieldPath: `faq[${index}]` }],
        placements: [...treatmentPlacements(detail.id, "faq-section"), { surface: "faq", region: "main", path: "/faq", anchor: detail.id, visible: true, indexable: true }],
        references: faq.source ? [{ url: faq.source.href, label: faq.source.label }] : [], order: order++,
      })));
      const revision = hash(JSON.stringify(units.map((item) => item.contentHash)));
      return { id: documentId, sourceType: "treatment", title: detail.name, description: detail.description, category: detail.id, tags: [], status: "published", language: "ko", reviewStatus: "unreviewed", revision, units } satisfies ContentDocument;
    });
}

export function buildEvidenceSnapshot(posts: BlogPost[], details: Record<string, TreatmentDetail>, generatedAt = new Date().toISOString()): EvidenceSnapshot {
  const documents = [...collectBlogEvidence(posts), ...collectTreatmentEvidence(details)].sort((a, b) => a.id.localeCompare(b.id));
  const evidenceUnitCount = documents.reduce((sum, document) => sum + document.units.length, 0);
  const duplicatePlacementCount = documents.reduce((sum, document) => sum + document.units.reduce((unitSum, item) => unitSum + Math.max(0, item.placements.length - 1), 0), 0);
  return { schemaVersion: EVIDENCE_SCHEMA_VERSION, generatedAt, documents, stats: { documentCount: documents.length, evidenceUnitCount, duplicatePlacementCount } };
}
