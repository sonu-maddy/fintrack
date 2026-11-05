import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import AuthShell from '../components/AuthShell';
import { Spinner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';

const schema = z.object({
  email: z.string().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await login(values.email, values.password);
      toast.success('Welcome back');
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, 'Could not log in. Please try again.'));
    }
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Pick up where you left off."
      footer={<>New to FinTrack? <Link to="/register" className="font-bold text-brand-600 hover:text-brand-700">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <div role="alert" className="rounded-xl border border-rose-200 bg-expense-soft px-4 py-3 text-sm font-semibold text-expense">{formError}</div>}
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} {...register('email')} />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" autoComplete="current-password" className={`input ${errors.password ? 'input-error' : ''}`} {...register('password')} />
          {errors.password && <p className="field-error">{errors.password.message}</p>}
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="h-4 w-4" />} Log in
        </button>
      </form>
    </AuthShell>
  );
}
