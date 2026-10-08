import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Check, Eye, EyeOff, ShieldCheck, Store, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../services/api';
import type { RegisterInput } from '../services/auth';
import { ApiError } from '../services/http';
import { Button } from '../components/ui/button';
import { isDemo, panelPathFor } from '../lib/utils';
import { AuthLayout } from './AuthLayout';

const categories = [
  'Cafetería',
  'Panadería',
  'Restaurante',
  'Postres y helados',
  'Barbería o estética',
  'Tienda o abarrotes',
  'Salud y bienestar',
  'Otro',
];

const passwordSchema = z
  .string()
  .min(8, 'Usa al menos 8 caracteres')
  .regex(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/, 'Incluye al menos una letra')
  .regex(/[0-9]/, 'Incluye al menos un número');

const phoneRule = /^$|^[0-9+()\s-]{7,20}$/;
const rfcRule = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

const schema = z
  .object({
    role: z.enum(['customer', 'business']),
    name: z.string().trim().min(3, 'Escribe tu nombre completo'),
    email: z.string().trim().min(1, 'Escribe tu correo').email('Escribe un correo válido'),
    phone: z.string().trim(),
    password: passwordSchema,
    confirm: z.string(),
    acceptsTerms: z.boolean(),
    businessName: z.string().trim(),
    category: z.string().trim(),
    businessPhone: z.string().trim(),
    address: z.string().trim(),
    city: z.string().trim(),
    rfc: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (!phoneRule.test(value.phone))
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Escribe un teléfono válido' });
    if (value.confirm !== value.password)
      ctx.addIssue({ code: 'custom', path: ['confirm'], message: 'Las contraseñas no coinciden' });
    if (!value.acceptsTerms)
      ctx.addIssue({
        code: 'custom',
        path: ['acceptsTerms'],
        message: 'Necesitamos tu aceptación para crear la cuenta',
      });
    if (value.role !== 'business') return;
    if (value.businessName.length < 2)
      ctx.addIssue({
        code: 'custom',
        path: ['businessName'],
        message: 'Escribe el nombre de tu negocio',
      });
    if (!value.category)
      ctx.addIssue({
        code: 'custom',
        path: ['category'],
        message: 'Elige la categoría de tu negocio',
      });
    if (value.businessPhone.length < 7)
      ctx.addIssue({
        code: 'custom',
        path: ['businessPhone'],
        message: 'Escribe el teléfono del negocio',
      });
    if (!value.address)
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Escribe la dirección del local',
      });
    if (!value.city) ctx.addIssue({ code: 'custom', path: ['city'], message: 'Escribe la ciudad' });
    if (value.rfc && !rfcRule.test(value.rfc.toUpperCase()))
      ctx.addIssue({
        code: 'custom',
        path: ['rfc'],
        message: 'El RFC no parece válido (12 o 13 caracteres)',
      });
  });

type RegisterForm = z.input<typeof schema>;

/** Del formulario al contrato de la API: descarta campos que son solo de la interfaz. */
function toRegisterInput(values: RegisterForm): RegisterInput {
  return {
    role: values.role,
    name: values.name,
    email: values.email,
    password: values.password,
    phone: values.phone || undefined,
    business:
      values.role === 'business'
        ? {
            businessName: values.businessName,
            category: values.category,
            phone: values.businessPhone,
            address: values.address,
            city: values.city,
            rfc: values.rfc,
          }
        : undefined,
  };
}

const FIELD_ALIASES: Record<keyof RegisterForm, string[]> = {
  role: ['role', 'type', 'user.role'],
  name: ['name', 'full_name', 'user.name'],
  email: ['email', 'user.email'],
  phone: ['phone', 'user.phone'],
  password: ['password', 'user.password'],
  confirm: ['confirm', 'password_confirmation', 'passwordConfirm'],
  acceptsTerms: ['acceptsTerms', 'terms'],
  businessName: ['businessName', 'business_name', 'business.name', 'store_name'],
  category: ['category', 'business.category', 'business_category'],
  businessPhone: ['businessPhone', 'business_phone', 'business.phone'],
  address: ['address', 'business.address', 'business_address'],
  city: ['city', 'business.city', 'business_city'],
  rfc: ['rfc', 'business.rfc', 'business_rfc'],
};

/** Traduce los errores 422 de Laravel (snake_case o anidados) a los campos del formulario. */
function applyServerErrors(
  fieldErrors: Record<string, string[]>,
  setError: (name: keyof RegisterForm, message: string) => void,
) {
  for (const [field, keys] of Object.entries(FIELD_ALIASES) as [keyof RegisterForm, string[]][]) {
    const message = keys.map((key) => fieldErrors[key]?.[0]).find(Boolean);
    if (message) setError(field, message);
  }
}

function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[0-9]/.test(password) && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/i.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const strengthLabels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente'];

export function Register() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'customer',
      name: '',
      email: '',
      phone: '',
      password: '',
      confirm: '',
      acceptsTerms: false,
      businessName: '',
      category: '',
      businessPhone: '',
      address: '',
      city: '',
      rfc: '',
    },
  });

  const role = watch('role');
  const password = watch('password');
  const score = passwordScore(password ?? '');
  const isBusiness = role === 'business';

  const mutation = useMutation({
    mutationFn: api.register,
    onSuccess: (session) => {
      const effectiveRole = session.user?.role ?? (isBusiness ? 'business' : 'customer');
      toast.success(
        isBusiness
          ? '¡Tu negocio ya es parte de Punto Plus!'
          : '¡Cuenta creada! Empieza a juntar sellos.',
      );
      navigate(panelPathFor(effectiveRole), { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length)
        applyServerErrors(error.fieldErrors, (name, message) => setError(name, { message }));
    },
  });

  function selectRole(next: 'customer' | 'business') {
    setValue('role', next, { shouldValidate: false });
    clearErrors();
  }

  return (
    <AuthLayout
      wide
      photo={isBusiness ? '/images/bakery.webp' : '/images/matcha.webp'}
      photoAlt={
        isBusiness ? 'Un negocio local abriendo su cortina' : 'Un matcha listo para disfrutarse'
      }
      headline={
        isBusiness ? (
          <>
            Tus clientes
            <br />
            siempre vuelven.
          </>
        ) : (
          <>
            Cada visita
            <br />
            suma algo bueno.
          </>
        )
      }
      tagline={
        isBusiness
          ? 'Tarjetas de sellos, promociones y clientes que regresan.'
          : 'Pequeñas visitas. Grandes sonrisas.'
      }
      eyebrow="CREA TU CUENTA GRATIS"
      title={
        isBusiness ? (
          <>
            Registra tu negocio
            <br />
            en Punto Plus.
          </>
        ) : (
          <>
            Únete y empieza
            <br />a coleccionar sellos.
          </>
        )
      }
      description={
        isDemo
          ? 'Estás en el modo de demostración: la cuenta se crea solo en este navegador y no se envía a la API.'
          : 'Elige si quieres juntar sellos en tus favoritos o crear la tarjeta de tu negocio.'
      }
    >
      <div
        className="role-switch"
        role="radiogroup"
        aria-label="Tipo de cuenta"
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          selectRole(isBusiness ? 'customer' : 'business');
        }}
      >
        <button
          type="button"
          role="radio"
          aria-checked={!isBusiness}
          className={`role-option ${!isBusiness ? 'active' : ''}`}
          onClick={() => selectRole('customer')}
        >
          <span className="role-icon">
            <UserRound size={18} />
          </span>
          <span className="role-text">
            <strong>Soy cliente</strong>
            <small>Quiero juntar sellos y canjear recompensas.</small>
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={isBusiness}
          className={`role-option ${isBusiness ? 'active' : ''}`}
          onClick={() => selectRole('business')}
        >
          <span className="role-icon">
            <Store size={18} />
          </span>
          <span className="role-text">
            <strong>Tengo un negocio</strong>
            <small>Quiero crear mi tarjeta y mis promociones.</small>
          </span>
        </button>
      </div>

      <form
        className="modal-form auth-form"
        onSubmit={handleSubmit((values) => mutation.mutate(toRegisterInput(values)))}
        noValidate
      >
        <div className="field">
          <label htmlFor="name">{isBusiness ? 'Nombre del responsable' : 'Nombre completo'}</label>
          <input
            id="name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'error-name' : undefined}
            {...register('name')}
            placeholder={isBusiness ? 'Ana Ramírez' : 'Sofía García'}
          />
          {errors.name && (
            <span id="error-name" className="form-error">
              {errors.name.message}
            </span>
          )}
        </div>

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
          <label htmlFor="phone">
            Teléfono <span className="optional">opcional</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'error-phone' : undefined}
            {...register('phone')}
            placeholder="55 1234 5678"
          />
          {errors.phone && (
            <span id="error-phone" className="form-error">
              {errors.phone.message}
            </span>
          )}
        </div>

        {isBusiness && (
          <fieldset className="business-fields">
            <legend>Datos de tu negocio</legend>

            <div className="field">
              <label htmlFor="businessName">Nombre comercial</label>
              <input
                id="businessName"
                aria-invalid={!!errors.businessName}
                aria-describedby={errors.businessName ? 'error-businessName' : undefined}
                {...register('businessName')}
                placeholder="Café Avellaneda"
              />
              {errors.businessName && (
                <span id="error-businessName" className="form-error">
                  {errors.businessName.message}
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="category">Categoría</label>
              <select
                id="category"
                aria-invalid={!!errors.category}
                aria-describedby={errors.category ? 'error-category' : undefined}
                {...register('category')}
                defaultValue=""
              >
                <option value="" disabled>
                  Elige una categoría
                </option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <span id="error-category" className="form-error">
                  {errors.category.message}
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="businessPhone">Teléfono del negocio</label>
              <input
                id="businessPhone"
                type="tel"
                aria-invalid={!!errors.businessPhone}
                aria-describedby={errors.businessPhone ? 'error-businessPhone' : undefined}
                {...register('businessPhone')}
                placeholder="55 8765 4321"
              />
              {errors.businessPhone && (
                <span id="error-businessPhone" className="form-error">
                  {errors.businessPhone.message}
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="address">Dirección del local</label>
              <input
                id="address"
                autoComplete="street-address"
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? 'error-address' : undefined}
                {...register('address')}
                placeholder="Av. Michoacán 120, Condesa"
              />
              {errors.address && (
                <span id="error-address" className="form-error">
                  {errors.address.message}
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="city">Ciudad</label>
              <input
                id="city"
                autoComplete="address-level2"
                aria-invalid={!!errors.city}
                aria-describedby={errors.city ? 'error-city' : undefined}
                {...register('city')}
                placeholder="Ciudad de México"
              />
              {errors.city && (
                <span id="error-city" className="form-error">
                  {errors.city.message}
                </span>
              )}
            </div>

            <div className="field">
              <label htmlFor="rfc">
                RFC <span className="optional">opcional, para facturas</span>
              </label>
              <input
                id="rfc"
                aria-invalid={!!errors.rfc}
                aria-describedby={errors.rfc ? 'error-rfc' : 'hint-rfc'}
                {...register('rfc')}
                placeholder="CAV190315AB1"
                maxLength={13}
              />
              <span id="hint-rfc" className="optional inline">
                12 o 13 caracteres. Lo usamos solo si pides facturas.
              </span>
              {errors.rfc && (
                <span id="error-rfc" className="form-error">
                  {errors.rfc.message}
                </span>
              )}
            </div>
          </fieldset>
        )}

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <div className="password-input">
            <input
              id="password"
              type={visible ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'error-password' : 'hint-password'}
              {...register('password')}
              placeholder="Mínimo 8 caracteres"
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
          {password ? (
            <span id="hint-password" className="strength">
              <span className="strength-bars" aria-hidden="true">
                {[0, 1, 2, 3].map((step) => (
                  <i key={step} data-on={step < score} />
                ))}
              </span>
              Seguridad: {strengthLabels[score]}
            </span>
          ) : (
            <span id="hint-password" className="optional inline">
              Combina letras y números, mínimo 8 caracteres.
            </span>
          )}
          {errors.password && (
            <span id="error-password" className="form-error">
              {errors.password.message}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirmar contraseña</label>
          <input
            id="confirm"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? 'error-confirm' : undefined}
            {...register('confirm')}
            placeholder="Repite tu contraseña"
          />
          {errors.confirm && (
            <span id="error-confirm" className="form-error">
              {errors.confirm.message}
            </span>
          )}
        </div>

        <div className="field span">
          <label className="form-check" htmlFor="acceptsTerms">
            <input
              id="acceptsTerms"
              type="checkbox"
              aria-invalid={!!errors.acceptsTerms}
              aria-describedby={errors.acceptsTerms ? 'error-terms' : undefined}
              {...register('acceptsTerms')}
            />
            <span aria-hidden="true">
              <Check size={12} strokeWidth={3} />
            </span>
            Acepto los términos y el aviso de privacidad de Punto Plus.
          </label>
          {errors.acceptsTerms && (
            <span id="error-terms" className="form-error">
              {errors.acceptsTerms.message}
            </span>
          )}
        </div>

        {mutation.isError && (
          <div role="alert" className="form-alert">
            {mutation.error.message}
          </div>
        )}

        <Button type="submit" className="full-width" disabled={mutation.isPending}>
          {mutation.isPending
            ? 'Creando tu cuenta…'
            : isBusiness
              ? 'Registrar mi negocio'
              : 'Crear mi cuenta'}
          <ArrowRight size={17} />
        </Button>
      </form>

      <p className="login-note">
        <ShieldCheck size={16} /> Guardamos tu sesión con un token cifrado, nunca tu contraseña.
      </p>

      <div className="auth-switch">
        ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
      </div>
    </AuthLayout>
  );
}
