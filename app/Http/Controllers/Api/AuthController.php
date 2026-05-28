<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePasswordRequest;
use App\Models\User;
use App\Rules\PersonNameLetters;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ], [
            'email.required' => 'Укажите электронную почту',
            'email.email' => 'Некорректный формат электронной почты',
            'password.required' => 'Пароль обязателен',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Ошибка валидации',
                'errors' => $validator->errors()
            ], 422);
        }

        $email = Str::lower(trim((string) $request->input('email')));
        $credentials = [
            'email' => $email,
            'password' => $request->input('password'),
        ];

        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            // Срок действия PAT задаётся в config/sanctum.php (expiration, по умолчанию 7 суток).
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
            'message' => 'Неверная электронная почта или пароль'
        ], 401);
    }

    public function register(Request $request)
    {
        $normalized = $request->all();
        $normalized['email'] = Str::lower(trim((string) $request->input('email')));
        $normalized['firstName'] = trim((string) $request->input('firstName', ''));
        $normalized['lastName'] = trim((string) $request->input('lastName', ''));
        $request->merge(['email' => $normalized['email']]);

        $validator = Validator::make($normalized, [
            'firstName' => ['required', 'string', 'max:255', new PersonNameLetters],
            'lastName' => ['required', 'string', 'max:255', new PersonNameLetters],
            'username' => 'required|string|max:255|unique:users,username',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'passwordConfirmation' => 'required|string|min:8|same:password',
            'accept_terms' => 'required|accepted',
        ], [
            'firstName.required' => 'Имя обязательно',
            'lastName.required' => 'Фамилия обязательна',
            'username.required' => 'Логин обязателен',
            'username.unique' => 'Пользователь с таким логином уже существует',
            'email.required' => 'Укажите электронную почту',
            'email.email' => 'Некорректный формат электронной почты',
            'email.unique' => 'Пользователь с такой электронной почтой уже существует',
            'password.required' => 'Пароль обязателен',
            'password.min' => 'Пароль должен содержать минимум 8 символов',
            'passwordConfirmation.required' => 'Подтверждение пароля обязательно',
            'passwordConfirmation.min' => 'Подтверждение пароля должно содержать минимум 8 символов',
            'passwordConfirmation.same' => 'Пароли не совпадают',
            'accept_terms.accepted' => 'Необходимо принять пользовательское соглашение и правила сообщества',
            'accept_terms.required' => 'Необходимо принять пользовательское соглашение и правила сообщества',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Ошибка валидации',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'name' => $normalized['firstName'],
            'user_surname' => $normalized['lastName'],
            'username' => $request->username,
            'email' => $normalized['email'],
            'password' => Hash::make($request->password),
            'terms_accepted_at' => now(),
        ]);
        Role::firstOrCreate(['name' => 'user']);
        $user->assignRole('user');

        // Срок действия PAT задаётся в config/sanctum.php (expiration, по умолчанию 7 суток).
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
                'terms_accepted_at' => $user->terms_accepted_at?->toIso8601String(),
                'comment_rules_accepted_at' => $user->comment_rules_accepted_at?->toIso8601String(),
            ],
            'token' => $token
        ], 201);
    }

    /**
     * Запрос на восстановление пароля (forgot password).
     * Возвращает одинаковый ответ для существующего и несуществующего email.
     */
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ], [
            'email.required' => 'Укажите электронную почту',
            'email.email' => 'Некорректный формат электронной почты',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Ошибка валидации',
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = Str::lower(trim((string) $request->input('email')));
        Password::sendResetLink(['email' => $email]);

        return response()->json([
            'message' => 'Если аккаунт с таким email существует, инструкция по сбросу отправлена.',
        ]);
    }

    /**
     * Сброс пароля по токену (reset password).
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'token.required' => 'Токен обязателен',
            'email.required' => 'Укажите электронную почту',
            'email.email' => 'Некорректный формат электронной почты',
            'password.required' => 'Новый пароль обязателен',
            'password.min' => 'Новый пароль должен содержать минимум 8 символов',
            'password.confirmed' => 'Подтверждение нового пароля не совпадает',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Ошибка валидации',
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = Str::lower(trim((string) $request->input('email')));
        $status = Password::reset(
            [
                'email' => $email,
                'password' => (string) $request->input('password'),
                'password_confirmation' => (string) $request->input('password_confirmation'),
                'token' => (string) $request->input('token'),
            ],
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Не удалось сбросить пароль. Проверьте токен и email.',
            ], 422);
        }

        return response()->json([
            'message' => 'Пароль успешно сброшен',
        ]);
    }

    public function logout(Request $request)
    {
        $token = $request->user()?->currentAccessToken();
        if ($token) {
            $token->delete();
        }

        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Успешный выход'
        ]);
    }

    /**
     * Смена пароля для авторизованного пользователя.
     * Текущий токен Sanctum не аннулируется — пользователь остаётся в приложении.
     */
    public function updatePassword(UpdatePasswordRequest $request)
    {
        $user = $request->user();

        if (!Hash::check($request->input('current_password'), $user->password)) {
            return response()->json([
                'message' => 'Текущий пароль указан неверно.',
                'errors' => [
                    'current_password' => ['Неверный текущий пароль.'],
                ],
            ], 422);
        }

        $user->update([
            'password' => $request->input('password'),
        ]);

        return response()->json([
            'message' => 'Пароль успешно изменен',
        ]);
    }

    /**
     * Принятие правил комментариев (первый комментарий).
     */
    public function acceptCommentRules(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->comment_rules_accepted_at) {
            return response()->json([
                'message' => 'Правила комментариев уже приняты',
                'comment_rules_accepted_at' => $user->comment_rules_accepted_at->toIso8601String(),
            ]);
        }

        $user->update(['comment_rules_accepted_at' => now()]);
        $user->refresh();

        return response()->json([
            'message' => 'Правила комментариев приняты',
            'comment_rules_accepted_at' => $user->comment_rules_accepted_at->toIso8601String(),
        ]);
    }
}
