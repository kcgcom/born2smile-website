import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const load = createRequire(resolve(".tmp/revision-db/package.json"));
const { PGlite } = load("@electric-sql/pglite");
const db = await PGlite.create();
try {
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;");
  await db.exec(readFileSync("supabase/migrations/012_content_planner.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/019_content_planner_faq.sql", "utf8"));
  const initial = readFileSync("supabase/migrations/001_initial_schema.sql", "utf8").match(/CREATE TABLE blog_posts \([\s\S]*?\n\);/);
  assert(initial);
  await db.exec(initial[0]);
  const inserted = await db.query("INSERT INTO content_planner_items(opportunity_key,item_type,title,category,target_page,status,created_by) VALUES('agent:test','blog','제안 원고','implant','/treatments/implant','deferred','agent:content') RETURNING id, updated_at::text AS version");
  const task = inserted.rows[0];
  const cas = (version, nextStatus, nextVersion) => db.query("UPDATE content_planner_items SET status=$3,updated_at=$4 WHERE id=$1 AND updated_at=$2 RETURNING updated_at::text AS version", [task.id, version, nextStatus, nextVersion]);
  const nextVersion = new Date(Math.max(Date.now(), Date.parse(task.version) + 1)).toISOString();
  const approved = await cas(task.version, "approved", nextVersion);
  assert.equal(approved.rows.length, 1, "PostgREST timestamp equality must preserve microseconds");
  assert.equal((await cas(task.version, "dismissed", new Date().toISOString())).rows.length, 0, "Stale human approval must not overwrite");
  const claimedVersion = new Date(Date.parse(nextVersion) + 1).toISOString();
  assert.equal((await cas(approved.rows[0].version, "in_progress", claimedVersion)).rows.length, 1);
  assert.equal((await cas(approved.rows[0].version, "in_progress", claimedVersion)).rows.length, 0, "Second claimant must lose the CAS");
  const slug = `task-${task.id}`;
  const create = () => db.query("INSERT INTO blog_posts(slug,title,subtitle,excerpt,category,tags,date,content,read_time,published,updated_by) VALUES($1,'원고 제목','원고 부제','원고 요약','implant','{}','2026-11-15','[]','1분',false,$2)", [slug, `agent:task:${task.id}`]);
  await create();
  await assert.rejects(create(), error => error.code === "23505");
  assert.equal((await db.query("SELECT published FROM blog_posts WHERE slug=$1", [slug])).rows[0].published, false);
  await cas(claimedVersion, "review", new Date(Date.parse(claimedVersion) + 1).toISOString());
  assert.equal((await db.query("SELECT published FROM blog_posts WHERE slug=$1", [slug])).rows[0].published, false);
  await db.exec("SET ROLE anon;");
  await assert.rejects(db.query("SELECT * FROM content_planner_items"), /permission denied/);
  await db.exec("RESET ROLE;");
  console.log("Content task PostgreSQL verified: existing schema, timestamp CAS, competing updates, unique insert-only private draft and restricted table access. No external database connection.");
} finally { await db.close(); }
