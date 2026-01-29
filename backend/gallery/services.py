"""
AI Art Generation Service
Handles AI image generation using various backends (Stable Diffusion, DALL-E, etc.)
"""

import os
import io
import base64
import random
import hashlib
from datetime import datetime
from pathlib import Path
from PIL import Image
import requests
from django.conf import settings
from django.core.files.base import ContentFile


class AIArtGenerator:
    """
    AI Art Generator Service
    Supports multiple AI backends for image generation
    """
    
    def __init__(self):
        self.stability_api_key = getattr(settings, 'STABILITY_API_KEY', os.getenv('STABILITY_API_KEY', ''))
        self.openai_api_key = getattr(settings, 'OPENAI_API_KEY', os.getenv('OPENAI_API_KEY', ''))
        self.huggingface_token = getattr(settings, 'HUGGINGFACE_TOKEN', os.getenv('HUGGINGFACE_TOKEN', ''))
        
        # Ensure media directories exist
        self.media_root = Path(settings.MEDIA_ROOT if hasattr(settings, 'MEDIA_ROOT') else 'media')
        self.generated_dir = self.media_root / 'generated' / datetime.now().strftime('%Y/%m')
        self.generated_dir.mkdir(parents=True, exist_ok=True)
    
    def generate(self, prompt, negative_prompt='', width=512, height=512, 
                 steps=50, cfg_scale=7.5, seed=None, num_images=1, ai_model='stable_diffusion'):
        """
        Generate AI art based on the given parameters
        
        Args:
            prompt: The text prompt describing the desired image
            negative_prompt: What to avoid in the image
            width: Image width (256-1024)
            height: Image height (256-1024)
            steps: Number of inference steps (10-150)
            cfg_scale: Classifier-free guidance scale (1-20)
            seed: Random seed for reproducibility
            num_images: Number of images to generate (1-4)
            ai_model: The AI model to use
        
        Returns:
            dict with image paths, base64 data, and metadata
        """
        
        if seed is None:
            seed = random.randint(0, 2147483647)
        
        # Try different backends based on configuration
        if ai_model == 'dalle' and self.openai_api_key:
            return self._generate_with_dalle(prompt, width, height, num_images, seed)
        elif self.stability_api_key:
            return self._generate_with_stability(
                prompt, negative_prompt, width, height, steps, cfg_scale, seed, num_images
            )
        elif self.huggingface_token:
            return self._generate_with_huggingface(
                prompt, negative_prompt, width, height, steps, cfg_scale, seed, num_images
            )
        else:
            # Fallback to generating placeholder images for demo
            return self._generate_placeholder(prompt, width, height, seed, num_images)
    
    def _generate_with_stability(self, prompt, negative_prompt, width, height, 
                                  steps, cfg_scale, seed, num_images):
        """Generate using Stability AI API"""
        
        url = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"
        
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.stability_api_key}",
            "Content-Type": "application/json"
        }
        
        body = {
            "text_prompts": [
                {"text": prompt, "weight": 1.0}
            ],
            "cfg_scale": cfg_scale,
            "height": min(height, 1024),
            "width": min(width, 1024),
            "steps": min(steps, 50),
            "samples": num_images,
            "seed": seed
        }
        
        if negative_prompt:
            body["text_prompts"].append({"text": negative_prompt, "weight": -1.0})
        
        response = requests.post(url, headers=headers, json=body)
        
        if response.status_code != 200:
            raise Exception(f"Stability AI error: {response.text}")
        
        data = response.json()
        images = []
        image_path = None
        
        for i, artifact in enumerate(data.get("artifacts", [])):
            img_data = base64.b64decode(artifact["base64"])
            filename = f"sd_{seed}_{i}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            filepath = self.generated_dir / filename
            
            with open(filepath, 'wb') as f:
                f.write(img_data)
            
            if i == 0:
                image_path = str(filepath.relative_to(self.media_root))
            
            images.append({
                'url': f'/media/{filepath.relative_to(self.media_root)}',
                'base64': artifact["base64"]
            })
        
        return {
            'images': images,
            'image_path': image_path,
            'seed': seed,
            'model': 'stable_diffusion'
        }
    
    def _generate_with_dalle(self, prompt, width, height, num_images, seed):
        """Generate using OpenAI DALL-E API"""
        
        url = "https://api.openai.com/v1/images/generations"
        
        # DALL-E 3 only supports specific sizes
        if width >= 1024 or height >= 1024:
            size = "1024x1024"
        elif width >= 512 or height >= 512:
            size = "1024x1024"
        else:
            size = "1024x1024"
        
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }
        
        body = {
            "model": "dall-e-3",
            "prompt": prompt,
            "n": min(num_images, 1),  # DALL-E 3 only supports n=1
            "size": size,
            "response_format": "b64_json"
        }
        
        response = requests.post(url, headers=headers, json=body)
        
        if response.status_code != 200:
            raise Exception(f"DALL-E error: {response.text}")
        
        data = response.json()
        images = []
        image_path = None
        
        for i, img_data in enumerate(data.get("data", [])):
            img_bytes = base64.b64decode(img_data["b64_json"])
            filename = f"dalle_{seed}_{i}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            filepath = self.generated_dir / filename
            
            with open(filepath, 'wb') as f:
                f.write(img_bytes)
            
            if i == 0:
                image_path = str(filepath.relative_to(self.media_root))
            
            images.append({
                'url': f'/media/{filepath.relative_to(self.media_root)}',
                'base64': img_data["b64_json"]
            })
        
        return {
            'images': images,
            'image_path': image_path,
            'seed': seed,
            'model': 'dalle'
        }
    
    def _generate_with_huggingface(self, prompt, negative_prompt, width, height,
                                    steps, cfg_scale, seed, num_images):
        """Generate using Hugging Face Inference API"""
        
        url = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
        
        headers = {
            "Authorization": f"Bearer {self.huggingface_token}",
            "Content-Type": "application/json"
        }
        
        body = {
            "inputs": prompt,
            "parameters": {
                "negative_prompt": negative_prompt,
                "width": min(width, 1024),
                "height": min(height, 1024),
                "num_inference_steps": min(steps, 50),
                "guidance_scale": cfg_scale,
                "seed": seed
            }
        }
        
        response = requests.post(url, headers=headers, json=body)
        
        if response.status_code != 200:
            raise Exception(f"Hugging Face error: {response.text}")
        
        # Response is the image bytes directly
        img_bytes = response.content
        filename = f"hf_{seed}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = self.generated_dir / filename
        
        with open(filepath, 'wb') as f:
            f.write(img_bytes)
        
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
        
        return {
            'images': [{
                'url': f'/media/{filepath.relative_to(self.media_root)}',
                'base64': img_base64
            }],
            'image_path': str(filepath.relative_to(self.media_root)),
            'seed': seed,
            'model': 'huggingface'
        }
    
    def _generate_placeholder(self, prompt, width, height, seed, num_images):
        """
        Generate placeholder images for demo/development
        Creates artistic gradient images with text overlay
        """
        
        images = []
        image_path = None
        
        # Use seed for reproducible colors
        random.seed(seed)
        
        for i in range(num_images):
            # Create a gradient image
            img = Image.new('RGB', (width, height))
            pixels = img.load()
            
            # Generate random colors based on seed
            color1 = (
                random.randint(50, 200),
                random.randint(50, 200),
                random.randint(50, 200)
            )
            color2 = (
                random.randint(50, 200),
                random.randint(50, 200),
                random.randint(50, 200)
            )
            
            # Create gradient
            for y in range(height):
                for x in range(width):
                    ratio = (x + y) / (width + height)
                    r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
                    g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
                    b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
                    pixels[x, y] = (r, g, b)
            
            # Add some noise/texture for visual interest
            for _ in range(width * height // 10):
                x = random.randint(0, width - 1)
                y = random.randint(0, height - 1)
                current = pixels[x, y]
                noise = random.randint(-20, 20)
                pixels[x, y] = (
                    max(0, min(255, current[0] + noise)),
                    max(0, min(255, current[1] + noise)),
                    max(0, min(255, current[2] + noise))
                )
            
            # Save image
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_bytes = img_byte_arr.getvalue()
            
            filename = f"placeholder_{seed}_{i}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            filepath = self.generated_dir / filename
            
            with open(filepath, 'wb') as f:
                f.write(img_bytes)
            
            if i == 0:
                image_path = str(filepath.relative_to(self.media_root))
            
            img_base64 = base64.b64encode(img_bytes).decode('utf-8')
            
            images.append({
                'url': f'/media/{filepath.relative_to(self.media_root)}',
                'base64': img_base64
            })
        
        return {
            'images': images,
            'image_path': image_path,
            'seed': seed,
            'model': 'placeholder',
            'note': 'Configure STABILITY_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_TOKEN for real AI generation'
        }
    
    def enhance_prompt(self, prompt, style='default'):
        """
        Enhance a simple prompt with additional style descriptors
        
        Args:
            prompt: The base prompt
            style: Style preset (photorealistic, artistic, anime, etc.)
        
        Returns:
            Enhanced prompt string
        """
        
        style_modifiers = {
            'photorealistic': 'photorealistic, highly detailed, 8k resolution, professional photography, dramatic lighting',
            'artistic': 'artistic, oil painting style, masterpiece, vibrant colors, detailed brushwork',
            'anime': 'anime style, detailed anime art, vibrant colors, dynamic pose, studio quality',
            'digital_art': 'digital art, concept art, trending on artstation, highly detailed, vibrant',
            'fantasy': 'fantasy art, magical, ethereal lighting, detailed environment, epic composition',
            'cyberpunk': 'cyberpunk style, neon lights, futuristic, high tech, rain, night city',
            'watercolor': 'watercolor painting, soft colors, artistic, delicate, flowing',
            'sketch': 'pencil sketch, detailed linework, artistic, professional illustration',
            'default': 'high quality, detailed, professional'
        }
        
        modifier = style_modifiers.get(style, style_modifiers['default'])
        return f"{prompt}, {modifier}"
    
    def get_prompt_suggestions(self, category=None):
        """
        Get AI prompt suggestions based on category
        
        Args:
            category: Optional category to filter suggestions
        
        Returns:
            List of prompt suggestions
        """
        
        suggestions = {
            'landscape': [
                "A serene mountain lake at sunset with snow-capped peaks reflecting in crystal clear water",
                "Enchanted forest with bioluminescent plants and mystical creatures",
                "Futuristic cityscape with flying vehicles and holographic advertisements",
                "Underwater coral reef paradise with colorful fish and sunbeams"
            ],
            'portrait': [
                "Elegant portrait of a mysterious figure in Renaissance style clothing",
                "Cyberpunk character with neon hair and augmented reality glasses",
                "Fantasy warrior princess with intricate armor and magical aura",
                "Steampunk inventor surrounded by clockwork mechanisms"
            ],
            'abstract': [
                "Swirling galaxies of color representing the human consciousness",
                "Geometric patterns flowing like liquid metal in zero gravity",
                "Emotional explosion of colors representing joy and creativity",
                "Fractal patterns inspired by nature's mathematical beauty"
            ],
            'fantasy': [
                "Ancient dragon perched atop a crystal mountain at twilight",
                "Magical library with floating books and ethereal librarians",
                "Enchanted castle in the clouds with rainbow bridges",
                "Mythical phoenix rising from flames in a starlit sky"
            ],
            'scifi': [
                "Space station orbiting a gas giant with multiple moons visible",
                "Alien marketplace on a distant planet with exotic species",
                "Time travel portal opening in a Victorian laboratory",
                "Robot and human collaboration in a futuristic workshop"
            ]
        }
        
        if category and category in suggestions:
            return suggestions[category]
        
        # Return a mix of all suggestions
        all_suggestions = []
        for cat_suggestions in suggestions.values():
            all_suggestions.extend(cat_suggestions)
        random.shuffle(all_suggestions)
        return all_suggestions[:10]
