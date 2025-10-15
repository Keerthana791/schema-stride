import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import API_CONFIG from '@/config/api';

const tenantRegistrationSchema = z.object({
  institutionId: z.string().min(3, 'Institution ID must be at least 3 characters').max(50, 'Institution ID must be less than 50 characters'),
  institutionName: z.string().min(3, 'Institution name must be at least 3 characters').max(200, 'Institution name must be less than 200 characters'),
  institutionPassword: z.string().min(6, 'Institution password must be at least 6 characters'),
  adminEmail: z.string().email('Valid email required'),
  adminPassword: z.string().min(6, 'Admin password must be at least 6 characters'),
  adminName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
});

type TenantRegistrationForm = z.infer<typeof tenantRegistrationSchema>;

const TenantRegistration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantRegistrationForm>({
    resolver: zodResolver(tenantRegistrationSchema),
  });

  const onSubmit = async (data: TenantRegistrationForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // Register tenant via backend
      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER_TENANT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: data.institutionId,
          institutionName: data.institutionName,
          institutionPassword: data.institutionPassword,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
          adminName: data.adminName,
        }),
      });
      const reg = await res.json();
      if (!res.ok) throw new Error(reg.message || 'Institution registration failed');

      // Login admin
      const loginRes = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.adminEmail, password: data.adminPassword }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.message || 'Login failed');
      if (loginData.accessToken) {
        localStorage.setItem('accessToken', loginData.accessToken);
      }

      toast({
        title: 'Success',
        description: 'Institution registered successfully! You are now logged in.',
      });
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed';
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Register Your Institution
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create a new tenant for your educational institution
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Institution Registration</CardTitle>
            <CardDescription>
              Set up your institution's learning management system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="institutionId">Institution ID</Label>
                  <Input
                    id="institutionId"
                    type="text"
                    placeholder="e.g., collegeA"
                    {...register('institutionId')}
                    className={errors.institutionId ? 'border-red-500' : ''}
                  />
                  {errors.institutionId && (
                    <p className="text-sm text-red-500 mt-1">{errors.institutionId.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Unique identifier for your institution (letters, numbers, no spaces)
                  </p>
                </div>

                <div>
                  <Label htmlFor="institutionName">Institution Name</Label>
                  <Input
                    id="institutionName"
                    type="text"
                    placeholder="e.g., College A University"
                    {...register('institutionName')}
                    className={errors.institutionName ? 'border-red-500' : ''}
                  />
                  {errors.institutionName && (
                    <p className="text-sm text-red-500 mt-1">{errors.institutionName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="institutionPassword">Institution Password</Label>
                  <Input
                    id="institutionPassword"
                    type="password"
                    placeholder="Create a password for your institution"
                    {...register('institutionPassword')}
                    className={errors.institutionPassword ? 'border-red-500' : ''}
                  />
                  {errors.institutionPassword && (
                    <p className="text-sm text-red-500 mt-1">{errors.institutionPassword.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    This password will be required for new users to join your institution
                  </p>
                </div>

                <div>
                  <Label htmlFor="adminName">Admin Name</Label>
                  <Input
                    id="adminName"
                    type="text"
                    placeholder="Your full name"
                    {...register('adminName')}
                    className={errors.adminName ? 'border-red-500' : ''}
                  />
                  {errors.adminName && (
                    <p className="text-sm text-red-500 mt-1">{errors.adminName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@yourinstitution.com"
                    {...register('adminEmail')}
                    className={errors.adminEmail ? 'border-red-500' : ''}
                  />
                  {errors.adminEmail && (
                    <p className="text-sm text-red-500 mt-1">{errors.adminEmail.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="Choose a strong password"
                    {...register('adminPassword')}
                    className={errors.adminPassword ? 'border-red-500' : ''}
                  />
                  {errors.adminPassword && (
                    <p className="text-sm text-red-500 mt-1">{errors.adminPassword.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Institution...' : 'Register Institution'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TenantRegistration;




