<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * A domain-level failure that should reach the client as the project's
 * standard JSON error envelope (§22), rather than a generic 500.
 */
class ApiException extends Exception
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 422,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}
