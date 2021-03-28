UPDATE area ar SET tr_cached_still_here = (
	SELECT COUNT(tpa.id) FROM area a JOIN gps ON (
		gps.continent_id = a.id 
		OR gps.country_id = a.id 
		OR gps.aa1_id = a.id 
		OR gps.aa2_id = a.id 
		OR gps.aa3_id = a.id 
		OR gps.locality_id = a.id 
		OR gps.sub_locality_id = a.id 
		OR gps.street_id = a.id  
		OR gps.zip_id = a.id
	) JOIN trash_point_activity tpa ON tpa.gps_id = gps.id WHERE tpa.last_id IS NULL AND status = 'stillHere' AND a.id = ar.id
);

UPDATE area ar SET tr_cached_less = (
	SELECT COUNT(tpa.id) FROM area a JOIN gps ON (
		gps.continent_id = a.id 
		OR gps.country_id = a.id 
		OR gps.aa1_id = a.id 
		OR gps.aa2_id = a.id 
		OR gps.aa3_id = a.id 
		OR gps.locality_id = a.id 
		OR gps.sub_locality_id = a.id 
		OR gps.street_id = a.id  
		OR gps.zip_id = a.id
	) JOIN trash_point_activity tpa ON tpa.gps_id = gps.id WHERE tpa.last_id IS NULL AND status = 'less' AND a.id = ar.id
);

UPDATE area ar SET tr_cached_more = (
	SELECT COUNT(tpa.id) FROM area a JOIN gps ON (
		gps.continent_id = a.id 
		OR gps.country_id = a.id 
		OR gps.aa1_id = a.id 
		OR gps.aa2_id = a.id 
		OR gps.aa3_id = a.id 
		OR gps.locality_id = a.id 
		OR gps.sub_locality_id = a.id 
		OR gps.street_id = a.id  
		OR gps.zip_id = a.id
	) JOIN trash_point_activity tpa ON tpa.gps_id = gps.id WHERE tpa.last_id IS NULL AND status = 'more' AND a.id = ar.id
);

UPDATE area ar SET tr_cached_cleaned = (
	SELECT COUNT(tpa.id) FROM area a JOIN gps ON (
		gps.continent_id = a.id 
		OR gps.country_id = a.id 
		OR gps.aa1_id = a.id 
		OR gps.aa2_id = a.id 
		OR gps.aa3_id = a.id 
		OR gps.locality_id = a.id 
		OR gps.sub_locality_id = a.id 
		OR gps.street_id = a.id  
		OR gps.zip_id = a.id
	) JOIN trash_point_activity tpa ON tpa.gps_id = gps.id WHERE tpa.last_id IS NULL AND status = 'cleaned' AND a.id = ar.id
);
