-- Drop triggers
DROP TRIGGER calculate_area_trash_point_counts ON public.trash_point_activity;
DROP FUNCTION public.area_trash_point_count();

-- Create triggers

CREATE OR REPLACE FUNCTION public.area_trash_point_count()
  RETURNS trigger AS
$BODY$DECLARE

counts RECORD;
area_info RECORD;
what RECORD;
BEGIN
SET search_path TO 'fit';

CASE TG_OP
WHEN 'INSERT' THEN what := NEW;
WHEN 'DELETE' THEN what := OLD;
WHEN 'UPDATE' THEN what := NEW;
END CASE;

-- Get GPS relations to Area for given TrashPoint
SELECT gps.* INTO area_info FROM public.gps WHERE what.gps_id = gps.id;

-- ===================== CONTINENT ===================== --

-- Get TrashPoint counts for Area
SELECT
	SUM(a.still_here) AS still_here,
	SUM(a.more) AS more,
	SUM(a.less) AS less,
	SUM(a.cleaned) AS cleaned
INTO counts
FROM (
	SELECT
		CASE WHEN tpa.status = 'stillHere' THEN 1 ELSE 0 END AS still_here,
		CASE WHEN tpa.status = 'more' THEN 1 ELSE 0 END AS more,
		CASE WHEN tpa.status = 'less' THEN 1 ELSE 0 END AS less,
		CASE WHEN tpa.status = 'cleaned' THEN 1 ELSE 0 END AS cleaned
	FROM public.trash_point_activity tpa
	JOIN public.gps ON gps.id = tpa.gps_id
	WHERE gps.continent_id = area_info.continent_id AND tpa.last_id IS NULL
) AS a;

-- Update Area with calculated counts
UPDATE public.area a SET 
	tr_cached_still_here = counts.still_here, 
	tr_cached_more = counts.more,
	tr_cached_less = counts.less,
	tr_cached_cleaned = counts.cleaned
WHERE a.id = area_info.continent_id;

-- ===================== COUNTRY ===================== --

-- Get TrashPoint counts for Area
SELECT
	SUM(a.still_here) AS still_here,
	SUM(a.more) AS more,
	SUM(a.less) AS less,
	SUM(a.cleaned) AS cleaned
INTO counts
FROM (
	SELECT
		CASE WHEN tpa.status = 'stillHere' THEN 1 ELSE 0 END AS still_here,
		CASE WHEN tpa.status = 'more' THEN 1 ELSE 0 END AS more,
		CASE WHEN tpa.status = 'less' THEN 1 ELSE 0 END AS less,
		CASE WHEN tpa.status = 'cleaned' THEN 1 ELSE 0 END AS cleaned
	FROM public.trash_point_activity tpa
	JOIN public.gps ON gps.id = tpa.gps_id
	WHERE gps.country_id = area_info.country_id AND tpa.last_id IS NULL
) AS a;

-- Update Area with calculated counts
UPDATE public.area a SET 
	tr_cached_still_here = counts.still_here, 
	tr_cached_more = counts.more,
	tr_cached_less = counts.less,
	tr_cached_cleaned = counts.cleaned
WHERE a.id = area_info.country_id;

-- ===================== AA1 ===================== --

-- Get TrashPoint counts for Area
SELECT
	SUM(a.still_here) AS still_here,
	SUM(a.more) AS more,
	SUM(a.less) AS less,
	SUM(a.cleaned) AS cleaned
INTO counts
FROM (
	SELECT
		CASE WHEN tpa.status = 'stillHere' THEN 1 ELSE 0 END AS still_here,
		CASE WHEN tpa.status = 'more' THEN 1 ELSE 0 END AS more,
		CASE WHEN tpa.status = 'less' THEN 1 ELSE 0 END AS less,
		CASE WHEN tpa.status = 'cleaned' THEN 1 ELSE 0 END AS cleaned
	FROM public.trash_point_activity tpa
	JOIN public.gps ON gps.id = tpa.gps_id
	WHERE gps.aa1_id = area_info.aa1_id AND tpa.last_id IS NULL
) AS a;

-- Update Area with calculated counts
UPDATE public.area a SET 
	tr_cached_still_here = counts.still_here, 
	tr_cached_more = counts.more,
	tr_cached_less = counts.less,
	tr_cached_cleaned = counts.cleaned
WHERE a.id = area_info.aa1_id;

-- ===================== AA2 ===================== --

-- Get TrashPoint counts for Area
SELECT
	SUM(a.still_here) AS still_here,
	SUM(a.more) AS more,
	SUM(a.less) AS less,
	SUM(a.cleaned) AS cleaned
INTO counts
FROM (
	SELECT
		CASE WHEN tpa.status = 'stillHere' THEN 1 ELSE 0 END AS still_here,
		CASE WHEN tpa.status = 'more' THEN 1 ELSE 0 END AS more,
		CASE WHEN tpa.status = 'less' THEN 1 ELSE 0 END AS less,
		CASE WHEN tpa.status = 'cleaned' THEN 1 ELSE 0 END AS cleaned
	FROM public.trash_point_activity tpa
	JOIN public.gps ON gps.id = tpa.gps_id
	WHERE gps.aa2_id = area_info.aa2_id AND tpa.last_id IS NULL
) AS a;

-- Update Area with calculated counts
UPDATE public.area a SET 
	tr_cached_still_here = counts.still_here, 
	tr_cached_more = counts.more,
	tr_cached_less = counts.less,
	tr_cached_cleaned = counts.cleaned
WHERE a.id = area_info.aa2_id;
RETURN what;

-- ===================== AA3 ===================== --

-- Get TrashPoint counts for Area
SELECT
	SUM(a.still_here) AS still_here,
	SUM(a.more) AS more,
	SUM(a.less) AS less,
	SUM(a.cleaned) AS cleaned
INTO counts
FROM (
	SELECT
		CASE WHEN tpa.status = 'stillHere' THEN 1 ELSE 0 END AS still_here,
		CASE WHEN tpa.status = 'more' THEN 1 ELSE 0 END AS more,
		CASE WHEN tpa.status = 'less' THEN 1 ELSE 0 END AS less,
		CASE WHEN tpa.status = 'cleaned' THEN 1 ELSE 0 END AS cleaned
	FROM public.trash_point_activity tpa
	JOIN public.gps ON gps.id = tpa.gps_id
	WHERE gps.aa3_id = area_info.aa3_id AND tpa.last_id IS NULL
) AS a;

-- Update Area with calculated counts
UPDATE public.area a SET 
	tr_cached_still_here = counts.still_here, 
	tr_cached_more = counts.more,
	tr_cached_less = counts.less,
	tr_cached_cleaned = counts.cleaned
WHERE a.id = area_info.aa3_id;

-- ===================== LOCALITY ===================== --

-- Get TrashPoint counts for Area
SELECT
	SUM(a.still_here) AS still_here,
	SUM(a.more) AS more,
	SUM(a.less) AS less,
	SUM(a.cleaned) AS cleaned
INTO counts
FROM (
	SELECT
		CASE WHEN tpa.status = 'stillHere' THEN 1 ELSE 0 END AS still_here,
		CASE WHEN tpa.status = 'more' THEN 1 ELSE 0 END AS more,
		CASE WHEN tpa.status = 'less' THEN 1 ELSE 0 END AS less,
		CASE WHEN tpa.status = 'cleaned' THEN 1 ELSE 0 END AS cleaned
	FROM public.trash_point_activity tpa
	JOIN public.gps ON gps.id = tpa.gps_id
	WHERE gps.locality_id = area_info.locality_id AND tpa.last_id IS NULL
) AS a;

-- Update Area with calculated counts
UPDATE public.area a SET 
	tr_cached_still_here = counts.still_here, 
	tr_cached_more = counts.more,
	tr_cached_less = counts.less,
	tr_cached_cleaned = counts.cleaned
WHERE a.id = area_info.locality_id;

-- ===================== SUB_LOCALITY ===================== --

-- Get TrashPoint counts for Area
SELECT
	SUM(a.still_here) AS still_here,
	SUM(a.more) AS more,
	SUM(a.less) AS less,
	SUM(a.cleaned) AS cleaned
INTO counts
FROM (
	SELECT
		CASE WHEN tpa.status = 'stillHere' THEN 1 ELSE 0 END AS still_here,
		CASE WHEN tpa.status = 'more' THEN 1 ELSE 0 END AS more,
		CASE WHEN tpa.status = 'less' THEN 1 ELSE 0 END AS less,
		CASE WHEN tpa.status = 'cleaned' THEN 1 ELSE 0 END AS cleaned
	FROM public.trash_point_activity tpa
	JOIN public.gps ON gps.id = tpa.gps_id
	WHERE gps.sub_locality_id = area_info.sub_locality_id AND tpa.last_id IS NULL
) AS a;

-- Update Area with calculated counts
UPDATE public.area a SET 
	tr_cached_still_here = counts.still_here, 
	tr_cached_more = counts.more,
	tr_cached_less = counts.less,
	tr_cached_cleaned = counts.cleaned
WHERE a.id = area_info.sub_locality_id;

-- ===================== STREET ===================== --

-- Get TrashPoint counts for Area
SELECT
	SUM(a.still_here) AS still_here,
	SUM(a.more) AS more,
	SUM(a.less) AS less,
	SUM(a.cleaned) AS cleaned
INTO counts
FROM (
	SELECT
		CASE WHEN tpa.status = 'stillHere' THEN 1 ELSE 0 END AS still_here,
		CASE WHEN tpa.status = 'more' THEN 1 ELSE 0 END AS more,
		CASE WHEN tpa.status = 'less' THEN 1 ELSE 0 END AS less,
		CASE WHEN tpa.status = 'cleaned' THEN 1 ELSE 0 END AS cleaned
	FROM public.trash_point_activity tpa
	JOIN public.gps ON gps.id = tpa.gps_id
	WHERE gps.street_id = area_info.street_id AND tpa.last_id IS NULL
) AS a;

-- Update Area with calculated counts
UPDATE public.area a SET 
	tr_cached_still_here = counts.still_here, 
	tr_cached_more = counts.more,
	tr_cached_less = counts.less,
	tr_cached_cleaned = counts.cleaned
WHERE a.id = area_info.street_id;

-- ===================== ZIP ===================== --

-- Get TrashPoint counts for Area
SELECT
	SUM(a.still_here) AS still_here,
	SUM(a.more) AS more,
	SUM(a.less) AS less,
	SUM(a.cleaned) AS cleaned
INTO counts
FROM (
	SELECT
		CASE WHEN tpa.status = 'stillHere' THEN 1 ELSE 0 END AS still_here,
		CASE WHEN tpa.status = 'more' THEN 1 ELSE 0 END AS more,
		CASE WHEN tpa.status = 'less' THEN 1 ELSE 0 END AS less,
		CASE WHEN tpa.status = 'cleaned' THEN 1 ELSE 0 END AS cleaned
	FROM public.trash_point_activity tpa
	JOIN public.gps ON gps.id = tpa.gps_id
	WHERE gps.zip_id = area_info.zip_id AND tpa.last_id IS NULL
) AS a;

-- Update Area with calculated counts
UPDATE public.area a SET 
	tr_cached_still_here = counts.still_here, 
	tr_cached_more = counts.more,
	tr_cached_less = counts.less,
	tr_cached_cleaned = counts.cleaned
WHERE a.id = area_info.zip_id;

END
$BODY$
  LANGUAGE plpgsql VOLATILE STRICT
  COST 100;
ALTER FUNCTION public.area_trash_point_count()
  OWNER TO trashout;


CREATE TRIGGER calculate_area_trash_point_counts
  AFTER INSERT OR UPDATE OR DELETE
  ON public.trash_point_activity
  FOR EACH ROW
  EXECUTE PROCEDURE public.area_trash_point_count();