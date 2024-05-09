
DROP TABLE IF EXISTS generation;

CREATE TABLE generation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid VARCHAR(36) NOT NULL,
    generation_params_json TEXT NOT NULL,
    tokens_json TEXT NOT NULL,
    timestamp DATETIME NOT NULL
);
