import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return toast.error('Full name is required');
    if (!employeeId.trim()) return toast.error('Employee ID is required');
    if (!department.trim()) return toast.error('Department is required');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');

    setBusy(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { name: name.trim() },
        },
      });

      if (authError) {
        setBusy(false);
        return toast.error(authError.message);
      }

      const uid = authData.user?.id;
      if (!uid) {
        setBusy(false);
        return toast.error('Could not retrieve user ID after signup. Please try again.');
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        department: department.trim(),
        manager_id: null,
      });

      if (profileError) {
        setBusy(false);
        return toast.error(`Profile creation failed: ${profileError.message}`);
      }

      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: uid,
        role: 'employee',
      });

      if (roleError) {
        setBusy(false);
        return toast.error(`Role assignment failed: ${roleError.message}`);
      }

      toast.success('Account created! Please sign in to continue.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message ?? 'Unexpected error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display">Create account</CardTitle>
          <CardDescription>
            Fill in your details below. An admin will link you to your manager.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">

            <div className="space-y-1">
              <Label htmlFor="su-name">Full name</Label>
              <Input
                id="su-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                required
                maxLength={80}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="su-empid">Employee ID</Label>
              <Input
                id="su-empid"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. EMP-1042"
                required
                maxLength={40}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="su-dept">Department</Label>
              <Input
                id="su-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering"
                required
                maxLength={80}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="su-email">Work email</Label>
              <Input
                id="su-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="su-pw">Password</Label>
              <Input
                id="su-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="su-pw2">Confirm password</Label>
              <Input
                id="su-pw2"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have one?{' '}
            <Link to="/" className="underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
