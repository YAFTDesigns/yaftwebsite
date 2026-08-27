-- Detail view can now show either a large image or an embedded
-- YouTube video, per script. If youtube_url is set, the public page
-- embeds the video instead of showing detail_image_path/thumbnail_path
-- -- leaving it blank keeps the existing image-only behavior exactly
-- as it was, no migration needed for scripts that never set this.
alter table lab_scripts add column if not exists youtube_url text;
