from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid


class UserProfile(models.Model):
    """Extended user profile for artists and collectors"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, max_length=500)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    website = models.URLField(blank=True)
    twitter = models.CharField(max_length=100, blank=True)
    instagram = models.CharField(max_length=100, blank=True)
    is_verified_artist = models.BooleanField(default=False)
    wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username}'s profile"


class Category(models.Model):
    """Categories for artwork classification"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # Emoji or icon class
    
    class Meta:
        verbose_name_plural = "Categories"
    
    def __str__(self):
        return self.name


class Tag(models.Model):
    """Tags for artwork discovery"""
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(unique=True)
    
    def __str__(self):
        return self.name


class Artwork(models.Model):
    """Main artwork model with AI generation support"""
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('sold', 'Sold'),
        ('archived', 'Archived'),
    ]
    
    AI_MODELS = [
        ('stable_diffusion', 'Stable Diffusion'),
        ('dalle', 'DALL-E'),
        ('midjourney', 'Midjourney Style'),
        ('custom', 'Custom Model'),
    ]
    
    # Basic info
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Image fields
    image = models.ImageField(upload_to='artworks/%Y/%m/')
    thumbnail = models.ImageField(upload_to='thumbnails/%Y/%m/', blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)  # For external images
    
    # AI Generation details
    prompt = models.TextField(blank=True, help_text="The AI prompt used to generate this artwork")
    negative_prompt = models.TextField(blank=True)
    ai_model = models.CharField(max_length=50, choices=AI_MODELS, default='stable_diffusion')
    seed = models.BigIntegerField(null=True, blank=True)
    steps = models.IntegerField(default=50)
    cfg_scale = models.FloatField(default=7.5)
    width = models.IntegerField(default=512)
    height = models.IntegerField(default=512)
    
    # Marketplace info
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    is_for_sale = models.BooleanField(default=False)
    is_auction = models.BooleanField(default=False)
    auction_end_time = models.DateTimeField(null=True, blank=True)
    minimum_bid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Relationships
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='artworks')
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_artworks')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='artworks')
    tags = models.ManyToManyField(Tag, blank=True, related_name='artworks')
    
    # Metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    views = models.PositiveIntegerField(default=0)
    likes_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Licensing
    license_type = models.CharField(max_length=50, default='personal', 
                                    choices=[('personal', 'Personal Use'), 
                                            ('commercial', 'Commercial Use'),
                                            ('exclusive', 'Exclusive Rights')])
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    def increment_views(self):
        self.views += 1
        self.save(update_fields=['views'])


class Like(models.Model):
    """Track likes on artworks"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes')
    artwork = models.ForeignKey(Artwork, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'artwork']
    
    def __str__(self):
        return f"{self.user.username} likes {self.artwork.title}"


class Comment(models.Model):
    """Comments on artworks"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    artwork = models.ForeignKey(Artwork, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField(max_length=1000)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Comment by {self.user.username} on {self.artwork.title}"


class Collection(models.Model):
    """User-created collections of artworks"""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='collections')
    artworks = models.ManyToManyField(Artwork, blank=True, related_name='collections')
    cover_image = models.ImageField(upload_to='collections/', blank=True, null=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} by {self.owner.username}"


class Bid(models.Model):
    """Bids for auction artworks"""
    artwork = models.ForeignKey(Artwork, on_delete=models.CASCADE, related_name='bids')
    bidder = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bids')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    is_winning = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-amount']
    
    def __str__(self):
        return f"${self.amount} bid on {self.artwork.title} by {self.bidder.username}"


class Transaction(models.Model):
    """Track all marketplace transactions"""
    
    TRANSACTION_TYPES = [
        ('purchase', 'Purchase'),
        ('sale', 'Sale'),
        ('bid_won', 'Auction Won'),
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('commission', 'Commission'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    buyer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='purchases')
    seller = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='sales')
    artwork = models.ForeignKey(Artwork, on_delete=models.SET_NULL, null=True, related_name='transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    stripe_payment_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.transaction_type}: ${self.amount}"


class Notification(models.Model):
    """User notifications"""
    
    NOTIFICATION_TYPES = [
        ('like', 'New Like'),
        ('comment', 'New Comment'),
        ('follow', 'New Follower'),
        ('sale', 'Artwork Sold'),
        ('bid', 'New Bid'),
        ('outbid', 'Outbid'),
        ('auction_won', 'Auction Won'),
        ('system', 'System'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} for {self.user.username}"


class Follow(models.Model):
    """Track user follows"""
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    followed = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['follower', 'followed']
    
    def __str__(self):
        return f"{self.follower.username} follows {self.followed.username}"


class AIGenerationTask(models.Model):
    """Track AI image generation tasks"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='generation_tasks')
    prompt = models.TextField()
    negative_prompt = models.TextField(blank=True)
    ai_model = models.CharField(max_length=50, default='stable_diffusion')
    width = models.IntegerField(default=512)
    height = models.IntegerField(default=512)
    steps = models.IntegerField(default=50)
    cfg_scale = models.FloatField(default=7.5)
    seed = models.BigIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    result_image = models.ImageField(upload_to='generated/%Y/%m/', blank=True, null=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Generation task {self.id} - {self.status}"
