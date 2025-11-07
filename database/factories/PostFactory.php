<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Post>
 */
class PostFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'post_title' => fake()->sentence(3),
            'post_content' => fake()->paragraph(3),
            'media_path' => 'posts/' . fake()->uuid() . '.jpg',
            'tags' => fake()->randomElements(['digital-art', '3d-art', 'concept-art', 'illustration', 'pixel-art'], 2),
            'user_id' => User::factory(),
            'media_type' => 'image',
            'like_count' => 0,
            'comment_count' => 0,
        ];
    }

    /**
     * Indicate that the post is deleted.
     */
    public function deleted(): static
    {
        return $this->state(fn (array $attributes) => [
            'deleted_at' => now(),
        ]);
    }
}


