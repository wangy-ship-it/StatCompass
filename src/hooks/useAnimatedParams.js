import useModuleParams from './useModuleParams';
import useSpring from './useSpring';

/**
 * Drop-in replacement for useModuleParams that applies spring animation
 * to all numeric parameters. Non-numeric values snap immediately.
 * Integer-valued defaults get Math.round() applied to the spring output.
 */
export default function useAnimatedParams(defaults) {
  const [raw, set] = useModuleParams(defaults);
  const keys = Object.keys(defaults);
  const animated = {};
  for (const key of keys) {
    const val = raw[key];
    // useSpring is called in a stable loop (keys derived from static defaults)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    if (typeof val === 'number') {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      let springVal = useSpring(val);
      // Snap integer params
      if (Number.isInteger(defaults[key])) {
        springVal = Math.round(springVal);
      }
      animated[key] = springVal;
    } else {
      animated[key] = val;
    }
  }
  return [animated, set];
}
