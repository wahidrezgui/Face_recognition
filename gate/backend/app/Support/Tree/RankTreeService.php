<?php

namespace App\Support\Tree;

use App\Models\RanksTrees;

class RankTreeService
{
    public function getRankAndAllChildrenRankIds(int $rankId): array
    {
        $rankIds = [$rankId];

        $ranks = RanksTrees::where('parent_id', $rankId)->get();

        foreach ($ranks as $rank) {
            $rankIds[] = $rank->id;
            $rankIds = array_merge($rankIds, $this->getAllChildrenRankIds($rank->id));
        }

        return $rankIds;
    }

    public function getAllChildrenRankIds(int $rankId): array
    {
        $rankIds = [];

        $ranks = RanksTrees::where('parent_id', $rankId)->get();

        foreach ($ranks as $rank) {
            $rankIds[] = $rank->id;
            $rankIds = array_merge($rankIds, $this->getAllChildrenRankIds($rank->id));
        }

        return $rankIds;
    }

    public function getAllRanksTree(): array
    {
        $topRanks = RanksTrees::where('parent_id', 0)->get()->map(function ($item) {
            $item->key = $item->id;
            $item->label = $item->name_ar;

            return $item;
        });

        foreach ($topRanks as $rank) {
            $rank->children = $this->getNestedRanks($rank->id);
        }

        return $topRanks->all();
    }

    public function getNestedRanks(int $parentId): array
    {
        $ranks = RanksTrees::where('parent_id', $parentId)->get()->map(function ($item) {
            $item->key = $item->id;
            $item->label = $item->name_ar;

            return $item;
        });

        foreach ($ranks as $rank) {
            $rank->children = $this->getNestedRanks($rank->id);
        }

        return $ranks->all();
    }
}
