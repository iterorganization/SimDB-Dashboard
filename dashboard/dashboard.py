from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for
)

bp = Blueprint('dashboard', __name__, url_prefix='/')


@bp.route('/', methods=('GET',))
def index():
    search_fields = [
        {'display': 'Workflow Name', 'name': 'workflow.name'},
        {'display': 'Shot', 'name': 'shot'},
        {'display': 'Run', 'name': 'run'},
    ]
    return render_template('dashboard/index.html', search_fields=search_fields)


@bp.route('/simulation/uuid/<uuid>', methods=('GET',))
def simulation(uuid):
    return render_template('dashboard/simulation.html')


@bp.route('/404')
def not_found():
    return render_template('404.html')


@bp.route('/<path:dummy>')
def fallback(dummy):
    return index()
