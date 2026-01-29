import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          });
          
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================

export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  getCurrentUser: () => api.get('/auth/me/'),
  updateProfile: (data) => api.put('/auth/profile/', data),
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// ==================== ARTWORKS API ====================

export const artworksAPI = {
  getAll: (params = {}) => api.get('/artworks/', { params }),
  getById: (id) => api.get(`/artworks/${id}/`),
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        if (key === 'tags' && Array.isArray(data[key])) {
          formData.append(key, JSON.stringify(data[key]));
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    return api.post('/artworks/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id, data) => api.patch(`/artworks/${id}/`, data),
  delete: (id) => api.delete(`/artworks/${id}/`),
  like: (id) => api.post(`/artworks/${id}/like/`),
  getTrending: () => api.get('/artworks/trending/'),
  getFeatured: () => api.get('/artworks/featured/'),
  getMyArtworks: () => api.get('/artworks/my_artworks/'),
  getFeed: () => api.get('/artworks/feed/'),
};

// ==================== AI GENERATION API ====================

export const generateAPI = {
  generate: (data) => api.post('/generate/', data),
  getHistory: () => api.get('/generate/history/'),
  saveGenerated: (data) => api.post('/generate/save/', data),
};

// ==================== MARKETPLACE API ====================

export const marketplaceAPI = {
  purchase: (artworkId) => api.post(`/marketplace/purchase/${artworkId}/`),
  placeBid: (artworkId, data) => api.post(`/marketplace/bid/${artworkId}/`, data),
  getTransactions: () => api.get('/marketplace/transactions/'),
  getStats: () => api.get('/marketplace/stats/'),
};

// ==================== USERS API ====================

export const usersAPI = {
  getAll: (params = {}) => api.get('/users/', { params }),
  getById: (id) => api.get(`/users/${id}/`),
  getProfile: (id) => api.get(`/users/${id}/profile/`),
  getArtworks: (id) => api.get(`/users/${id}/artworks/`),
  follow: (id) => api.post(`/users/${id}/follow/`),
};

// ==================== COLLECTIONS API ====================

export const collectionsAPI = {
  getAll: (params = {}) => api.get('/collections/', { params }),
  getById: (id) => api.get(`/collections/${id}/`),
  create: (data) => api.post('/collections/', data),
  update: (id, data) => api.patch(`/collections/${id}/`, data),
  delete: (id) => api.delete(`/collections/${id}/`),
  addArtwork: (id, artworkId) => api.post(`/collections/${id}/add_artwork/`, { artwork_id: artworkId }),
  removeArtwork: (id, artworkId) => api.post(`/collections/${id}/remove_artwork/`, { artwork_id: artworkId }),
};

// ==================== COMMENTS API ====================

export const commentsAPI = {
  getForArtwork: (artworkId) => api.get('/comments/', { params: { artwork: artworkId } }),
  create: (data) => api.post('/comments/', data),
  update: (id, data) => api.patch(`/comments/${id}/`, data),
  delete: (id) => api.delete(`/comments/${id}/`),
};

// ==================== CATEGORIES & TAGS API ====================

export const categoriesAPI = {
  getAll: () => api.get('/categories/'),
  getBySlug: (slug) => api.get(`/categories/${slug}/`),
};

export const tagsAPI = {
  getAll: () => api.get('/tags/'),
  getPopular: () => api.get('/tags/popular/'),
};

// ==================== NOTIFICATIONS API ====================

export const notificationsAPI = {
  getAll: () => api.get('/notifications/'),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/read-all/'),
};

// ==================== SEARCH API ====================

export const searchAPI = {
  search: (query, type = 'all') => api.get('/search/', { params: { q: query, type } }),
};

export default api;
