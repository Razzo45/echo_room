declare module 'web-push' {
  interface PushSubscription {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
  interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }
  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  function sendNotification(subscription: PushSubscription, payload: string): Promise<SendResult>;
}

declare module '@3d-dice/dice-box-threejs' {
  interface DiceBoxConfig {
    theme_customColorset?: {
      background?: string[];
      foreground?: string;
      outline?: string;
      texture?: string;
      material?: string;
    };
    theme_surface?: string;
    theme_colorset?: string;
    theme_texture?: string;
    theme_material?: string;
    gravity_multiplier?: number;
    light_intensity?: number;
    shadows?: boolean;
    sounds?: boolean;
    strength?: number;
    baseScale?: number;
    framerate?: number;
    onRollComplete?: (results: DiceResult[]) => void;
  }

  interface DiceResult {
    value: number;
    dice: string;
  }

  class DiceBox {
    constructor(selector: string, config?: DiceBoxConfig);
    initialize(): void;
    roll(notation: string): Promise<DiceResult[]>;
    clear(): void;
  }

  export default DiceBox;
}

