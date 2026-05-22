from django.apps import AppConfig


class EscrowConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'escrow'
    verbose_name = 'Escrow & Staking'

    def ready(self):
        import escrow.signals  # noqa: F401
