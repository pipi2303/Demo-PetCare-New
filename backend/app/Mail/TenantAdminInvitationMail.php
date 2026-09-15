<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TenantAdminInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $acceptUrl;

    public function __construct(
        public Authenticatable $user,
        public string $token,
    ) {
        $this->acceptUrl = url('/accept-invitation').'?'.http_build_query([
            'token' => $token,
            'email' => $user->email,
        ]);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You're invited to ".config('app.name'),
        );
    }

    public function content(): Content
    {
        // markdown, not view — see PasswordResetMail for why.
        return new Content(
            markdown: 'emails.tenant-admin-invitation',
        );
    }
}
