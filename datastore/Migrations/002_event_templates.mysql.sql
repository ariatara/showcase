-- Apply once after 001. MySQL DDL implicitly commits; back up before upgrading.
ALTER TABLE showcase.events ADD COLUMN view_template VARCHAR(64) NOT NULL DEFAULT 'signature';
-- Rollback: retain the column until all application instances stop writing it.
