from django.contrib import admin
from .models import (
    UserProfile, Category, Tag, Artwork, Like, Comment,
    Collection, Bid, Transaction, Notification, Follow, AIGenerationTask
)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_verified_artist', 'wallet_balance', 'total_sales', 'created_at']
    list_filter = ['is_verified_artist', 'created_at']
    search_fields = ['user__username', 'user__email', 'bio']
    readonly_fields = ['created_at']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'icon']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


@admin.register(Artwork)
class ArtworkAdmin(admin.ModelAdmin):
    list_display = ['title', 'owner', 'status', 'price', 'is_for_sale', 'is_auction', 'views', 'likes_count', 'created_at']
    list_filter = ['status', 'is_for_sale', 'is_auction', 'ai_model', 'category', 'created_at']
    search_fields = ['title', 'description', 'prompt', 'owner__username']
    readonly_fields = ['id', 'views', 'likes_count', 'created_at', 'updated_at']
    raw_id_fields = ['owner', 'creator', 'category']
    filter_horizontal = ['tags']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'title', 'description', 'status')
        }),
        ('Images', {
            'fields': ('image', 'thumbnail', 'image_url')
        }),
        ('AI Generation', {
            'fields': ('prompt', 'negative_prompt', 'ai_model', 'seed', 'steps', 'cfg_scale', 'width', 'height'),
            'classes': ('collapse',)
        }),
        ('Marketplace', {
            'fields': ('price', 'is_for_sale', 'is_auction', 'auction_end_time', 'minimum_bid', 'license_type')
        }),
        ('Relationships', {
            'fields': ('owner', 'creator', 'category', 'tags')
        }),
        ('Stats', {
            'fields': ('views', 'likes_count', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'artwork', 'created_at']
    list_filter = ['created_at']
    raw_id_fields = ['user', 'artwork']


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['user', 'artwork', 'content_preview', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'user__username', 'artwork__title']
    raw_id_fields = ['user', 'artwork', 'parent']
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'is_public', 'artworks_count', 'created_at']
    list_filter = ['is_public', 'created_at']
    search_fields = ['name', 'description', 'owner__username']
    raw_id_fields = ['owner']
    filter_horizontal = ['artworks']
    
    def artworks_count(self, obj):
        return obj.artworks.count()
    artworks_count.short_description = 'Artworks'


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ['artwork', 'bidder', 'amount', 'is_winning', 'created_at']
    list_filter = ['is_winning', 'created_at']
    search_fields = ['artwork__title', 'bidder__username']
    raw_id_fields = ['artwork', 'bidder']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'transaction_type', 'buyer', 'seller', 'amount', 'status', 'created_at']
    list_filter = ['transaction_type', 'status', 'created_at']
    search_fields = ['buyer__username', 'seller__username', 'artwork__title']
    raw_id_fields = ['buyer', 'seller', 'artwork']
    readonly_fields = ['id', 'created_at', 'completed_at']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['user__username', 'title', 'message']
    raw_id_fields = ['user']


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ['follower', 'followed', 'created_at']
    list_filter = ['created_at']
    search_fields = ['follower__username', 'followed__username']
    raw_id_fields = ['follower', 'followed']


@admin.register(AIGenerationTask)
class AIGenerationTaskAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'ai_model', 'created_at', 'completed_at']
    list_filter = ['status', 'ai_model', 'created_at']
    search_fields = ['user__username', 'prompt']
    raw_id_fields = ['user']
    readonly_fields = ['id', 'created_at', 'completed_at']
