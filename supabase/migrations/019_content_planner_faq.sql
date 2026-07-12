alter table public.content_planner_items
  drop constraint if exists content_planner_items_item_type_check;

alter table public.content_planner_items
  add constraint content_planner_items_item_type_check
  check (item_type in ('blog', 'page', 'faq'));
