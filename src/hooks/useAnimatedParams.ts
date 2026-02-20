import useModuleParams from './useModuleParams';
import useSpring from './useSpring';

type ParamValue = number | string | boolean;

export default function useAnimatedParams<T extends Record<string, ParamValue>>(
  defaults: T,
): [T, (key: keyof T & string, value: T[keyof T & string]) => void] {
  const [raw, set] = useModuleParams(defaults);
  const keys = Object.keys(defaults) as (keyof T & string)[];
  const animated = {} as Record<string, ParamValue>;
  for (const key of keys) {
    const val = raw[key];
    // useSpring is called in a stable loop (keys derived from static defaults)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    if (typeof val === 'number') {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      let springVal = useSpring(val);
      if (Number.isInteger(defaults[key])) {
        springVal = Math.round(springVal);
      }
      animated[key] = springVal;
    } else {
      animated[key] = val;
    }
  }
  return [animated as T, set];
}
