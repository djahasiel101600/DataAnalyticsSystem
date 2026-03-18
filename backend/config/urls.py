"""
URL configuration for Data Analytics System.
"""
from django.urls import path, re_path
from django.views.generic import TemplateView
from django.conf import settings
import os

from api import views

urlpatterns = [
    path('api/health/', views.health),
    path('api/export/xlsx/', views.export_xlsx),
    path('api/parse/upload/', views.parse_upload),
    path('api/ai/analytics/', views.ai_analytics),
]

# Serve SPA (when built): for any non-API route, serve index.html
_spa_index = getattr(settings, 'SPA_INDEX', None)
if _spa_index and os.path.isfile(_spa_index):
    urlpatterns += [re_path(r'^(?!api/).*$', TemplateView.as_view(template_name='index.html'))]
