export interface ComfyUIConfig {
  host: string;
  port: number;
  timeout: number;
  checkInterval: number;
  workflows: {
    [key: string]: {
      template: string;
      paramMap: string;
    };
  };
  defaults: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: Record<string, any>;
  };
}

export function getComfyUIConfig(): ComfyUIConfig {
  return {
    host: process.env.COMFYUI_HOST || 'localhost',
    port: parseInt(process.env.COMFYUI_PORT || '8188', 10),
    timeout: parseInt(process.env.COMFYUI_TIMEOUT || '300', 10),
    checkInterval: 1000,

    workflows: {
      txt2img: {
        template: 'comfyui-templates/templates/txt2img-zimage.template.json',
        paramMap: 'comfyui-templates/parameter-maps/txt2img-zimage.api-params.json',
      },
    },

    defaults: {
      txt2img: {
        width: 1024,
        height: 1024,
        steps: 11,
        cfg: 1.0,
        sampler: 'euler',
        scheduler: 'ddim_uniform',
        batch_size: 1,
      },
    },
  };
}
