from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserWallet, UserSession


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'reputation_score', 'stake_balance', 'is_verified', 'created_at')
    list_filter = ('is_verified', 'is_staff', 'is_superuser', 'created_at')
    search_fields = ('username',)
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('email',)}),
        ('Keys', {'fields': ('public_key', 'encrypted_private_key')}),
        ('Reputation', {'fields': ('reputation_score', 'stake_balance', 'is_verified')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined', 'created_at', 'updated_at')}),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'public_key'),
        }),
    )


@admin.register(UserWallet)
class UserWalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'wallet_address', 'balance', 'frozen_balance', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'wallet_address')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'session_key', 'ip_address', 'is_active', 'last_activity')
    list_filter = ('is_active', 'created_at')
    search_fields = ('user__username', 'ip_address')
    readonly_fields = ('created_at', 'last_activity')
    
    def has_add_permission(self, request):
        return False
