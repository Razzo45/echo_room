declare module 'web-push';

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

