FROM python:3.7
COPY ./ /tmp/dashboard/
RUN cd /tmp/dashboard/ && \
    pip3 install . && \
    pip3 install flask gunicorn && \
    rm -rf /tmp/dashboard

ENTRYPOINT ["gunicorn", "--bind=0.0.0.0:5000", "--workers=1", "dashboard.wsgi:app"]
EXPOSE 5000