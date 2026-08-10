SELECT COUNT(*) AS attempts_total FROM "Attempt";
SELECT COUNT(*) AS answers_total FROM "AttemptAnswer";
SELECT COUNT(*) AS historical_outcome_mismatches
FROM "AttemptAnswer"
WHERE ("correctFirstTry" AND "outcome" <> 'CORRECT')
   OR (NOT "correctFirstTry" AND "outcome" = 'CORRECT');
SELECT COUNT(*) AS duplicated_session_exercises
FROM (
  SELECT "sessionExerciseId"
  FROM "Attempt"
  WHERE "sessionExerciseId" IS NOT NULL
  GROUP BY "sessionExerciseId"
  HAVING COUNT(*) > 1
) duplicates;
SELECT migration_name, finished_at IS NOT NULL AS applied
FROM "_prisma_migrations"
WHERE migration_name = '20260810000200_first_answer_wins';
