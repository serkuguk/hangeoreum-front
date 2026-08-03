module.exports = (request, options) => {
  if (request !== 'rxjs' && !request.startsWith('rxjs/')) {
    return options.defaultResolver(request, options);
  }

  return options.defaultResolver(request, {
    ...options,
    conditions: ['node', 'require', 'default'],
  });
};
