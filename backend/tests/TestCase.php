<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Artisan;

abstract class TestCase extends BaseTestCase
{
    private static bool $centralDatabaseMigrated = false;

    /**
     * Tests that create a real tenant (and so can't use RefreshDatabase —
     * see TenantIsolationTest) rely on the central "testing" database
     * already being migrated. That used to happen only as a side effect of
     * some *other*, RefreshDatabase-backed test class running first in the
     * same process — correct only by accident of alphabetical test order.
     * Migrate explicitly, once per process, instead.
     */
    protected function setUp(): void
    {
        parent::setUp();

        if (! self::$centralDatabaseMigrated) {
            Artisan::call('migrate', ['--force' => true]);
            self::$centralDatabaseMigrated = true;
        }
    }
}
