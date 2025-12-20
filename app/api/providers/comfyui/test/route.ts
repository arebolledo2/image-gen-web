import { NextResponse } from 'next/server';
import { ComfyUIProvider } from '@/lib/providers/comfyui/comfyui-provider';

export async function GET() {
  try {
    const provider = new ComfyUIProvider();
    const isConnected = await provider.testConnection();

    return NextResponse.json({
      connected: isConnected,
      host: process.env.COMFYUI_HOST || 'localhost',
      port: process.env.COMFYUI_PORT || '8188',
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
