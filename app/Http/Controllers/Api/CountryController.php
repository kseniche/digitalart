<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Country;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CountryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $limit = min(max((int) $request->query('limit', 20), 1), 50);

        $query = Country::query()->orderBy('name_ru');

        if ($q !== '') {
            $escaped = addcslashes(mb_strtolower($q), '%_\\');
            $like = '%'.$escaped.'%';
            $query->where(function ($outer) use ($like, $q) {
                $outer->whereRaw('LOWER(name_ru) LIKE ?', [$like])
                    ->orWhere('code', 'like', strtoupper(substr($q, 0, 2)).'%');
            });
        }

        $countries = $query->limit($limit)->get(['id', 'code', 'name_ru']);

        return response()->json($countries);
    }
}
