import { useEffect, useId, useState } from 'react';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import { Button } from './ui/button';
import { isDemo } from '../lib/utils';
export function Scanner({
  onResult,
  business = false,
}: {
  onResult: (token: string) => void;
  business?: boolean;
}) {
  const id = `scanner-${useId().replace(/:/g, '')}`;
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let stop: (() => Promise<void>) | undefined;
    async function start() {
      try {
        if (!window.isSecureContext) throw new Error('La cámara necesita una conexión HTTPS.');
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const scanner = new Html5Qrcode(id);
        stop = async () => {
          if (scanner.isScanning) await scanner.stop();
          scanner.clear();
        };
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          (text) => {
            if (cancelled) return;
            cancelled = true;
            void stop?.()
              .catch(() => {})
              .finally(() => {
                setRunning(false);
                onResult(text);
              });
          },
          () => {},
        );
        if (cancelled) await stop();
      } catch {
        if (!cancelled) {
          setError(
            'No pudimos abrir la cámara. Permite el acceso en tu navegador o ingresa el código manualmente.',
          );
          setRunning(false);
        }
      }
    }
    void start();
    return () => {
      cancelled = true;
      void stop?.().catch(() => {});
    };
  }, [running, id, onResult]);
  return (
    <div className="scanner-panel">
      <div className="scanner-viewport">
        <div id={id} />
        {!running && (
          <div className="scanner-placeholder">
            <ScanLine size={64} strokeWidth={1} />
            <p>{business ? 'Escanea el QR de tu cliente' : 'Escanea el QR de un negocio'}</p>
            <small>Coloca el código dentro del recuadro</small>
          </div>
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button
        className="full-width"
        variant={running ? 'outline' : 'default'}
        onClick={() => {
          setError('');
          setRunning(!running);
        }}
      >
        {running ? <CameraOff size={18} /> : <Camera size={18} />}{' '}
        {running ? 'Detener cámara' : 'Activar cámara'}
      </Button>
      <div className="manual-divider">o ingresa el código</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onResult(manual.trim());
        }}
      >
        <label className="sr-only" htmlFor={`${id}-code`}>
          Código QR manual
        </label>
        <div className="input-button">
          <input
            id={`${id}-code`}
            placeholder="Código del cliente o negocio"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            required
            maxLength={2048}
          />
          <Button variant="secondary" type="submit">
            Validar
          </Button>
        </div>
      </form>
      {isDemo && (
        <button
          className="text-link demo-scan"
          onClick={() => onResult(business ? 'punto-plus:demo:sofia' : 'punto-plus:business:b4')}
        >
          Probar con un QR de demostración <ScanLine size={15} />
        </button>
      )}
    </div>
  );
}
