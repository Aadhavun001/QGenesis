import { useEffect } from 'react';

type LogoSettings = {
  type: 'image' | 'text';
  imageUrl?: string;
  shape?: 'square' | 'circle' | 'rounded';
  brightness?: number;
  contrast?: number;
  saturate?: number;
  hueRotate?: number;
};

function ensureIconLink(rel: string, attrs: Record<string, string>) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  Object.entries(attrs).forEach(([k, v]) => link!.setAttribute(k, v));
  return link!;
}

function setFavicon(href: string) {
  const icon = ensureIconLink('icon', { type: 'image/png', sizes: '32x32' });
  const shortcut = ensureIconLink('shortcut icon', { type: 'image/png' });
  const apple = ensureIconLink('apple-touch-icon', { sizes: '180x180' });
  icon.href = href;
  shortcut.href = href;
  apple.href = href;
}

async function setFaviconFromLogo(settings: LogoSettings) {
  if (settings.type !== 'image' || !settings.imageUrl) {
    setFavicon('/favicon.png');
    return;
  }

  if (settings.shape !== 'circle') {
    setFavicon(settings.imageUrl);
    return;
  }

  // Circle favicon with transparent outside
  try {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = settings.imageUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Favicon image load failed'));
    });

    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.filter = `brightness(${settings.brightness || 100}%) contrast(${settings.contrast || 100}%) saturate(${settings.saturate || 100}%) hue-rotate(${settings.hueRotate || 0}deg)`;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();

    setFavicon(canvas.toDataURL('image/png'));
  } catch {
    setFavicon(settings.imageUrl);
  }
}

export function FaviconSync() {
  useEffect(() => {
    const apply = () => {
      try {
        const raw = localStorage.getItem('qgenesis-logo-settings');
        if (!raw) return;
        const settings = JSON.parse(raw) as LogoSettings;
        void setFaviconFromLogo(settings);
      } catch {}
    };

    apply();
    window.addEventListener('logo-settings-updated', apply);
    window.addEventListener('storage', apply);
    return () => {
      window.removeEventListener('logo-settings-updated', apply);
      window.removeEventListener('storage', apply);
    };
  }, []);

  return null;
}

