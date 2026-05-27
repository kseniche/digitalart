<?php

$path = 'C:/Users/kseni/Desktop/pz30.04 .docx';
$zip = new ZipArchive();
if ($zip->open($path) !== true) {
    fwrite(STDERR, "open failed: $path\n");
    exit(1);
}

$xml = $zip->getFromName('word/document.xml');
$zip->close();

if ($xml === false) {
    fwrite(STDERR, "document.xml not found in docx\n");
    exit(1);
}

$doc = new DOMDocument();
$doc->loadXML($xml);
$xpath = new DOMXPath($doc);
$xpath->registerNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');

$paras = $xpath->query('//w:p');
$page = 1;
$out = ["=== PAGE $page ==="];

foreach ($paras as $p) {
    $texts = [];
    $hasBreak = false;

    foreach ($xpath->query('.//w:r', $p) as $r) {
        foreach ($xpath->query('w:br', $r) as $br) {
            if ($br->getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'type') === 'page') {
                $hasBreak = true;
            }
        }

        foreach ($xpath->query('w:t', $r) as $t) {
            $texts[] = $t->textContent;
        }
    }

    $line = trim(implode('', $texts));
    if ($line !== '') {
        $out[] = $line;
    }

    if ($hasBreak) {
        $page++;
        $out[] = "=== PAGE $page ===";
    }
}

$target = 'C:/Users/kseni/Desktop/diplom2goygoyДоведениедоИдеала/docs/_pz30_04_extracted.txt';
file_put_contents($target, implode(PHP_EOL, $out));
echo "written $target pages~$page\n";
