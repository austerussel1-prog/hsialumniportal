export const ADMIN_ROLES = ['super_admin', 'admin', 'hr', 'alumni_officer'];
export const GUEST_USER_ID = 'guest-session';

export function safelyParseUser(rawValue = null) {
  try {
    const raw = rawValue === null ? localStorage.getItem('user') : rawValue;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isGuestUser(user) {
  return Boolean(user?.isGuest || user?.role === 'guest');
}

export function createGuestUser() {
  return {
    id: GUEST_USER_ID,
    _id: GUEST_USER_ID,
    role: 'guest',
    status: 'guest',
    name: 'Guest',
    fullName: 'Guest User',
    email: '',
    isGuest: true,
  };
}

export function startGuestSession() {
  localStorage.removeItem('token');
  const guestUser = createGuestUser();
  localStorage.setItem('user', JSON.stringify(guestUser));
  return guestUser;
}

export function isAdminUser(user) {
  return Boolean(user && ADMIN_ROLES.includes(user.role));
}
