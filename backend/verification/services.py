import hashlib
import requests
import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from django.utils import timezone
from django.conf import settings
from .models import Proof, Verification, VerificationQueue
from listings.models import Listing


class ProofValidationService:
    """Service for validating proof files and detecting fraud"""
    
    def __init__(self):
        self.suspicious_patterns = [
            r'.*test.*',
            r'.*demo.*',
            r'.*sample.*',
            r'.*fake.*',
            r'.*mock.*',
        ]
        self.max_file_size = 100 * 1024 * 1024  # 100MB
        self.allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.avi', '.mov', '.pdf', '.txt', '.log']
    
    def validate_proof(self, proof: Proof) -> Tuple[bool, str, Dict]:
        """
        Validate a proof file and return validation result
        
        Returns:
            Tuple of (is_valid, message, validation_data)
        """
        validation_data = {
            'file_integrity': False,
            'duplicate_check': False,
            'metadata_validation': False,
            'content_analysis': False,
            'risk_score': 0,
            'warnings': [],
            'errors': []
        }
        
        try:
            # 1. File integrity check
            integrity_valid, integrity_msg = self._check_file_integrity(proof)
            validation_data['file_integrity'] = integrity_valid
            if not integrity_valid:
                validation_data['errors'].append(integrity_msg)
            
            # 2. Duplicate detection
            duplicate_valid, duplicate_msg = self._check_for_duplicates(proof)
            validation_data['duplicate_check'] = duplicate_valid
            if not duplicate_valid:
                validation_data['warnings'].append(duplicate_msg)
                validation_data['risk_score'] += 30
            
            # 3. Metadata validation
            metadata_valid, metadata_msg = self._validate_metadata(proof)
            validation_data['metadata_validation'] = metadata_valid
            if not metadata_valid:
                validation_data['warnings'].append(metadata_msg)
                validation_data['risk_score'] += 20
            
            # 4. Content analysis
            content_valid, content_msg = self._analyze_content(proof)
            validation_data['content_analysis'] = content_valid
            if not content_valid:
                validation_data['warnings'].append(content_msg)
                validation_data['risk_score'] += 25
            
            # 5. Calculate overall validity
            is_valid = (
                validation_data['file_integrity'] and
                validation_data['duplicate_check'] and
                validation_data['risk_score'] < 50
            )
            
            message = "Proof validated successfully" if is_valid else "Proof validation failed"
            if validation_data['warnings']:
                message += f" (Warnings: {len(validation_data['warnings'])})"
            
            return is_valid, message, validation_data
            
        except Exception as e:
            return False, f"Validation error: {str(e)}", validation_data
    
    def _check_file_integrity(self, proof: Proof) -> Tuple[bool, str]:
        """Check file integrity and accessibility"""
        try:
            # In production, this would download and verify the actual file
            # For now, we'll validate the URL and check file size
            
            if not proof.file_url:
                return False, "No file URL provided"
            
            # Check if URL is accessible (HEAD request)
            response = requests.head(proof.file_url, timeout=10, allow_redirects=True)
            if response.status_code != 200:
                return False, f"File not accessible (HTTP {response.status_code})"
            
            # Check content length if available
            content_length = response.headers.get('content-length')
            if content_length and int(content_length) > self.max_file_size:
                return False, f"File too large ({content_length} bytes)"
            
            # Verify file hash matches (if we can download)
            if proof.file_hash:
                # In production, download file and calculate hash
                # For now, trust the provided hash
                pass
            
            return True, "File integrity check passed"
            
        except requests.RequestException:
            return False, "Failed to access file"
    
    def _check_for_duplicates(self, proof: Proof) -> Tuple[bool, str]:
        """Check if proof file has been used before"""
        try:
            # Check for duplicate file hashes
            duplicate_proofs = Proof.objects.filter(
                file_hash=proof.file_hash
            ).exclude(id=proof.id)
            
            if duplicate_proofs.exists():
                duplicate_listings = [p.listing.title for p in duplicate_proofs]
                return False, f"File already used in: {', '.join(duplicate_listings)}"
            
            # Check for similar URLs (partial hashing)
            url_hash = hashlib.sha256(proof.file_url.encode()).hexdigest()
            similar_urls = Proof.objects.filter(
                file_hash__startswith=url_hash[:16]
            ).exclude(id=proof.id)
            
            if similar_urls.exists():
                return False, "Similar file detected"
            
            return True, "No duplicates found"
            
        except Exception as e:
            return False, f"Duplicate check failed: {str(e)}"
    
    def _validate_metadata(self, proof: Proof) -> Tuple[bool, str]:
        """Validate proof metadata"""
        try:
            metadata = proof.metadata or {}
            
            # Check required metadata fields
            required_fields = ['timestamp', 'file_type']
            missing_fields = [field for field in required_fields if field not in metadata]
            
            if missing_fields:
                return False, f"Missing metadata fields: {', '.join(missing_fields)}"
            
            # Validate timestamp
            timestamp_str = metadata.get('timestamp')
            try:
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                if timestamp > timezone.now():
                    return False, "Timestamp is in the future"
                
                # Check if timestamp is too old (more than 1 year)
                if timestamp < timezone.now() - timedelta(days=365):
                    return False, "Timestamp is too old"
                    
            except (ValueError, AttributeError):
                return False, "Invalid timestamp format"
            
            # Validate file type
            file_type = metadata.get('file_type')
            if file_type.lower() not in [ext.lower() for ext in self.allowed_extensions]:
                return False, f"Unsupported file type: {file_type}"
            
            return True, "Metadata validation passed"
            
        except Exception as e:
            return False, f"Metadata validation failed: {str(e)}"
    
    def _analyze_content(self, proof: Proof) -> Tuple[bool, str]:
        """Analyze proof content for suspicious patterns"""
        try:
            # In production, this would analyze actual file content
            # For now, we'll analyze URL and metadata for patterns
            
            url = proof.file_url.lower()
            metadata = proof.metadata or {}
            
            # Check filename for suspicious patterns
            filename = url.split('/')[-1]
            for pattern in self.suspicious_patterns:
                if re.match(pattern, filename, re.IGNORECASE):
                    return False, f"Suspicious filename pattern detected: {pattern}"
            
            # Check metadata notes for suspicious content
            notes = metadata.get('notes', '').lower()
            suspicious_keywords = ['test', 'demo', 'fake', 'mock', 'sample']
            found_keywords = [kw for kw in suspicious_keywords if kw in notes]
            
            if found_keywords:
                return False, f"Suspicious keywords found: {', '.join(found_keywords)}"
            
            return True, "Content analysis passed"
            
        except Exception as e:
            return False, f"Content analysis failed: {str(e)}"


class VerificationWorkflowService:
    """Service for managing verification workflow"""
    
    def __init__(self):
        self.proof_validator = ProofValidationService()
    
    def submit_for_verification(self, listing: Listing, proofs_data: List[Dict], 
                               priority: str = 'medium', special_instructions: str = '') -> VerificationQueue:
        """Submit a listing for verification"""
        try:
            # Create verification queue entry
            queue_item = VerificationQueue.objects.create(
                listing=listing,
                priority=priority,
                special_instructions=special_instructions,
                estimated_complexity=self._estimate_complexity(listing, proofs_data)
            )
            
            # Create and validate proofs
            created_proofs = []
            for proof_data in proofs_data:
                proof = Proof.objects.create(listing=listing, **proof_data)
                
                # Validate proof
                is_valid, message, validation_data = self.proof_validator.validate_proof(proof)
                
                # Update proof with validation results
                proof.is_validated = is_valid
                proof.validation_notes = message
                proof.save()
                
                created_proofs.append(proof)
            
            # Check if all proofs are valid
            all_valid = all(p.is_validated for p in created_proofs)
            
            if not all_valid:
                queue_item.status = 'rejected'
                queue_item.save()
                
                # Update listing status
                listing.status = 'rejected'
                listing.verification_status = 'rejected'
                listing.save()
            else:
                # Auto-assign verifier if enabled
                if self._should_auto_assign():
                    self._auto_assign_verifier(queue_item)
                else:
                    queue_item.status = 'pending'
                    queue_item.save()
            
            return queue_item
            
        except Exception as e:
            raise Exception(f"Failed to submit for verification: {str(e)}")
    
    def assign_verifier(self, queue_item: VerificationQueue, verifier) -> bool:
        """Assign a verifier to a queue item"""
        try:
            # Check if verifier is available
            active_assignments = VerificationQueue.objects.filter(
                assigned_verifier=verifier,
                status='in_progress'
            ).count()
            
            max_assignments = getattr(settings, 'MAX_VERIFIER_ASSIGNMENTS', 5)
            if active_assignments >= max_assignments:
                return False
            
            # Assign verifier
            queue_item.assigned_verifier = verifier
            queue_item.status = 'in_progress'
            queue_item.save()
            
            # Update listing status
            queue_item.listing.verification_status = 'in_review'
            queue_item.listing.save()
            
            return True
            
        except Exception:
            return False
    
    def complete_verification(self, queue_item: VerificationQueue, 
                            verification_data: Dict) -> Verification:
        """Complete verification and update consensus"""
        try:
            # Create verification entry
            verification = Verification.objects.create(
                listing=queue_item.listing,
                verifier=queue_item.assigned_verifier,
                **verification_data
            )
            
            # Update queue status
            queue_item.status = 'completed'
            queue_item.completed_at = timezone.now()
            queue_item.save()
            
            # Update consensus
            self._update_consensus(queue_item.listing)
            
            return verification
            
        except Exception as e:
            raise Exception(f"Failed to complete verification: {str(e)}")
    
    def _estimate_complexity(self, listing: Listing, proofs_data: List[Dict]) -> int:
        """Estimate verification complexity"""
        base_complexity = 3
        
        # Adjust based on price
        if listing.price > 10000:
            base_complexity += 2
        elif listing.price > 5000:
            base_complexity += 1
        
        # Adjust based on risk level
        risk_multipliers = {'low': -1, 'medium': 0, 'high': 2, 'extreme': 3}
        base_complexity += risk_multipliers.get(listing.risk_level, 0)
        
        # Adjust based on number of proofs
        base_complexity += min(len(proofs_data) - 1, 3)
        
        # Adjust based on estimated difficulty
        if listing.estimated_difficulty:
            base_complexity += listing.estimated_difficulty - 5
        
        return max(1, min(10, base_complexity))
    
    def _should_auto_assign(self) -> bool:
        """Determine if auto-assignment should be used"""
        return getattr(settings, 'AUTO_ASSIGN_VERIFIERS', True)
    
    def _auto_assign_verifier(self, queue_item: VerificationQueue) -> bool:
        """Auto-assign a verifier"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            # Find available verifiers (staff users with good reputation)
            available_verifiers = User.objects.filter(
                is_staff=True,
                reputation_score__gte=4.0
            ).exclude(
                id__in=VerificationQueue.objects.filter(
                    status='in_progress'
                ).values_list('assigned_verifier', flat=True)
            ).order_by('-reputation_score')
            
            if available_verifiers.exists():
                return self.assign_verifier(queue_item, available_verifiers.first())
            
            return False
            
        except Exception:
            return False
    
    def _update_consensus(self, listing: Listing) -> None:
        """Update verification consensus"""
        try:
            from .models import VerificationConsensus
            from django.db.models import Avg, Count
            
            verifications = Verification.objects.filter(listing=listing)
            
            if verifications.count() >= 3:  # Minimum for consensus
                # Count verdicts
                verdict_counts = verifications.values('verdict').annotate(count=Count('verdict'))
                verdict_map = {v['verdict']: v['count'] for v in verdict_counts}
                
                total = verifications.count()
                valid_count = verdict_map.get('valid', 0)
                invalid_count = verdict_map.get('invalid', 0)
                partial_count = verdict_map.get('partial', 0)
                needs_info_count = verdict_map.get('needs_info', 0)
                
                # Determine consensus
                if valid_count / total >= 0.6:
                    final_verdict = 'valid'
                elif invalid_count / total >= 0.6:
                    final_verdict = 'invalid'
                elif partial_count / total >= 0.5:
                    final_verdict = 'partial'
                else:
                    final_verdict = 'needs_info'
                
                # Calculate average confidence
                avg_confidence = verifications.aggregate(
                    avg_confidence=Avg('confidence_score')
                )['avg_confidence'] or 0
                
                # Create or update consensus
                VerificationConsensus.objects.update_or_create(
                    listing=listing,
                    defaults={
                        'final_verdict': final_verdict,
                        'confidence_score': avg_confidence,
                        'total_verifications': total,
                        'valid_votes': valid_count,
                        'invalid_votes': invalid_count,
                        'partial_votes': partial_count,
                        'needs_info_votes': needs_info_count,
                        'consensus_threshold_met': True
                    }
                )
                
                # Update listing status
                if final_verdict == 'valid':
                    listing.status = 'verified'
                    listing.verification_status = 'verified'
                    listing.last_verified_at = timezone.now()
                elif final_verdict == 'invalid':
                    listing.status = 'rejected'
                    listing.verification_status = 'rejected'
                elif final_verdict == 'partial':
                    listing.status = 'partial'
                    listing.verification_status = 'partial'
                
                listing.save()
            
        except Exception as e:
            # Log error but don't fail the verification
            print(f"Failed to update consensus: {str(e)}")


class VerificationScoringService:
    """Service for calculating and managing verification scores"""
    
    def calculate_listing_score(self, listing: Listing) -> Dict:
        """Calculate comprehensive verification score for a listing"""
        try:
            from .models import VerificationScore, Verification, ReproducibilityTest, PostSaleReport
            
            score_data = {
                'base_score': 0,
                'reproducibility_bonus': 0,
                'post_sale_bonus': 0,
                'seniority_bonus': 0,
                'penalty_factors': [],
                'final_score': 0,
                'success_rate': 0
            }
            
            # 1. Base score from verification consensus
            consensus = listing.verification_consensus
            if consensus:
                if consensus.final_verdict == 'valid':
                    score_data['base_score'] = min(consensus.confidence_score, 80)
                elif consensus.final_verdict == 'partial':
                    score_data['base_score'] = min(consensus.confidence_score * 0.6, 50)
                else:
                    score_data['base_score'] = 0
            
            # 2. Reproducibility bonus
            repro_tests = ReproducibilityTest.objects.filter(listing=listing)
            if repro_tests.exists():
                success_rate = repro_tests.filter(success=True).count() / repro_tests.count()
                score_data['reproducibility_bonus'] = success_rate * 20
            
            # 3. Post-sale bonus
            post_sale_reports = PostSaleReport.objects.filter(transaction__listing=listing)
            if post_sale_reports.exists():
                success_rate = post_sale_reports.filter(success=True).count() / post_sale_reports.count()
                avg_satisfaction = post_sale_reports.aggregate(
                    avg_sat=models.Avg('satisfaction_score')
                )['avg_sat'] or 5
                
                score_data['post_sale_bonus'] = (success_rate * 0.7 + avg_satisfaction / 10 * 0.3) * 20
                score_data['success_rate'] = success_rate * 100
            
            # 4. Seniority bonus (based on seller's reputation and listing age)
            days_since_creation = (timezone.now() - listing.created_at).days
            seller_rep = listing.seller.reputation_score
            
            seniority_score = 0
            if days_since_creation > 30:
                seniority_score += min(days_since_creation / 365 * 5, 10)
            if seller_rep > 4.5:
                seniority_score += 5
            elif seller_rep > 4.0:
                seniority_score += 3
            
            score_data['seniority_bonus'] = seniority_score
            
            # 5. Penalty factors
            if listing.requires_reverification:
                score_data['penalty_factors'].append({
                    'type': 'reverification_required',
                    'amount': 15,
                    'description': 'Listing requires re-verification'
                })
            
            if listing.risk_level == 'high':
                score_data['penalty_factors'].append({
                    'type': 'high_risk',
                    'amount': 10,
                    'description': 'High risk level'
                })
            elif listing.risk_level == 'extreme':
                score_data['penalty_factors'].append({
                    'type': 'extreme_risk',
                    'amount': 20,
                    'description': 'Extreme risk level'
                })
            
            # Calculate final score
            total_penalties = sum(p['amount'] for p in score_data['penalty_factors'])
            final_score = max(0, min(100, 
                score_data['base_score'] + 
                score_data['reproducibility_bonus'] + 
                score_data['post_sale_bonus'] + 
                score_data['seniority_bonus'] - 
                total_penalties
            ))
            
            score_data['final_score'] = final_score
            
            # Update or create score record
            verification_score, created = VerificationScore.objects.get_or_create(
                listing=listing,
                defaults=score_data
            )
            
            if not created:
                for key, value in score_data.items():
                    setattr(verification_score, key, value)
                verification_score.save()
            
            return score_data
            
        except Exception as e:
            raise Exception(f"Failed to calculate score: {str(e)}")
