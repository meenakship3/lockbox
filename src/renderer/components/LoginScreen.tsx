import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { KeyRound, Lock, Eye, EyeOff, Fingerprint } from 'lucide-react';

interface LoginScreenProps {
  onAuthenticated: () => void;
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [isSetup, setIsSetup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTouchIDAvailable, setIsTouchIDAvailable] = useState(false);

  useEffect(() => {
    checkSetup();
    checkTouchID();
  }, []);

  async function checkSetup() {
    try {
      const setupComplete = await window.api.auth.isSetup();
      setIsSetup(setupComplete);
    } catch (error) {
      toast.error('Failed to check authentication status');
      console.error('Setup check error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkTouchID() {
    try {
      const available = await window.api.auth.isTouchIDAvailable();
      setIsTouchIDAvailable(available);
    } catch (error) {
      console.error('Touch ID check error:', error);
    }
  }

  async function handleTouchID() {
    setIsSubmitting(true);
    try {
      const result = await window.api.auth.authenticateWithTouchID();
      if (result.success) {
        onAuthenticated();
      } else {
        toast.error(result.error || 'Touch ID authentication failed');
      }
    } catch (error) {
      toast.error('Touch ID authentication failed');
      console.error('Touch ID error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (!isSetup && password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }

    if (!isSetup && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      if (!isSetup) {
        // Setup mode - create initial password
        const result = await window.api.auth.setup(password);
        if (result.success) {
          toast.success('Password created successfully!');
          onAuthenticated();
        } else {
          toast.error(result.error || 'Failed to create password');
        }
      } else {
        // Login mode - verify password
        const result = await window.api.auth.verify(password);
        if (result.success) {
          onAuthenticated();
        } else {
          setErrors({ password: 'Incorrect password' });
          setPassword('');
          toast.error('Incorrect password');
        }
      }
    } catch (error) {
      toast.error('Authentication failed');
      console.error('Auth error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 opacity-[0.06]"
            style={{
            background:
                "repeating-linear-gradient(0deg, #000, #000 1px, transparent 1px, transparent 3px), radial-gradient(1000px 500px at 50% -20%, #0f172a 0%, transparent 60%)",
            mixBlendMode: "multiply",
            }}
        />
      <Card className="w-[420px] bg-white relative z-10">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            {isSetup ? (
              <Lock className="h-12 w-12 text-gray-700" />
            ) : (
              <KeyRound className="h-12 w-12 text-gray-700" />
            )}
          </div>
          <CardTitle className="text-2xl text-center">
            {isSetup ? 'Unlock Lockbox' : 'Welcome to Lockbox'}
          </CardTitle>
          <CardDescription className="text-center">
            {isSetup
              ? 'Enter your password to access your tokens'
              : 'Create a master password to secure your tokens'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Touch ID Button (only show on login, not setup) */}
            {isSetup && isTouchIDAvailable && (
              <Button
                type="button"
                onClick={handleTouchID}
                disabled={isSubmitting}
                className="w-full bg-gray-900 hover:bg-gray-800"
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                Unlock with Touch ID
              </Button>
            )}

            {/* Divider (only show if Touch ID is available on login) */}
            {isSetup && isTouchIDAvailable && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    Or continue with password
                  </span>
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">
                {isSetup ? 'Password' : 'Master Password'} *
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder={isSetup ? 'Enter your password' : 'Create a strong password'}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  autoFocus={!isTouchIDAvailable}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field (Setup only) */}
            {!isSetup && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                    placeholder="Re-enter your password"
                    className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Info message for setup */}
            {!isSetup && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  Remember this password! You&apos;ll need it to access your tokens.
                  Make sure it&apos;s strong and secure.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait...'
                : isSetup
                  ? 'Unlock'
                  : 'Create Password & Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
