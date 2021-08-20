from flask import (
    Blueprint, render_template
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


@bp.route('/uuid/<uuid>', methods=('GET',))
def simulation_by_uuid(uuid):
    return render_template('dashboard/simulation.html')


@bp.route('/alias/<path:alias>', methods=('GET',))
def simulation_by_alias(alias):
    return render_template('dashboard/simulation.html')


@bp.route('/compare', methods=('GET',))
def compare():
    return render_template('dashboard/compare.html')


@bp.route('/404')
def not_found():
    return render_template('404.html')

