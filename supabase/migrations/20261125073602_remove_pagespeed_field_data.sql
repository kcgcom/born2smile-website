-- Apply after the Lighthouse-only admin deployment is live.
update public.api_cache
set data = data - array['coreWebVitals', 'overallCategory']
where (
  key in (
    'psi-homepage-latest-mobile', 'psi-homepage-latest-desktop',
    'psi-latest-blog-mobile', 'psi-latest-blog-desktop',
    'psi-latest-implant-mobile', 'psi-latest-implant-desktop',
    'psi-latest-contact-mobile', 'psi-latest-contact-desktop'
  )
  or key ~ '^psi-homepage-[0-9]{4}-[0-9]{2}-[0-9]{2}-(mobile|desktop)$'
)
  and jsonb_typeof(data) = 'object'
  and data ?| array['coreWebVitals', 'overallCategory'];
