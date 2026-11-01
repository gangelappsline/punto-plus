import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import {
  useAdminBusinesses,
  useCreateAdminBusiness,
  useDeleteAdminBusiness,
  useUpdateAdminBusiness,
} from '../lib/queries';
import type { AdminBusiness, AdminBusinessInput } from '../lib/types';

const statusLabels: Record<AdminBusiness['status'], string> = {
  pending: 'Pendiente',
  active: 'Activo',
  cancelled: 'Cancelado',
  onboarding: 'En incorporación',
};
const statusStyles: Record<AdminBusiness['status'], string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  onboarding: 'bg-sky-50 text-sky-800 ring-sky-200',
};
const statusOptions: AdminBusiness['status'][] = ['pending', 'active', 'cancelled', 'onboarding'];
const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});
const numberFormat = new Intl.NumberFormat('es-MX');

function dateValue(value?: string) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
function formatDate(value?: string) {
  const date = dateValue(value);
  return date
    ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        date,
      )
    : 'Sin fecha';
}
function daysUntil(value?: string) {
  const date = dateValue(value);
  return date ? Math.ceil((date.getTime() - new Date().setHours(12, 0, 0, 0)) / 86400000) : null;
}
function isMembershipActive(business: AdminBusiness) {
  return business.membershipActive ?? business.status === 'active';
}
function isExpiringSoon(business: AdminBusiness) {
  const days = daysUntil(business.membershipExpiresAt);
  return isMembershipActive(business) && days !== null && days >= 0 && days <= 30;
}

export function AdminBusinessesPage() {
  const report = useAdminBusinesses();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminBusiness['status']>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBusiness | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminBusiness | null>(null);
  const createBusiness = useCreateAdminBusiness(() => setFormOpen(false));
  const updateBusiness = useUpdateAdminBusiness(() => setFormOpen(false));
  const deleteBusiness = useDeleteAdminBusiness(() => setDeleteTarget(null));

  const businesses = report.data?.businesses ?? [];
  const filteredBusinesses = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('es-MX');
    return businesses.filter((business) => {
      const matchesSearch = [business.name, business.email, business.phone, business.slug].some(
        (value) => value?.toLocaleLowerCase('es-MX').includes(normalized),
      );
      return matchesSearch && (statusFilter === 'all' || business.status === statusFilter);
    });
  }, [businesses, search, statusFilter]);

  const currentMonthCustomers =
    report.data?.statistics?.currentMonthCustomers ??
    sumAvailable(businesses.map((business) => business.currentMonthCustomerCount));
  const previousMonthCustomers =
    report.data?.statistics?.previousMonthCustomers ??
    sumAvailable(businesses.map((business) => business.previousMonthCustomerCount));
  const currentMonthRevenue =
    report.data?.statistics?.currentMonthRevenue ??
    sumAvailable(businesses.map((business) => business.currentMonthRevenue));
  const previousMonthRevenue =
    report.data?.statistics?.previousMonthRevenue ??
    sumAvailable(businesses.map((business) => business.previousMonthRevenue));
  const expiringBusinesses = businesses
    .filter(isExpiringSoon)
    .sort(
      (a, b) =>
        (daysUntil(a.membershipExpiresAt) ?? 999) - (daysUntil(b.membershipExpiresAt) ?? 999),
    );
  const expiringCount = report.data?.statistics?.expiringMemberships ?? expiringBusinesses.length;
  const activeCount = businesses.filter((business) => business.status === 'active').length;

  function startCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function startEdit(business: AdminBusiness) {
    setEditing(business);
    setFormOpen(true);
  }
  function saveBusiness(input: AdminBusinessInput) {
    if (editing) updateBusiness.mutate({ id: editing.id, ...input });
    else createBusiness.mutate(input);
  }

  return (
    <div className="space-y-7 pb-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-teal-700">
            <Building2 size={15} /> DIRECTORIO DE PLATAFORMA
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Negocios <span className="text-teal-700">y membresías.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Consulta el crecimiento, los ingresos y las renovaciones; administra el ciclo de vida de
            cada negocio.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus size={17} /> Nuevo negocio
        </Button>
      </div>

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Estadísticas de negocios"
      >
        <MetricCard
          label="Clientes este mes"
          value={
            currentMonthCustomers === undefined ? '—' : numberFormat.format(currentMonthCustomers)
          }
          comparison={comparison(currentMonthCustomers, previousMonthCustomers, 'clientes')}
          icon={<Users size={20} />}
          tone="teal"
        />
        <MetricCard
          label="Ingresos de este mes"
          value={currentMonthRevenue === undefined ? '—' : currency.format(currentMonthRevenue)}
          comparison={comparison(
            currentMonthRevenue,
            previousMonthRevenue,
            'vs. mes anterior',
            true,
          )}
          icon={<CircleDollarSign size={20} />}
          tone="green"
        />
        <MetricCard
          label="Membresías por vencer"
          value={numberFormat.format(expiringCount)}
          comparison="En los próximos 30 días"
          icon={<CalendarClock size={20} />}
          tone="amber"
        />
        <MetricCard
          label="Negocios activos"
          value={numberFormat.format(activeCount)}
          comparison={`${numberFormat.format(businesses.length)} en total`}
          icon={<Building2 size={20} />}
          tone="blue"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Membresías próximas a vencer</h2>
            <p className="mt-1 text-sm text-slate-500">
              Negocios con membresía activa que vence en 30 días o menos.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800">
            <Clock3 size={15} /> {numberFormat.format(expiringCount)} por vencer
          </span>
        </div>
        {report.isPending ? (
          <LoadingState />
        ) : expiringBusinesses.length ? (
          <div className="divide-y divide-slate-100">
            {expiringBusinesses.map((business) => {
              const days = daysUntil(business.membershipExpiresAt) ?? 0;
              return (
                <div
                  key={business.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{business.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {business.email || 'Sin correo de contacto'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <span className="text-sm text-slate-600">
                      Vence el {formatDate(business.membershipExpiresAt)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${days <= 7 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}
                    >
                      {days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            {report.data?.statistics?.expiringMemberships
              ? `${report.data.statistics.expiringMemberships} membresías están próximas a vencer. Revisa el directorio para ver sus fechas.`
              : 'No hay membresías activas por vencer en los próximos 30 días.'}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Directorio de negocios</h2>
            <p className="mt-1 text-sm text-slate-500">
              {report.isSuccess
                ? `${businesses.length} ${businesses.length === 1 ? 'negocio registrado' : 'negocios registrados'}`
                : 'Gestiona los negocios de la plataforma'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-400 sm:w-64">
              <Search size={16} />
              <input
                type="search"
                aria-label="Buscar negocios"
                placeholder="Buscar negocio"
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearch('')}>
                  <X size={15} />
                </button>
              )}
            </label>
            <select
              aria-label="Filtrar por estado"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-teal-600"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="all">Todos los estados</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {report.isPending && <LoadingState />}
        {report.isError && (
          <div className="px-6 py-12 text-center">
            <h3 className="font-semibold text-slate-900">No pudimos cargar los negocios</h3>
            <p className="mt-1 text-sm text-slate-500">
              Comprueba la conexión con la API e inténtalo de nuevo.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => void report.refetch()}>
              Volver a intentar
            </Button>
          </div>
        )}
        {report.isSuccess && filteredBusinesses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Negocio</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Membresía</th>
                  <th className="px-4 py-3 font-semibold">Clientes</th>
                  <th className="px-4 py-3 font-semibold">Ingresos este mes</th>
                  <th className="px-5 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBusinesses.map((business) => (
                  <tr key={business.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{business.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {business.email || business.phone || 'Sin datos de contacto'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={business.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-700">
                        {isMembershipActive(business) ? 'Activa' : 'Inactiva'}
                      </div>
                      <div
                        className={`mt-1 text-xs ${isExpiringSoon(business) ? 'font-semibold text-amber-700' : 'text-slate-500'}`}
                      >
                        {business.membershipExpiresAt
                          ? `Vence ${formatDate(business.membershipExpiresAt)}`
                          : 'Sin fecha de vencimiento'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {business.customerCount === undefined
                        ? '—'
                        : numberFormat.format(business.customerCount)}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-700">
                      {business.currentMonthRevenue === undefined
                        ? '—'
                        : currency.format(business.currentMonthRevenue)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-500 hover:bg-teal-50 hover:text-teal-800"
                          aria-label={`Editar ${business.name}`}
                          onClick={() => startEdit(business)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                          aria-label={`Eliminar ${business.name}`}
                          onClick={() => setDeleteTarget(business)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {report.isSuccess && filteredBusinesses.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Building2 className="mx-auto text-slate-300" size={28} />
            <h3 className="mt-3 font-semibold text-slate-900">
              {search || statusFilter !== 'all' ? 'No encontramos negocios' : 'Aún no hay negocios'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {search || statusFilter !== 'all'
                ? 'Prueba con otra búsqueda o cambia el filtro.'
                : 'Crea el primer negocio para empezar el directorio.'}
            </p>
          </div>
        )}
      </section>

      <BusinessFormDialog
        open={formOpen}
        business={editing}
        isPending={createBusiness.isPending || updateBusiness.isPending}
        onOpenChange={setFormOpen}
        onSave={saveBusiness}
      />
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteBusiness.isPending) setDeleteTarget(null);
        }}
        title="Eliminar negocio"
        description="Esta acción quitará el negocio del directorio y no se puede deshacer."
      >
        {deleteTarget && (
          <div>
            <p className="mb-6 text-sm text-slate-600">
              ¿Seguro que quieres eliminar{' '}
              <strong className="text-slate-900">{deleteTarget.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={deleteBusiness.isPending}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                className="button-danger"
                disabled={deleteBusiness.isPending}
                onClick={() => deleteBusiness.mutate(deleteTarget.id)}
              >
                <Trash2 size={16} /> {deleteBusiness.isPending ? 'Eliminando…' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function sumAvailable(values: Array<number | undefined>) {
  return values.some((value) => value !== undefined)
    ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : undefined;
}

function comparison(current?: number, previous?: number, unit = '', money = false) {
  if (current === undefined || previous === undefined) return 'Comparación mensual sin datos';
  const delta = current - previous;
  const percent = previous === 0 ? (current === 0 ? 0 : null) : (delta / previous) * 100;
  const change = `${delta > 0 ? '+' : ''}${money ? currency.format(delta) : numberFormat.format(delta)}${unit && !money ? ` ${unit}` : ''}`;
  const percentage = percent === null ? 'nuevo' : `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
  const trendClass =
    delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : 'text-slate-500';
  const TrendIcon = delta < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <span className={`inline-flex items-center gap-1 ${trendClass}`}>
      <TrendIcon size={14} />
      {change} · {percentage} vs. mes anterior
    </span>
  );
}

function MetricCard({
  label,
  value,
  comparison: detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  comparison: ReactNode;
  icon: ReactNode;
  tone: 'teal' | 'green' | 'amber' | 'blue';
}) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-sky-50 text-sky-700',
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500">{detail}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: AdminBusiness['status'] }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function LoadingState() {
  return (
    <div
      className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-500"
      role="status"
    >
      <LoaderCircle className="animate-spin" size={18} /> Cargando información…
    </div>
  );
}

function BusinessFormDialog({
  open,
  business,
  isPending,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  business: AdminBusiness | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: AdminBusinessInput) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<AdminBusiness['status']>('pending');
  const [membershipExpiresAt, setMembershipExpiresAt] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(business?.name ?? '');
    setEmail(business?.email ?? '');
    setPhone(business?.phone ?? '');
    setStatus(business?.status ?? 'pending');
    setMembershipExpiresAt(business?.membershipExpiresAt?.slice(0, 10) ?? '');
    setError('');
  }, [business, open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Escribe un correo electrónico válido.');
      return;
    }
    setError('');
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status,
      membershipExpiresAt,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={business ? 'Editar negocio' : 'Nuevo negocio'}
      description="Registra los datos de contacto, estado y vigencia de la membresía."
      className="max-w-xl"
    >
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          Nombre del negocio <span className="text-rose-600">*</span>
          <input
            autoFocus
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Café Avellaneda"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="contacto@negocio.mx"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Teléfono
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="55 1234 5678"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Estado
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as AdminBusiness['status'])}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {statusLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Vencimiento de membresía
            <input
              type="date"
              value={membershipExpiresAt}
              onChange={(event) => setMembershipExpiresAt(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando…' : business ? 'Guardar cambios' : 'Crear negocio'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
