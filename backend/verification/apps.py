from django.apps import AppConfig


class VerificationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'verification'
    verbose_name = 'Verification System'
    
    def ready(self):
        # Import signals when the app is ready
        try:
            from . import signals
        except ImportError:
            pass
