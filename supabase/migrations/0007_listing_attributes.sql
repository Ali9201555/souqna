-- Souqna marketplace — category-specific structured attributes
-- Run after 0006_profiles_public_grants.sql.
--
-- Powers the Real-estate (Zillow-style) and Cars sections: one jsonb column
-- holds a discriminated union (see src/types ListingAttributes) —
--   vehicle:  { "kind":"vehicle", "make","model","year","mileageKm","transmission","fuel" }
--   property: { "kind":"property","dealType","propertyType","bedrooms","bathrooms","areaM2","furnished" }
-- Numeric values are stored as JSON numbers (not strings) so PostgREST range
-- filters on `attributes->key` compare numerically.

alter table listings
  add column attributes jsonb not null default '{}'::jsonb;

-- Serves containment filters (attributes @> '{"dealType":"rent"}').
-- Range filters on hot numeric keys get expression indexes when volume warrants.
create index listings_attributes_idx
  on listings using gin (attributes jsonb_path_ops);
