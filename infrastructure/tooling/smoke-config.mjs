export function parseImageOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!['--app', '--image'].includes(key) || key in options || !value || value.startsWith('--')) {
      throw new Error('Use --app admin|portal --image <tag>');
    }
    options[key] = value;
  }
  if (!['admin', 'portal'].includes(options['--app']) || !options['--image']) {
    throw new Error('Use --app admin|portal --image <tag>');
  }
  return { app: options['--app'], image: options['--image'] };
}
