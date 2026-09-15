<?php

declare(strict_types=1);

namespace App\Services\Navigation;

use App\Models\TenantFeature;
use App\Models\User;

/**
 * Turns the static config/navigation.php tree into the per-request menu
 * §8.4 describes: an item shows only if the current tenant has its
 * `feature` enabled (when it declares one) and the current user holds its
 * `permission` (when it declares one). An item with `children` that all
 * get filtered out is dropped too, rather than left as an empty group.
 */
class NavigationService
{
    public function forUser(User $user): array
    {
        $enabledFeatureCodes = $this->enabledFeatureCodesForCurrentTenant();

        return $this->filterItems(config('navigation.items'), $user, $enabledFeatureCodes);
    }

    /**
     * @return list<string>
     */
    private function enabledFeatureCodesForCurrentTenant(): array
    {
        $central = config('tenancy.database.central_connection');

        return TenantFeature::on($central)
            ->where('tenant_id', tenant('id'))
            ->where('enabled', true)
            ->join('features', 'features.id', '=', 'tenant_features.feature_id')
            ->pluck('features.code')
            ->all();
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @param  list<string>  $enabledFeatureCodes
     * @return list<array<string, mixed>>
     */
    private function filterItems(array $items, User $user, array $enabledFeatureCodes): array
    {
        $result = [];

        foreach ($items as $item) {
            if (isset($item['feature']) && ! in_array($item['feature'], $enabledFeatureCodes, true)) {
                continue;
            }

            if (isset($item['permission']) && ! $user->hasPermission($item['permission'])) {
                continue;
            }

            if (isset($item['children'])) {
                $item['children'] = $this->filterItems($item['children'], $user, $enabledFeatureCodes);

                if (empty($item['children'])) {
                    continue;
                }
            }

            $result[] = $item;
        }

        return $result;
    }
}
