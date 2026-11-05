import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import AuthShell from '../components/AuthShell';
import { Spinner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name (at least 2 characters)').max(60, 'Name is too long'),
    email: z.string().min(1, 'Enter your email').email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .regex(/[A-Za-z]/, 'Include at least one letter')
      .regex(/\d/, 'Include at least one number'),
    confirm: z.string().min(1, 'Re-enter your password'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export default function Register() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', password: '', confirm: '' } });

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await signUp(values.name, values.email, values.password);
      toast.success('Account created');
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, 'Could not create your account. Please try again.'));
    }
  };

  const field = (name, label, type, autoComplete) => (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} type={type} autoComplete={autoComplete} className={`input ${errors[name] ? 'input-error' : ''}`} {...register(name)} />
      {errors[name] && <p className="field-error">{errors[name].message}</p>}
    </div>
  );

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking income and expenses in a minute."
      footer={<>Already have an account? <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700">Log in</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {formError && <div role="alert" className="rounded-xl border border-rose-200 bg-expense-soft px-4 py-3 text-sm font-semibold text-expense">{formError}</div>}
        {field('name', 'Full name', 'text', 'name')}
        {field('email', 'Email', 'email', 'email')}
        {field('password', 'Password', 'password', 'new-password')}
        {field('confirm', 'Confirm password', 'password', 'new-password')}
        <button type="submit" className="btn-primary w-full py-3" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="h-4 w-4" />} Create account
        </button>
      </form>
    </AuthShell>
  );
}
