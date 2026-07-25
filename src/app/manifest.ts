import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ruby+ Business', short_name: 'Ruby+ Business', description: 'Manage your Ruby+ business from anywhere.', start_url: '/business/dashboard', display: 'standalone', background_color: '#ffffff', theme_color: '#FD362F', icons: [{ src: '/images/logo.png', sizes: '192x192', type: 'image/png' }],
  };
}
