import ssl

from dashboard import create_app

app = create_app()


def run():
    # from werkzeug.middleware.profiler import ProfilerMiddleware
    # app.config['PROFILE'] = True
    # app.wsgi_app = ProfilerMiddleware(app.wsgi_app, restrictions=[50], sort_by=("cumtime",))

    app.run(host='0.0.0.0', port='5000')


if __name__ == '__main__':
    run()

