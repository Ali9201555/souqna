-- Souqna marketplace — constrain the listing-images bucket
-- Run after 0004_profiles_privacy.sql.
--
-- The bucket was created public with no size/MIME limits, so any phone-verified
-- account could use it as a free CDN for arbitrary files (video, executables,
-- phishing HTML) under its own uid folder. Supabase enforces both constraints
-- server-side at upload time.

update storage.buckets
set
  file_size_limit = 5242880, -- 5 MiB per object
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'
  ]
where id = 'listing-images';
