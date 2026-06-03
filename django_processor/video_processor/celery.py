import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'video_processor.settings')

app = Celery('video_processor')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(10.0, poll_sqs_queue.s(), name='poll-sqs-every-10s')

from transcoder.tasks import poll_sqs_queue
