<<<<<<< HEAD
# AIM - Anonymous Information Marketplace

A secure, anonymous marketplace where sellers list verified earning strategies and buyers purchase via escrow. All content is encrypted end-to-end, ensuring complete privacy and trust.

## 🏗️ Architecture

### Backend (Django)
- **Framework**: Django 6.0 + Django REST Framework
- **Real-time**: Django Channels (WebSockets)
- **Database**: PostgreSQL (SQLite for development)
- **Cache**: Redis
- **Authentication**: JWT with anonymous users
- **Payments**: Paystack integration with escrow
- **Storage**: AWS S3 for encrypted content

### Frontend (Next.js)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: TailwindCSS
- **Encryption**: Client-side AES + RSA encryption
- **State Management**: React Context API

## 🔐 Security Features

- **End-to-End Encryption**: All content encrypted client-side
- **Anonymous Identity**: No real names required
- **Escrow System**: Safe transactions with fund protection
- **Cryptographic Keys**: RSA keypair generation for each user
- **Secure Storage**: Encrypted content stored in S3

## 🚀 Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On Unix
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Create superuser (optional):
```bash
python manage.py createsuperuser
```

7. Start development server:
```bash
python manage.py runserver
```

Backend will be available at: `http://127.0.0.1:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api" > .env.local
```

4. Start development server:
```bash
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/profile/` - Get user profile
- `POST /api/auth/generate-username/` - Generate anonymous username
- `POST /api/auth/generate-keys/` - Generate RSA keypair

### Listings
- `GET /api/listings/` - List all listings
- `POST /api/listings/` - Create new listing
- `GET /api/listings/{id}/` - Get listing details
- `POST /api/listings/{id}/purchase/` - Purchase listing

### Transactions
- `GET /api/transactions/` - List user transactions
- `POST /api/transactions/initiate/` - Initiate transaction
- `POST /api/transactions/{id}/release/` - Release escrow funds

### Bounties
- `GET /api/bounties/` - List all bounties
- `POST /api/bounties/` - Create new bounty
- `POST /api/bounties/{id}/submit/` - Submit solution

### Chat (WebSocket)
- `ws://localhost:8000/ws/chat/{room_id}/` - Real-time messaging

## 🔑 Encryption Flow

1. **User Registration**: RSA keypair generated client-side
2. **Content Creation**: Content encrypted with AES
3. **Key Exchange**: AES key encrypted with recipient's RSA public key
4. **Storage**: Encrypted content stored in S3
5. **Purchase**: Buyer receives encrypted AES key
6. **Decryption**: Buyer decrypts content with private key

## 💰 Transaction Flow

1. **Listing**: Seller creates encrypted listing
2. **Purchase**: Buyer initiates payment via Paystack
3. **Escrow**: Funds held in escrow after payment confirmation
4. **Key Release**: Seller releases decryption key
5. **Completion**: Funds released to seller
6. **Review**: Both parties can leave reviews

## 🏆 Reputation System

- **Scoring**: Weighted based on transaction values
- **Badges**: Trust badges for high reputation users
- **Staking**: Sellers must stake tokens for higher-value listings
- **Disputes**: Resolution system for conflicts

## 🔧 Development

### Environment Variables

#### Backend (.env)
```
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=db.sqlite3
REDIS_URL=redis://localhost:6379/0
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
```

#### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

### Database Models

#### User System
- **User**: Anonymous user with RSA keys
- **UserWallet**: Wallet balance and transactions
- **UserSession**: Active sessions tracking

#### Marketplace
- **Listing**: Encrypted content listings
- **Transaction**: Escrow transactions
- **Review**: User reviews and ratings
- **Dispute**: Conflict resolution

#### Communication
- **ChatRoom**: Encrypted messaging rooms
- **Message**: E2EE messages
- **Bounty**: Problem-solving bounties

## 🚀 Deployment

### Docker (Production)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
1. Set up PostgreSQL and Redis
2. Configure AWS S3 credentials
3. Set up Paystack webhook
4. Deploy backend to production server
5. Deploy frontend to Vercel/Netlify

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Add tests if applicable
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Security Notice

This is a demonstration project. For production use:
- Use production-grade secrets management
- Implement rate limiting and DDoS protection
- Add comprehensive logging and monitoring
- Conduct security audits
- Use HTTPS everywhere
- Implement proper backup strategies

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

---

**Built with ❤️ for secure anonymous commerce**
=======
# freelancing_aim_app
Trust Information market App
>>>>>>> 37e5f84326251e09d76f8b2c0d62ea8b4c4ec87d
