from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from django.http import JsonResponse

def api_root(request):
    """API root endpoint with info about available endpoints"""
    return JsonResponse({
        'name': 'AI Art Gallery & Marketplace API',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'api': '/api/',
            'admin': '/admin/',
            'artworks': '/api/artworks/',
            'users': '/api/users/',
            'categories': '/api/categories/',
            'generate': '/api/generate/',
            'auth': {
                'register': '/api/auth/register/',
                'login': '/api/auth/login/',
                'token_refresh': '/api/token/refresh/',
            }
        },
        'documentation': 'Visit /api/ for browsable API'
    })

urlpatterns = [
    path('', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/', include('gallery.urls')),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
