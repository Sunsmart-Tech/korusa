import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { supabase } from "../../../lib/supabase";
import { MIN_PASSWORD_LENGTH } from "../../../lib/authConstant";


// Shown after the user opens the link from a password-reset email.
//
// Supabase signs the user in with a temporary "recovery" session when they open
// that link. Without this screen, App.tsx would treat them as a normal logged-in
// user and send them to /home without ever setting a new password.
// App.tsx renders this view when it receives the PASSWORD_RECOVERY auth event.
export const ResetPasswordView = ({ onDone }: { onDone: () => void }) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setError('');

        // Cheap client-side checks first, so obvious mistakes don't cost a round trip.
        if(password.length < MIN_PASSWORD_LENGTH) {
            setError (`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }
        if(password !== confirm) { 
            setError('Passwords do not match');
            return;
        }

        setSaving(true);
        // updateUser works because the recovery link already gave us a session.
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setSaving(false);

        if (updateError) { 
            // Supabase's own message covers cases like "new password must be different".
            setError(updateError.message);
            return;
        }

        onDone();
    };

    return (
        <div className="min-h-dvh bg-sun-bg flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 rounded-[3rem] space-y-6">
                <h2 className="text-2xl font-bold font-display">Set a new password</h2>
                <Input label="New Password" type="password" icon={<Lock size={18} />}
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                <Input label="Confirm Password" type="password" icon={<Lock size={18} />}
                    value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button className="w-full" size="lg" onClick={submit}>
                    {saving ? 'Saving...' : 'Update Password'}
                </Button>
            </div>
        </div>
    );
};