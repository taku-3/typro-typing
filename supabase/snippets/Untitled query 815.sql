CREATE UNIQUE INDEX credentials_username_unique_lower
ON credentials (LOWER(username));