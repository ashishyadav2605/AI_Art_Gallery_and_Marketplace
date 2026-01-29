from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from decimal import Decimal
import random

from .models import (
    UserProfile, Category, Tag, Artwork, Like, Comment,
    Collection, Bid, Transaction, Notification, Follow, AIGenerationTask
)
from .serializers import (
    UserSerializer, UserProfileSerializer, RegisterSerializer,
    CategorySerializer, TagSerializer, ArtworkListSerializer,
    ArtworkDetailSerializer, ArtworkCreateSerializer, CommentSerializer,
    CollectionSerializer, BidSerializer, TransactionSerializer,
    NotificationSerializer, FollowSerializer, AIGenerationTaskSerializer,
    AIGenerationRequestSerializer
)
from .services import AIArtGenerator


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ==================== AUTH VIEWS ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """Register a new user"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """Login user and return tokens"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Get current authenticated user details"""
    serializer = UserSerializer(request.user)
    profile = UserProfile.objects.get_or_create(user=request.user)[0]
    return Response({
        'user': serializer.data,
        'profile': UserProfileSerializer(profile).data
    })


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update user profile"""
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    serializer = UserProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==================== ARTWORK VIEWS ====================

class ArtworkViewSet(viewsets.ModelViewSet):
    """ViewSet for artwork CRUD operations"""
    queryset = Artwork.objects.filter(status='published')
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'prompt', 'tags__name']
    ordering_fields = ['created_at', 'price', 'views', 'likes_count']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ArtworkListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ArtworkCreateSerializer
        return ArtworkDetailSerializer
    
    def get_queryset(self):
        queryset = Artwork.objects.all()
        
        # Filter by status
        if self.request.user.is_authenticated:
            queryset = queryset.filter(
                Q(status='published') | Q(owner=self.request.user)
            )
        else:
            queryset = queryset.filter(status='published')
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)
        
        # Filter by tag
        tag = self.request.query_params.get('tag')
        if tag:
            queryset = queryset.filter(tags__slug=tag)
        
        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        # Filter by AI model
        ai_model = self.request.query_params.get('ai_model')
        if ai_model:
            queryset = queryset.filter(ai_model=ai_model)
        
        # Filter for sale items only
        for_sale = self.request.query_params.get('for_sale')
        if for_sale == 'true':
            queryset = queryset.filter(is_for_sale=True)
        
        # Filter for auctions
        auctions = self.request.query_params.get('auctions')
        if auctions == 'true':
            queryset = queryset.filter(is_auction=True, auction_end_time__gt=timezone.now())
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(owner_id=user_id)
        
        return queryset.select_related('owner', 'category', 'creator').prefetch_related('tags')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, creator=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.increment_views()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """Like or unlike an artwork"""
        artwork = self.get_object()
        like, created = Like.objects.get_or_create(user=request.user, artwork=artwork)
        
        if not created:
            like.delete()
            artwork.likes_count = max(0, artwork.likes_count - 1)
            artwork.save()
            return Response({'liked': False, 'likes_count': artwork.likes_count})
        
        artwork.likes_count += 1
        artwork.save()
        
        # Create notification for artwork owner
        if artwork.owner != request.user:
            Notification.objects.create(
                user=artwork.owner,
                notification_type='like',
                title='New Like',
                message=f'{request.user.username} liked your artwork "{artwork.title}"',
                link=f'/artwork/{artwork.id}'
            )
        
        return Response({'liked': True, 'likes_count': artwork.likes_count})
    
    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Get trending artworks"""
        artworks = Artwork.objects.filter(
            status='published',
            created_at__gte=timezone.now() - timezone.timedelta(days=7)
        ).order_by('-likes_count', '-views')[:20]
        serializer = ArtworkListSerializer(artworks, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured artworks (curated selection)"""
        artworks = Artwork.objects.filter(
            status='published',
            likes_count__gte=10
        ).order_by('?')[:12]
        serializer = ArtworkListSerializer(artworks, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_artworks(self, request):
        """Get current user's artworks"""
        artworks = Artwork.objects.filter(owner=request.user).order_by('-created_at')
        page = self.paginate_queryset(artworks)
        serializer = ArtworkListSerializer(page, many=True, context={'request': request})
        return self.get_paginated_response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def feed(self, request):
        """Get personalized feed based on followed users"""
        following_ids = Follow.objects.filter(
            follower=request.user
        ).values_list('followed_id', flat=True)
        
        artworks = Artwork.objects.filter(
            owner_id__in=following_ids,
            status='published'
        ).order_by('-created_at')
        
        page = self.paginate_queryset(artworks)
        serializer = ArtworkListSerializer(page, many=True, context={'request': request})
        return self.get_paginated_response(serializer.data)


# ==================== AI GENERATION VIEWS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_art(request):
    """Generate AI art from a prompt"""
    serializer = AIGenerationRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    # Create generation task
    task = AIGenerationTask.objects.create(
        user=request.user,
        prompt=data['prompt'],
        negative_prompt=data.get('negative_prompt', ''),
        ai_model=data.get('ai_model', 'stable_diffusion'),
        width=data.get('width', 512),
        height=data.get('height', 512),
        steps=data.get('steps', 50),
        cfg_scale=data.get('cfg_scale', 7.5),
        seed=data.get('seed'),
        status='pending'
    )
    
    # Generate art using AI service
    try:
        generator = AIArtGenerator()
        result = generator.generate(
            prompt=data['prompt'],
            negative_prompt=data.get('negative_prompt', ''),
            width=data.get('width', 512),
            height=data.get('height', 512),
            steps=data.get('steps', 50),
            cfg_scale=data.get('cfg_scale', 7.5),
            seed=data.get('seed'),
            num_images=data.get('num_images', 1)
        )
        
        task.status = 'completed'
        task.result_image = result['image_path']
        task.seed = result['seed']
        task.completed_at = timezone.now()
        task.save()
        
        return Response({
            'task_id': str(task.id),
            'status': 'completed',
            'images': result['images'],
            'seed': result['seed']
        })
        
    except Exception as e:
        task.status = 'failed'
        task.error_message = str(e)
        task.save()
        return Response({
            'task_id': str(task.id),
            'status': 'failed',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generation_history(request):
    """Get user's generation history"""
    tasks = AIGenerationTask.objects.filter(user=request.user).order_by('-created_at')[:50]
    serializer = AIGenerationTaskSerializer(tasks, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_generated_art(request):
    """Save a generated artwork to the gallery"""
    task_id = request.data.get('task_id')
    title = request.data.get('title', 'Untitled AI Art')
    description = request.data.get('description', '')
    is_for_sale = request.data.get('is_for_sale', False)
    price = request.data.get('price', 0)
    
    try:
        task = AIGenerationTask.objects.get(id=task_id, user=request.user)
    except AIGenerationTask.DoesNotExist:
        return Response({'error': 'Generation task not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if task.status != 'completed' or not task.result_image:
        return Response({'error': 'No generated image available'}, status=status.HTTP_400_BAD_REQUEST)
    
    artwork = Artwork.objects.create(
        title=title,
        description=description,
        image=task.result_image,
        prompt=task.prompt,
        negative_prompt=task.negative_prompt,
        ai_model=task.ai_model,
        seed=task.seed,
        steps=task.steps,
        cfg_scale=task.cfg_scale,
        width=task.width,
        height=task.height,
        owner=request.user,
        creator=request.user,
        is_for_sale=is_for_sale,
        price=Decimal(str(price)),
        status='published'
    )
    
    return Response(ArtworkDetailSerializer(artwork, context={'request': request}).data, status=status.HTTP_201_CREATED)


# ==================== COMMENT VIEWS ====================

class CommentViewSet(viewsets.ModelViewSet):
    """ViewSet for comments"""
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        artwork_id = self.request.query_params.get('artwork')
        if artwork_id:
            return Comment.objects.filter(artwork_id=artwork_id, parent=None)
        return Comment.objects.filter(parent=None)
    
    def perform_create(self, serializer):
        comment = serializer.save(user=self.request.user)
        
        # Notify artwork owner
        if comment.artwork.owner != self.request.user:
            Notification.objects.create(
                user=comment.artwork.owner,
                notification_type='comment',
                title='New Comment',
                message=f'{self.request.user.username} commented on "{comment.artwork.title}"',
                link=f'/artwork/{comment.artwork.id}'
            )


# ==================== COLLECTION VIEWS ====================

class CollectionViewSet(viewsets.ModelViewSet):
    """ViewSet for collections"""
    serializer_class = CollectionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Collection.objects.filter(
                Q(is_public=True) | Q(owner=self.request.user)
            )
        return Collection.objects.filter(is_public=True)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_artwork(self, request, pk=None):
        """Add artwork to collection"""
        collection = self.get_object()
        if collection.owner != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        artwork_id = request.data.get('artwork_id')
        try:
            artwork = Artwork.objects.get(id=artwork_id)
            collection.artworks.add(artwork)
            return Response({'success': True})
        except Artwork.DoesNotExist:
            return Response({'error': 'Artwork not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def remove_artwork(self, request, pk=None):
        """Remove artwork from collection"""
        collection = self.get_object()
        if collection.owner != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        artwork_id = request.data.get('artwork_id')
        try:
            artwork = Artwork.objects.get(id=artwork_id)
            collection.artworks.remove(artwork)
            return Response({'success': True})
        except Artwork.DoesNotExist:
            return Response({'error': 'Artwork not found'}, status=status.HTTP_404_NOT_FOUND)


# ==================== MARKETPLACE VIEWS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def purchase_artwork(request, artwork_id):
    """Purchase an artwork"""
    try:
        artwork = Artwork.objects.get(id=artwork_id)
    except Artwork.DoesNotExist:
        return Response({'error': 'Artwork not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not artwork.is_for_sale:
        return Response({'error': 'Artwork is not for sale'}, status=status.HTTP_400_BAD_REQUEST)
    
    if artwork.owner == request.user:
        return Response({'error': 'Cannot purchase your own artwork'}, status=status.HTTP_400_BAD_REQUEST)
    
    buyer_profile = UserProfile.objects.get_or_create(user=request.user)[0]
    seller_profile = UserProfile.objects.get_or_create(user=artwork.owner)[0]
    
    if buyer_profile.wallet_balance < artwork.price:
        return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Calculate platform fee (5%)
    platform_fee = artwork.price * Decimal('0.05')
    seller_amount = artwork.price - platform_fee
    
    # Process transaction
    buyer_profile.wallet_balance -= artwork.price
    buyer_profile.save()
    
    seller_profile.wallet_balance += seller_amount
    seller_profile.total_sales += artwork.price
    seller_profile.save()
    
    # Update artwork ownership
    old_owner = artwork.owner
    artwork.owner = request.user
    artwork.is_for_sale = False
    artwork.status = 'sold'
    artwork.save()
    
    # Create transaction record
    transaction = Transaction.objects.create(
        transaction_type='purchase',
        buyer=request.user,
        seller=old_owner,
        artwork=artwork,
        amount=artwork.price,
        platform_fee=platform_fee,
        status='completed',
        completed_at=timezone.now()
    )
    
    # Notify seller
    Notification.objects.create(
        user=old_owner,
        notification_type='sale',
        title='Artwork Sold!',
        message=f'Your artwork "{artwork.title}" was purchased by {request.user.username} for ${artwork.price}',
        link=f'/artwork/{artwork.id}'
    )
    
    return Response({
        'success': True,
        'transaction_id': str(transaction.id),
        'message': f'Successfully purchased "{artwork.title}"'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def place_bid(request, artwork_id):
    """Place a bid on an auction"""
    try:
        artwork = Artwork.objects.get(id=artwork_id)
    except Artwork.DoesNotExist:
        return Response({'error': 'Artwork not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = BidSerializer(data={**request.data, 'artwork': artwork_id})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    amount = serializer.validated_data['amount']
    
    # Check auction is still active
    if artwork.auction_end_time and artwork.auction_end_time < timezone.now():
        return Response({'error': 'Auction has ended'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Mark previous winning bid as not winning
    Bid.objects.filter(artwork=artwork, is_winning=True).update(is_winning=False)
    
    # Create new bid
    bid = Bid.objects.create(
        artwork=artwork,
        bidder=request.user,
        amount=amount,
        is_winning=True
    )
    
    # Notify artwork owner
    Notification.objects.create(
        user=artwork.owner,
        notification_type='bid',
        title='New Bid!',
        message=f'{request.user.username} placed a ${amount} bid on "{artwork.title}"',
        link=f'/artwork/{artwork.id}'
    )
    
    # Notify previous highest bidder
    previous_bids = Bid.objects.filter(artwork=artwork).exclude(bidder=request.user).order_by('-amount')
    if previous_bids.exists():
        previous_bidder = previous_bids.first().bidder
        if previous_bidder != artwork.owner:
            Notification.objects.create(
                user=previous_bidder,
                notification_type='outbid',
                title='You have been outbid!',
                message=f'Someone placed a higher bid on "{artwork.title}"',
                link=f'/artwork/{artwork.id}'
            )
    
    return Response(BidSerializer(bid).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_transactions(request):
    """Get user's transaction history"""
    transactions = Transaction.objects.filter(
        Q(buyer=request.user) | Q(seller=request.user)
    ).order_by('-created_at')[:50]
    serializer = TransactionSerializer(transactions, many=True)
    return Response(serializer.data)


# ==================== USER/SOCIAL VIEWS ====================

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing users"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'first_name', 'last_name']
    
    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        """Get user profile with stats"""
        user = self.get_object()
        profile = UserProfile.objects.get_or_create(user=user)[0]
        
        is_following = False
        if request.user.is_authenticated:
            is_following = Follow.objects.filter(
                follower=request.user, followed=user
            ).exists()
        
        return Response({
            'user': UserSerializer(user).data,
            'profile': UserProfileSerializer(profile).data,
            'is_following': is_following
        })
    
    @action(detail=True, methods=['get'])
    def artworks(self, request, pk=None):
        """Get user's public artworks"""
        user = self.get_object()
        artworks = Artwork.objects.filter(owner=user, status='published')
        page = self.paginate_queryset(artworks)
        serializer = ArtworkListSerializer(page, many=True, context={'request': request})
        return self.get_paginated_response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def follow(self, request, pk=None):
        """Follow or unfollow a user"""
        user_to_follow = self.get_object()
        
        if user_to_follow == request.user:
            return Response({'error': 'Cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        follow, created = Follow.objects.get_or_create(
            follower=request.user,
            followed=user_to_follow
        )
        
        if not created:
            follow.delete()
            return Response({'following': False})
        
        # Notify user
        Notification.objects.create(
            user=user_to_follow,
            notification_type='follow',
            title='New Follower',
            message=f'{request.user.username} started following you',
            link=f'/user/{request.user.id}'
        )
        
        return Response({'following': True})


# ==================== CATEGORY/TAG VIEWS ====================

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for categories"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'


class TagViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for tags"""
    queryset = Tag.objects.annotate(count=Count('artworks')).order_by('-count')
    serializer_class = TagSerializer
    lookup_field = 'slug'
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get popular tags"""
        tags = Tag.objects.annotate(count=Count('artworks')).order_by('-count')[:20]
        serializer = TagSerializer(tags, many=True)
        return Response(serializer.data)


# ==================== NOTIFICATION VIEWS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """Get user notifications"""
    notifications = Notification.objects.filter(user=request.user)[:50]
    unread_count = notifications.filter(is_read=False).count()
    serializer = NotificationSerializer(notifications, many=True)
    return Response({
        'notifications': serializer.data,
        'unread_count': unread_count
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """Mark a notification as read"""
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({'success': True})
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all notifications as read"""
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'success': True})


# ==================== SEARCH VIEWS ====================

@api_view(['GET'])
def search(request):
    """Global search across artworks, users, and collections"""
    query = request.query_params.get('q', '')
    search_type = request.query_params.get('type', 'all')
    
    results = {}
    
    if search_type in ['all', 'artworks']:
        artworks = Artwork.objects.filter(
            Q(title__icontains=query) | 
            Q(description__icontains=query) |
            Q(prompt__icontains=query) |
            Q(tags__name__icontains=query),
            status='published'
        ).distinct()[:20]
        results['artworks'] = ArtworkListSerializer(artworks, many=True, context={'request': request}).data
    
    if search_type in ['all', 'users']:
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        )[:10]
        results['users'] = UserSerializer(users, many=True).data
    
    if search_type in ['all', 'collections']:
        collections = Collection.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query),
            is_public=True
        )[:10]
        results['collections'] = CollectionSerializer(collections, many=True).data
    
    return Response(results)


# ==================== STATS VIEWS ====================

@api_view(['GET'])
def marketplace_stats(request):
    """Get marketplace statistics"""
    total_artworks = Artwork.objects.filter(status='published').count()
    total_artists = User.objects.filter(artworks__isnull=False).distinct().count()
    total_sales = Transaction.objects.filter(status='completed').count()
    
    # Get recent sales
    recent_transactions = Transaction.objects.filter(
        status='completed'
    ).order_by('-created_at')[:5]
    
    return Response({
        'total_artworks': total_artworks,
        'total_artists': total_artists,
        'total_sales': total_sales,
        'recent_sales': TransactionSerializer(recent_transactions, many=True).data
    })
