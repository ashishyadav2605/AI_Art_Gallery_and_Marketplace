from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import (
    UserProfile, Category, Tag, Artwork, Like, Comment, 
    Collection, Bid, Transaction, Notification, Follow, AIGenerationTask
)


class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer"""
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    artworks_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'date_joined', 'followers_count', 'following_count', 'artworks_count']
        read_only_fields = ['date_joined']
    
    def get_followers_count(self, obj):
        return obj.followers.count()
    
    def get_following_count(self, obj):
        return obj.following.count()
    
    def get_artworks_count(self, obj):
        return obj.artworks.filter(status='published').count()


class UserProfileSerializer(serializers.ModelSerializer):
    """User profile serializer"""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'bio', 'avatar', 'website', 'twitter', 
                  'instagram', 'is_verified_artist', 'wallet_balance', 
                  'total_sales', 'created_at']
        read_only_fields = ['wallet_balance', 'total_sales', 'is_verified_artist']


class RegisterSerializer(serializers.ModelSerializer):
    """User registration serializer"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        return user


class CategorySerializer(serializers.ModelSerializer):
    """Category serializer"""
    artworks_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'artworks_count']
    
    def get_artworks_count(self, obj):
        return obj.artworks.filter(status='published').count()


class TagSerializer(serializers.ModelSerializer):
    """Tag serializer"""
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']


class ArtworkListSerializer(serializers.ModelSerializer):
    """Artwork list serializer (lightweight)"""
    owner = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = Artwork
        fields = ['id', 'title', 'image', 'thumbnail', 'image_url', 'price', 
                  'is_for_sale', 'is_auction', 'owner', 'category', 'views', 
                  'likes_count', 'created_at', 'is_liked', 'ai_model']
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False


class ArtworkDetailSerializer(serializers.ModelSerializer):
    """Artwork detail serializer (full details)"""
    owner = UserSerializer(read_only=True)
    creator = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    is_liked = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    highest_bid = serializers.SerializerMethodField()
    
    class Meta:
        model = Artwork
        fields = '__all__'
        read_only_fields = ['id', 'owner', 'creator', 'views', 'likes_count', 'created_at', 'updated_at']
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
    
    def get_comments_count(self, obj):
        return obj.comments.count()
    
    def get_highest_bid(self, obj):
        if obj.is_auction:
            highest = obj.bids.first()
            if highest:
                return {'amount': highest.amount, 'bidder': highest.bidder.username}
        return None


class ArtworkCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating artworks"""
    tags = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    category_id = serializers.IntegerField(required=False, write_only=True)
    
    class Meta:
        model = Artwork
        fields = ['title', 'description', 'image', 'image_url', 'prompt', 
                  'negative_prompt', 'ai_model', 'seed', 'steps', 'cfg_scale',
                  'width', 'height', 'price', 'is_for_sale', 'is_auction',
                  'auction_end_time', 'minimum_bid', 'category_id', 'tags',
                  'status', 'license_type']
    
    def create(self, validated_data):
        tags_data = validated_data.pop('tags', [])
        category_id = validated_data.pop('category_id', None)
        
        artwork = Artwork.objects.create(**validated_data)
        
        if category_id:
            artwork.category_id = category_id
            artwork.save()
        
        for tag_name in tags_data:
            tag, _ = Tag.objects.get_or_create(
                name=tag_name.lower().strip(),
                defaults={'slug': tag_name.lower().strip().replace(' ', '-')}
            )
            artwork.tags.add(tag)
        
        return artwork


class CommentSerializer(serializers.ModelSerializer):
    """Comment serializer"""
    user = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['id', 'user', 'artwork', 'content', 'parent', 'replies', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_replies(self, obj):
        if obj.parent is None:
            replies = obj.replies.all()[:5]
            return CommentSerializer(replies, many=True, context=self.context).data
        return []


class CollectionSerializer(serializers.ModelSerializer):
    """Collection serializer"""
    owner = UserSerializer(read_only=True)
    artworks_count = serializers.SerializerMethodField()
    preview_artworks = serializers.SerializerMethodField()
    
    class Meta:
        model = Collection
        fields = ['id', 'name', 'description', 'owner', 'cover_image', 
                  'is_public', 'artworks_count', 'preview_artworks', 
                  'created_at', 'updated_at']
        read_only_fields = ['owner', 'created_at', 'updated_at']
    
    def get_artworks_count(self, obj):
        return obj.artworks.count()
    
    def get_preview_artworks(self, obj):
        artworks = obj.artworks.all()[:4]
        return [{'id': a.id, 'thumbnail': a.thumbnail.url if a.thumbnail else None} for a in artworks]


class BidSerializer(serializers.ModelSerializer):
    """Bid serializer"""
    bidder = UserSerializer(read_only=True)
    
    class Meta:
        model = Bid
        fields = ['id', 'artwork', 'bidder', 'amount', 'created_at', 'is_winning']
        read_only_fields = ['bidder', 'created_at', 'is_winning']
    
    def validate(self, attrs):
        artwork = attrs.get('artwork')
        amount = attrs.get('amount')
        
        if not artwork.is_auction:
            raise serializers.ValidationError("This artwork is not up for auction.")
        
        if amount < artwork.minimum_bid:
            raise serializers.ValidationError(f"Bid must be at least ${artwork.minimum_bid}")
        
        highest_bid = artwork.bids.first()
        if highest_bid and amount <= highest_bid.amount:
            raise serializers.ValidationError(f"Bid must be higher than ${highest_bid.amount}")
        
        return attrs


class TransactionSerializer(serializers.ModelSerializer):
    """Transaction serializer"""
    buyer = UserSerializer(read_only=True)
    seller = UserSerializer(read_only=True)
    artwork = ArtworkListSerializer(read_only=True)
    
    class Meta:
        model = Transaction
        fields = ['id', 'transaction_type', 'buyer', 'seller', 'artwork', 
                  'amount', 'platform_fee', 'status', 'created_at', 'completed_at']
        read_only_fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer"""
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'title', 'message', 'link', 
                  'is_read', 'created_at']
        read_only_fields = ['notification_type', 'title', 'message', 'link', 'created_at']


class FollowSerializer(serializers.ModelSerializer):
    """Follow serializer"""
    follower = UserSerializer(read_only=True)
    followed = UserSerializer(read_only=True)
    
    class Meta:
        model = Follow
        fields = ['id', 'follower', 'followed', 'created_at']


class AIGenerationTaskSerializer(serializers.ModelSerializer):
    """AI generation task serializer"""
    class Meta:
        model = AIGenerationTask
        fields = ['id', 'prompt', 'negative_prompt', 'ai_model', 'width', 
                  'height', 'steps', 'cfg_scale', 'seed', 'status', 
                  'result_image', 'error_message', 'created_at', 'completed_at']
        read_only_fields = ['id', 'status', 'result_image', 'error_message', 
                           'created_at', 'completed_at']


class AIGenerationRequestSerializer(serializers.Serializer):
    """Serializer for AI generation requests"""
    prompt = serializers.CharField(max_length=2000, required=True)
    negative_prompt = serializers.CharField(max_length=1000, required=False, default='')
    ai_model = serializers.ChoiceField(choices=['stable_diffusion', 'dalle', 'midjourney', 'custom'], default='stable_diffusion')
    width = serializers.IntegerField(min_value=256, max_value=1024, default=512)
    height = serializers.IntegerField(min_value=256, max_value=1024, default=512)
    steps = serializers.IntegerField(min_value=10, max_value=150, default=50)
    cfg_scale = serializers.FloatField(min_value=1.0, max_value=20.0, default=7.5)
    seed = serializers.IntegerField(required=False, allow_null=True)
    num_images = serializers.IntegerField(min_value=1, max_value=4, default=1)
