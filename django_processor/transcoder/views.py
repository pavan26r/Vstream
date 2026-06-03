from django.http import JsonResponse
from django.views.decorators.http import require_GET

@require_GET
def health_check(request):
    return JsonResponse({'status': 'ok', 'service': 'django-transcoder'})

@require_GET
def video_status(request, video_id):
    from .tasks import transcode_video
    from celery.result import AsyncResult
    result = AsyncResult(video_id)
    return JsonResponse({'video_id': video_id, 'state': result.state})
