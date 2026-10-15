import fares from "@/data/presets/fares-20.json";
import oneOff from "@/data/presets/one-off-300.json";
import petrol from "@/data/presets/petrol-15.json";
import childcare from "@/data/presets/childcare-half.json";
import { PresetFileSchema, type PresetFile } from "@/lib/schemas";

// The 4 hand-checked presets, in chip order. Each file is validated when loaded,
// so a broken preset fails loudly instead of quietly changing the demo.
export const PRESETS: PresetFile[] = [fares, oneOff, petrol, childcare].map((file) => PresetFileSchema.parse(file));

export function getPreset(id: string): PresetFile | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
