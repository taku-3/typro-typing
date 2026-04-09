ALTER TABLE credentials
ADD CONSTRAINT credentials_username_unique UNIQUE (username);