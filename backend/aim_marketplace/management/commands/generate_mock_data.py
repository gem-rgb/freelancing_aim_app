import random
import secrets
import string
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.db.models.signals import post_save
from faker import Faker

from authentication.models import User, UserWallet, UserSession
from listings.models import Category, Listing, ListingImage, EncryptedContent, ListingView, SavedListing
from transactions.models import Transaction, Payment, Review, Stake, Dispute, EscrowRelease, TransactionLog
from chat.models import ChatRoom, Message, MessageRead, ChatKeyExchange
from bounties.models import Bounty, BountySubmission, BountyTransaction, BountyMessage, BountyView
from verification.models import Proof, Verification, ReproducibilityTest, PostSaleReport, VerificationQueue, VerificationConsensus, VerificationScore, ListingDemo


class Command(BaseCommand):
    help = 'Generate comprehensive mock data for the AIM marketplace system'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fake = Faker()
        self.users = []
        self.listings = []
        self.transactions = []
        self.bounties = []

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=50,
            help='Number of users to create'
        )
        parser.add_argument(
            '--listings',
            type=int,
            default=100,
            help='Number of listings to create'
        )
        parser.add_argument(
            '--bounties',
            type=int,
            default=30,
            help='Number of bounties to create'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before creating new data'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.clear_data()
        
        num_users = options['users']
        num_listings = options['listings']
        num_bounties = options['bounties']
        
        self.stdout.write('Starting mock data generation...')
        
        # Temporarily disable Celery-dependent signals
        from verification.signals import verification_created, post_sale_report_created, reproducibility_test_created, consensus_created
        
        # Disconnect signals that require Celery
        post_save.disconnect(verification_created, sender=Verification)
        post_save.disconnect(post_sale_report_created, sender=PostSaleReport)
        post_save.disconnect(reproducibility_test_created, sender=ReproducibilityTest)
        post_save.disconnect(consensus_created, sender=VerificationConsensus)
        
        try:
            with transaction.atomic():
                # Create base data
                self.create_categories()
                self.create_users(num_users)
                self.create_listings(num_listings)
                self.create_bounties(num_bounties)
                
                # Create related data
                self.create_transactions()
                self.create_reviews()
                self.create_chats()
                self.create_verifications()
                self.create_bounty_submissions()
                self.create_views_and_saves()
        finally:
            # Reconnect signals
            post_save.connect(verification_created, sender=Verification)
            post_save.connect(post_sale_report_created, sender=PostSaleReport)
            post_save.connect(reproducibility_test_created, sender=ReproducibilityTest)
            post_save.connect(consensus_created, sender=VerificationConsensus)
        
        self.stdout.write(self.style.SUCCESS(
            f'Successfully created mock data:\n'
            f'- {len(self.users)} users\n'
            f'- {len(self.listings)} listings\n'
            f'- {len(self.bounties)} bounties\n'
            f'- Related transactions, reviews, chats, and verifications'
        ))

    def clear_data(self):
        self.stdout.write('Clearing existing data...')
        models_to_clear = [
            PostSaleReport, ReproducibilityTest, Verification, Proof, ListingDemo,
            BountySubmission, BountyTransaction, BountyMessage, BountyView, Bounty,
            Message, ChatRoom, Review, Dispute, EscrowRelease, TransactionLog, Payment, Transaction,
            SavedListing, ListingView, EncryptedContent, ListingImage, Listing,
            UserSession, UserWallet, User, Category
        ]
        
        for model in reversed(models_to_clear):
            model.objects.all().delete()
        
        self.stdout.write('Data cleared.')

    def create_categories(self):
        categories = [
            ('Freelancing', 'Methods for earning on freelance platforms'),
            ('Trading', 'Trading and investment strategies'),
            ('Marketing', 'Digital marketing and advertising methods'),
            ('Development', 'Software development and coding'),
            ('Design', 'Graphic design and creative services'),
            ('Writing', 'Content creation and copywriting'),
            ('Data Entry', 'Data processing and entry tasks'),
            ('Social Media', 'Social media management and growth'),
            ('E-commerce', 'Online selling and dropshipping'),
            ('Other', 'Miscellaneous earning methods')
        ]
        
        for name, description in categories:
            Category.objects.get_or_create(name=name, defaults={'description': description})
        
        self.stdout.write(f'Created {len(categories)} categories')

    def create_users(self, num_users):
        self.stdout.write(f'Creating {num_users} users...')
        
        for i in range(num_users):
            # Generate anonymous username
            adjectives = ['silent', 'shadow', 'phantom', 'ghost', 'mystic', 'hidden', 'secret', 'covert', 'stealth', 'invisible']
            nouns = ['trader', 'seller', 'buyer', 'dealer', 'merchant', 'vendor', 'broker', 'agent', 'expert', 'guru']
            number = ''.join(secrets.choice(string.digits) for _ in range(3))
            username = f"{secrets.choice(adjectives)}_{secrets.choice(nouns)}_{number}"
            
            # Create user
            user = User.objects.create_user(
                username=username,
                email=self.fake.email() if random.random() < 0.3 else '',
                user_type=random.choice(['buyer', 'seller']),
                reputation_score=Decimal(random.uniform(0, 100)),
                stake_balance=Decimal(random.uniform(0, 5000)),
                is_verified=random.random() < 0.2,
                is_suspended=random.random() < 0.05,
                bio=self.fake.text(max_nb_chars=200) if random.random() < 0.7 else '',
                avatar_url=f'https://api.dicebear.com/7.x/avataaars/svg?seed={username}'
            )
            
            # Generate RSA keys
            public_key, private_key = User.generate_keypair()
            user.public_key = public_key
            user.encrypted_private_key = private_key  # In production, this would be encrypted
            user.save()
            
            # Create wallet
            UserWallet.objects.create(
                user=user,
                wallet_address=f'0x{secrets.token_hex(20)}',
                balance=Decimal(random.uniform(0, 10000)),
                frozen_balance=Decimal(random.uniform(0, 1000))
            )
            
            # Create sessions
            if random.random() < 0.8:
                UserSession.objects.create(
                    user=user,
                    session_key=secrets.token_urlsafe(32),
                    ip_address=self.fake.ipv4(),
                    user_agent=self.fake.user_agent(),
                    is_active=random.random() < 0.7,
                    last_activity=timezone.now() - timedelta(hours=random.randint(0, 72))
                )
            
            self.users.append(user)
        
        self.stdout.write(f'Created {len(self.users)} users')

    def create_listings(self, num_listings):
        self.stdout.write(f'Creating {num_listings} listings...')
        categories = list(Category.objects.all())
        
        listing_templates = {
            'Freelancing': [
                'Upwork Automation Bot - Earn $500/day',
                'Fiverr Gig Optimization Secrets',
                'Freelancer.com Bid Winning Strategy',
                'PeoplePerHour High-Paying Gigs Method',
                '99Designs Contest Winning Templates'
            ],
            'Trading': [
                'Crypto Arbitrage Bot - 15% Daily Returns',
                'Forex Scalping Strategy 80% Win Rate',
                'Options Trading Algorithm - Consistent Profits',
                'Stock Market Pattern Recognition System',
                'NFT Flipping Automation Tool'
            ],
            'Marketing': [
                'Facebook Ads Campaign Optimizer',
                'Google Ads CPC Reduction Method',
                'Instagram Growth Automation Bot',
                'YouTube Algorithm Exploit - Viral Videos',
                'TikTok Trend Prediction System'
            ],
            'Development': [
                'SaaS Boilerplate - Launch in 24 Hours',
                'Mobile App Development Templates',
                'Web Scraping Automation Framework',
                'API Integration Scripts Collection',
                'Database Optimization Techniques'
            ],
            'Design': [
                'Canva Pro Templates Bundle',
                'Adobe Photoshop Automation Scripts',
                'Logo Design Generator Tool',
                'Social Media Template Library',
                '3D Modeling Quick Start Guide'
            ]
        }
        
        for i in range(num_listings):
            category = random.choice(categories)
            templates = listing_templates.get(category.name, ['Generic Earning Method'])
            title = random.choice(templates) if templates else f'Earning Method #{i+1}'
            
            listing = Listing.objects.create(
                title=title,
                description=self.fake.text(max_nb_chars=1000),
                preview_content=self.fake.text(max_nb_chars=300),
                encrypted_content_url=f'https://s3.aim.market/content/{secrets.token_hex(16)}.enc',
                price=Decimal(random.uniform(10, 500)),
                seller=random.choice([u for u in self.users if u.user_type == 'seller']),
                category=category,
                status=random.choice(['draft', 'pending_verification', 'verified', 'active', 'sold']),
                verification_status=random.choice(['not_submitted', 'pending', 'verified', 'rejected']),
                verification_score=Decimal(random.uniform(0, 100)),
                success_rate=Decimal(random.uniform(0, 100)),
                view_count=random.randint(0, 10000),
                purchase_count=random.randint(0, 100),
                is_featured=random.random() < 0.1,
                tags=', '.join(random.sample(['automation', 'bot', 'passive', 'income', 'method', 'guide', 'tool'], k=random.randint(2, 4))),
                estimated_difficulty=random.randint(1, 10),
                time_investment=timedelta(hours=random.randint(1, 100)),
                required_skills=self.fake.text(max_nb_chars=200),
                risk_level=random.choice(['low', 'medium', 'high', 'extreme']),
                potential_earnings=Decimal(random.uniform(100, 10000)),
                last_verified_at=timezone.now() - timedelta(days=random.randint(1, 30)) if random.random() < 0.5 else None,
                verification_expires_at=timezone.now() + timedelta(days=random.randint(1, 90)) if random.random() < 0.5 else None,
                requires_reverification=random.random() < 0.2
            )
            
            # Create encrypted content
            EncryptedContent.objects.create(
                listing=listing,
                content_hash=secrets.token_hex(32),
                file_size=random.randint(1000, 10000000),
                encryption_algorithm='AES-256-GCM'
            )
            
            # Create demo
            if random.random() < 0.6:
                demo_files = []
                for _ in range(random.randint(1, 3)):
                    demo_files.append({
                        'url': f'https://s3.aim.market/demo/{secrets.token_hex(16)}.jpg',
                        'type': 'image',
                        'caption': self.fake.sentence(),
                        'file_hash': secrets.token_hex(32)
                    })
                
                ListingDemo.objects.create(
                    listing=listing,
                    demo_category=random.choice(['general', 'freelancing', 'bank', 'proxies']),
                    demo_text=self.fake.text(max_nb_chars=400),
                    demo_files=demo_files,
                    guidance_acknowledged=True,
                    is_approved=random.random() < 0.7,
                    approved_by=random.choice(self.users) if random.random() < 0.7 else None,
                    approved_at=timezone.now() - timedelta(days=random.randint(1, 10)) if random.random() < 0.7 else None
                )
            
            self.listings.append(listing)
        
        self.stdout.write(f'Created {len(self.listings)} listings')

    def create_bounties(self, num_bounties):
        self.stdout.write(f'Creating {num_bounties} bounties...')
        
        bounty_templates = [
            'Need custom trading bot development',
            'Looking for social media growth expert',
            'Require e-commerce automation setup',
            'Seeking mobile app development',
            'Need content creation system',
            'Looking for data scraping solution',
            'Require website optimization',
            'Need API integration specialist',
            'Looking for UI/UX designer',
            'Require database optimization expert'
        ]
        
        for i in range(num_bounties):
            bounty = Bounty.objects.create(
                title=random.choice(bounty_templates) + f' #{i+1}',
                description=self.fake.text(max_nb_chars=800),
                requirements=self.fake.text(max_nb_chars=600),
                reward=Decimal(random.uniform(100, 2000)),
                buyer=random.choice([u for u in self.users if u.user_type == 'buyer']),
                status=random.choice(['open', 'in_progress', 'reviewing', 'completed']),
                priority=random.choice(['low', 'medium', 'high', 'urgent']),
                category=random.choice(['development', 'marketing', 'design', 'data', 'other']),
                tags=', '.join(random.sample(['urgent', 'expert', 'senior', 'quick', 'complex'], k=random.randint(1, 3))),
                deadline=timezone.now() + timedelta(days=random.randint(7, 30)) if random.random() < 0.7 else None,
                max_submissions=random.randint(1, 10) if random.random() < 0.5 else None,
                view_count=random.randint(0, 500),
                submission_count=random.randint(0, 5),
                expires_at=timezone.now() + timedelta(days=random.randint(1, 60)) if random.random() < 0.8 else None
            )
            
            self.bounties.append(bounty)
        
        self.stdout.write(f'Created {len(self.bounties)} bounties')

    def create_transactions(self):
        self.stdout.write('Creating transactions...')
        
        for listing in random.sample(self.listings, min(50, len(self.listings))):
            if listing.status == 'sold':
                continue
                
            buyers = [u for u in self.users if u.user_type == 'buyer' and u != listing.seller]
            if not buyers:
                continue
                
            buyer = random.choice(buyers)
            
            transaction = Transaction.objects.create(
                buyer=buyer,
                seller=listing.seller,
                listing=listing,
                amount=listing.price,
                platform_fee=listing.price * Decimal('0.15'),
                status=random.choice(['pending', 'escrow', 'released', 'disputed']),
                encrypted_key=secrets.token_hex(32),
                paystack_reference=f'PAY_{secrets.token_hex(16).upper()}',
                paystack_transaction_id=secrets.token_hex(16).upper(),
                expires_at=timezone.now() + timedelta(hours=24),
                released_at=timezone.now() - timedelta(hours=random.randint(1, 12)) if random.random() < 0.3 else None
            )
            
            # Create payment
            Payment.objects.create(
                transaction=transaction,
                gateway='paystack',
                gateway_reference=transaction.paystack_reference,
                gateway_transaction_id=transaction.paystack_transaction_id,
                amount=transaction.amount,
                status=random.choice(['completed', 'processing', 'failed']),
                gateway_response={'status': 'success', 'message': 'Payment processed'},
                processed_at=timezone.now() - timedelta(minutes=random.randint(5, 60))
            )
            
            # Create stake
            Stake.objects.create(
                user=listing.seller,
                amount=listing.price * Decimal('0.1'),
                is_locked=True,
                lock_reason='seller_stake',
                transaction=transaction,
                released_at=timezone.now() - timedelta(hours=random.randint(1, 6)) if transaction.status == 'released' else None
            )
            
            # Create transaction logs
            actions = ['created', 'payment_initiated', 'payment_confirmed', 'escrow_entered']
            if transaction.status == 'released':
                actions.extend(['key_released'])
            elif transaction.status == 'disputed':
                actions.append('dispute_opened')
            
            for i, action in enumerate(actions):
                TransactionLog.objects.create(
                    transaction=transaction,
                    action=action,
                    description=f'Transaction {action.replace("_", " ").title()}',
                    user=buyer if i < 2 else listing.seller,
                    ip_address=self.fake.ipv4(),
                    metadata={'timestamp': timezone.now().isoformat()}
                )
            
            # Update listing status
            if transaction.status == 'released':
                listing.status = 'sold'
                listing.purchase_count += 1
                listing.save()
            
            self.transactions.append(transaction)
        
        self.stdout.write(f'Created {len(self.transactions)} transactions')

    def create_reviews(self):
        self.stdout.write('Creating reviews...')
        
        released_transactions = [t for t in self.transactions if t.status == 'released']
        reviewed_transactions = set()
        
        for transaction in random.sample(released_transactions, min(30, len(released_transactions))):
            if transaction.id in reviewed_transactions:
                continue
                
            # Create buyer review for seller
            Review.objects.create(
                transaction=transaction,
                reviewer=transaction.buyer,
                reviewed_user=transaction.seller,
                rating=random.randint(1, 5),
                comment=self.fake.text(max_nb_chars=300),
                is_public=random.random() < 0.8
            )
            reviewed_transactions.add(transaction.id)
            
            # Create seller review for buyer (less common) - only if transaction doesn't already have a review
            if random.random() < 0.3 and not Review.objects.filter(transaction=transaction).exists():
                Review.objects.create(
                    transaction=transaction,
                    reviewer=transaction.seller,
                    reviewed_user=transaction.buyer,
                    rating=random.randint(3, 5),
                    comment=self.fake.text(max_nb_chars=200),
                    is_public=True
                )
                reviewed_transactions.add(transaction.id)
        
        self.stdout.write('Created reviews')

    def create_chats(self):
        self.stdout.write('Creating chat rooms and messages...')
        
        # Create chat rooms for transactions
        for transaction in random.sample(self.transactions, min(40, len(self.transactions))):
            room = ChatRoom.objects.create(
                type='transaction',
                transaction=transaction,
                is_active=True
            )
            room.participants.add(transaction.buyer, transaction.seller)
            
            # Create messages
            num_messages = random.randint(3, 15)
            for i in range(num_messages):
                sender = transaction.buyer if i % 2 == 0 else transaction.seller
                Message.objects.create(
                    room=room,
                    sender=sender,
                    encrypted_message=secrets.token_hex(64),
                    message_type='text',
                    is_deleted=False,
                    is_edited=random.random() < 0.1
                )
            
            # Create key exchanges
            ChatKeyExchange.objects.create(
                room=room,
                from_user=transaction.seller,
                to_user=transaction.buyer,
                encrypted_key=secrets.token_hex(32),
                key_version=1
            )
        
        # Create some direct message rooms
        for i in range(min(20, len(self.users))):
            user1, user2 = random.sample(self.users, 2)
            if not ChatRoom.objects.filter(
                participants__in=[user1, user2], 
                type='direct'
            ).exists():
                room = ChatRoom.objects.create(
                    type='direct',
                    is_active=True
                )
                room.participants.add(user1, user2)
                
                # Add a few messages
                for _ in range(random.randint(1, 5)):
                    Message.objects.create(
                        room=room,
                        sender=random.choice([user1, user2]),
                        encrypted_message=secrets.token_hex(64),
                        message_type='text'
                    )
        
        self.stdout.write('Created chat rooms and messages')

    def create_verifications(self):
        self.stdout.write('Creating verification data...')
        
        verified_listings = [l for l in self.listings if l.verification_status == 'verified']
        used_verifier_listings = set()
        
        for listing in random.sample(verified_listings, min(20, len(verified_listings))):
            # Create verification queue entry
            VerificationQueue.objects.create(
                listing=listing,
                priority=random.choice(['low', 'medium', 'high']),
                status='completed',
                assigned_verifier=random.choice(self.users),
                auto_assigned=random.random() < 0.5,
                estimated_complexity=random.randint(1, 10),
                completed_at=timezone.now() - timedelta(days=random.randint(1, 7))
            )
            
            # Create verifications
            num_verifications = random.randint(1, 3)
            for i in range(num_verifications):
                # Find a verifier that hasn't verified this listing yet
                available_verifiers = [u for u in self.users if (listing.id, u.id) not in used_verifier_listings]
                if not available_verifiers:
                    break
                    
                verifier = random.choice(available_verifiers)
                used_verifier_listings.add((listing.id, verifier.id))
                
                Verification.objects.create(
                    listing=listing,
                    verifier=verifier,
                    verdict=random.choice(['valid', 'invalid', 'partial', 'needs_info']),
                    confidence_score=Decimal(random.uniform(60, 100)),
                    notes=self.fake.text(max_nb_chars=500),
                    evidence_reviewed=self.fake.text(max_nb_chars=300),
                    testing_methodology=self.fake.text(max_nb_chars=200),
                    identified_risks=[self.fake.word() for _ in range(random.randint(0, 3))],
                    recommendations=[self.fake.sentence() for _ in range(random.randint(0, 2))],
                    time_spent_minutes=random.randint(15, 120)
                )
            
            # Create reproducibility tests
            for _ in range(random.randint(0, 2)):
                potential_earnings = float(listing.potential_earnings or 1000)
                ReproducibilityTest.objects.create(
                    listing=listing,
                    tester=random.choice(self.users),
                    success=random.random() < 0.7,
                    earnings_reported=Decimal(str(random.uniform(50, potential_earnings))),
                    roi_percentage=Decimal(str(random.uniform(10, 200))),
                    time_to_results=timedelta(days=random.randint(1, 30)),
                    notes=self.fake.text(max_nb_chars=400),
                    challenges_faced=self.fake.text(max_nb_chars=200),
                    environment_details={'os': 'Windows 10', 'browser': 'Chrome'},
                    supporting_evidence=[f'screenshot_{i}.jpg' for i in range(random.randint(1, 3))],
                    would_recommend=random.random() < 0.8
                )
            
            # Create verification score
            score = VerificationScore.objects.create(
                listing=listing,
                base_score=Decimal(random.uniform(60, 90)),
                reproducibility_bonus=Decimal(random.uniform(0, 10)),
                post_sale_bonus=Decimal(random.uniform(0, 5)),
                seniority_bonus=Decimal(random.uniform(0, 3)),
                penalty_factors=[{'type': 'age', 'amount': random.uniform(0, 5)}],
                success_rate=Decimal(random.uniform(70, 95))
            )
            score.calculate_final_score()
            
            # Create verification consensus
            VerificationConsensus.objects.create(
                listing=listing,
                final_verdict=random.choice(['valid', 'invalid', 'partial']),
                confidence_score=Decimal(random.uniform(70, 95)),
                total_verifications=num_verifications,
                valid_votes=random.randint(num_verifications // 2, num_verifications),
                invalid_votes=random.randint(0, num_verifications // 2),
                partial_votes=random.randint(0, num_verifications // 3),
                needs_info_votes=random.randint(0, 1),
                consensus_threshold_met=True,
                final_notes=self.fake.text(max_nb_chars=400),
                risk_assessment={'overall': 'medium', 'factors': ['complexity', 'investment']},
                recommendations=[self.fake.sentence() for _ in range(2)],
                determined_by=random.choice(self.users)
            )
        
        self.stdout.write('Created verification data')

    def create_bounty_submissions(self):
        self.stdout.write('Creating bounty submissions...')
        
        open_bounties = [b for b in self.bounties if b.status == 'open']
        
        for bounty in random.sample(open_bounties, min(15, len(open_bounties))):
            sellers = [u for u in self.users if u.user_type == 'seller' and u != bounty.buyer]
            if not sellers:
                continue
            
            # Create submissions
            num_submissions = random.randint(1, min(3, len(sellers)))
            for i in range(num_submissions):
                seller = random.choice(sellers)
                sellers.remove(seller)  # Avoid duplicate submissions
                
                submission = BountySubmission.objects.create(
                    bounty=bounty,
                    seller=seller,
                    encrypted_solution=secrets.token_hex(128),
                    solution_hash=secrets.token_hex(32),
                    file_url=f'https://s3.aim.market/solutions/{secrets.token_hex(16)}.zip',
                    file_name=f'solution_{secrets.token_hex(8)}.zip',
                    file_size=random.randint(1000, 50000),
                    status=random.choice(['pending', 'accepted', 'rejected']),
                    submission_notes=self.fake.text(max_nb_chars=200),
                    rejection_reason=self.fake.text(max_nb_chars=100) if random.random() < 0.3 else '',
                    reviewed_at=timezone.now() - timedelta(hours=random.randint(1, 48)) if random.random() < 0.7 else None
                )
                
                # Create transaction if accepted
                if submission.status == 'accepted':
                    BountyTransaction.objects.create(
                        bounty=bounty,
                        submission=submission,
                        buyer=bounty.buyer,
                        seller=seller,
                        amount=bounty.reward,
                        platform_fee=bounty.reward * Decimal('0.15'),
                        status='paid',
                        paystack_reference=f'BOUNTY_{secrets.token_hex(16).upper()}',
                        paid_at=timezone.now() - timedelta(hours=random.randint(1, 24))
                    )
                    
                    # Update bounty status
                    bounty.status = 'completed'
                    bounty.save()
                
                # Create messages
                BountyMessage.objects.create(
                    bounty=bounty,
                    sender=bounty.buyer,
                    recipient=seller,
                    message=self.fake.text(max_nb_chars=200),
                    is_public=random.random() < 0.3
                )
        
        self.stdout.write('Created bounty submissions')

    def create_views_and_saves(self):
        self.stdout.write('Creating views and saved listings...')
        
        # Create listing views
        for listing in random.sample(self.listings, min(80, len(self.listings))):
            num_views = random.randint(1, 50)
            for _ in range(num_views):
                viewer = random.choice(self.users) if random.random() < 0.8 else None
                ListingView.objects.create(
                    listing=listing,
                    viewer=viewer,
                    ip_address=self.fake.ipv4(),
                    user_agent=self.fake.user_agent(),
                    viewed_at=timezone.now() - timedelta(
                        days=random.randint(0, 30),
                        hours=random.randint(0, 23)
                    )
                )
        
        # Create saved listings
        for user in random.sample(self.users, min(30, len(self.users))):
            num_saves = random.randint(1, 10)
            user_listings = random.sample(self.listings, min(num_saves, len(self.listings)))
            for listing in user_listings:
                if listing.seller != user:  # Don't save own listings
                    SavedListing.objects.get_or_create(
                        user=user,
                        listing=listing,
                        defaults={'created_at': timezone.now() - timedelta(days=random.randint(1, 30))}
                    )
        
        # Create bounty views
        for bounty in random.sample(self.bounties, min(20, len(self.bounties))):
            num_views = random.randint(1, 20)
            for _ in range(num_views):
                viewer = random.choice(self.users) if random.random() < 0.7 else None
                BountyView.objects.create(
                    bounty=bounty,
                    viewer=viewer,
                    ip_address=self.fake.ipv4(),
                    user_agent=self.fake.user_agent(),
                    viewed_at=timezone.now() - timedelta(
                        days=random.randint(0, 15),
                        hours=random.randint(0, 23)
                    )
                )
        
        self.stdout.write('Created views and saved listings')
