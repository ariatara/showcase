import {
  EVENT_FIELDS, normalizeEventPayload, validateEvent, validateDraft, validatePublish,
} from "../Utilities/EventValidation.js";

function databaseError(response, error, action) {
  console.error(`${action} event failed:`, error.code);
  if (error.code === "ER_DUP_ENTRY") {
    return response.status(409).json({ Status: false, Error: "Page title/URL already exists." });
  }
  if (error.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
    return response.status(400).json({ Status: false, Error: "Cannot publish: complete all required event fields." });
  }
  return response.status(500).json({ Status: false, Error: `${action} event failed.` });
}

function validationError(response, event) {
  const FieldErrors = validateEvent(event);
  if (Object.keys(FieldErrors).length === 0) return false;
  response.status(400).json({
    Status: false,
    Error: Object.values(FieldErrors).join(" "),
    FieldErrors,
    MissingFields: event.isPublished ? validatePublish(event) : validateDraft(event),
  });
  return true;
}

function toColumns(event) {
  const columns = {};
  for (const [key, [column]] of Object.entries(EVENT_FIELDS)) {
    if (Object.hasOwn(event, key)) columns[column] = event[key];
  }
  if (Object.hasOwn(event, "isPublished")) columns.published = event.isPublished;
  return columns;
}

function fromRow(row) {
  const event = { isPublished: Boolean(row.published) };
  for (const [key, [column]] of Object.entries(EVENT_FIELDS)) {
    const value = row[column];
    // mysql2 returns DATE columns as local Date objects unless dateStrings is enabled.
    event[key] = value instanceof Date
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
      : value;
  }
  return event;
}

export function createEventHandlers(db) {
  function createEventAdminAccess(request, response) {
    let event;
    try {
      event = { isPublished: false, ...normalizeEventPayload(request.body) };
    } catch (error) {
      return response.status(400).json({ Status: false, Error: error.message });
    }
    if (validationError(response, event)) return;
    db.query("INSERT INTO events SET ?, created_date = NOW(), modified_date = NOW()",
      [toColumns(event)], (error, result) => {
        if (error) return databaseError(response, error, "Create");
        return response.json({ Status: true, Result: { id: result.insertId, url: event.eventURL } });
      });
  }

  function updateEventAdminAccess(request, response) {
    const id = request.params.id;
    if (!/^[1-9]\d*$/.test(String(id))) {
      return response.status(400).json({ Status: false, Error: "Invalid event ID." });
    }
    let patch;
    try {
      patch = normalizeEventPayload(request.body);
    } catch (error) {
      return response.status(400).json({ Status: false, Error: error.message });
    }
    db.query("SELECT * FROM events WHERE id = ?", [id], (error, rows) => {
      if (error) return databaseError(response, error, "Get");
      if (!rows.length) return response.status(404).json({ Status: false, Error: "Event not found." });
      const event = { ...fromRow(rows[0]), ...patch };
      if (validationError(response, event)) return;
      const columns = toColumns(patch);
      delete columns.created_by;
      // Write only supplied fields. Explicit null clears a field; omission preserves it.
      columns.modified_date = new Date();
      db.query("UPDATE events SET ? WHERE id = ?", [columns, id], (writeError, result) => {
        if (writeError) return databaseError(response, writeError, "Update");
        if (!result.affectedRows) return response.status(404).json({ Status: false, Error: "Event not found." });
        return response.json({ Status: true, Result: { id: Number(id), url: event.eventURL } });
      });
    });
  }

  function readEvent(request, response, publishedOnly) {
    const sql = "SELECT * FROM events WHERE url = ?" + (publishedOnly ? " AND published = TRUE" : "");
    db.query(sql, [request.params.event_url], (error, rows) => {
      if (error) return databaseError(response, error, "Get");
      if (!rows.length) return response.status(404).json({ Status: false, Error: "Event not found." });
      return response.json({ Status: true, Result: rows });
    });
  }

  return {
    createEventAdminAccess,
    updateEventAdminAccess,
    getEventAdminAccess: (request, response) => readEvent(request, response, false),
    viewEventUserAccess: (request, response) => readEvent(request, response, true),
  };
}
