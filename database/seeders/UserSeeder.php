<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run()
    {
        // Создаем роли, если их нет
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $userRole = Role::firstOrCreate(['name' => 'user']);
        
        $adminUser = User::create([
            'name' => 'administrator',
            'user_surname' => 'admin',
            'username' => 'admin_user',
            'email' => 'admin@digital-art.ru',
            'password' => Hash::make('password123'),
            'email_verified_at' => now(),
            'avatar' => '/default-avatar.svg'
        ]);
        
        // НАЗНАЧАЕМ РОЛЬ АДМИНИСТРАТОРА
        $adminUser->assignRole('admin');
        // Создаем тестового пользователя
        $testUser = User::create([
            'name' => 'Тестовый',
            'user_surname' => 'Пользователь',
            'username' => 'test_user',
            'email' => 'test@example.com',
            'password' => Hash::make('password123'),
            'email_verified_at' => now(),
            'avatar' => '/default-avatar.svg',
        ]);
        $testUser->assignRole('user');

        // Создаем еще несколько пользователей
        $annaUser = User::create([
            'name' => 'Анна',
            'user_surname' => 'Петрова',
            'username' => 'anna_artist',
            'email' => 'anna@example.com',
            'password' => Hash::make('password123'),
            'email_verified_at' => now(),
            'avatar' => '/default-avatar.svg',
        ]);
        $annaUser->assignRole('user');

        $mikeUser = User::create([
            'name' => 'Михаил',
            'user_surname' => 'Соколов',
            'username' => 'mike_3d',
            'email' => 'mike@example.com',
            'password' => Hash::make('password123'),
            'email_verified_at' => now(),
            'avatar' => '/default-avatar.svg',
        ]);
        $mikeUser->assignRole('user');
    }
}
