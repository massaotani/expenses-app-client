import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Baseline screen size (standard design draft size)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

export const scale = (size: number) => (width / GUIDELINE_BASE_WIDTH) * size;
export const verticalScale = (size: number) =>
  (height / GUIDELINE_BASE_HEIGHT) * size;
export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;
