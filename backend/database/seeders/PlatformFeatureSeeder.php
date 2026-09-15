<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Feature;
use Illuminate\Database\Seeder;

/**
 * Default feature catalog (Master Prompt §8.1). Idempotent (updateOrCreate),
 * same convention as Phase 4's TenantRolesAndPermissionsSeeder.
 */
class PlatformFeatureSeeder extends Seeder
{
    private const FEATURES = [
        'PATIENT_MANAGEMENT' => 'Patient Management',
        'APPOINTMENT' => 'Appointment',
        'PHARMACY' => 'Pharmacy',
        'LABORATORY' => 'Laboratory',
        'BILLING' => 'Billing',
        'REPORTING' => 'Reporting',
        'AI' => 'AI',
    ];

    public function run(): void
    {
        foreach (self::FEATURES as $code => $name) {
            Feature::updateOrCreate(['code' => $code], ['name' => $name]);
        }
    }
}
