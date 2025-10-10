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
import { authService, TenantRegistrationData } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';

const tenantRegistrationSchema = z.object({
  tenantId: z.string().min(3, 'Tenant ID must be at least 3 characters').max(50, 'Tenant ID must be less than 50 characters'),
  institutionName: z.string().min(3, 'Institution name must be at least 3 characters').max(200, 'Institution name must be less than 200 characters'),
  adminEmail: z.string().email('Valid email required'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
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
      await authService.registerTenant(data as TenantRegistrationData);
      toast({
        title: 'Success',
        description: 'Tenant registered successfully! You are now logged in.',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      toast({
        title: 'Error',
        description: err.message || 'Registration failed',
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
                  <Label htmlFor="tenantId">Institution ID</Label>
                  <Input
                    id="tenantId"
                    type="text"
                    placeholder="e.g., collegeA"
                    {...register('tenantId')}
                    className={errors.tenantId ? 'border-red-500' : ''}
                  />
                  {errors.tenantId && (
                    <p className="text-sm text-red-500 mt-1">{errors.tenantId.message}</p>
                  )}
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




