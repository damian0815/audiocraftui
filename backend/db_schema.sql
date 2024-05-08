
DROP TABLE IF EXISTS generation;

CREATE TABLE generation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    generation_params_json TEXT NOT NULL,
    uuid VARCHAR(36) NOT NULL
);

