<?php

namespace App\Application\Gate;

use App\Domain\Gate\Models\Base;
use App\Domain\Gate\Models\Gate;
use App\Domain\Gate\Models\Zone;
use App\Domain\Gate\ZoneStyleSupport;
use Illuminate\Support\Collection;

class BaseService
{
    /**
     * @return Collection<int, Base>
     */
    public function list(): Collection
    {
        return Base::with(['gates', 'zones'])->orderBy('name_ar')->get();
    }

    public function createBase(array $data): Base
    {
        return Base::create($this->withRequiredNameAr($data));
    }

    public function updateBase(Base $base, array $data): Base
    {
        $base->update($this->withRequiredNameAr($data));

        return $base;
    }

    public function deleteBase(Base $base): void
    {
        $base->delete();
    }

    public function createGate(Base $base, array $data): Gate
    {
        return Gate::create([...$this->withRequiredNameAr($data), 'base_id' => $base->id]);
    }

    public function updateGate(Gate $gate, array $data): Gate
    {
        $gate->update($this->withRequiredNameAr($data));

        return $gate;
    }

    public function deleteGate(Gate $gate): void
    {
        $gate->delete();
    }

    public function createZone(Base $base, array $data): Zone
    {
        $data = ZoneStyleSupport::normalizePayload($data);

        return Zone::create([...$data, 'base_id' => $base->id]);
    }

    public function updateZone(Zone $zone, array $data): Zone
    {
        $zone->update(ZoneStyleSupport::normalizePayload($data));

        return $zone;
    }

    public function deleteZone(Zone $zone): void
    {
        $zone->delete();
    }

    /**
     * bases.name_ar and gates.name_ar are NOT NULL with no default in the live schema
     * (unlike departments/zones, which allow null) — coerce a validated-nullable null
     * to an empty string so the insert/update doesn't violate that constraint.
     */
    private function withRequiredNameAr(array $data): array
    {
        $data['name_ar'] ??= '';

        return $data;
    }
}
