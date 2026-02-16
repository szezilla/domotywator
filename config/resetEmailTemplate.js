// config/resetEmailTemplate.js

module.exports = {
    resetHasla: (
        /** @type {string} */ linkResetujacy,
        /** @type {'pl'|'en'} */ lang = 'pl'
    ) => {
        if (lang === 'en') {
            return {
                subject: 'Password reset - DOMotywator',
                text: `We received a password reset request. Click here: ${linkResetujacy}`,
                html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #667eea; text-align: center;">Forgot your password?</h2>
                <p style="font-size: 16px; color: #333;">Hi!</p>
                <p style="color: #555;">We received a request to reset your password for your DOMotywator account. If this was not you, ignore this message.</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${linkResetujacy}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                </div>

                <p style="font-size: 12px; color: #999; text-align: center;">The link is valid for 1 hour.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">Button not working? Copy this link:<br>${linkResetujacy}</p>
            </div>
            `
            };
        }
        return {
            subject: 'Resetowanie hasła - DOMotywator',
            text: `Otrzymaliśmy prośbę o zmianę hasła. Kliknij tutaj: ${linkResetujacy}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #667eea; text-align: center;">Zapomniałeś hasła?</h2>
                <p style="font-size: 16px; color: #333;">Cześć!</p>
                <p style="color: #555;">Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w aplikacji DOMotywator. Jeśli to nie Ty, zignoruj tę wiadomość.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${linkResetujacy}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Zresetuj Hasło</a>
                </div>
                
                <p style="font-size: 12px; color: #999; text-align: center;">Link jest ważny przez 1 godzinę.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">Link nie działa? Skopiuj ten adres:<br>${linkResetujacy}</p>
            </div>
            `
        };
    }
};
