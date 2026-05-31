<?php

namespace App\Support;

use Carbon\CarbonInterface;

class MailAppeal
{
    public static function supportLine(): string
    {
        $email = (string) config('mail.from.address', '');

        if ($email === '') {
            return 'Если вы не согласны с данным решением администрации, обратитесь в службу поддержки через сайт.';
        }

        return 'Если вы не согласны с данным решением администрации, обратитесь в службу поддержки по адресу электронной почты отправителя: '.$email;
    }

    public static function eventDateLine(?CarbonInterface $at = null): string
    {
        $at = $at ?? now();
        $formatted = $at->timezone(config('app.timezone'))->format('d.m.Y H:i');

        return "Дата события: {$formatted}";
    }
}
