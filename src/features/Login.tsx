import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../services/api';
import { ApiError } from '../services/http';
import { Button } from '../components/ui/button';
import { isDemo, panelPathFor } from '../lib/utils';
import { AuthLayout } from './AuthLayout';

const schema = z.object({
  email: z.string().trim().min(1, 'Escribe tu correo').email('Escribe un correo válido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});

type LoginForm = z.infer<typeof schema>;

export function Login() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  const login = useMutation({
    mutationFn: api.login,
    onSuccess: (session) => {
      toast.success(
        `Qué bueno verte de nuevo${session.user ? `, ${session.user.name.split(' ')[0]}` : ''}.`,
      );
      navigate(panelPathFor(session.user?.role), { replace: true });
    },
    onError: (error) => {
      // Laravel responde 422 con errores por campo; los mostramos junto al input.
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
        const email = error.fieldErrors.email?.[0];
        const password = error.fieldErrors.password?.[0];
        if (email) setError('email', { message: email });
        if (password) setError('password', { message: password });
      }
    },
  });

  return (
    <AuthLayout
      photo="/images/coffee.webp"
      photoAlt="Un café esperando tu próxima visita"
      headline={
        <>
          Tus favoritos,
          <br />
          te dan más.
        </>
      }
      tagline="Pequeñas visitas. Grandes sonrisas."
      eyebrow="QUÉ BUENO TENERTE AQUÍ"
      title={
        <>
          Volver siempre tiene
          <br />
          su recompensa.
        </>
      }
      description={
        isDemo
          ? 'Estás en el modo de demostración: puedes entrar con cualquier correo y contraseña.'
          : 'Inicia sesión con tu cuenta de cliente o de negocio.'
      }
    >
      <form
        className="modal-form"
        onSubmit={handleSubmit((values) => login.mutate(values))}
        noValidate
      >
        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'error-email' : undefined}
            {...register('email')}
            placeholder="tu@correo.com"
          />
          {errors.email && (
            <span id="error-email" className="form-error">
              {errors.email.message}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <div className="password-input">
            <input
              id="password"
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'error-password' : undefined}
              {...register('password')}
              placeholder="Tu contraseña"
            />
            <button
              type="button"
              className="icon-button"
              aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <span id="error-password" className="form-error">
              {errors.password.message}
            </span>
          )}
        </div>

        {login.isError && (
          <div role="alert" className="form-alert">
            {login.error.message}
          </div>
        )}

        <Button type="submit" className="full-width" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar a mi comunidad'}
          <ArrowRight size={17} />
        </Button>
      </form>

      <p className="login-note">
        <ShieldCheck size={16} /> Tu sesión está protegida con un token cifrado.
      </p>

      <div className="auth-switch">
        ¿Aún no tienes una cuenta? <Link to="/registro">Crea la tuya en un minuto</Link>
      </div>
    </AuthLayout>
  );
}
