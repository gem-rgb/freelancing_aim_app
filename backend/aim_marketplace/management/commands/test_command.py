from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Test command to verify management commands are working'

    def handle(self, *args, **options):
        self.stdout.write('Test command is working!')
