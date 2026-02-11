const routes = {
  home: '/',
  dashboard: '/dashboard',
  createProposal: '/proposals/create',
  proposal: (id: string) => `/proposals/${id}`,
  admin: '/admin',
};

export default routes;

