from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health'),
    path('status/<str:video_id>/', views.video_status, name='video-status'),
]
