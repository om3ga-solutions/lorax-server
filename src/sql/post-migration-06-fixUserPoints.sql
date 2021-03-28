UPDATE public.user

SET points = bam.points

FROM (

SELECT a.id, (a.trash_points_created + a.trash_points_updated + a.trash_points_with_update + a.trash_points_cleaned) AS points FROM
(
	SELECT u1.id,
		(SELECT COALESCE(count(*), 0) * 10 FROM public.trash_point WHERE user_id = u1.id) AS trash_points_created,
		(SELECT COALESCE(count(*), 0) * 10 FROM public.trash_point_activity WHERE user_id = u1.id) AS trash_points_updated,
		(SELECT COALESCE(count(tp.id), 0) * 4  FROM public.trash_point tp WHERE tp.id IN (SELECT trash_point_id FROM public.trash_point_activity WHERE user_id != u1.id AND status != 'cleaned') AND user_id = u1.id) AS trash_points_with_update,
		(SELECT COALESCE(count(tp.id), 0) * 20 FROM public.trash_point tp WHERE tp.id IN (SELECT trash_point_id FROM public.trash_point_activity WHERE user_id != u1.id AND status = 'cleaned') AND user_id = u1.id) AS trash_points_cleaned
        FROM public.user u1 

) AS a

) AS bam

WHERE public.user.id = bam.id
