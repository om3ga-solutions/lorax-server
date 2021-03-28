SELECT 'ALTER TABLE "'||nspname||'"."'||relname||'" DROP CONSTRAINT "'||conname||'";' AS query
 FROM pg_constraint 
 INNER JOIN pg_class ON conrelid=pg_class.oid 
 INNER JOIN pg_namespace ON pg_namespace.oid=pg_class.relnamespace 
 WHERE conname NOT LIKE '%pkey%' AND nspname = 'public' AND relname NOT IN ('spatial_ref_sys', 'us_gaz', 'us_lex', 'us_rules')
 ORDER BY CASE WHEN contype='f' THEN 0 ELSE 1 END,contype,nspname,relname,conname
