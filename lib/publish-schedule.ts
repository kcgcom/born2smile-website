interface PublishScheduleInput {
  publishDays?: number[];
  posts: { published: boolean; date: string }[];
  today: string;
}

/** today is a KST calendar date; UTC methods avoid browser timezone and DST changes. */
export function getNextPublishDate({ publishDays, posts, today }: PublishScheduleInput): string {
  if (!publishDays?.length) return "";
  const cursor = new Date(`${today}T00:00:00Z`);
  if (!Number.isFinite(cursor.getTime()) || cursor.toISOString().slice(0, 10) !== today) return "";
  const scheduled = new Set(posts.filter((post) => post.published).map((post) => post.date));
  for (let i = 0; i < 90; i += 1) {
    const date = cursor.toISOString().slice(0, 10);
    if (publishDays.includes(cursor.getUTCDay()) && !scheduled.has(date)) return date;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return "";
}
