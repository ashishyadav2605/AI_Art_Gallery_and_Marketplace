from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'artworks', views.ArtworkViewSet, basename='artwork')
router.register(r'comments', views.CommentViewSet, basename='comment')
router.register(r'collections', views.CollectionViewSet, basename='collection')
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'tags', views.TagViewSet, basename='tag')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Auth endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/me/', views.get_current_user, name='current-user'),
    path('auth/profile/', views.update_profile, name='update-profile'),
    
    # AI Generation endpoints
    path('generate/', views.generate_art, name='generate-art'),
    path('generate/history/', views.generation_history, name='generation-history'),
    path('generate/save/', views.save_generated_art, name='save-generated-art'),
    
    # Marketplace endpoints
    path('marketplace/purchase/<uuid:artwork_id>/', views.purchase_artwork, name='purchase-artwork'),
    path('marketplace/bid/<uuid:artwork_id>/', views.place_bid, name='place-bid'),
    path('marketplace/transactions/', views.my_transactions, name='my-transactions'),
    path('marketplace/stats/', views.marketplace_stats, name='marketplace-stats'),
    
    # Notification endpoints
    path('notifications/', views.get_notifications, name='notifications'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark-notification-read'),
    path('notifications/read-all/', views.mark_all_notifications_read, name='mark-all-read'),
    
    # Search endpoint
    path('search/', views.search, name='search'),
]
