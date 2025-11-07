<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Post;
use App\Models\User;

class PostSeeder extends Seeder
{

    public function run()
    {
        $users = User::all();

        if ($users->count() === 0) {
            $this->command->info('No users found. Please run UserSeeder first.');
            return;
        }


        $s3Folder = 'posts'; 

        $posts = [
            [
                'post_title' => 'Цифровая живопись "Закат над городом"',
                'post_content' => 'Работа выполнена в технике цифровой живописи с использованием Adobe Photoshop. Вдохновлена закатами Санкт-Петербурга.',
                'media_path' => $s3Folder . '/digital-art-1.jpg',
                'tags' => 'цифровая живопись,закат,город,photoshop',
                'media_type' => 'image',
                'like_count' => 42,
                'comment_count' => 8,
            ],
            [
                'post_title' => '3D Скульптура "Мечтатель"',
                'post_content' => '3D модель создана в Blender. Скульптура символизирует стремление к мечтам и творчеству.',
                'media_path' => $s3Folder . '/3d-art-2.png',
                'tags' => '3d,скульптура,blender,мечты',
                'media_type' => 'image',
                'like_count' => 67,
                'comment_count' => 12,
            ],
            [
                'post_title' => 'Векторная иллюстрация "Космос"',
                'post_content' => 'Минималистичная векторная иллюстрация космической тематики. Создана в Adobe Illustrator.',
                'media_path' => $s3Folder . '/vector-art-3.jpg',
                'tags' => 'вектор,космос,минимализм,illustrator',
                'media_type' => 'image',
                'like_count' => 89,
                'comment_count' => 15,
            ],
            [
                'post_title' => 'Фотоманипуляция "Сюрреализм"',
                'post_content' => 'Сюрреалистичная фотоманипуляция, объединяющая реальность и фантазию.',
                'media_path' => $s3Folder . '/photo-manipulation-4.jpg',
                'tags' => 'фотоманипуляция,сюрреализм,photoshop,творчество',
                'media_type' => 'image',
                'like_count' => 156,
                'comment_count' => 23,
            ],
            [
                'post_title' => 'Пиксель-арт "Ретро игра"',
                'post_content' => 'Пиксель-арт в стиле ретро игр 90-х годов. Создан в Aseprite.',
                'media_path' => $s3Folder . '/pixel-art-5.jpg',
                'tags' => 'пиксель-арт,ретро,игры,aseprite',
                'media_type' => 'image',
                'like_count' => 73,
                'comment_count' => 9,
            ],
            [
                'post_title' => 'Концепт-арт персонажа',
                'post_content' => 'Концепт-арт фэнтезийного персонажа для видеоигры. Работа выполнена в Procreate.',
                'media_path' => $s3Folder . '/concept-art-6.jpg',
                'tags' => 'концепт-арт,персонаж,фэнтези,procreate',
                'media_type' => 'image',
                'like_count' => 124,
                'comment_count' => 18,
            ],
        ];

        foreach ($posts as $index => $postData) {
            $user = $users->get($index % $users->count());
            
            Post::create([
                ...$postData,
                'user_id' => $user->id, 
                'created_at' => now()->subDays(rand(1, 30)),
                'updated_at' => now()->subDays(rand(1, 30)),
            ]);
        }

        $this->command->info(' Posts seeded successfully with S3 images!');
    }
}

