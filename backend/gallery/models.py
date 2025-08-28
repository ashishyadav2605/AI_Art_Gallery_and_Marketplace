from django.db import models
from django.contrib.auth.models import User

class Artwork(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    image_url = models.URLField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='artworks')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
