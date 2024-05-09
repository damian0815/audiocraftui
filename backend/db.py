import datetime
import json
import sqlite3
import uuid

import click
from flask import current_app, g

from .generation_history import GenerationParameters

def save_generation(uuid: str, parameters: GenerationParameters, tokens: list[list[float]]):
    """
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid VARCHAR(36) NOT NULL,
    generation_params_json TEXT NOT NULL,
    tokens_json TEXT NOT NULL
    """

    #for

    parameters_json = parameters.to_json()
    tokens_json = json.dumps(tokens)
    get_db().execute(
        "INSERT INTO generation (uuid, generation_params_json, tokens_json, timestamp) VALUES (?, ?, ?, ?)",
        (uuid, parameters_json, tokens_json, datetime.datetime.now()),
    )
    get_db().commit()


def get_generations(limit: int=20, cursor_timestamp: datetime=None, cursor_uuid: str=None) -> list[dict]:
    params = (limit,)
    sql = "SELECT uuid, timestamp, generation_params_json, tokens_json FROM generation "
    if cursor_timestamp is not None:
        sql += "WHERE timestamp, uuid > (? , ?) "
        params = (cursor_timestamp, cursor_uuid) + params
    sql += "ORDER BY timestamp, uuid DESC LIMIT ?"
    cursor = get_db().execute(
        sql,
        params
    )
    results = [ {
            "uuid": row[0],
            "timestamp": row[1],
            "generation_params": GenerationParameters.from_json(row[2]),
            "tokens": json.loads(row[3])
        } for row in cursor.fetchall() ]
    return results


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row

    return g.db

def close_db(e=None):
    db = g.pop('db', None)

    if db is not None:
        db.close()


def init_db():
    db = get_db()

    with current_app.open_resource('db_schema.sql') as f:
        db.executescript(f.read().decode('utf8'))


@click.command('init-db')
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')

