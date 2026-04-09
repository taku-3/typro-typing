SELECT table_name
FROM information_schema.tables
WHERE table_name IN (
'durations',
'themes',
'word_items'
);