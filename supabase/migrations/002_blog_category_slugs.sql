-- =============================================
-- blog_posts.category 한글 label → canonical slug 전환
-- =============================================

UPDATE blog_posts
SET category = CASE category
  WHEN '임플란트' THEN 'implant'
  WHEN '치아교정' THEN 'orthodontics'
  WHEN '보철치료' THEN 'prosthetics'
  WHEN '보존치료' THEN 'restorative'
  WHEN '소아치료' THEN 'pediatric'
  WHEN '예방관리' THEN 'prevention'
  WHEN '건강상식' THEN 'health-tips'
  ELSE category
END
WHERE category IN (
  '임플란트',
  '치아교정',
  '보철치료',
  '보존치료',
  '소아치료',
  '예방관리',
  '건강상식'
);

COMMENT ON COLUMN blog_posts.category IS 'implant|orthodontics|prosthetics|restorative|pediatric|prevention|health-tips';
