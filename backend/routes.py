
from flask import Blueprint, request, jsonify

from .db import get_generations

route_blueprint = Blueprint('route_blueprint', __name__)

@route_blueprint.route("/generation_history")
def get_generation_history():
    limit = request.args.get("limit", 20)
    offset = request.args.get("offset", 0)
    generations = get_generations(limit=limit, offset=offset)
    return jsonify(generations)

