-- Point courses.image_path at the site-images bucket object path instead of
-- the old /public static path, now that images live in Supabase Storage.

update courses set image_path = 'courses/rhino-architecture.jpg' where slug = 'rhino-architecture';
update courses set image_path = 'courses/grasshopper-architecture.jpg' where slug = 'grasshopper-architecture';
update courses set image_path = 'courses/revit-rhino-inside.jpg' where slug = 'revit-rhino-inside';
update courses set image_path = 'courses/rhino-aec-climate.jpg' where slug = 'rhino-aec-climate';
update courses set image_path = 'courses/rhino-wearables-footwear.jpg' where slug = 'rhino-wearables-footwear';
update courses set image_path = 'courses/rhino-industrial-design.jpg' where slug = 'rhino-industrial-design';
