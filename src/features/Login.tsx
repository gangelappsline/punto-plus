import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { api } from '../services/api';
import { Button } from '../components/ui/button';
const schema = z.object({
  email: z.string().email('Escribe un correo válido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});
export function Login() {
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const login = useMutation({ mutationFn: api.login });
  return (
    <main className="login-page">
      <div className="login-photo">
        <img src="/images/coffee.webp" alt="Un café esperando tu próxima visita" />
        <div>
          <img src="/icon.svg" alt="" />
          <h1>
            Tus favoritos,
            <br />
            te dan más.
          </h1>
          <p>Pequeñas visitas. Grandes sonrisas.</p>
        </div>
      </div>
      <div className="login-content">
        <a href="/" className="brand">
          <img src="/icon.svg" alt="" />
          <span>
            punto<span className="brand-plus">plus</span>
            <sup>®</sup>
          </span>
        </a>
        <div className="eyebrow">QUÉ BUENO TENERTE AQUÍ</div>
        <h2>
          Volver siempre tiene
          <br />
          su recompensa.
        </h2>
        <p className="muted">Inicia sesión para encontrar tus tarjetas.</p>
        <form className="modal-form" onSubmit={handleSubmit((v) => login.mutate(v))}>
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="email"
              {...register('email')}
              placeholder="tu@correo.com"
            />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </label>
          <label>
            Contraseña
            <div className="password-input">
              <input
                type={visible ? 'text' : 'password'}
                autoComplete="current-password"
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
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </label>
          {login.isError && (
            <div role="alert" className="form-error">
              {login.error.message}
            </div>
          )}
          <Button type="submit" className="full-width" disabled={login.isPending}>
            {login.isPending ? 'Entrando…' : 'Entrar a mi comunidad'}
            <ArrowRight size={17} />
          </Button>
        </form>
        <p className="login-note">
          <ShieldCheck size={16} /> Tu sesión está protegida.
        </p>
        <div className="notice">
          ¿Aún no tienes una cuenta? Solicita tu alta al equipo de Punto Plus. La creación y
          recuperación de cuentas requieren el contrato oficial de la API.
        </div>
      </div>
    </main>
  );
}
