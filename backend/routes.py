
from flask import Blueprint, request, jsonify

from .db import get_generations

route_blueprint = Blueprint('route_blueprint', __name__)

@route_blueprint.route("/generation_history")
def get_generation_history():
    limit = request.args.get("limit", 20)
    cursor_uuid = request.args.get("cursorUuid", None)
    cursor_timestamp = request.args.get("cursorTimestamp", None)
    generations = get_generations(limit=limit, cursor_uuid=cursor_uuid, cursor_timestamp=cursor_timestamp)
    return jsonify(generations)

