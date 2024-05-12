import os.path

from flask import Blueprint, request, jsonify, send_file

from .db import get_generations
from .generation_history import make_audio_path

route_blueprint = Blueprint('route_blueprint', __name__)

@route_blueprint.route("/generation_history")
def get_generation_history():
    limit = request.args.get("limit", 20)
    cursor_uuid = request.args.get("cursorUuid", None)
    cursor_timestamp = request.args.get("cursorTimestamp", None)
    generations = get_generations(limit=limit, cursor_uuid=cursor_uuid, cursor_timestamp=cursor_timestamp)
    for g in generations:
        g['generation_params'] = g['generation_params'].to_dict()
    return jsonify(generations)


@route_blueprint.route("/audio/<uuid:uuid>")
def get_audio(uuid):
    audio_path = make_audio_path(uuid)
    if not os.path.exists(audio_path):
        return 'no such audio', 404
    return send_file(audio_path, mimetype='audio/mpeg')
