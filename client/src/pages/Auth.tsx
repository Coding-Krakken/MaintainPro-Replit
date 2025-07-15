import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Wrench, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      toast({
        title: 'Success',
        description: 'Successfully logged in',
      });
      setLocation('/dashboard');
    } catch (error) {
      const errorMessage = 'Invalid credentials';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-500 rounded-xl flex items-center justify-center">
            <Wrench className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            MaintAInPro CMMS
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your maintenance management system
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div 
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
                  data-testid="error-message"
                >
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="mt-1"
                  data-testid="email-input"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pr-10"
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                data-testid="login-button"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Credentials</h3>
              <div className="space-y-1 text-sm text-blue-700">
                <p><strong>Supervisor:</strong> supervisor@maintainpro.com</p>
                <p><strong>Technician:</strong> technician@maintainpro.com</p>
                <p><strong>Manager:</strong> manager@maintainpro.com</p>
                <p><strong>Password:</strong> demo123</p>
              </div>
              <div className="mt-3 flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail('supervisor@maintainpro.com');
                    setPassword('demo123');
                  }}
                >
                  Use Supervisor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail('technician@maintainpro.com');
                    setPassword('demo123');
                  }}
                >
                  Use Technician
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Enterprise Maintenance Management System</p>
          <p className="mt-1">Secure • Reliable • Efficient</p>
        </div>
      </div>
    </div>
  );
}
