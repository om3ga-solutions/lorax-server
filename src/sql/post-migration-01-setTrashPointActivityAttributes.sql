/*
UPDATE trash_point_activity SET is_first = FALSE;
*/

UPDATE trash_point_activity SET is_first = TRUE WHERE id IN (
SELECT (SELECT tpa.id FROM trash_point_activity tpa WHERE tpa.trash_point_id = tp.id ORDER BY tpa.created ASC LIMIT 1) FROM trash_point tp WHERE tp.id BETWEEN 0 AND 10000
);



UPDATE trash_point_activity SET is_first = TRUE WHERE id IN (
SELECT (SELECT tpa.id FROM trash_point_activity tpa WHERE tpa.trash_point_id = tp.id ORDER BY tpa.created ASC LIMIT 1) FROM trash_point tp WHERE tp.id BETWEEN 10000 AND 20000
);



UPDATE trash_point_activity SET is_first = TRUE WHERE id IN (
SELECT (SELECT tpa.id FROM trash_point_activity tpa WHERE tpa.trash_point_id = tp.id ORDER BY tpa.created ASC LIMIT 1) FROM trash_point tp WHERE tp.id BETWEEN 20000 AND 30000
);



UPDATE trash_point_activity SET is_first = TRUE WHERE id IN (
SELECT (SELECT tpa.id FROM trash_point_activity tpa WHERE tpa.trash_point_id = tp.id ORDER BY tpa.created ASC LIMIT 1) FROM trash_point tp WHERE tp.id BETWEEN 30000 AND 40000
);



UPDATE trash_point_activity SET is_first = TRUE WHERE id IN (
SELECT (SELECT tpa.id FROM trash_point_activity tpa WHERE tpa.trash_point_id = tp.id ORDER BY tpa.created ASC LIMIT 1) FROM trash_point tp WHERE tp.id BETWEEN 40000 AND 50000
);



UPDATE trash_point_activity SET is_first = TRUE WHERE id IN (
SELECT (SELECT tpa.id FROM trash_point_activity tpa WHERE tpa.trash_point_id = tp.id ORDER BY tpa.created ASC LIMIT 1) FROM trash_point tp WHERE tp.id BETWEEN 50000 AND 60000
);
