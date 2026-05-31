<?php

namespace Tests\Feature;

use App\Models\Country;
use App\Models\User;
use Database\Seeders\CountrySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CountriesApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CountrySeeder::class);
    }

    public function test_countries_search_returns_matches(): void
    {
        $response = $this->getJson('/api/countries?q=рос');

        $response->assertStatus(200);
        $names = collect($response->json())->pluck('name_ru')->all();
        $this->assertContains('Россия', $names);
    }

    public function test_profile_update_with_country_id_sets_country_name(): void
    {
        $user = User::factory()->create(['country' => null, 'country_id' => null]);
        $russia = Country::query()->where('code', 'RU')->firstOrFail();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/profile', [
                'country_id' => $russia->id,
            ]);

        $response->assertStatus(200);
        $user->refresh();
        $this->assertSame($russia->id, $user->country_id);
        $this->assertSame('Россия', $user->country);
    }
}
