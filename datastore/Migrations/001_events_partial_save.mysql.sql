-- MySQL 8.0.16+ only. Back up events before applying; DDL implicitly commits.
-- Preflight: resolve these published rows before running the ALTER (do not silently unpublish).
SELECT id, page_title FROM showcase.events
WHERE published <> 0 AND (
    NULLIF(TRIM(page_title), '') IS NULL OR
    NULLIF(TRIM(event_title), '') IS NULL OR
    start_date IS NULL OR start_time IS NULL OR end_date IS NULL OR end_time IS NULL OR
    NULLIF(TRIM(venue_address), '') IS NULL OR
    NULLIF(TRIM(banner_background_image_name), '') IS NULL
);

UPDATE showcase.events SET published = FALSE WHERE published IS NULL;

ALTER TABLE showcase.events
    MODIFY event_title VARCHAR(128) NULL,
    MODIFY start_date DATE NULL,
    MODIFY start_time TIME NULL,
    MODIFY end_date DATE NULL,
    MODIFY end_time TIME NULL,
    MODIFY venue_address VARCHAR(256) NULL,
    MODIFY banner_background_image_name VARCHAR(128) NULL,
    MODIFY published BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT chk_events_publish_complete CHECK (
        published = FALSE OR (
            NULLIF(TRIM(page_title), '') IS NOT NULL AND
            NULLIF(TRIM(event_title), '') IS NOT NULL AND
            start_date IS NOT NULL AND start_time IS NOT NULL AND
            end_date IS NOT NULL AND end_time IS NOT NULL AND
            NULLIF(TRIM(venue_address), '') IS NOT NULL AND
            NULLIF(TRIM(banner_background_image_name), '') IS NOT NULL
        )
    );

-- Rollback: stop draft writes, back up/export incomplete drafts, and complete those
-- rows before restoring NOT NULL. Never delete drafts or invent placeholder values.
-- Then run:
-- ALTER TABLE showcase.events
--   DROP CHECK chk_events_publish_complete,
--   MODIFY event_title VARCHAR(128) NOT NULL,
--   MODIFY start_date DATE NOT NULL, MODIFY start_time TIME NOT NULL,
--   MODIFY end_date DATE NOT NULL, MODIFY end_time TIME NOT NULL,
--   MODIFY venue_address VARCHAR(256) NOT NULL,
--   MODIFY banner_background_image_name VARCHAR(128) NOT NULL,
--   MODIFY published BOOLEAN NULL DEFAULT NULL;
-- Revert application changes only after restoring the schema.
-- The NULL -> FALSE backfill is intentionally not reversed.
