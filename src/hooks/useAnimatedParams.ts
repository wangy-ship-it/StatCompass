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
    // Always call useSpring to maintain stable hook order (keys derived from static defaults).
    // For non-numeric values, pass 0 as a dummy target and discard the result.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const springVal = useSpring(typeof val === 'number' ? val : 0);
    animated[key] = typeof val === 'number' ? springVal : val;
  }
  return [animated as T, set];
}
