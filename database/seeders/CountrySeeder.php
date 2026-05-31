<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\User;
use Illuminate\Database\Seeder;

class CountrySeeder extends Seeder
{
    /**
     * ISO 3166-1 alpha-2 + русское название (основной справочник).
     *
     * @return list<array{code: string, name_ru: string}>
     */
    public static function countriesData(): array
    {
        return [
            ['code' => 'RU', 'name_ru' => 'Россия'],
            ['code' => 'BY', 'name_ru' => 'Беларусь'],
            ['code' => 'KZ', 'name_ru' => 'Казахстан'],
            ['code' => 'UA', 'name_ru' => 'Украина'],
            ['code' => 'UZ', 'name_ru' => 'Узбекистан'],
            ['code' => 'AM', 'name_ru' => 'Армения'],
            ['code' => 'AZ', 'name_ru' => 'Азербайджан'],
            ['code' => 'GE', 'name_ru' => 'Грузия'],
            ['code' => 'KG', 'name_ru' => 'Киргизия'],
            ['code' => 'MD', 'name_ru' => 'Молдова'],
            ['code' => 'TJ', 'name_ru' => 'Таджикистан'],
            ['code' => 'TM', 'name_ru' => 'Туркменистан'],
            ['code' => 'LV', 'name_ru' => 'Латвия'],
            ['code' => 'LT', 'name_ru' => 'Литва'],
            ['code' => 'EE', 'name_ru' => 'Эстония'],
            ['code' => 'DE', 'name_ru' => 'Германия'],
            ['code' => 'FR', 'name_ru' => 'Франция'],
            ['code' => 'IT', 'name_ru' => 'Италия'],
            ['code' => 'ES', 'name_ru' => 'Испания'],
            ['code' => 'GB', 'name_ru' => 'Великобритания'],
            ['code' => 'US', 'name_ru' => 'США'],
            ['code' => 'CA', 'name_ru' => 'Канада'],
            ['code' => 'CN', 'name_ru' => 'Китай'],
            ['code' => 'JP', 'name_ru' => 'Япония'],
            ['code' => 'KR', 'name_ru' => 'Южная Корея'],
            ['code' => 'IN', 'name_ru' => 'Индия'],
            ['code' => 'TR', 'name_ru' => 'Турция'],
            ['code' => 'IL', 'name_ru' => 'Израиль'],
            ['code' => 'AE', 'name_ru' => 'ОАЭ'],
            ['code' => 'PL', 'name_ru' => 'Польша'],
            ['code' => 'CZ', 'name_ru' => 'Чехия'],
            ['code' => 'AT', 'name_ru' => 'Австрия'],
            ['code' => 'CH', 'name_ru' => 'Швейцария'],
            ['code' => 'NL', 'name_ru' => 'Нидерланды'],
            ['code' => 'BE', 'name_ru' => 'Бельгия'],
            ['code' => 'SE', 'name_ru' => 'Швеция'],
            ['code' => 'NO', 'name_ru' => 'Норвегия'],
            ['code' => 'FI', 'name_ru' => 'Финляндия'],
            ['code' => 'DK', 'name_ru' => 'Дания'],
            ['code' => 'PT', 'name_ru' => 'Португалия'],
            ['code' => 'GR', 'name_ru' => 'Греция'],
            ['code' => 'HU', 'name_ru' => 'Венгрия'],
            ['code' => 'RO', 'name_ru' => 'Румыния'],
            ['code' => 'BG', 'name_ru' => 'Болгария'],
            ['code' => 'RS', 'name_ru' => 'Сербия'],
            ['code' => 'HR', 'name_ru' => 'Хорватия'],
            ['code' => 'AU', 'name_ru' => 'Австралия'],
            ['code' => 'BR', 'name_ru' => 'Бразилия'],
            ['code' => 'AR', 'name_ru' => 'Аргентина'],
            ['code' => 'MX', 'name_ru' => 'Мексика'],
        ];
    }

    public function run(): void
    {
        foreach (self::countriesData() as $row) {
            Country::query()->updateOrCreate(
                ['code' => $row['code']],
                ['name_ru' => $row['name_ru']]
            );
        }

        $aliases = [
            'Russia' => 'RU',
            'Russian Federation' => 'RU',
            'Российская Федерация' => 'RU',
            'Belarus' => 'BY',
            'Kazakhstan' => 'KZ',
            'Ukraine' => 'UA',
            'Germany' => 'DE',
            'France' => 'FR',
            'USA' => 'US',
            'United States' => 'US',
        ];

        User::query()
            ->whereNull('country_id')
            ->whereNotNull('country')
            ->where('country', '!=', '')
            ->each(function (User $user) use ($aliases) {
                $raw = trim((string) $user->country);
                if ($raw === '') {
                    return;
                }

                $country = Country::query()
                    ->whereRaw('LOWER(name_ru) = ?', [mb_strtolower($raw)])
                    ->first();

                if (! $country && isset($aliases[$raw])) {
                    $country = Country::query()->where('code', $aliases[$raw])->first();
                }

                if (! $country) {
                    $country = Country::query()
                        ->where('name_ru', 'like', $raw.'%')
                        ->first();
                }

                if ($country) {
                    $user->update([
                        'country_id' => $country->id,
                        'country' => $country->name_ru,
                    ]);
                }
            });
    }
}
