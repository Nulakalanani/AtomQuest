import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { name } },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success('Account created'); navigate('/employee'); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader><CardTitle className="font-display">Create account</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required maxLength={80} />
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6)" required minLength={6} />
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating…' : 'Sign up'}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Have one? <Link to="/" className="underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
