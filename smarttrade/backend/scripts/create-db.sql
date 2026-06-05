-- Run as postgres superuser:
--   sudo -u postgres psql -f backend/scripts/create-db.sql
ALTER USER blanca CREATEDB;
SELECT 'CREATEDB granted to blanca' AS status;

CREATE DATABASE smarttrade_db
  OWNER    blanca
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE   'en_US.UTF-8'
  TEMPLATE   template0;

SELECT 'smarttrade_db created' AS status;
