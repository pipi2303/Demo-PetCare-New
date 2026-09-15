<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $resetUrl;

    public function __construct(
        public Authenticatable $user,
        public string $token,
        public string $guard,
    ) {
        $this->resetUrl = url('/reset-password').'?'.http_build_query([
            'token' => $token,
            'email' => $user->email,
        ]);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset Your Password',
        );
    }

    public function content(): Content
    {
        // markdown, not view: the template uses <x-mail::message> markdown
        // mail components, which only get their view namespace registered
        // via the Markdown renderer (view: renders it as a plain Blade
        // view instead, which fails with "No hint path defined for [mail]").
        return new Content(
            markdown: 'emails.password-reset',
        );
    }
}
