<x-mail::message>
# Reset Your Password

We received a request to reset the password for your account ({{ $user->email }}).

<x-mail::button :url="$resetUrl">
Reset Password
</x-mail::button>

This link expires in {{ config('authentication.password_reset.expire_minutes') }} minutes. If you did not request a password reset, no further action is required.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
