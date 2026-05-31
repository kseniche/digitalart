/**
 * Состояние для React Router Link: страница, на которую нужно вернуться по «Назад».
 */
export function getReturnState(location) {
  if (location?.state?.from && typeof location.state.from === 'string') {
    return { from: location.state.from };
  }

  const path = `${location?.pathname ?? ''}${location?.search ?? ''}`;

  if (!path || path === '/') {
    return { from: '/' };
  }

  if (path.startsWith('/post/')) {
    return { from: '/' };
  }

  return { from: path };
}
