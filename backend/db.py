import datetime
import json
import os
import sqlite3
import uuid
from sqlite3 import Connection

import click
import torch
import torchaudio
from flask import current_app, g
from numba.misc import appdirs

from .generation_history import GenerationParameters, make_audio_path


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



def save_audio(uuid: str, audio: torch.Tensor, sample_rate: int):
    audio_path = make_audio_path(uuid)
    os.makedirs(os.path.dirname(audio_path), exist_ok=True)
    torchaudio.save(audio_path, audio, sample_rate=sample_rate)


def get_generations(limit: int=20, cursor_timestamp: datetime=None, cursor_uuid: str=None) -> list[dict]:
    params = (limit,)
    sql = "SELECT uuid, timestamp, generation_params_json, tokens_json FROM generation "
    if cursor_timestamp is not None:
        sql += "WHERE (timestamp, uuid) > (? , ?) "
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
    #print([r['generation_params'].to_json() for r in results])
    return results


def get_db() -> Connection:
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row

        if needs_init_db():
            print("building database...")
            init_db()
        else:
            print("no need to build database")

    return g.db

def close_db(e=None):
    db = g.pop('db', None)

    if db is not None:
        db.close()

def _does_table_exist(db, table_name):
    sql = "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    res = get_db().execute(sql, (table_name,))
    return res.fetchone() is not None

def needs_init_db():
    return not _does_table_exist(get_db(), 'generation')


def init_db():
    db = get_db()

    with current_app.open_resource('db_schema.sql') as f:
        db.executescript(f.read().decode('utf8'))


@click.command('init-db')
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')

