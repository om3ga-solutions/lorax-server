-- Role: trashout

-- DROP ROLE trashout;

CREATE ROLE trashout PASSWORD 'kunsepase' LOGIN
  NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION;


-- Database: trashout

-- DROP DATABASE trashout;

CREATE DATABASE trashout
  WITH OWNER = trashout
       ENCODING = 'UTF8'
       TABLESPACE = pg_default
       LC_COLLATE = 'Czech_Czech Republic.1250'
       LC_CTYPE = 'Czech_Czech Republic.1250'
       CONNECTION LIMIT = -1;

