<x-mail::message>
# Welcome to {{ config('app.name') }}

An account has been created for you as the administrator of your organization.

<x-mail::button :url="$acceptUrl">
Accept Invitation & Set Password
</x-mail::button>

This link expires in {{ config('authentication.invitation.expire_days') }} days. If you weren't expecting this, no further action is required.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
