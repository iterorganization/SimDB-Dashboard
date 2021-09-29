from flask import (
    Blueprint, render_template, current_app
)

bp = Blueprint('dashboard', __name__, url_prefix='/')


def get_config_file():
    return 'dev-config.js' if current_app.config['ENV'] == 'development' else 'config.js'


@bp.route('/', methods=('GET',))
def index():
    search_fields = [
        {'display': 'Workflow Name', 'name': 'workflow.name'},
        {'display': 'Shot', 'name': 'shot'},
        {'display': 'Run', 'name': 'run'},
    ]

    return render_template('dashboard/index.html', search_fields=search_fields, config_file=get_config_file())


@bp.route('/uuid/<uuid>', methods=('GET',))
def simulation_by_uuid(uuid):
    return render_template('dashboard/simulation.html', config_file=get_config_file())


@bp.route('/alias/<path:alias>', methods=('GET',))
def simulation_by_alias(alias):
    return render_template('dashboard/simulation.html', config_file=get_config_file())


@bp.route('/compare/', methods=('GET',))
def compare():
    return render_template('dashboard/compare.html', config_file=get_config_file())


@bp.route('/404')
def not_found():
    return render_template('404.html')

