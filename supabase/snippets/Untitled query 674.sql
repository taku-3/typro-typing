-- 既存の重複確認（念のため）
SELECT username, COUNT(*)
FROM credentials
GROUP BY username
HAVING COUNT(*) > 1;