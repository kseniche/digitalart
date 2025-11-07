<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ], [
            'email.required' => 'Email обязателен',
            'email.email' => 'Некорректный формат email',
            'password.required' => 'Пароль обязателен',
            'password.min' => 'Пароль должен содержать минимум 6 символов',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Ошибка валидации',
                'errors' => $validator->errors()
            ], 422);
        }

        $credentials = $request->only('email', 'password');

        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'message' => 'Успешный вход',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'user_surname' => $user->user_surname,
                    'username' => $user->username,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                ],
                'token' => $token
            ]);
        }

        return response()->json([
            'message' => 'Неверный email или пароль'
        ], 401);
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'firstName' => 'required|string|max:255',
            'lastName' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'passwordConfirmation' => 'required|string|min:6|same:password',
        ], [
            'firstName.required' => 'Имя обязательно',
            'lastName.required' => 'Фамилия обязательна',
            'username.required' => 'Логин обязателен',
            'username.unique' => 'Пользователь с таким логином уже существует',
            'email.required' => 'Email обязателен',
            'email.email' => 'Некорректный формат email',
            'email.unique' => 'Пользователь с таким email уже существует',
            'password.required' => 'Пароль обязателен',
            'password.min' => 'Пароль должен содержать минимум 6 символов',
            'passwordConfirmation.required' => 'Подтверждение пароля обязательно',
            'passwordConfirmation.min' => 'Подтверждение пароля должно содержать минимум 6 символов',
            'passwordConfirmation.same' => 'Пароли не совпадают',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Ошибка валидации',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'name' => $request->firstName,
            'user_surname' => $request->lastName,
            'username' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Пользователь успешно зарегистрирован',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'user_surname' => $user->user_surname,
                'username' => $user->username,
                'email' => $user->email,
                'avatar' => $user->avatar,
            ],
            'token' => $token
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Успешный выход'
        ]);
    }
}
