import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

class ApiService {
  client: AxiosInstance;  // public — used by pages for dynamic endpoints

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const newToken = await this.refreshToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch {
            this.logout();
            if (typeof window !== 'undefined') window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token') || Cookies.get('access_token') || null;
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token') || Cookies.get('refresh_token') || null;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    Cookies.set('access_token', accessToken, { expires: 1 });
    Cookies.set('refresh_token', refreshToken, { expires: 7 });
  }

  private async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh: refreshToken });
      const { access } = response.data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access);
        Cookies.set('access_token', access, { expires: 1 });
      }
      return access;
    } catch {
      return null;
    }
  }

  logout(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  async register(userData: {
    username: string;
    password: string;
    confirm_password: string;
    user_type?: string;
    email?: string;
    public_key?: string;
    encrypted_private_key?: string;
  }) {
    const response = await this.client.post('/auth/register/', userData);
    if (response.data.tokens) this.setTokens(response.data.tokens.access, response.data.tokens.refresh);
    return response.data;  // { user, tokens, requires_otp }
  }

  async login(credentials: { username: string; password: string }) {
    const response = await this.client.post('/auth/login/', credentials);
    if (response.data.tokens) this.setTokens(response.data.tokens.access, response.data.tokens.refresh);
    return response.data;
  }

  async staffLogin(credentials: { username: string; password: string }) {
    const response = await this.client.post('/auth/admin/login/', credentials);
    if (response.data.tokens) this.setTokens(response.data.tokens.access, response.data.tokens.refresh);
    return response.data;
  }

  async logoutApi() {
    try { await this.client.post('/auth/logout/', { refresh: this.getRefreshToken() }); }
    finally { this.logout(); }
  }

  async getProfile() { return this.client.get('/auth/profile/'); }
  async updateProfile(data: { public_key?: string; encrypted_private_key?: string }) { return this.client.patch('/auth/profile/', data); }
  async generateUsername() { return this.client.post('/auth/generate-username/'); }
  async generateKeys() { return this.client.post('/auth/generate-keys/'); }
  async getUserStats() { return this.client.get('/auth/stats/'); }

  async requestOTP(email?: string) { return this.client.post('/auth/otp/request/', email ? { email } : {}); }
  async verifyOTP(otp: string) { return this.client.post('/auth/otp/verify/', { otp }); }

  // ── Listings ──────────────────────────────────────────────────────────────
  async getListings(params?: Record<string, string | number>) { return this.client.get('/listings/', { params }); }
  async getListing(id: string) { return this.client.get(`/listings/${id}/`); }
  async createListing(data: { title: string; description: string; preview_content: string; price: number; category?: string; tags?: string }) { return this.client.post('/listings/', data); }
  async updateListing(id: string, data: Partial<{ title: string; description: string; preview_content: string; price: number; status: string; encrypted_content_url: string }>) { return this.client.patch(`/listings/${id}/`, data); }
  async saveListing(id: string) { return this.client.post(`/listings/${id}/save/`); }
  async unsaveListing(id: string) { return this.client.post(`/listings/${id}/unsave/`); }
  async getSavedListings() { return this.client.get('/listings/saved/'); }
  async getMyListings() { return this.client.get('/listings/my/'); }
  async getUploadUrl(listingId: string, data: { filename: string; content_type: string; file_size: number; content_hash: string }) { return this.client.post(`/listings/${listingId}/upload-url/`, data); }

  // ── Generic request helpers ──────────────────────────────────────────────
  async post<T = any>(url: string, data?: unknown) { return this.client.post<T>(url, data); }
  async get<T = any>(url: string, params?: Record<string, unknown>) { return this.client.get<T>(url, { params }); }
  async patch<T = any>(url: string, data?: unknown) { return this.client.patch<T>(url, data); }

  // ── Verification / Demo ──────────────────────────────────────────────────
  async submitDemo(data: { listing: string; demo_category: string; demo_text: string; demo_files: unknown[]; guidance_acknowledged: boolean }) {
    return this.client.post('/v1/verification/demos/', data);
  }
  async getDemo(listingId: string) { return this.client.get(`/v1/verification/demos/?listing=${listingId}`); }
  async submitForVerification(data: { listing_id: string; proofs: unknown[]; priority?: string }) {
    return this.client.post('/v1/verification/queue/submit_for_verification/', data);
  }

  // ── Transactions ──────────────────────────────────────────────────────────
  async getTransactions(params?: { role?: string }) { return this.client.get('/transactions/', { params }); }
  async getTransaction(id: string) { return this.client.get(`/transactions/${id}/`); }
  async initiateTransaction(data: { listing_id: string; buyer_public_key?: string }) { return this.client.post('/transactions/initiate/', { ...data, encrypted_key: data.buyer_public_key || '' }); }
  async initiateMpesa(data: { listing_id: string; phone: string }) { return this.client.post('/transactions/mpesa/initiate/', data); }
  async releaseTransaction(id: string, data: { encrypted_key_for_buyer: string }) { return this.client.post(`/transactions/${id}/release/`, data); }
  async confirmTransaction(id: string) { return this.client.post(`/transactions/${id}/confirm/`); }

  // ── Disputes ──────────────────────────────────────────────────────────────
  async createDispute(transactionId: string, data: { buyer_claim: string }) { return this.client.post(`/transactions/${transactionId}/dispute/`, data); }
  async getDisputes() { return this.client.get('/transactions/disputes/'); }
  async getDispute(id: string) { return this.client.get(`/transactions/disputes/${id}/`); }
  async respondDispute(id: string, data: { seller_response: string }) { return this.client.post(`/transactions/disputes/${id}/respond/`, data); }
  async resolveDispute(id: string, data: { resolution: string; resolution_details: string; admin_notes: string; slash_stake: boolean }) { return this.client.post(`/transactions/disputes/${id}/resolve/`, data); }

  // ── Reviews ───────────────────────────────────────────────────────────────
  async createReview(transactionId: string, data: { rating: number; comment: string }) { return this.client.post(`/transactions/${transactionId}/review/`, data); }
  async getUserReviews(userId: string) { return this.client.get(`/transactions/reviews/${userId}/`); }

  // ── Stakes ────────────────────────────────────────────────────────────────
  async createStake(data: { amount: number }) { return this.client.post('/transactions/stake/', data); }
  async getMyStakes() { return this.client.get('/transactions/stakes/'); }

  // ── Bounties ──────────────────────────────────────────────────────────────
  async getBounties(params?: { page?: number; category?: string; status?: string }) { return this.client.get('/bounties/', { params }); }
  async getBounty(id: string) { return this.client.get(`/bounties/${id}/`); }
  async createBounty(data: { title: string; description: string; requirements: string; reward: number; category?: string; tags?: string; deadline?: string; priority?: string }) { return this.client.post('/bounties/', data); }
  async submitToBounty(id: string, data: { encrypted_solution: string; solution_hash: string; submission_notes?: string; file_url?: string }) { return this.client.post(`/bounties/${id}/submit/`, data); }
  async getBountySubmissions(id: string) { return this.client.get(`/bounties/${id}/submissions/`); }
  async acceptSubmission(submissionId: string) { return this.client.post(`/bounties/submissions/${submissionId}/accept/`); }
  async rejectSubmission(submissionId: string, data: { rejection_reason: string }) { return this.client.post(`/bounties/submissions/${submissionId}/reject/`, data); }
  async watchBounty(id: string) { return this.client.post(`/bounties/${id}/watch/`); }
  async unwatchBounty(id: string) { return this.client.post(`/bounties/${id}/unwatch/`); }
  async getMyBounties() { return this.client.get('/bounties/my/'); }
  async getMySubmissions() { return this.client.get('/bounties/my-submissions/'); }

  // ── Chat ──────────────────────────────────────────────────────────────────
  async getChatRooms() { return this.client.get('/chat/rooms/'); }
  async createChatRoom(data: { participant_id: string; room_type?: string }) { return this.client.post('/chat/rooms/create/', data); }
  async createSupportRoom() { return this.client.post('/chat/rooms/support/'); }
  async getChatUserByUsername(username: string) { return this.client.get(`/chat/user/${username}/`); }
  async getMessages(roomId: string) { return this.client.get(`/chat/rooms/${roomId}/messages/`); }
  async markMessageRead(messageId: string) { return this.client.post(`/chat/messages/${messageId}/read/`); }
  async storeKeyExchange(data: { room_id: string; to_user_id: string; encrypted_key: string }) { return this.client.post('/chat/keys/', data); }
  async getMyKey(roomId: string) { return this.client.get(`/chat/rooms/${roomId}/key/`); }
  async blockUser(username: string) { return this.client.post('/chat/block/', { username }); }
  async unblockUser(username: string) { return this.client.post(`/chat/unblock/${username}/`); }

  async adminListUsers() { return this.client.get('/auth/admin/users/'); }
  async adminPlatformStats() { return this.client.get('/auth/admin/stats/'); }
  async adminSuspendUser(userId: number, reason: string, duration_days: number = 7) { 
    return this.client.post(`/auth/admin/users/${userId}/suspend/`, { reason, duration_days }); 
  }
  async adminUnsuspendUser(userId: number) { return this.client.post(`/auth/admin/users/${userId}/unsuspend/`); }
  async adminTerminateUser(userId: number, reason: string) { return this.client.delete(`/auth/admin/users/${userId}/terminate/`, { data: { reason } }); }
  async adminEditListing(listingId: string, data: Record<string, unknown>) { return this.client.post(`/auth/admin/listings/${listingId}/edit/`, data); }
  async adminTerminateListing(listingId: string) { return this.client.delete(`/auth/admin/listings/${listingId}/terminate/`); }
  async adminRefundTransaction(txnId: string, reason: string) { return this.client.post(`/auth/admin/transactions/${txnId}/refund/`, { reason }); }
  async adminGetSupportRooms() { return this.client.get('/auth/admin/support-rooms/'); }
  async adminGetAllConversations() { return this.client.get('/auth/admin/all-conversations/'); }
  async adminSendMessage(data: { room_id?: string; target_username?: string; message: string }) { return this.client.post('/auth/admin/message/send/', data); }
  async adminStakeLogs() { return this.client.get('/auth/admin/logs/stakes/'); }
  async adminEscrowLogs() { return this.client.get('/auth/admin/logs/escrow/'); }
  async adminGetAllListings(params?: Record<string, unknown>) { return this.client.get('/listings/', { params: { page_size: 200, ...params } }); }
  async adminGetAllTransactions() { return this.client.get('/transactions/', { params: { page_size: 200 } }); }
}

export const apiService = new ApiService();
export default apiService;

