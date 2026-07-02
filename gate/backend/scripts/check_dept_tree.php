<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$service = $app->make(App\Support\Tree\DepartmentTreeService::class);
$tree = $service->getNestedTree();

$countNodes = function (array $nodes) use (&$countNodes): int {
    $count = 0;
    foreach ($nodes as $node) {
        $count++;
        if (! empty($node['children'])) {
            $count += $countNodes($node['children']);
        }
    }

    return $count;
};

echo 'roots=' . count($tree) . PHP_EOL;
echo 'total=' . $countNodes($tree) . PHP_EOL;

if ($tree !== []) {
    echo 'first root: ' . ($tree[0]['label'] ?? '') . ' children=' . count($tree[0]['children'] ?? []) . PHP_EOL;
}
