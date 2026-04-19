import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface ProfileForm {
  name: string;
  phone: string;
  preferredLanguage: 'en' | 'ar';
}

export default function UserProfile() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      preferredLanguage: user?.preferredLanguage || 'en',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<ProfileForm>) => api.patch('/users/me', data),
    onSuccess: (res) => {
      const updatedUser = res.data.data.user;
      if (user && accessToken && refreshToken) {
        setAuth(updatedUser, accessToken, refreshToken);
      }
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const onSubmit = (data: ProfileForm) => mutation.mutate(data);

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your personal information and preferences</p>
      </div>

      {/* Profile card */}
      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-blue-700 font-bold text-2xl">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full capitalize">
                {user?.role?.replace('_', ' ')}
              </span>
              {user?.isEmailVerified && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                className="input"
                {...register('name', { required: 'Name is required', minLength: 2 })}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Phone number</label>
              <input
                type="tel"
                className="input"
                placeholder="+966 5X XXX XXXX"
                {...register('phone')}
              />
            </div>
          </div>

          <div>
            <label className="label">Email address</label>
            <input type="email" className="input bg-gray-50" value={user?.email} disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact support if needed.</p>
          </div>

          <div>
            <label className="label">Preferred language</label>
            <select className="input" {...register('preferredLanguage')}>
              <option value="en">English</option>
              <option value="ar">العربية (Arabic)</option>
            </select>
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      {/* PDPL Rights notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Your Data Rights (Saudi PDPL)</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Right to access your personal data</li>
          <li>• Right to correct inaccurate data</li>
          <li>• Right to request data deletion</li>
          <li>• Right to withdraw consent at any time</li>
          <li>• Right to know how your data is processed</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          For data requests, contact: <a href="mailto:privacy@privora.sa" className="underline">privacy@privora.sa</a>
        </p>
      </div>
    </div>
  );
}
