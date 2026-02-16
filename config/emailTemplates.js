module.exports = {
    rejestracja: (
        /** @type {string} */ linkAktywacyjny,
        /** @type {'pl'|'en'} */ lang = 'pl'
    ) => {
        if (lang === 'en') {
            return {
                subject: 'Confirm your account - DOMotywator',
                text: `Welcome to DOMotywator! Click this link to activate your account: ${linkAktywacyjny}`,
                html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Account Activation</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;">
                    <tr>
                        <td style="padding: 20px 0;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <h2 style="color: #333333; text-align: center; margin-bottom: 20px;">Welcome to DOMotywator!</h2>

                                <p style="color: #555555; font-size: 16px; line-height: 1.5; text-align: center; margin-bottom: 30px;">
                                    Thank you for registering. To fully use the app, please confirm your e-mail address.
                                </p>

                                <div style="text-align: center; margin-bottom: 30px;">
                                    <a href="${linkAktywacyjny}" style="background-color: #4CAF50; color: #ffffff; padding: 14px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block;">
                                        Activate account
                                    </a>
                                </div>

                                <p style="color: #999999; font-size: 12px; line-height: 1.4; text-align: center; border-top: 1px solid #eeeeee; padding-top: 20px;">
                                    If the button does not work, copy this link into your browser:<br>
                                    <a href="${linkAktywacyjny}" style="color: #4CAF50;">${linkAktywacyjny}</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            `
            };
        }
        return {
            subject: 'Potwierdzenie konta - DOMotywator',
            // Dodajemy wersję tekstową dla klientów bez obsługi HTML
            text: `Witaj w DOMotywatorze! Kliknij w link, aby aktywować konto: ${linkAktywacyjny}`,
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Aktywacja Konta</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;">
                    <tr>
                        <td style="padding: 20px 0;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <h2 style="color: #333333; text-align: center; margin-bottom: 20px;">Witaj w DOMotywatorze!</h2>
                                
                                <p style="color: #555555; font-size: 16px; line-height: 1.5; text-align: center; margin-bottom: 30px;">
                                    Dziękujemy za rejestrację. Aby w pełni korzystać z aplikacji i dołączyć do domowników, musisz potwierdzić swój adres e-mail.
                                </p>
                                
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <a href="${linkAktywacyjny}" style="background-color: #4CAF50; color: #ffffff; padding: 14px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block;">
                                        Aktywuj konto
                                    </a>
                                </div>
                                
                                <p style="color: #999999; font-size: 12px; line-height: 1.4; text-align: center; border-top: 1px solid #eeeeee; padding-top: 20px;">
                                    Jeśli przycisk nie działa, skopiuj poniższy link do przeglądarki:<br>
                                    <a href="${linkAktywacyjny}" style="color: #4CAF50;">${linkAktywacyjny}</a>
                                </p>
                            </div>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            `
        };
    }
};
