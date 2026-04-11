export const createProfileBackLink = (pathname, label, options = {}) => ({
  backLink: {
    pathname,
    label,
    search: options.search || '',
    state: options.state,
  },
});
