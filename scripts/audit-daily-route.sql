SELECT migration_name, finished_at IS NOT NULL AS applied
FROM "_prisma_migrations"
WHERE migration_name = '20260810000300_daily_early_reading';

SELECT COUNT(*) AS historical_attempts FROM "Attempt";
SELECT COUNT(*) AS historical_answers FROM "AttemptAnswer";
SELECT COUNT(*) AS temporary_e2e_profiles
FROM "ChildProfile"
WHERE "nickname" LIKE 'E2E Ruta %';

SELECT COUNT(*) AS temporary_e2e_categories
FROM "Category"
WHERE "name" LIKE 'E2E consonante %' OR "name" LIKE 'E2E múltiples %';
